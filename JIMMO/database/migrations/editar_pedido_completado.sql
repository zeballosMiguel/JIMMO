-- ============================================================
-- Función: editar_pedido_completado
-- Edita un pedido COMPLETADO con reversión completa y reaplicación:
--   Fase 1: Revertir estado actual (stock, asignaciones, detalles, repartos)
--   Fase 2: Actualizar metadata del pedido
--   Fase 3: Aplicar nuevos ítems vía FIFO directo (p_reservar = FALSE)
--   Fase 4: Recalcular repartos_utilidad
-- ============================================================
CREATE OR REPLACE FUNCTION editar_pedido_completado(
  p_pedido_id       UUID,
  p_cliente_id      UUID,
  p_vendedor_id     UUID,
  p_sucursal_id     UUID,
  p_canal_id        UUID,
  p_tipo_entrega_id UUID,
  p_items           JSONB,
  p_lugar_entrega   TEXT DEFAULT NULL,
  p_lugar_envio     TEXT DEFAULT NULL,
  p_notas           TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado      TEXT;
  r             RECORD;
  v_item        JSONB;
  v_detalle_id  UUID;
  v_variante_id UUID;
  v_cantidad    INT;
  v_precio      NUMERIC;
BEGIN
  -- 1. Lock y validar estado
  SELECT estado INTO v_estado
  FROM pedidos
  WHERE id = p_pedido_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido % no encontrado', p_pedido_id;
  END IF;

  IF v_estado <> 'COMPLETADO' THEN
    RAISE EXCEPTION 'Solo se pueden editar pedidos en estado COMPLETADO. Estado actual: %', v_estado;
  END IF;

  -- ── FASE 1: REVERTIR estado actual ──────────────────────────

  -- 2. Restaurar stock por cada asignación activa
  FOR r IN
    SELECT ap.detalle_lote_id, ap.cantidad, dp.variante_id
    FROM asignaciones_lote_pedido ap
    JOIN detalle_pedido dp ON dp.id = ap.detalle_pedido_id
    WHERE dp.pedido_id = p_pedido_id
      AND dp.activo = TRUE
      AND ap.activa = TRUE
    ORDER BY ap.id
    FOR UPDATE OF ap
  LOOP
    -- Restaurar cantidad_disponible en detalle_lote
    UPDATE detalle_lote
    SET cantidad_disponible = cantidad_disponible + r.cantidad
    WHERE id = r.detalle_lote_id;

    -- Restaurar stock_actual en variante
    UPDATE variantes_producto
    SET stock_actual = stock_actual + r.cantidad
    WHERE id = r.variante_id;
  END LOOP;

  -- 3. Marcar asignaciones anteriores inactivas
  UPDATE asignaciones_lote_pedido
  SET activa = FALSE
  WHERE detalle_pedido_id IN (
    SELECT id FROM detalle_pedido WHERE pedido_id = p_pedido_id AND activo = TRUE
  )
  AND activa = TRUE;

  -- 4. Desactivar detalle_pedido anterior
  -- Las columnas subtotal/costo_total/utilidad son GENERATED ALWAYS, no se pueden escribir.
  -- Basta con activo=FALSE: las vistas y dashboard filtran activo=TRUE.
  UPDATE detalle_pedido
  SET activo = FALSE
  WHERE pedido_id = p_pedido_id
    AND activo = TRUE;

  -- 5. Eliminar repartos anteriores
  DELETE FROM repartos_utilidad
  WHERE pedido_id = p_pedido_id;

  -- ── FASE 2: ACTUALIZAR METADATA DEL PEDIDO ──────────────────

  UPDATE pedidos
  SET
    cliente_id      = p_cliente_id,
    vendedor_id     = p_vendedor_id,
    sucursal_id     = p_sucursal_id,
    canal_id        = p_canal_id,
    tipo_entrega_id = p_tipo_entrega_id,
    lugar_entrega   = p_lugar_entrega,
    lugar_envio     = p_lugar_envio,
    notas           = p_notas,
    updated_at      = NOW()
  WHERE id = p_pedido_id;

  -- ── FASE 3: INSERTAR NUEVOS ÍTEMS + FIFO DIRECTO ────────────

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variante_id := (v_item->>'variante_id')::UUID;
    v_cantidad    := (v_item->>'cantidad')::INT;
    v_precio      := (v_item->>'precio_unitario')::NUMERIC;

    -- Insertar nuevo detalle
    -- subtotal es GENERATED ALWAYS (cantidad * precio_unitario), no se inserta
    INSERT INTO detalle_pedido (
      pedido_id, variante_id, cantidad, precio_unitario, activo
    )
    VALUES (
      p_pedido_id,
      v_variante_id,
      v_cantidad,
      v_precio,
      TRUE
    )
    RETURNING id INTO v_detalle_id;

    -- FIFO directo: p_reservar = FALSE → consume stock sin reservar
    -- Esta función ya actualiza: asignaciones_lote_pedido, detalle_lote,
    -- y el costo_unitario en detalle_pedido
    PERFORM asignar_fifo_detalle(v_detalle_id, FALSE);

    -- Descontar stock_actual en variante (asignar_fifo_detalle no lo hace cuando p_reservar=FALSE)
    UPDATE variantes_producto
    SET stock_actual = stock_actual - v_cantidad
    WHERE id = v_variante_id;

    -- Registrar movimiento SALIDA_VENTA
    INSERT INTO movimientos_inventario (variante_id, lote_id, pedido_id, tipo, cantidad, motivo, usuario_id)
    SELECT v_variante_id, dl.lote_id, p_pedido_id, 'SALIDA_VENTA', v_cantidad, 'Edición de venta completada', auth.uid()
    FROM asignaciones_lote_pedido ap2
    JOIN detalle_lote dl ON dl.id = ap2.detalle_lote_id
    WHERE ap2.detalle_pedido_id = v_detalle_id
      AND ap2.activa = TRUE;
  END LOOP;

  -- ── FASE 4: RECALCULAR REPARTOS ─────────────────────────────
  PERFORM generar_reparto_utilidad(p_pedido_id);

  -- ── FASE 5: FORZAR RECÁLCULO DEL TOTAL ──────────────────────
  -- Garantiza que pedidos.total refleje SOLO los detalles activos,
  -- independientemente de si el trigger se disparó correctamente.
  UPDATE pedidos
  SET total = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM detalle_pedido
    WHERE pedido_id = p_pedido_id
      AND activo = TRUE
  )
  WHERE id = p_pedido_id;

  -- ── FASE 6: VERIFICAR INVARIANTES ───────────────────────────
  FOR r IN
    SELECT DISTINCT variante_id FROM detalle_pedido WHERE pedido_id = p_pedido_id AND activo = TRUE
  LOOP
    PERFORM verificar_invariantes_inventario(r.variante_id);
  END LOOP;

END;
$$;

GRANT EXECUTE ON FUNCTION editar_pedido_completado(UUID, UUID, UUID, UUID, UUID, UUID, JSONB, TEXT, TEXT, TEXT) TO authenticated;
