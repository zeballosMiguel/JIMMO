-- JIMMO V4.1 - validación estructural
-- Ejecutar después de aplicar Jimmo_V4_1.sql en PostgreSQL/Supabase.
-- No crea ni modifica datos.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='detalle_pedido' AND column_name='activo'
  ) THEN RAISE EXCEPTION 'FALLO: detalle_pedido.activo'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='asignaciones_lote_pedido' AND column_name='activa'
  ) THEN RAISE EXCEPTION 'FALLO: asignaciones_lote_pedido.activa'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='uq_asignacion_fifo_activa'
  ) THEN RAISE EXCEPTION 'FALLO: índice FIFO parcial'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema='public' AND table_name='reservas'
      AND constraint_type='UNIQUE'
      AND constraint_name IN (
        SELECT constraint_name FROM information_schema.key_column_usage
        WHERE table_schema='public' AND table_name='reservas' AND column_name='pedido_id'
      )
  ) THEN RAISE EXCEPTION 'FALLO: reservas.pedido_id UNIQUE'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace='public'::regnamespace AND proname='editar_pedido'
  ) THEN RAISE EXCEPTION 'FALLO: editar_pedido'; END IF;

  -- Verificación de existencia de funciones sensibles mediante consulta posterior.
END $$;

-- SECURITY DEFINER: todas las funciones sensibles deben fijar search_path.
SELECT p.proname, p.prosecdef,
       pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_functiondef(p.oid) LIKE '%SET search_path = public%' AS search_path_ok
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN (
    'crear_pedido','completar_pedido','cancelar_pedido','registrar_pago',
    'editar_pedido','recibir_lote','reservar_stock','liberar_stock_reservado',
    'asignar_fifo_detalle','generar_reparto_utilidad',
    'costo_unitario_lote_fifo','verificar_invariantes_inventario'
  )
ORDER BY p.proname;

-- RLS debe estar activo en las tablas sensibles.
SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public'
  AND c.relname IN ('pedidos','detalle_pedido','pagos','reservas',
                    'asignaciones_lote_pedido','entregas','transportes');
