import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EntregaEliminarButton } from "@/features/entregas/components/entrega-eliminar-button";
import { EstadoEntregaSelect } from "@/features/entregas/estado-entrega-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, MapPin, CheckCircle2, Clock, Calendar } from "lucide-react";

export const metadata = { title: "Entregas" };

export default async function EntregasPage() {
  const supabase = await createClient();
  const { data: entregas } = await supabase
    .from("entregas")
    .select(`
      *,
      pedidos (
        numero,
        cliente_id,
        lugar_entrega,
        lugar_envio,
        notas,
        clientes (nombre, telefono)
      ),
      transportes (nombre)
    `)
    .order("fecha_programada", { ascending: false });

  const totalPendientes = (entregas || []).filter((e) => e.estado !== "ENTREGADO").length;
  const totalEntregados = (entregas || []).filter((e) => e.estado === "ENTREGADO").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entregas y Despachos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control logístico de envíos y paquetes a clientes.
          </p>
        </div>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-card border border-border/80 shadow-xs">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Pendientes por Entregar
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-amber-600 tabular-nums">
              {totalPendientes} {totalPendientes === 1 ? "despacho" : "despachos"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/80 shadow-xs">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Entregados / Dejados
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-600 tabular-nums">
              {totalEntregados} {totalEntregados === 1 ? "entrega" : "entregas"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Entregas */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nro. Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Destino / Transporte</TableHead>
              <TableHead>Fecha Programada</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!entregas?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No hay entregas o despachos registrados.
                </TableCell>
              </TableRow>
            ) : (
              entregas.map((e) => {
                const pedido = e.pedidos as any;
                const transporte = e.transportes as { nombre: string } | null;
                const clienteNombre = pedido?.clientes?.nombre || "Cliente Ocasional";
                const destinoInfo =
                  transporte?.nombre ||
                  pedido?.lugar_envio ||
                  pedido?.lugar_entrega ||
                  e.notas ||
                  "—";

                return (
                  <TableRow key={e.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono font-bold text-xs">
                      {pedido ? (
                        <Link
                          href={`/pedidos/${e.pedido_id}`}
                          className="hover:underline text-primary"
                        >
                          #{pedido.numero}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-xs text-foreground block">
                        {clienteNombre}
                      </span>
                      {pedido?.clientes?.telefono && (
                        <span className="text-[11px] text-muted-foreground">
                          Tel: {pedido.clientes.telefono}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground">{destinoInfo}</span>
                      </div>
                      {e.notas && e.notas !== destinoInfo && (
                        <span className="text-[11px] text-muted-foreground block line-clamp-1 mt-0.5">
                          {e.notas}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.fecha_programada ? (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {new Date(e.fecha_programada + "T00:00:00").toLocaleDateString("es-BO")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <EstadoEntregaSelect entregaId={e.id} estadoActual={e.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {pedido && (
                          <Link
                            href={`/pedidos/${e.pedido_id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            Ver Pedido
                          </Link>
                        )}
                        <EntregaEliminarButton id={e.id} />
                      </div>
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
