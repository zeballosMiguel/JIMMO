import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { TraspasoForm, type VarianteStockItem, type TraspasoHistorialItem } from "@/features/traspasos/components/traspaso-form";
import { ArrowRightLeft } from "lucide-react";

export const metadata = { title: "Traspasos de Stock" };

export default async function TraspasosPage() {
  const supabase = await createClient();
  const perfil = await getPerfil();

  if (!perfil || perfil.rol !== "admin") {
    redirect("/dashboard");
  }

  const [
    { data: sucursalesRaw },
    { data: stockSucursalRaw },
    { data: variantesRaw },
    { data: historialRaw },
  ] = await Promise.all([
    supabase.from("sucursales").select("id, nombre").eq("activa", true).order("created_at", { ascending: true }).order("nombre", { ascending: true }),
    (supabase as any).from("vw_stock_sucursal").select("variante_id, sucursal_id, sucursal_nombre, stock_disponible_sucursal"),
    supabase
      .from("variantes_producto")
      .select("id, sku, color, talla, producto_id, productos(nombre, codigo_interno)")
      .eq("activa", true)
      .order("sku"),
    (supabase as any)
      .from("traspasos_stock")
      .select(`
        id, cantidad, motivo, created_at,
        origen: origen_sucursal_id ( nombre ),
        destino: destino_sucursal_id ( nombre ),
        variante: variante_id ( sku, color, productos ( nombre ) )
      `)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const sucursales = (sucursalesRaw || []).map((s: any) => ({ id: s.id, nombre: s.nombre }));

  // Identificar UUIDs de EA (matriz) y LP (sucursal) por orden de creación
  const elAltoId = sucursales[0]?.id ?? "";
  const laPazId = sucursales[1]?.id ?? "";
  const eaNombre = sucursales[0]?.nombre ?? "EA";
  const lpNombre = sucursales[1]?.nombre ?? "LP";

  // Construir mapa de stock por variante y sucursal
  const stockMap = new Map<string, { ea: number; lp: number }>();
  for (const row of (stockSucursalRaw || []) as any[]) {
    const varId = row.variante_id;
    if (!stockMap.has(varId)) stockMap.set(varId, { ea: 0, lp: 0 });
    const entry = stockMap.get(varId)!;
    if (elAltoId && row.sucursal_id === elAltoId) {
      entry.ea += Number(row.stock_disponible_sucursal) || 0;
    } else if (laPazId && row.sucursal_id === laPazId) {
      entry.lp += Number(row.stock_disponible_sucursal) || 0;
    }
  }

  // Construir lista de variantes con stock
  const variantes: VarianteStockItem[] = (variantesRaw || [])
    .map((v: any) => {
      const stock = stockMap.get(v.id) ?? { ea: 0, lp: 0 };
      const prod = Array.isArray(v.productos) ? v.productos[0] : v.productos;
      return {
        variante_id: v.id,
        sku: v.sku ?? "SKU-S/N",
        nombre_producto: prod?.nombre ?? "Producto",
        color: v.color ?? "",
        talla: v.talla ?? null,
        stock_ea: stock.ea,
        stock_lp: stock.lp,
      };
    })
    .filter((v: VarianteStockItem) => v.stock_ea > 0 || v.stock_lp > 0);

  // Construir historial
  const historial: TraspasoHistorialItem[] = (historialRaw || []).map((h: any) => ({
    id: h.id,
    origen_sucursal_nombre: h.origen?.nombre ?? "—",
    destino_sucursal_nombre: h.destino?.nombre ?? "—",
    nombre_producto: h.variante?.productos?.nombre ?? null,
    variante_sku: h.variante?.sku ?? "—",
    variante_color: h.variante?.color ?? "—",
    cantidad: h.cantidad,
    motivo: h.motivo ?? null,
    created_at: h.created_at,
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Traspasos de Stock</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Mueve unidades entre{" "}
            <span className="font-medium">EA ({eaNombre})</span> y{" "}
            <span className="font-medium">LP ({lpNombre})</span>.
          </p>
        </div>
      </div>

      <TraspasoForm
        sucursales={sucursales}
        variantes={variantes}
        historial={historial}
        elAltoId={elAltoId}
        laPazId={laPazId}
      />
    </div>
  );
}
