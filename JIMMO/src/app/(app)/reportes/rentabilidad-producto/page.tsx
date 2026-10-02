import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Reporte: Rentabilidad por Producto" };

export default async function ReporteRentabilidadProductoPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: reporte } = await supabase
    .from("vw_rentabilidad_producto")
    .select("*")
    .order("utilidad", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rentabilidad por Producto</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Utilidad y margen por cada producto (solo pedidos completados).
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Unid. Vendidas</TableHead>
              <TableHead className="text-right">Ventas Totales</TableHead>
              <TableHead className="text-right">Costo Total</TableHead>
              <TableHead className="text-right">Utilidad Neta</TableHead>
              <TableHead className="text-right">Margen (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!reporte?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay datos suficientes para mostrar la rentabilidad.
                </TableCell>
              </TableRow>
            ) : (
              reporte.map((r) => {
                const ventas = Number(r.ventas);
                const utilidad = Number(r.utilidad);
                const margen = ventas > 0 ? (utilidad / ventas) * 100 : 0;
                
                return (
                  <TableRow key={r.producto_id}>
                    <TableCell className="font-medium">{r.producto}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.unidades_vendidas}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      Bs {ventas.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      Bs {Number(r.costo).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-primary">
                      Bs {utilidad.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
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
