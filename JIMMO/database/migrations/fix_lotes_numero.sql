-- ============================================================
-- MIGRACIÓN: Secuencia automática para numero_lote en tabla lotes
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS lotes_numero_lote_seq;

ALTER TABLE lotes ALTER COLUMN numero_lote SET DEFAULT nextval('lotes_numero_lote_seq');

SELECT setval('lotes_numero_lote_seq', COALESCE((SELECT MAX(numero_lote) FROM lotes), 0) + 1, false);
