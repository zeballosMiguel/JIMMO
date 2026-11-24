-- Migration: Agregar sucursal_id a detalle_lote
-- Ejecutar en Supabase SQL Editor

-- Agregar sucursal_id a detalle_lote
ALTER TABLE detalle_lote
  ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);

-- Reemplazar constraint único (lote_id, variante_id) para permitir desglose/traspaso por sucursal
ALTER TABLE detalle_lote
  DROP CONSTRAINT IF EXISTS detalle_lote_lote_id_variante_id_key;

ALTER TABLE detalle_lote
  DROP CONSTRAINT IF EXISTS detalle_lote_lote_id_variante_id_sucursal_id_key;

ALTER TABLE detalle_lote
  ADD CONSTRAINT detalle_lote_lote_id_variante_id_sucursal_id_key UNIQUE (lote_id, variante_id, sucursal_id);

-- Asignar todo el stock existente a la sucursal matriz (primera sucursal activa creada)
UPDATE detalle_lote
SET sucursal_id = (
  SELECT id FROM sucursales
  WHERE activa = true
  ORDER BY created_at ASC, nombre ASC
  LIMIT 1
)
WHERE sucursal_id IS NULL;

-- Índice para performance en queries por sucursal
CREATE INDEX IF NOT EXISTS idx_detalle_lote_sucursal ON detalle_lote(sucursal_id);
