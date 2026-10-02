-- ============================================================
-- MIGRACIÓN COMPLETA: Campos faltantes en tabla lotes
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================
-- Esta migración es SEGURA para re-ejecutar (usa IF NOT EXISTS)
-- ============================================================

-- 1. Columnas para compra por bulto / precio estimado
ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS tipo_compra       TEXT          DEFAULT 'ESTANDAR',
  ADD COLUMN IF NOT EXISTS producto_id       UUID          REFERENCES productos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cantidad_estimada INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cantidad_bultos   INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_total_usd   NUMERIC(14,2) DEFAULT 0;

-- 2. Gastos extras (flete, aduana, transporte)
ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS gastos_extras_bs NUMERIC(14,2) DEFAULT 0;

-- 3. Índice de búsqueda por producto
CREATE INDEX IF NOT EXISTS idx_lotes_producto_id ON lotes(producto_id);

-- 4. Verificación — muestra columnas de lotes tras la migración
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'lotes'
ORDER BY ordinal_position;
