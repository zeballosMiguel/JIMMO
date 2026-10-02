-- ============================================================
-- MIGRACIÓN: CAMPOS PARA COMPRA POR BULTO / A CIEGAS EN LOTES
-- ============================================================

ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS tipo_compra TEXT DEFAULT 'ESTANDAR', -- 'ESTANDAR' | 'BULTO' | 'CANTIDAD'
  ADD COLUMN IF NOT EXISTS producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cantidad_estimada INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cantidad_bultos INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_total_usd NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_lotes_producto_id ON lotes(producto_id);
