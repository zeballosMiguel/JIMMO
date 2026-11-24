-- Migration: Crear tabla traspasos_stock, vista vw_stock_sucursal y función realizar_traspaso_stock
-- Ejecutar en Supabase SQL Editor DESPUÉS de add_sucursal_to_detalle_lote.sql

-- Tabla de historial de traspasos entre sucursales
CREATE TABLE IF NOT EXISTS traspasos_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origen_sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  destino_sucursal_id UUID NOT NULL REFERENCES sucursales(id),
  variante_id UUID NOT NULL REFERENCES variantes_producto(id),
  cantidad INT NOT NULL CHECK (cantidad > 0),
  motivo TEXT,
  usuario_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vista de stock disponible por variante y sucursal
CREATE OR REPLACE VIEW vw_stock_sucursal AS
SELECT
  dl.variante_id,
  dl.sucursal_id,
  s.nombre AS sucursal_nombre,
  SUM(dl.cantidad_disponible) AS stock_disponible_sucursal,
  SUM(dl.cantidad) AS stock_total_sucursal
FROM detalle_lote dl
JOIN sucursales s ON s.id = dl.sucursal_id
WHERE dl.sucursal_id IS NOT NULL
GROUP BY dl.variante_id, dl.sucursal_id, s.nombre;

-- Función de traspaso de stock entre sucursales (FIFO)
CREATE OR REPLACE FUNCTION realizar_traspaso_stock(
  p_origen_sucursal_id UUID,
  p_destino_sucursal_id UUID,
  p_variante_id UUID,
  p_cantidad INT,
  p_motivo TEXT DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_stock_origen INT;
  v_lote_origen_id UUID;
  v_detalle_origen_id UUID;
  v_cant_a_transferir INT;
  v_cant_restante INT;
  v_detalle_destino_id UUID;
BEGIN
  -- Validar que origen != destino
  IF p_origen_sucursal_id = p_destino_sucursal_id THEN
    RAISE EXCEPTION 'El origen y destino no pueden ser la misma sucursal';
  END IF;

  -- Validar stock disponible en origen
  SELECT COALESCE(SUM(cantidad_disponible), 0)
  INTO v_stock_origen
  FROM detalle_lote
  WHERE variante_id = p_variante_id AND sucursal_id = p_origen_sucursal_id;

  IF v_stock_origen < p_cantidad THEN
    RAISE EXCEPTION 'Stock insuficiente en sucursal origen. Disponible: %, Requerido: %', v_stock_origen, p_cantidad;
  END IF;

  -- Descontar del origen (FIFO: lotes más antiguos primero)
  v_cant_restante := p_cantidad;
  FOR v_detalle_origen_id, v_lote_origen_id, v_cant_a_transferir IN
    SELECT dl.id, dl.lote_id, dl.cantidad_disponible
    FROM detalle_lote dl
    JOIN lotes l ON l.id = dl.lote_id
    WHERE dl.variante_id = p_variante_id
      AND dl.sucursal_id = p_origen_sucursal_id
      AND dl.cantidad_disponible > 0
    ORDER BY l.fecha_recepcion ASC NULLS LAST, l.created_at ASC
  LOOP
    EXIT WHEN v_cant_restante <= 0;

    DECLARE
      v_tomar INT := LEAST(v_cant_a_transferir, v_cant_restante);
    BEGIN
      -- Restar del origen
      UPDATE detalle_lote
      SET cantidad_disponible = cantidad_disponible - v_tomar
      WHERE id = v_detalle_origen_id;

      -- Sumar al destino (en el mismo lote si existe, si no crear fila nueva)
      SELECT id INTO v_detalle_destino_id
      FROM detalle_lote
      WHERE lote_id = v_lote_origen_id
        AND variante_id = p_variante_id
        AND sucursal_id = p_destino_sucursal_id
      LIMIT 1;

      IF v_detalle_destino_id IS NOT NULL THEN
        UPDATE detalle_lote
        SET cantidad_disponible = cantidad_disponible + v_tomar,
            cantidad = cantidad + v_tomar
        WHERE id = v_detalle_destino_id;
      ELSE
        INSERT INTO detalle_lote (lote_id, variante_id, sucursal_id, cantidad, cantidad_disponible, costo_unitario_bs)
        SELECT v_lote_origen_id, p_variante_id, p_destino_sucursal_id, v_tomar, v_tomar, costo_unitario_bs
        FROM detalle_lote WHERE id = v_detalle_origen_id;
      END IF;

      v_cant_restante := v_cant_restante - v_tomar;
    END;
  END LOOP;

  -- Registrar el traspaso en el historial
  INSERT INTO traspasos_stock (origen_sucursal_id, destino_sucursal_id, variante_id, cantidad, motivo, usuario_id)
  VALUES (p_origen_sucursal_id, p_destino_sucursal_id, p_variante_id, p_cantidad, p_motivo, auth.uid());
END;
$$;

-- Permisos para usuarios autenticados
GRANT EXECUTE ON FUNCTION realizar_traspaso_stock(UUID, UUID, UUID, INT, TEXT) TO authenticated;
GRANT SELECT ON vw_stock_sucursal TO authenticated;
GRANT SELECT ON traspasos_stock TO authenticated;

-- RLS para que usuarios autenticados puedan leer el historial de traspasos
ALTER TABLE traspasos_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated_read_traspasos" ON traspasos_stock;
CREATE POLICY "authenticated_read_traspasos"
  ON traspasos_stock
  FOR SELECT
  TO authenticated
  USING (true);
