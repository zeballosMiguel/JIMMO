-- Migración: agregar inversionista_id a la tabla lotes
-- Permite asociar un inversionista (socio) a cada pedido/lote de inventario.

ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS inversionista_id UUID
    REFERENCES inversionistas(id)
    ON DELETE SET NULL;

ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS gastos_extras_bs NUMERIC(14,2) DEFAULT 0;

-- Índice para acelerar las consultas por inversionista
CREATE INDEX IF NOT EXISTS idx_lotes_inversionista_id
  ON lotes(inversionista_id);
