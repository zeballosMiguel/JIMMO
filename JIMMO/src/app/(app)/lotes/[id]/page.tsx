import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { LoteDetalleView } from "@/features/inventario/components/lote-detalle-view";

export const metadata = { title: "Detalle de Lote" };

export default async function LoteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; action?: string }>;
}) {
  const { id } = await params;
  const { tab, action } = await searchParams;
  const supabase = await createClient();

  // ─── Estrategia resiliente: intentar con todas las columnas, hacer fallback si alguna no existe ───
  // Columnas que SIEMPRE existen (schema base + migraciones ya aplicadas)
  const BASE_SELECT =
    "id, numero_lote, proveedor, fecha_compra, fecha_recepcion, tipo_cambio, estado, notas, inversionista_id, productos_compra, created_at, updated_at, inversionistas(id, nombre)";

  // Columnas opcionales (requieren migración add_bulto_fields_to_lotes.sql)
  const EXTRA_COLS = "tipo_compra, producto_id, cantidad_estimada, cantidad_bultos, costo_total_usd, gastos_extras_bs, productos(id, nombre, codigo_interno)";

  let lote: any = null;

  // Intento 1: con todas las columnas + joins de producto
  const { data: loteAll, error: errAll } = await supabase
    .from("lotes")
    .select(`${BASE_SELECT}, ${EXTRA_COLS}`)
    .eq("id", id)
    .maybeSingle();

  if (!errAll && loteAll) {
    lote = loteAll;
  } else {
    // Intento 2: solo columnas base (sin las de la migración pendiente)
    const { data: loteBase, error: errBase } = await supabase
      .from("lotes")
      .select(BASE_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (!errBase && loteBase) {
      lote = loteBase;
    } else {
      // Último fallback: select *
      const { data: simpleLote } = await supabase
        .from("lotes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      lote = simpleLote;
    }
  }

  if (!lote) notFound();

  const [
    { data: detalles },
    { data: variantes },
    { data: productos },
    { data: categorias },
    { data: inversionistas },
  ] = await Promise.all([
    supabase
      .from("detalle_lote")
      .select(
        "id, lote_id, variante_id, cantidad, cantidad_disponible, costo_unitario_bs, costo_unitario_usd, otros_costos_bs, variantes_producto(id, color, talla, sku, productos(id, nombre, codigo_interno))"
      )
      .eq("lote_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("variantes_producto")
      .select(
        "id, sku, color, talla, producto_id, stock_actual, stock_disponible, productos(id, nombre, codigo_interno)"
      )
      .eq("activa", true),
    supabase
      .from("productos")
      .select("id, nombre, codigo_interno, descripcion, categoria_id, categorias(id, nombre)")
      .eq("activo", true)
      .order("nombre"),
    supabase.from("categorias").select("id, nombre").order("nombre"),
    supabase
      .from("inversionistas")
      .select("id, nombre")
      .eq("activo", true)
      .order("nombre"),
  ]);

  return (
    <LoteDetalleView
      lote={lote}
      detalles={detalles ?? []}
      variantes={(variantes ?? []) as any}
      productos={(productos ?? []) as any}
      categorias={categorias ?? []}
      inversionistas={inversionistas ?? []}
      initialTab={tab}
      initialAction={action}
    />
  );
}
