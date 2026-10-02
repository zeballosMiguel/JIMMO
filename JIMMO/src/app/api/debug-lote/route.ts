import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: lotes, error: errLotes } = await supabase
    .from("lotes")
    .select("*, detalle_lote(*)")
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: productos, error: errProd } = await supabase
    .from("productos")
    .select("id, nombre, codigo_interno")
    .limit(5);

  return NextResponse.json({
    lotes,
    errLotes,
    productos,
    errProd,
  });
}
