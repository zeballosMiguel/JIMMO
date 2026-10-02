import { createClient } from "@/lib/supabase/server";
import { CrearLoteForm } from "@/features/inventario/components/crear-lote-form";

export const metadata = { title: "Nuevo Lote de Inventario" };

export default async function NuevoLotePage() {
  const supabase = await createClient();

  const [
    { data: inversionistas },
    { data: productos },
    { data: categorias },
  ] = await Promise.all([
    supabase
      .from("inversionistas")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("productos")
      .select("id, nombre, codigo_interno, descripcion, categoria_id, categorias(id, nombre)")
      .eq("activo", true)
      .order("nombre"),
    supabase
      .from("categorias")
      .select("id, nombre")
      .order("nombre"),
  ]);

  return (
    <CrearLoteForm
      inversionistas={inversionistas ?? []}
      productos={(productos ?? []) as any}
      categorias={categorias ?? []}
    />
  );
}

