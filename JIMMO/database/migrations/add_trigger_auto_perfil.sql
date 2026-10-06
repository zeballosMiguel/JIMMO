-- ============================================================
-- Trigger: auto-crear perfil al registrar un usuario nuevo
-- ============================================================
-- Cada vez que Supabase crea un usuario en auth.users,
-- esta función inserta automáticamente una fila en `perfiles`
-- usando el email como nombre provisional.
--
-- Si el perfil ya existe (ON CONFLICT DO NOTHING) no hace nada.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nombre_inicial TEXT;
BEGIN
  -- Intentamos sacar un nombre del metadata de Supabase Auth
  -- (lo rellenan proveedores OAuth como Google, GitHub, etc.)
  nombre_inicial := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    -- Si no hay metadata, tomamos la parte local del email (antes del @)
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.perfiles (id, email, nombre, rol, activo)
  VALUES (
    NEW.id,
    NEW.email,
    nombre_inicial,
    'vendedor',    -- rol por defecto; el admin puede cambiarlo luego
    TRUE
  )
  ON CONFLICT (id) DO NOTHING;  -- si ya existe el perfil, no hace nada

  RETURN NEW;
END;
$$;

-- Asociamos la función al evento de creación de usuario
CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
