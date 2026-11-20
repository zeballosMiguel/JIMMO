-- ============================================================
-- Migración: Agregar soporte de notas y devoluciones a vw_pedidos
-- Fecha: 2026-11-14
-- Descripción: Expone el campo 'notas' y una columna booleana 'tiene_devolucion'
--              en la vista vw_pedidos para permitir filtrado y badges directos.
-- ============================================================

CREATE OR REPLACE VIEW vw_pedidos AS
SELECT
    p.id,
    p.numero,
    p.estado,
    p.total,
    COALESCE(
        (
            SELECT SUM(pg.monto)
            FROM pagos pg
            WHERE pg.pedido_id = p.id
              AND pg.estado = 'PAGADO'
        ),
        0
    ) AS total_pagado,
    GREATEST(
        p.total
        -
        COALESCE(
            (
                SELECT SUM(pg.monto)
                FROM pagos pg
                WHERE pg.pedido_id = p.id
                  AND pg.estado = 'PAGADO'
            ),
            0
        ),
        0
    ) AS saldo,
    c.nombre AS cliente,
    v.nombre AS vendedor,
    s.nombre AS sucursal,
    cv.nombre AS canal,
    te.nombre AS tipo_entrega,
    p.notas,
    EXISTS (
        SELECT 1 FROM devoluciones d WHERE d.pedido_id = p.id
    ) AS tiene_devolucion,
    p.created_at
FROM pedidos p
LEFT JOIN clientes c
    ON c.id = p.cliente_id
LEFT JOIN vendedores v
    ON v.id = p.vendedor_id
LEFT JOIN sucursales s
    ON s.id = p.sucursal_id
LEFT JOIN canales_venta cv
    ON cv.id = p.canal_id
LEFT JOIN tipos_entrega te
    ON te.id = p.tipo_entrega_id;

