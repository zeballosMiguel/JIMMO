import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, QrCode, CreditCard, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial de Pagos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pagos?.length ?? 0} transacciones registradas en el sistema.
          </p>
        </div>
      </div>

      {/* Cards de Resumen Visual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border border-border/80 shadow-xs">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Total Recaudado
            </CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-foreground tabular-nums">
              Bs {totalRecaudado.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/80 shadow-xs">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Cobrado en Efectivo
            </CardTitle>
            <Wallet className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-foreground tabular-nums">
              Bs {pagosEnEfectivo.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/80 shadow-xs">
          <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Cobrado por QR / Banco
            </CardTitle>
            <QrCode className="w-4 h-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-foreground tabular-nums">
              Bs {pagosEnQR.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Pagos */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha de Pago</TableHead>
              <TableHead>Nro. Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Método de Pago</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!pagos?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  No hay transacciones ni pagos registrados aún.
                </TableCell>
              </TableRow>
            ) : (
              pagos.map((p) => {
                const pedido = p.pedidos as any;
                const clienteNombre = pedido?.clientes?.nombre || "Cliente Ocasional";
                const esEfectivo = p.metodo?.toUpperCase().includes("EFECTIVO");

                return (
                  <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
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
