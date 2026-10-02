import type { Database } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";

export type Perfil = Database["public"]["Tables"]["perfiles"]["Row"];

export async function getPerfil(): Promise<Perfil | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ?? null;
}

export async function requireAdmin() {
  const perfil = await getPerfil();
  if (!perfil || perfil.rol !== "admin") {
    throw new Error("Acceso denegado. Se requiere rol de administrador.");
  }
  return perfil;
}

export async function requireAuth() {
  const perfil = await getPerfil();
  if (!perfil) {
    throw new Error("Usuario no autenticado.");
  }
  return perfil;
}
