import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { EditarClienteDialog } from "@/features/clientes/editar-cliente-dialog";
import Link from "next/link";
import { ArrowLeft, User, Phone, Mail, MapPin, Plus } from "lucide-react";

export const metadata = { title: "Detalle de Cliente" };

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cliente }, { data: pedidos }] = await Promise.all([
    supabase.from("clientes").select("*").eq("id", id).single(),
    supabase.from("vw_pedidos").select("*").eq("cliente_id", id).order("created_at", { ascending: false }),
  ]);

  if (!cliente) notFound();

  const totalComprado = (pedidos || []).reduce((acc, p) => acc + Number(p.total || 0), 0);
  const saldoTotal = (pedidos || []).reduce((acc, p) => acc + Number(p.saldo || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clientes" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{cliente.nombre}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Cliente desde {new Date(cliente.created_at).toLocaleDateString("es-BO")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditarClienteDialog cliente={cliente} />
          <Link href="/pedidos/nuevo" className={buttonVariants({ variant: "default" })}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Pedido
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Pedidos Realizados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold">{pedidos?.length ?? 0}</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-foreground">
              Bs {totalComprado.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Saldo Deudor</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-extrabold ${saldoTotal > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              Bs {saldoTotal.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info & Notes */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-foreground border-b border-border pb-2">Datos de Contacto</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="w-4 h-4 text-primary" />
            <span>Teléfono: <strong className="text-foreground">{cliente.telefono || "Sin registrar"}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="w-4 h-4 text-primary" />
            <span>Email: <strong className="text-foreground">{cliente.email || "Sin registrar"}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>Ciudad: <strong className="text-foreground">{cliente.ciudad || "Sin registrar"}</strong></span>
          </div>
        </div>
        {cliente.notas && (
          <div className="pt-2 border-t border-border mt-2">
            <span className="text-xs text-muted-foreground font-semibold block">Notas:</span>
            <p className="text-sm text-foreground italic mt-0.5">{cliente.notas}</p>
          </div>
        )}
      </div>

      {/* Historial de Pedidos */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground border-b border-border pb-2">Historial de Pedidos</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nro.</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!pedidos?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Este cliente aún no ha realizado ningún pedido.
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono font-semibold">#{p.numero}</TableCell>
                    <TableCell>{p.vendedor ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      Bs {Number(p.total).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      Bs {Number(p.total_pagado).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${Number(p.saldo) > 0 ? "text-destructive font-semibold" : ""}`}>
                      Bs {Number(p.saldo).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.estado === "COMPLETADO" ? "outline" : p.estado === "CANCELADO" ? "destructive" : "default"}>
                        {p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/pedidos/${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Ver</Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
