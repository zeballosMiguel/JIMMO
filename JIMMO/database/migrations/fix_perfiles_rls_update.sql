-- ============================================================
-- Fix: Política RLS de UPDATE en tabla perfiles
-- ============================================================
-- La tabla perfiles tenía RLS habilitado pero solo una política
-- FOR SELECT. Eso causaba que los UPDATE desde server actions
-- fueran silenciosamente bloqueados (0 filas afectadas, sin error).
-- ============================================================

-- 1. Admin puede actualizar cualquier perfil
CREATE POLICY "admin_update_perfiles"
ON perfiles FOR UPDATE TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

-- 2. Cada usuario puede actualizar su propio perfil
CREATE POLICY "user_update_own_perfil"
ON perfiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Admin puede insertar perfiles (para crear usuarios manualmente)
CREATE POLICY "admin_insert_perfiles"
ON perfiles FOR INSERT TO authenticated
WITH CHECK (es_admin());
