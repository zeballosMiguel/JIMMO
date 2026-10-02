-- ============================================================
-- MIGRACIÓN: ELIMINAR ESTADO BORRADOR Y CONFIGURAR RESERVADO / COMPLETADO
-- Ambos estados descuentan / comprometen stock de inmediato
-- ============================================================

-- Limpiar firmas anteriores para evitar ambigüedades
DROP FUNCTION IF EXISTS crear_pedido(UUID, UUID, UUID, UUID, UUID, JSONB, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS crear_pedido(UUID, UUID, UUID, UUID, UUID, JSONB, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT);

-- 1. Actualizar función crear_pedido para aceptar modalidad 'RESERVADO' o 'COMPLETADO'
CREATE OR REPLACE FUNCTION crear_pedido(
    p_cliente_id UUID,
    p_vendedor_id UUID,
    p_sucursal_id UUID,
    p_canal_id UUID,
    p_tipo_entrega_id UUID,
    p_items JSONB,
    p_reservar_stock BOOLEAN DEFAULT TRUE,
    p_monto_reserva NUMERIC DEFAULT 0,
    p_lugar_entrega TEXT DEFAULT NULL,
    p_lugar_envio TEXT DEFAULT NULL,
    p_notas TEXT DEFAULT NULL,
    p_metodo_pago TEXT DEFAULT 'EFECTIVO',
    p_referencia_pago TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pedido_id UUID;
    v_vendedor UUID;
    item JSONB;
    v_detalle_id UUID;
    v_variante UUID;
    v_cantidad INTEGER;
    v_precio NUMERIC;
    v_total NUMERIC := 0;
    v_estado estado_pedido_venta;
    v_metodo metodo_pago;
    r RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND activo = TRUE) THEN
        RAISE EXCEPTION 'El usuario está inactivo';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe contener al menos un producto';
    END IF;

    IF p_monto_reserva < 0 THEN
        RAISE EXCEPTION 'El monto del adelanto / pago no puede ser negativo';
    END IF;

    IF es_admin() THEN
        v_vendedor := p_vendedor_id;
    ELSE
        v_vendedor := vendedor_actual();
        IF v_vendedor IS NULL THEN
            RAISE EXCEPTION 'El usuario actual no es un vendedor activo';
        END IF;
        IF v_vendedor <> p_vendedor_id THEN
            RAISE EXCEPTION 'No puede crear pedidos para otro vendedor';
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM vendedores WHERE id = v_vendedor AND activo = TRUE) THEN
        RAISE EXCEPTION 'El vendedor no existe o está inactivo';
    END IF;

    -- Determinar estado inicial: Solo existen RESERVADO o COMPLETADO (no existe BORRADOR)
    IF p_reservar_stock THEN
        v_estado := 'RESERVADO'::estado_pedido_venta;
    ELSE
        v_estado := 'COMPLETADO'::estado_pedido_venta;
    END IF;

    INSERT INTO pedidos (
        cliente_id, vendedor_id, sucursal_id, canal_id, tipo_entrega_id,
        estado, lugar_entrega, lugar_envio, notas
    )
    VALUES (
        p_cliente_id, v_vendedor, p_sucursal_id, p_canal_id, p_tipo_entrega_id,
        'RESERVADO'::estado_pedido_venta, -- temporalmente reservado para asignar FIFO
        p_lugar_entrega, p_lugar_envio, p_notas
    )
    RETURNING id INTO v_pedido_id;

    -- Procesar items y reservar stock inmediatamente por FIFO
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        BEGIN
            v_variante := (item->>'variante_id')::UUID;
            v_cantidad := (item->>'cantidad')::INTEGER;
            v_precio := (item->>'precio_unitario')::NUMERIC;
        EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
            RAISE EXCEPTION 'Cada item debe contener variante_id, cantidad y precio_unitario válidos';
        END;

        IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
            RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
        END IF;
        IF v_precio IS NULL OR v_precio < 0 THEN
            RAISE EXCEPTION 'El precio no puede ser negativo';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM variantes_producto WHERE id = v_variante AND activa = TRUE) THEN
            RAISE EXCEPTION 'La variante % no existe o está inactiva', v_variante;
        END IF;

        INSERT INTO detalle_pedido (pedido_id, variante_id, cantidad, precio_unitario)
        VALUES (v_pedido_id, v_variante, v_cantidad, v_precio)
        RETURNING id INTO v_detalle_id;

        -- Descontar/apartar stock siempre en ambos estados
        PERFORM reservar_stock(v_variante, v_cantidad);
        PERFORM asignar_fifo_detalle(v_detalle_id, TRUE);
    END LOOP;

    -- Calcular total
    v_total := total_pedido(v_pedido_id);
    UPDATE pedidos SET total = v_total WHERE id = v_pedido_id;

    -- Inicializar registro de reservas
    INSERT INTO reservas (pedido_id, monto_reserva, monto_pendiente, fecha_reserva, activa)
    VALUES (v_pedido_id, 0, v_total, NOW(), TRUE);

    -- Procesar método de pago válido
    BEGIN
        v_metodo := COALESCE(p_metodo_pago, 'EFECTIVO')::metodo_pago;
    EXCEPTION WHEN OTHERS THEN
        v_metodo := 'EFECTIVO'::metodo_pago;
    END;

    -- Si es RESERVADO y deja adelanto en tienda
    IF v_estado = 'RESERVADO' THEN
        IF p_monto_reserva > 0 THEN
            IF p_monto_reserva > v_total THEN
                RAISE EXCEPTION 'El monto del adelanto no puede superar el total del pedido';
            END IF;
            INSERT INTO pagos (pedido_id, monto, metodo, estado, referencia, notas)
            VALUES (v_pedido_id, p_monto_reserva, v_metodo, 'PAGADO', p_referencia_pago, 'Adelanto / anticipo en tienda');
        END IF;
        PERFORM sincronizar_reserva(v_pedido_id);
    ELSE
        -- Si es VENTA INMEDIATA (COMPLETADO): marcar pago completo y salida definitiva de stock
        IF p_monto_reserva > 0 THEN
            INSERT INTO pagos (pedido_id, monto, metodo, estado, referencia, notas)
            VALUES (v_pedido_id, p_monto_reserva, v_metodo, 'PAGADO', p_referencia_pago, 'Pago venta directa');
        ELSE
            -- Si no se especificó monto, asume pago total
            INSERT INTO pagos (pedido_id, monto, metodo, estado, referencia, notas)
            VALUES (v_pedido_id, v_total, v_metodo, 'PAGADO', p_referencia_pago, 'Pago total venta directa');
        END IF;

        -- Ejecutar deducción definitiva de stock (SALIDA_VENTA)
        FOR r IN
            SELECT ap.detalle_pedido_id, ap.detalle_lote_id, ap.cantidad, dp.variante_id
            FROM asignaciones_lote_pedido ap
            JOIN detalle_pedido dp ON dp.id = ap.detalle_pedido_id
            WHERE dp.pedido_id = v_pedido_id AND dp.activo = TRUE AND ap.activa = TRUE
            ORDER BY ap.id
            FOR UPDATE OF ap
        LOOP
            UPDATE detalle_lote
            SET cantidad_reservada = cantidad_reservada - r.cantidad
            WHERE id = r.detalle_lote_id AND cantidad_reservada >= r.cantidad;

            UPDATE variantes_producto
            SET stock_actual = stock_actual - r.cantidad,
                stock_reservado = stock_reservado - r.cantidad
            WHERE id = r.variante_id AND stock_actual >= r.cantidad AND stock_reservado >= r.cantidad;

            INSERT INTO movimientos_inventario (variante_id, lote_id, pedido_id, tipo, cantidad, motivo, usuario_id)
            SELECT r.variante_id, dl.lote_id, v_pedido_id, 'SALIDA_VENTA', r.cantidad, 'Venta directa completada', auth.uid()
            FROM detalle_lote dl WHERE dl.id = r.detalle_lote_id;
        END LOOP;

        UPDATE pedidos SET estado = 'COMPLETADO' WHERE id = v_pedido_id;
        UPDATE reservas SET activa = FALSE WHERE pedido_id = v_pedido_id;

        FOR r IN SELECT DISTINCT variante_id FROM detalle_pedido WHERE pedido_id = v_pedido_id AND activo = TRUE LOOP
            PERFORM verificar_invariantes_inventario(r.variante_id);
        END LOOP;

        PERFORM generar_reparto_utilidad(v_pedido_id);
    END IF;

    -- Validar invariantes
    FOR r IN SELECT DISTINCT variante_id FROM detalle_pedido WHERE pedido_id = v_pedido_id AND activo = TRUE LOOP
        PERFORM verificar_invariantes_inventario(r.variante_id);
    END LOOP;

    RETURN v_pedido_id;
