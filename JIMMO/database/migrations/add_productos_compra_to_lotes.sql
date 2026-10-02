-- ============================================================
-- MIGRACIÓN: Guardar lista de productos esperados en compras por lote
-- ============================================================

-- Agrega la columna productos_compra (JSONB) para almacenar los productos
-- que componen la compra antes de ser desglosados en colores/tallas físicos.
ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS productos_compra JSONB DEFAULT '[]'::jsonb;

-- Comentario explicativo en la tabla
COMMENT ON COLUMN lotes.productos_compra IS 'Lista de productos comprados en el lote con cantidad y costo estimado antes del desglose físico de variantes';
