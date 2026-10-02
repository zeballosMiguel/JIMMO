-- ============================================================
-- FIX: Políticas RLS para 'entregas' (Idempotente)
-- Si ya existe alguna política, la elimina y la recrea limpiamente.
-- Ejecutar TODO este bloque en el SQL Editor de Supabase.
-- ============================================================

DROP POLICY IF EXISTS "authenticated_insert_entregas" ON entregas;
DROP POLICY IF EXISTS "authenticated_update_entregas" ON entregas;
DROP POLICY IF EXISTS "authenticated_delete_entregas" ON entregas;

-- INSERT: El vendedor dueño del pedido o un admin puede crear entregas
CREATE POLICY "authenticated_insert_entregas"
ON entregas FOR INSERT TO authenticated
WITH CHECK (
  es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = entregas.pedido_id
      AND p.vendedor_id = vendedor_actual()
  )
);

-- UPDATE: El vendedor dueño del pedido o un admin puede actualizar entregas
CREATE POLICY "authenticated_update_entregas"
ON entregas FOR UPDATE TO authenticated
USING (
  es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = entregas.pedido_id
      AND p.vendedor_id = vendedor_actual()
  )
)
WITH CHECK (
  es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = entregas.pedido_id
      AND p.vendedor_id = vendedor_actual()
  )
);

-- DELETE: El vendedor dueño del pedido o un admin puede eliminar entregas
CREATE POLICY "authenticated_delete_entregas"
ON entregas FOR DELETE TO authenticated
USING (
  es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p
    WHERE p.id = entregas.pedido_id
      AND p.vendedor_id = vendedor_actual()
  )
);
