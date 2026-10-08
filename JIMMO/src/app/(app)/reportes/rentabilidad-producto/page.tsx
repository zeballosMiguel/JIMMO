import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { ReportePeriodoSelect } from "@/features/reportes/components/reporte-periodo-select";
import { getRangoPeriodo, type PeriodoFinanciero } from "@/features/reportes/lib/date-utils";

export const metadata = { title: "Reporte: Rentabilidad por Producto" };

interface Props {
  searchParams: Promise<{
    periodo?: PeriodoFinanciero;
    desde?: string;
    hasta?: string;
  }>;
}

export default async function ReporteRentabilidadProductoPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const { desde, hasta, sublabel } = getRangoPeriodo(sp.periodo, sp.desde, sp.hasta);
  const supabase = await createClient();

  let query = supabase
    .from("detalle_pedido")
    .select(`
      id,
      subtotal,
      costo_total,
      utilidad,
      cantidad,
      variante_id,
      variantes_producto (
        producto_id,
        productos (
          id,
          nombre,
          categorias (nombre)
        )
      ),
      pedidos!inner (
        id,
        estado,
        created_at
      )
    `)
    .eq("activo", true)
    .eq("pedidos.estado", "COMPLETADO");

  if (desde) query = query.gte("pedidos.created_at", desde);
  if (hasta) query = query.lte("pedidos.created_at", hasta);

  const { data: rawItems, error } = await query;
  if (error) {
    console.error("Error al cargar rentabilidad de productos:", error);
  }
  const items = rawItems ?? [];

  // Agrupar por producto
  const mapProductos = new Map<string, {
    producto_id: string;
    producto: string;
    categoria: string;
    unidades_vendidas: number;
    ventas: number;
    costo: number;
    utilidad: number;
  }>();

  for (const item of items) {
    const prodObj = (item as any).variantes_producto?.productos;
    if (!prodObj) continue;

    const prodId = prodObj.id;
    const prodNombre = prodObj.nombre || "Producto sin nombre";
    const catNombre = prodObj.categorias?.nombre || "Sin categoría";

    const prev = mapProductos.get(prodId) ?? {
      producto_id: prodId,
      producto: prodNombre,
      categoria: catNombre,
      unidades_vendidas: 0,
      ventas: 0,
      costo: 0,
      utilidad: 0,
    };

    prev.unidades_vendidas += Number(item.cantidad || 0);
    prev.ventas += Number(item.subtotal || 0);
    prev.costo += Number(item.costo_total || 0);
    prev.utilidad += Number(item.utilidad || 0);
    mapProductos.set(prodId, prev);
  }

  const reporte = Array.from(mapProductos.values()).sort((a, b) => b.utilidad - a.utilidad);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">Rentabilidad por Producto</h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Utilidad y margen por cada producto {sublabel ? `(${sublabel})` : ""}.
          </p>
        </div>
        <ReportePeriodoSelect />
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-bold text-xs uppercase">Producto</TableHead>
              <TableHead className="font-bold text-xs uppercase">Categoría</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase">Unid. Vendidas</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase">Ventas Totales</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase">Costo Total</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase">Utilidad Neta</TableHead>
              <TableHead className="text-right font-bold text-xs uppercase">Margen (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!reporte.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10 text-xs">
                  No hay ventas registradas en el período seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              reporte.map((r) => {
                const margen = r.ventas > 0 ? (r.utilidad / r.ventas) * 100 : 0;
                
                return (
                  <TableRow key={r.producto_id}>
                    <TableCell className="font-medium text-xs">{r.producto}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.categoria}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{r.unidades_vendidas}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-mono">
                      Bs {r.ventas.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground font-mono">
                      Bs {r.costo.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-bold text-red-600 font-mono">
                      Bs {r.utilidad.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs font-semibold">
                      {margen.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
