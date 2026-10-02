-- ============================================================
-- MIGRACIÓN: ESTANDARIZAR EXACTAMENTE LOS 3 TIPOS DE ENTREGA:
-- 1. En Tienda (no requiere datos)
-- 2. Envío (solicita flota / ciudad)
-- 3. Paquetería (solicita nombre o lugar de paquetería)
-- ============================================================

INSERT INTO tipos_entrega (nombre, descripcion, activo)
VALUES
    ('En Tienda', 'Retiro en tienda física (sin datos adicionales)', TRUE),
    ('Envío', 'Envío por flota / ciudad de destino', TRUE),
    ('Paquetería', 'Entrega en paquetería local para recojo del comprador', TRUE)
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion,
    activo = TRUE;

-- Desactivar otros nombres para mantener solo los 3 oficiales
UPDATE tipos_entrega
SET activo = FALSE
WHERE nombre NOT IN ('En Tienda', 'Envío', 'Paquetería');
