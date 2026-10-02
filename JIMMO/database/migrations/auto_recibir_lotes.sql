-- ============================================================
-- MIGRACIÓN: RECEPCIÓN AUTOMÁTICA DE LOTES AL CUMPLIRSE LA FECHA
-- ============================================================

-- 1. Función para auto-recibir lotes cuya fecha_recepcion ya llegó
CREATE OR REPLACE FUNCTION auto_recibir_lotes_vencidos()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lote RECORD;
    v_count INTEGER := 0;
    r RECORD;
BEGIN
    FOR v_lote IN
        SELECT id, fecha_recepcion, numero_lote
        FROM lotes
        WHERE estado IN ('PENDIENTE', 'EN_TRANSITO')
          AND fecha_recepcion IS NOT NULL
          AND fecha_recepcion <= CURRENT_DATE
          -- Solo recibir si el lote tiene al menos un producto cargado
          AND EXISTS (SELECT 1 FROM detalle_lote dl WHERE dl.lote_id = lotes.id)
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Procesar cada item del lote e ingresar a inventario
        FOR r IN
            SELECT id, variante_id, cantidad
            FROM detalle_lote
            WHERE lote_id = v_lote.id
            FOR UPDATE
        LOOP
            -- Habilitar disponibilidad en el lote
            UPDATE detalle_lote
            SET cantidad_disponible = cantidad_disponible + r.cantidad
            WHERE id = r.id;

            -- Sumar al stock físico actual de la prenda
            UPDATE variantes_producto
            SET stock_actual = stock_actual + r.cantidad
            WHERE id = r.variante_id;

            -- Registrar movimiento de kardex
            INSERT INTO movimientos_inventario (
                variante_id,
                lote_id,
                tipo,
                cantidad,
                motivo,
                usuario_id
            )
            VALUES (
                r.variante_id,
                v_lote.id,
                'ENTRADA_COMPRA',
                'Recepción automática al llegar la fecha (' || v_lote.fecha_recepcion::TEXT || ')',
                NULL
            );
        END LOOP;

        -- Actualizar estado del lote a RECIBIDO
        UPDATE lotes
        SET estado = 'RECIBIDO',
            fecha_recepcion = COALESCE(fecha_recepcion, CURRENT_DATE)
        WHERE id = v_lote.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- Permisos de ejecución
GRANT EXECUTE ON FUNCTION auto_recibir_lotes_vencidos() TO authenticated, anon;

-- 2. Programar cron job en Supabase si la extensión pg_cron está activa
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Eliminar job previo si existe
        PERFORM cron.unschedule('auto-recibir-lotes-diario');
        -- Programar ejecución todos los días a medianoche (00:05 UTC)
        PERFORM cron.schedule(
            'auto-recibir-lotes-diario',
            '5 0 * * *',
            'SELECT auto_recibir_lotes_vencidos();'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
