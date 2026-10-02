-- ============================================================
-- MIGRACIÓN: Asegurar existencia de columnas 'activo' / 'activa'
-- ============================================================

-- 1. detalle_pedido (necesario para histórico de ediciones en V4.1)
ALTER TABLE detalle_pedido
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_detalle_pedido_activo
    ON detalle_pedido (pedido_id, activo);

-- 2. asignaciones_lote_pedido (necesario para histórico FIFO en V4.1)
ALTER TABLE asignaciones_lote_pedido
    ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. reservas
ALTER TABLE reservas
    ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. tipos_entrega
ALTER TABLE tipos_entrega
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- 5. canales_venta
ALTER TABLE canales_venta
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- 6. sucursales
ALTER TABLE sucursales
    ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;

-- 7. vendedores
ALTER TABLE vendedores
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- 8. transportes
ALTER TABLE transportes
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- 9. inversionistas
ALTER TABLE inversionistas
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- 10. productos y variantes
ALTER TABLE productos
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE variantes_producto
    ADD COLUMN IF NOT EXISTS activa BOOLEAN NOT NULL DEFAULT TRUE;
