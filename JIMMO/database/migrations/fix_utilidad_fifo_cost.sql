-- ============================================================
-- MIGRACIÓN: Corregir duplicidad de costos extras y Crear Vista de Rentabilidad por Lote
-- Fecha: 2026-10-02
-- ============================================================

-- 1. Actualizar la función FIFO quitando la duplicidad de otros_costos_bs
CREATE OR REPLACE FUNCTION costo_unitario_lote_fifo(
    p_detalle_lote_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT ROUND(
        COALESCE(dl.costo_unitario_bs, 0)
        + COALESCE((
            SELECT SUM(cl.monto_bs)
            FROM costos_lote cl
            WHERE cl.lote_id = dl.lote_id
        ), 0) / NULLIF((
            SELECT SUM(dl2.cantidad)
            FROM detalle_lote dl2
            WHERE dl2.lote_id = dl.lote_id
        ), 0),
        2
    )
    FROM detalle_lote dl
    WHERE dl.id = p_detalle_lote_id;
$$;

-- 2. Recalcular las asignaciones FIFO existentes
UPDATE asignaciones_lote_pedido alp
SET costo_unitario_bs = costo_unitario_lote_fifo(alp.detalle_lote_id)
WHERE alp.activa = TRUE;

-- 3. Recalcular costo_unitario en detalle_pedido
UPDATE detalle_pedido dp
SET costo_unitario = x.costo_promedio
FROM (
    SELECT
        detalle_pedido_id,
        ROUND(SUM(cantidad * costo_unitario_bs) / NULLIF(SUM(cantidad), 0), 2) AS costo_promedio
    FROM asignaciones_lote_pedido
    WHERE activa = TRUE
    GROUP BY detalle_pedido_id
) x
WHERE dp.id = x.detalle_pedido_id;

-- 4. Eliminar vista previa para permitir cambiar la estructura de columnas
DROP VIEW IF EXISTS vw_rentabilidad_lote CASCADE;

-- 5. Crear la vista enriquecida de Rentabilidad por Lote
CREATE OR REPLACE VIEW vw_rentabilidad_lote AS
WITH lotes_base AS (
    SELECT
        l.id AS lote_id,
        l.numero_lote,
        l.estado,
        l.fecha_compra,
        l.fecha_recepcion,
        l.costo_total_usd,
        l.tipo_cambio,
        l.gastos_extras_bs,
        COALESCE(SUM(dl.cantidad), 0) AS unidades_compradas,
        COALESCE(SUM(dl.cantidad_disponible), 0) AS unidades_disponibles,
        COALESCE(SUM(dl.cantidad * dl.costo_unitario_bs), 0) AS costo_mercaderia_bs,
        COALESCE((
            SELECT SUM(cl.monto_bs)
            FROM costos_lote cl
            WHERE cl.lote_id = l.id
        ), 0) AS costos_adicionales_bs
    FROM lotes l
    LEFT JOIN detalle_lote dl ON dl.lote_id = l.id
    GROUP BY l.id, l.numero_lote, l.estado, l.fecha_compra, l.fecha_recepcion, l.costo_total_usd, l.tipo_cambio, l.gastos_extras_bs
),
ventas_lote AS (
    SELECT
        dl.lote_id,
        COALESCE(SUM(alp.cantidad), 0) AS unidades_vendidas,
        COALESCE(SUM(alp.cantidad * dp.precio_unitario), 0) AS ventas_totales_bs,
        COALESCE(SUM(alp.cantidad * alp.costo_unitario_bs), 0) AS costo_ventas_bs
    FROM asignaciones_lote_pedido alp
    JOIN detalle_lote dl ON dl.id = alp.detalle_lote_id
    JOIN detalle_pedido dp ON dp.id = alp.detalle_pedido_id
    JOIN pedidos p ON p.id = dp.pedido_id
    WHERE alp.activa = TRUE
      AND p.estado = 'COMPLETADO'
    GROUP BY dl.lote_id
)
SELECT
    lb.lote_id,
    lb.numero_lote,
    lb.estado,
    lb.fecha_compra,
    lb.fecha_recepcion,
    lb.unidades_compradas,
    lb.unidades_disponibles,
    COALESCE(vl.unidades_vendidas, 0) AS unidades_vendidas,
    (lb.costo_mercaderia_bs + lb.costos_adicionales_bs) AS costo_total_inversion,
    COALESCE(vl.ventas_totales_bs, 0) AS ventas_totales,
    COALESCE(vl.costo_ventas_bs, 0) AS costo_ventas,
    (COALESCE(vl.ventas_totales_bs, 0) - COALESCE(vl.costo_ventas_bs, 0)) AS utilidad_real,
    CASE 
        WHEN lb.unidades_compradas > 0 
        THEN ROUND((COALESCE(vl.unidades_vendidas, 0)::numeric / lb.unidades_compradas::numeric) * 100, 2)
        ELSE 0 
    END AS porcentaje_vendido,
    CASE 
        WHEN (lb.costo_mercaderia_bs + lb.costos_adicionales_bs) > 0 
        THEN ROUND(((COALESCE(vl.ventas_totales_bs, 0) - COALESCE(vl.costo_ventas_bs, 0)) / (lb.costo_mercaderia_bs + lb.costos_adicionales_bs)) * 100, 2)
        ELSE 0 
    END AS roi_porcentaje
FROM lotes_base lb
LEFT JOIN ventas_lote vl ON vl.lote_id = lb.lote_id;
