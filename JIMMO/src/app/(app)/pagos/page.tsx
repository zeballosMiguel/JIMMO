import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Wallet, QrCode, DollarSign, CreditCard } from "lucide-react";
import { RefreshButton } from "@/components/ui/refresh-button";

export const metadata = { title: "Pagos y Transacciones" };

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDIENTE: "secondary",
  PAGADO: "default",
  ANULADO: "destructive",
};

export default async function PagosPage() {
  const supabase = await createClient();

  const { data: pagos } = await supabase
    .from("pagos")
    .select(`
      *,
      pedidos (
        numero,
        cliente_id,
        clientes (
          nombre
        )
      )
    `)
    .order("fecha_pago", { ascending: false });

  const totalRecaudado = (pagos || [])
    .filter((p) => p.estado === "PAGADO")
    .reduce((acc, p) => acc + Number(p.monto || 0), 0);

  const pagosEnEfectivo = (pagos || [])
    .filter((p) => p.estado === "PAGADO" && p.metodo?.toUpperCase().includes("EFECTIVO"))
    .reduce((acc, p) => acc + Number(p.monto || 0), 0);

  const pagosEnQR = (pagos || [])
    .filter((p) => p.estado === "PAGADO" && (p.metodo?.toUpperCase().includes("QR") || p.metodo?.toUpperCase().includes("TRANSFERENCIA")))
    .reduce((acc, p) => acc + Number(p.monto || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Historial de Pagos</h1>
            <RefreshButton />
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {pagos?.length ?? 0} transacciones registradas en el sistema.
          </p>
        </div>
      </div>

      {/* Cards de Resumen Visual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="px-5 py-5 rounded-xl border-2 border-border bg-card shadow-2xs hover:border-emerald-400/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Recaudado
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
              Bs {totalRecaudado.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total de pagos confirmados</p>
          </div>
        </div>

        <div className="px-5 py-5 rounded-xl border-2 border-border bg-card shadow-2xs hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cobrado en Efectivo
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 dark:bg-zinc-800/80 dark:border-zinc-700/60 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
              Bs {pagosEnEfectivo.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ingresos en efectivo</p>
          </div>
        </div>

        <div className="px-5 py-5 rounded-xl border-2 border-border bg-card shadow-2xs hover:border-indigo-400/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cobrado por QR / Banco
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/20 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
              Bs {pagosEnQR.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Transferencias y pagos digitales</p>
          </div>
        </div>
      </div>

      {/* Tabla de Pagos */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha de Pago</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nro. Pedido</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Método de Pago</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Monto</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!pagos?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  <CreditCard className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-medium text-foreground">No hay transacciones ni pagos registrados aún.</p>
                </TableCell>
              </TableRow>
            ) : (
              pagos.map((p) => {
                const pedido = p.pedidos as any;
                const clienteNombre = pedido?.clientes?.nombre || "Cliente Ocasional";
                const esEfectivo = p.metodo?.toUpperCase().includes("EFECTIVO");

                return (
                  <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium text-foreground text-xs">
                      {new Date(p.fecha_pago).toLocaleDateString("es-VE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>

                    <TableCell className="font-mono font-bold text-xs text-primary">
                      {pedido ? `#${pedido.numero}` : "—"}
                    </TableCell>

                    <TableCell className="text-xs font-semibold text-foreground">
                      {clienteNombre}
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-xs font-semibold text-foreground border border-border/50">
                        {esEfectivo ? (
                          <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <QrCode className="w-3.5 h-3.5 text-indigo-500" />
                        )}
                        {p.metodo}
                      </span>
                    </TableCell>

                    <TableCell className="text-right tabular-nums font-black text-foreground text-sm">
                      Bs {Number(p.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>

                    <TableCell>
                      <Badge variant={estadoVariant[p.estado] ?? "secondary"} className="font-semibold text-[11px]">
                        {p.estado}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {p.pedido_id && (
                        <Link
                          href={`/pedidos/${p.pedido_id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          Ver Pedido
                        </Link>
                      )}
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
