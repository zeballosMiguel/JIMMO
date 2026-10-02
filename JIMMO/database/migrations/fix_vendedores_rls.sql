-- ============================================================
-- MIGRACIÓN: Políticas RLS para Administración de Vendedores, Canales y Tipos de Entrega
-- ============================================================

-- 1. Política para permitir a los administradores crear/editar/eliminar vendedores
DROP POLICY IF EXISTS "admin_all_vendedores" ON vendedores;
CREATE POLICY "admin_all_vendedores"
ON vendedores
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

-- 2. Política para permitir a los administradores crear/editar/eliminar canales de venta
DROP POLICY IF EXISTS "admin_all_canales" ON canales_venta;
CREATE POLICY "admin_all_canales"
ON canales_venta
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

-- 3. Política para permitir a los administradores crear/editar/eliminar tipos de entrega
DROP POLICY IF EXISTS "admin_all_tipos_entrega" ON tipos_entrega;
CREATE POLICY "admin_all_tipos_entrega"
ON tipos_entrega
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());
