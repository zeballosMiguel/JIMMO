-- ============================================================
-- MIGRACIÓN: Permitir cambio de estado BORRADOR <-> RESERVADO en editar_pedido
-- ============================================================

CREATE OR REPLACE FUNCTION editar_pedido(
    p_pedido_id UUID,
    p_cliente_id UUID,
    p_vendedor_id UUID,
    p_sucursal_id UUID,
    p_canal_id UUID,
    p_tipo_entrega_id UUID,
    p_items JSONB,
    p_lugar_entrega TEXT DEFAULT NULL,
    p_lugar_envio TEXT DEFAULT NULL,
    p_notas TEXT DEFAULT NULL,
    p_nuevo_estado estado_pedido_venta DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado_previo estado_pedido_venta;
    v_estado estado_pedido_venta;
    v_vendedor UUID;
    v_pagado NUMERIC;
    item JSONB;
    v_variante UUID;
    v_cantidad INTEGER;
    v_precio NUMERIC;
    v_detalle_id UUID;
    r RECORD;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;

    SELECT estado, vendedor_id INTO v_estado_previo, v_vendedor
    FROM pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

    IF NOT es_admin() AND v_vendedor <> vendedor_actual() THEN
        RAISE EXCEPTION 'No tiene permiso para modificar este pedido';
    END IF;

    IF v_estado_previo NOT IN ('BORRADOR','RESERVADO') THEN
        RAISE EXCEPTION 'Solo se pueden modificar pedidos BORRADOR o RESERVADO';
    END IF;

    IF p_nuevo_estado IS NOT NULL THEN
        IF p_nuevo_estado NOT IN ('BORRADOR','RESERVADO') THEN
            RAISE EXCEPTION 'El estado destino solo puede ser BORRADOR o RESERVADO';
        END IF;
        v_estado := p_nuevo_estado;
    ELSE
        v_estado := v_estado_previo;
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe contener al menos un producto';
    END IF;

    IF es_admin() THEN
        v_vendedor := p_vendedor_id;
    ELSE
        IF p_vendedor_id <> vendedor_actual() THEN RAISE EXCEPTION 'No puede reasignar el pedido a otro vendedor'; END IF;
        v_vendedor := vendedor_actual();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM vendedores WHERE id = v_vendedor AND activo = TRUE) THEN
        RAISE EXCEPTION 'El vendedor no existe o está inactivo';
    END IF;

    -- Si estaba reservado previamente, primero devolvemos TODO el stock reservado por FIFO.
    IF v_estado_previo = 'RESERVADO' THEN
        FOR item IN
            SELECT jsonb_build_object('detalle_lote_id', ap.detalle_lote_id, 'cantidad', ap.cantidad, 'variante_id', dp.variante_id)
            FROM asignaciones_lote_pedido ap
            JOIN detalle_pedido dp ON dp.id = ap.detalle_pedido_id
            WHERE dp.pedido_id = p_pedido_id AND dp.activo = TRUE AND ap.activa = TRUE
        LOOP
            UPDATE detalle_lote
            SET cantidad_disponible = cantidad_disponible + (item->>'cantidad')::INTEGER,
                cantidad_reservada = cantidad_reservada - (item->>'cantidad')::INTEGER
            WHERE id = (item->>'detalle_lote_id')::UUID
              AND cantidad_reservada >= (item->>'cantidad')::INTEGER;
            IF NOT FOUND THEN RAISE EXCEPTION 'Error al liberar FIFO durante la edición'; END IF;

            UPDATE variantes_producto
            SET stock_reservado = stock_reservado - (item->>'cantidad')::INTEGER
            WHERE id = (item->>'variante_id')::UUID
              AND stock_reservado >= (item->>'cantidad')::INTEGER;
            IF NOT FOUND THEN RAISE EXCEPTION 'Error al liberar stock durante la edición'; END IF;
        END LOOP;
    END IF;

    UPDATE asignaciones_lote_pedido
    SET activa = FALSE
    WHERE detalle_pedido_id IN (SELECT id FROM detalle_pedido WHERE pedido_id = p_pedido_id)
      AND activa = TRUE;

    UPDATE detalle_pedido
    SET activo = FALSE
    WHERE pedido_id = p_pedido_id AND activo = TRUE;

    UPDATE pedidos
    SET cliente_id = p_cliente_id,
        vendedor_id = v_vendedor,
        sucursal_id = p_sucursal_id,
        canal_id = p_canal_id,
        tipo_entrega_id = p_tipo_entrega_id,
        lugar_entrega = p_lugar_entrega,
        lugar_envio = p_lugar_envio,
        notas = p_notas,
        estado = v_estado
    WHERE id = p_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_variante := (item->>'variante_id')::UUID;
        v_cantidad := (item->>'cantidad')::INTEGER;
        v_precio := (item->>'precio_unitario')::NUMERIC;
        IF v_cantidad IS NULL OR v_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero'; END IF;
        IF v_precio IS NULL OR v_precio < 0 THEN RAISE EXCEPTION 'El precio no puede ser negativo'; END IF;
        IF NOT EXISTS (SELECT 1 FROM variantes_producto WHERE id = v_variante AND activa = TRUE) THEN
            RAISE EXCEPTION 'La variante no existe o está inactiva';
        END IF;

        INSERT INTO detalle_pedido (pedido_id, variante_id, cantidad, precio_unitario)
        VALUES (p_pedido_id, v_variante, v_cantidad, v_precio)
        RETURNING id INTO v_detalle_id;

        IF v_estado = 'RESERVADO' THEN
            PERFORM reservar_stock(v_variante, v_cantidad);
            PERFORM asignar_fifo_detalle(v_detalle_id, TRUE);
        END IF;
    END LOOP;

    IF v_estado = 'RESERVADO' THEN
        INSERT INTO reservas (pedido_id, monto_reserva, monto_pendiente, activa)
        VALUES (p_pedido_id, 0, 0, TRUE)
        ON CONFLICT (pedido_id) DO UPDATE SET activa = TRUE;
    ELSE
        UPDATE reservas SET activa = FALSE WHERE pedido_id = p_pedido_id;
    END IF;

    v_pagado := total_pagado_pedido(p_pedido_id);
    IF v_pagado > total_pedido(p_pedido_id) THEN
        RAISE EXCEPTION 'La modificación no puede dejar pagos por encima del total del pedido';
    END IF;

    UPDATE pedidos SET total = total_pedido(p_pedido_id) WHERE id = p_pedido_id;
    PERFORM sincronizar_reserva(p_pedido_id);

    FOR r IN SELECT DISTINCT variante_id FROM detalle_pedido WHERE pedido_id = p_pedido_id LOOP
        PERFORM verificar_invariantes_inventario(r.variante_id);
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION editar_pedido(UUID, UUID, UUID, UUID, UUID, UUID, JSONB, TEXT, TEXT, TEXT, estado_pedido_venta) TO authenticated;