END;
$$;

-- 2. Actualizar editar_pedido para pedidos RESERVADO
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
    p_nuevo_estado TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado_previo estado_pedido_venta;
    v_vendedor_previo UUID;
    v_vendedor_target UUID;
    item JSONB;
    v_detalle_id UUID;
    v_variante UUID;
    v_cantidad INTEGER;
    v_precio NUMERIC;
    r RECORD;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
    IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND activo = TRUE) THEN RAISE EXCEPTION 'El usuario está inactivo'; END IF;
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe contener al menos un producto';
    END IF;

    SELECT estado, vendedor_id INTO v_estado_previo, v_vendedor_previo
    FROM pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

    IF NOT es_admin() AND v_vendedor_previo <> vendedor_actual() THEN
        RAISE EXCEPTION 'No tiene permiso para modificar este pedido';
    END IF;

    IF v_estado_previo NOT IN ('RESERVADO', 'BORRADOR') THEN
        RAISE EXCEPTION 'Solo se pueden modificar pedidos en estado RESERVADO';
    END IF;

    IF es_admin() THEN
        v_vendedor_target := p_vendedor_id;
    ELSE
        v_vendedor_target := v_vendedor_previo;
    END IF;

    -- Liberar reservas anteriores activas
    FOR r IN
        SELECT ap.id AS asignacion_id, ap.detalle_lote_id, ap.cantidad, dp.variante_id
        FROM asignaciones_lote_pedido ap
        JOIN detalle_pedido dp ON dp.id = ap.detalle_pedido_id
        WHERE dp.pedido_id = p_pedido_id AND ap.activa = TRUE AND dp.activo = TRUE
        ORDER BY ap.id
        FOR UPDATE OF ap
    LOOP
        PERFORM liberar_reserva(r.variante_id, r.cantidad);
        UPDATE detalle_lote
        SET cantidad_reservada = cantidad_reservada - r.cantidad,
            cantidad_disponible = cantidad_disponible + r.cantidad
        WHERE id = r.detalle_lote_id;
        UPDATE asignaciones_lote_pedido SET activa = FALSE WHERE id = r.asignacion_id;
    END LOOP;

    -- Marcar detalles anteriores como inactivos
    UPDATE detalle_pedido SET activo = FALSE WHERE pedido_id = p_pedido_id AND activo = TRUE;

    -- Actualizar cabecera
    UPDATE pedidos
    SET cliente_id = p_cliente_id,
        vendedor_id = v_vendedor_target,
        sucursal_id = p_sucursal_id,
        canal_id = p_canal_id,
        tipo_entrega_id = p_tipo_entrega_id,
        estado = 'RESERVADO'::estado_pedido_venta,
        lugar_entrega = p_lugar_entrega,
        lugar_envio = p_lugar_envio,
        notas = p_notas,
        updated_at = NOW()
    WHERE id = p_pedido_id;

    -- Insertar nuevos detalles y reservar stock
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        BEGIN
            v_variante := (item->>'variante_id')::UUID;
            v_cantidad := (item->>'cantidad')::INTEGER;
            v_precio := (item->>'precio_unitario')::NUMERIC;
        EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
            RAISE EXCEPTION 'Cada item debe contener variante_id, cantidad y precio_unitario válidos';
        END;

        IF v_cantidad IS NULL OR v_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero'; END IF;
        IF v_precio IS NULL OR v_precio < 0 THEN RAISE EXCEPTION 'El precio no puede ser negativo'; END IF;
        IF NOT EXISTS (SELECT 1 FROM variantes_producto WHERE id = v_variante AND activa = TRUE) THEN
            RAISE EXCEPTION 'La variante % no existe o está inactiva', v_variante;
        END IF;

        INSERT INTO detalle_pedido (pedido_id, variante_id, cantidad, precio_unitario, activo)
        VALUES (p_pedido_id, v_variante, v_cantidad, v_precio, TRUE)
        RETURNING id INTO v_detalle_id;

        PERFORM reservar_stock(v_variante, v_cantidad);
        PERFORM asignar_fifo_detalle(v_detalle_id, TRUE);
    END LOOP;

    UPDATE pedidos SET total = total_pedido(p_pedido_id) WHERE id = p_pedido_id;
    PERFORM sincronizar_reserva(p_pedido_id);

    FOR r IN SELECT DISTINCT variante_id FROM detalle_pedido WHERE pedido_id = p_pedido_id LOOP
        PERFORM verificar_invariantes_inventario(r.variante_id);
    END LOOP;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION crear_pedido(UUID, UUID, UUID, UUID, UUID, JSONB, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION editar_pedido(UUID, UUID, UUID, UUID, UUID, UUID, JSONB, TEXT, TEXT, TEXT, TEXT) TO authenticated;
