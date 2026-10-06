import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { EntregaEliminarButton } from "@/features/entregas/components/entrega-eliminar-button";
import { EstadoEntregaSelect } from "@/features/entregas/estado-entrega-select";
import { Truck, MapPin, CheckCircle2, Clock, Calendar } from "lucide-react";
import { RefreshButton } from "@/components/ui/refresh-button";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Entregas y Despachos</h1>
            <RefreshButton />
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Control logístico de envíos y paquetes a clientes.
          </p>
        </div>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="px-5 py-5 rounded-xl border-2 border-border bg-card shadow-2xs hover:border-amber-400/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pendientes por Entregar
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-4xl font-extrabold tracking-tight text-amber-700 dark:text-amber-400">
              {totalPendientes}
            </p>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {totalPendientes === 1 ? "despacho" : "despachos"}
            </span>
          </div>
        </div>

        <div className="px-5 py-5 rounded-xl border-2 border-border bg-card shadow-2xs hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Entregados / Dejados
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-4xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
              {totalEntregados}
            </p>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {totalEntregados === 1 ? "entrega" : "entregas"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla de Entregas */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nro. Pedido</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Destino / Transporte</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha Programada</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!entregas?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <Truck className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-medium text-foreground">No hay entregas o despachos registrados.</p>
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
                  <TableRow key={e.id} className="hover:bg-muted/20 transition-colors">
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
