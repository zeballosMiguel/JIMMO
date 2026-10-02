import { createClient } from "@/lib/supabase/server";
import { LotesListView } from "@/features/inventario/components/lotes-list-view";

export const metadata = { title: "Lotes de Inventario y Compras" };

export default async function LotesPage() {
  const supabase = await createClient();

  const [{ data: lotesData }, { data: inversionistas }] = await Promise.all([
    supabase
      .from("lotes")
      .select("*, detalle_lote(count), productos(nombre, codigo_interno), inversionistas(id, nombre)")
      .order("numero_lote", { ascending: false }),
    supabase
      .from("inversionistas")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre"),
  ]);

  let lotes: any[] = lotesData ?? [];

  // Fallback si falla alguna relación en Supabase
  if (!lotesData) {
    const { data: simpleLotes } = await supabase
      .from("lotes")
      .select("*, detalle_lote(count)")
      .order("created_at", { ascending: false });
    lotes = simpleLotes ?? [];
  }

  return (
    <LotesListView
      lotes={lotes}
      inversionistas={inversionistas ?? []}
    />
  );
}
