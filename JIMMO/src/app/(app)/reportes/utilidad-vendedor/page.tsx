import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { ReportePeriodoSelect } from "@/features/reportes/components/reporte-periodo-select";
import { getRangoPeriodo, type PeriodoFinanciero } from "@/features/reportes/lib/date-utils";

export const metadata = { title: "Reporte: Utilidad por Vendedor" };

interface Props {
  searchParams: Promise<{
    periodo?: PeriodoFinanciero;
    desde?: string;
    hasta?: string;
  }>;
}

export default async function ReporteUtilidadVendedorPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const { desde, hasta, sublabel } = getRangoPeriodo(sp.periodo, sp.desde, sp.hasta);
  const supabase = await createClient();

  // Obtener todos los vendedores para listarlos aun sin ventas en el periodo
  const { data: vendedoresRaw } = await supabase
    .from("vendedores")
    .select("id, nombre, comision_porcentaje, activo")
    .eq("activo", true);

  let query = supabase
    .from("detalle_pedido")
    .select(`
      id,
      subtotal,
      utilidad,
      pedidos!inner (
        id,
        estado,
        created_at,
        vendedor_id,
        vendedores (id, nombre, comision_porcentaje)
      )
    `)
    .eq("activo", true)
    .eq("pedidos.estado", "COMPLETADO");

  if (desde) query = query.gte("pedidos.created_at", desde);
  if (hasta) query = query.lte("pedidos.created_at", hasta);

  const { data: rawItems, error } = await query;
  if (error) {
    console.error("Error al cargar utilidad de vendedores:", error);
  }
  const items = rawItems ?? [];
  const vendedoresList = vendedoresRaw ?? [];

  const mapVendedores = new Map<string, {
    vendedor_id: string;
    vendedor: string;
    comision_porcentaje: number;
    pedidosSet: Set<string>;
    ventas: number;
    utilidad: number;
  }>();

  for (const v of vendedoresList) {
    mapVendedores.set(v.id, {
      vendedor_id: v.id,
      vendedor: v.nombre,
      comision_porcentaje: Number(v.comision_porcentaje || 0),
      pedidosSet: new Set(),
      ventas: 0,
      utilidad: 0,
    });
  }

  for (const item of items) {
    const ped = (item as any).pedidos;
    if (!ped || !ped.vendedor_id) continue;

    const vId = ped.vendedor_id;
    const vNombre = ped.vendedores?.nombre || "Vendedor";
    const vComision = Number(ped.vendedores?.comision_porcentaje || 0);

    const prev = mapVendedores.get(vId) ?? {
      vendedor_id: vId,
      vendedor: vNombre,
      comision_porcentaje: vComision,
      pedidosSet: new Set(),
      ventas: 0,
      utilidad: 0,
    };

    prev.pedidosSet.add(ped.id);
    prev.ventas += Number(item.subtotal || 0);
    prev.utilidad += Number(item.utilidad || 0);
    mapVendedores.set(vId, prev);
  }

  const reporte = Array.from(mapVendedores.values())
    .map((v) => ({
      vendedor_id: v.vendedor_id,
      vendedor: v.vendedor,
      comision_porcentaje: v.comision_porcentaje,
      pedidos_completados: v.pedidosSet.size,
      ventas: v.ventas,
      utilidad: v.utilidad,
    }))
    .sort((a, b) => b.utilidad - a.utilidad);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">Utilidad por Vendedor</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Ganancia total generada por cada vendedor a través de sus ventas {sublabel ? `(${sublabel})` : ""}.
          </p>
        </div>
        <ReportePeriodoSelect />
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-bold text-xs uppercase">Vendedor</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase">Pedidos Completados</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase">Monto en Ventas</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase">Utilidad Total Generada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!reporte.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10 text-xs">
                  No hay ventas registradas en el período seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              reporte.map((r) => (
                <TableRow key={r.vendedor_id}>
                  <TableCell className="font-medium text-xs">{r.vendedor}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">{r.pedidos_completados}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-mono">
                    Bs {r.ventas.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs font-bold text-red-600 font-mono">
                    Bs {r.utilidad.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
