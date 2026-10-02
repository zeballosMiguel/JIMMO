import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Reporte: Utilidad por Vendedor" };

export default async function ReporteUtilidadVendedorPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: reporte } = await supabase
    .from("vw_utilidad_vendedor")
    .select("*")
    .order("utilidad", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Utilidad por Vendedor</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Ganancia total generada por cada vendedor a través de sus ventas.
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Pedidos Completados</TableHead>
              <TableHead className="text-right">Monto en Ventas</TableHead>
              <TableHead className="text-right">Utilidad Total Generada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!reporte?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay datos de ventas para mostrar.
                </TableCell>
              </TableRow>
            ) : (
              reporte.map((r) => (
                <TableRow key={r.vendedor_id}>
                  <TableCell className="font-medium">{r.vendedor}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.pedidos_completados}</TableCell>
                  <TableCell className="text-right tabular-nums font-mono">
                    Bs {Number(r.ventas).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-red-600 font-mono">
                    Bs {Number(r.utilidad).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
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
