-- ============================================================
-- Función: anular_pedido_completado
-- Revierte COMPLETAMENTE un pedido COMPLETADO:
--   1. Restaura stock a lotes (via detalle_lote_id en asignaciones)
--   2. Anula pagos
--   3. Desactiva detalle_pedido
--   4. Marca pedido CANCELADO
--   5. Desactiva reservas
--   6. Cancela entregas PENDIENTES
--   7. Elimina repartos_utilidad
--   8. Registra movimientos DEVOLUCION_VENTA
-- ============================================================
CREATE OR REPLACE FUNCTION anular_pedido_completado(p_pedido_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado   TEXT;
  r          RECORD;
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
    RAISE EXCEPTION 'Solo se pueden anular pedidos en estado COMPLETADO. Estado actual: %', v_estado;
  END IF;

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

    -- Registrar movimiento DEVOLUCION_VENTA
    INSERT INTO movimientos_inventario (variante_id, lote_id, pedido_id, tipo, cantidad, motivo, usuario_id)
    SELECT r.variante_id, dl.lote_id, p_pedido_id, 'DEVOLUCION_VENTA', r.cantidad, 'Anulación de venta completada', auth.uid()
    FROM detalle_lote dl WHERE dl.id = r.detalle_lote_id;
  END LOOP;

  -- 3. Marcar asignaciones inactivas
  UPDATE asignaciones_lote_pedido
  SET activa = FALSE
  WHERE detalle_pedido_id IN (
    SELECT id FROM detalle_pedido WHERE pedido_id = p_pedido_id AND activo = TRUE
  )
  AND activa = TRUE;

  -- 4. Anular pagos
  UPDATE pagos
  SET estado = 'ANULADO'
  WHERE pedido_id = p_pedido_id
    AND estado = 'PAGADO';

  -- 5. Desactivar detalle_pedido
  -- Las columnas subtotal/costo_total/utilidad son GENERATED ALWAYS, no se pueden escribir.
  -- cantidad tiene CHECK > 0, no se puede poner a 0.
  -- Basta con activo=FALSE: las vistas y dashboard filtran activo=TRUE,
  -- por lo que estos detalles dejan de contar en todos los cálculos.
  UPDATE detalle_pedido
  SET activo = FALSE
  WHERE pedido_id = p_pedido_id
    AND activo = TRUE;

  -- 6. Marcar pedido CANCELADO
  UPDATE pedidos
  SET estado = 'CANCELADO',
      updated_at = NOW()
  WHERE id = p_pedido_id;

  -- 7. Desactivar reservas
  UPDATE reservas
  SET activa = FALSE
  WHERE pedido_id = p_pedido_id;

  -- 8. Cancelar entregas PENDIENTES
  UPDATE entregas
  SET estado = 'CANCELADO'
  WHERE pedido_id = p_pedido_id
    AND estado = 'PENDIENTE';

  -- 9. Eliminar repartos de utilidad
  DELETE FROM repartos_utilidad
  WHERE pedido_id = p_pedido_id;

  -- 10. Verificar invariantes de inventario
  FOR r IN
    SELECT DISTINCT variante_id FROM detalle_pedido WHERE pedido_id = p_pedido_id
  LOOP
    PERFORM verificar_invariantes_inventario(r.variante_id);
  END LOOP;

END;
$$;

GRANT EXECUTE ON FUNCTION anular_pedido_completado(UUID) TO authenticated;
