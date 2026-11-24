-- Migration: Agregar sucursal_id a detalle_lote
-- Ejecutar en Supabase SQL Editor

-- Agregar sucursal_id a detalle_lote
ALTER TABLE detalle_lote
  ADD COLUMN IF NOT EXISTS sucursal_id UUID REFERENCES sucursales(id);

-- Asignar todo el stock existente a El Alto (sucursal matriz / default)
UPDATE detalle_lote
SET sucursal_id = (SELECT id FROM sucursales WHERE nombre ILIKE '%alto%' LIMIT 1)
WHERE sucursal_id IS NULL;

-- Índice para performance en queries por sucursal
CREATE INDEX IF NOT EXISTS idx_detalle_lote_sucursal ON detalle_lote(sucursal_id);
