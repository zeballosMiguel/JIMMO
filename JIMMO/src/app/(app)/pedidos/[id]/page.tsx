import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccionesPedido } from "@/features/pedidos/components/acciones-pedido";
import { RegistrarPagoDialog } from "@/features/pagos/registrar-pago-dialog";
import { CrearEntregaDialog } from "@/features/entregas/crear-entrega-dialog";
import { EstadoEntregaSelect } from "@/features/entregas/estado-entrega-select";
import { PagoEliminarButton } from "@/features/pagos/components/pago-eliminar-button";
import { EntregaEliminarButton } from "@/features/entregas/components/entrega-eliminar-button";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, RotateCcw } from "lucide-react";
import { getPerfil } from "@/lib/auth/session";
import { DevolucionCambioDialog } from "@/features/pedidos/components/devolucion-cambio-dialog";

export const metadata = { title: "Detalle de Pedido" };

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    perfil,
    { data: pedido },
    { data: pedidoRaw },
    { data: detalles },
    { data: pagos },
    { data: entregas },
    { data: devoluciones },
  ] = await Promise.all([
    getPerfil(),
    supabase.from("vw_pedidos").select("*").eq("id", id).single(),
    supabase.from("pedidos").select("lugar_entrega, lugar_envio, notas").eq("id", id).single(),
    supabase.from("detalle_pedido").select("*, variantes_producto(color, talla, sku, productos(nombre))").eq("pedido_id", id).eq("activo", true),
    supabase.from("pagos").select("*").eq("pedido_id", id).order("created_at", { ascending: false }),
    supabase.from("entregas").select("*").eq("pedido_id", id).order("fecha_programada", { ascending: false }),
    supabase
      .from("devoluciones")
      .select(`
        *,
        detalle_devolucion (
          cantidad,
          variantes_producto (
            color,
            talla,
            productos (nombre)
          )
        ),
        detalle_cambio (
          cantidad,
          variantes_producto (
            color,
            talla,
            productos (nombre)
          )
        )
      `)
      .eq("pedido_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!pedido) notFound();

  const esAdmin = perfil?.rol === "admin";
  const saldo = Number(pedido.saldo || 0);
  const esFinalizado = pedido.estado === "COMPLETADO" || pedido.estado === "CANCELADO";
  const esRetiroEnTienda = pedido.tipo_entrega?.toLowerCase().includes("tienda");
  const requiereProgramarEntrega = !esRetiroEnTienda && (!entregas || entregas.length === 0);
  const lugarDespacho = pedidoRaw?.lugar_envio || pedidoRaw?.lugar_entrega;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/pedidos" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Pedido #{pedido.numero}
              </h1>
              <Badge variant={pedido.estado === "COMPLETADO" ? "outline" : pedido.estado === "CANCELADO" ? "destructive" : "default"}>
                {pedido.estado}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              Cliente: <span className="font-medium text-foreground">{pedido.cliente ?? "Cliente Ocasional"}</span> • Vendedor: <span className="font-medium text-foreground">{pedido.vendedor}</span>
              {pedido.tipo_entrega && (
                <> • Entrega: <span className="font-medium text-foreground">{pedido.tipo_entrega}</span></>
              )}
              {lugarDespacho && (
                <> • Destino/Paquetería: <span className="font-medium text-foreground">{lugarDespacho}</span></>
              )}
            </p>
          </div>
        </div>

        {/* Dynamic Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/pedidos/nuevo"
            className={buttonVariants({ variant: "default", size: "sm" })}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Nueva Venta
          </Link>
          {!esFinalizado && (
            <>
              <Link
                href={`/pedidos/${pedido.id}/editar`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <Pencil className="w-4 h-4 mr-1.5" /> Editar Pedido
              </Link>
              {saldo > 0 && (
                <RegistrarPagoDialog pedidoId={pedido.id} saldoPendiente={saldo} />
              )}
              {requiereProgramarEntrega && (
                <CrearEntregaDialog pedidoId={pedido.id} />
              )}
            </>
          )}
          {pedido.estado === "COMPLETADO" && esAdmin && (
            <DevolucionCambioDialog
              pedidoId={pedido.id}
              numeroPedido={pedido.numero}
              detalles={(detalles as any) || []}
              totalPedido={Number(pedido.total || 0)}
              esAdmin={esAdmin}
            />
          )}
          <AccionesPedido pedidoId={pedido.id} estado={pedido.estado} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total del Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-foreground">
              Bs {Number(pedido.total).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Monto Pagado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-extrabold text-emerald-600">
              Bs {Number(pedido.total_pagado).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Saldo Pendiente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-extrabold ${saldo > 0 ? "text-destructive" : "text-muted-foreground"}`}>
              Bs {saldo.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de Productos */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-foreground border-b border-border pb-2">Productos Solicitados</h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Variante / Color / Talla</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio Unitario</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!detalles?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    El pedido no tiene productos activos.
                  </TableCell>
                </TableRow>
              ) : (
                detalles.map((d) => {
                  const v = d.variantes_producto as any;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{v?.productos?.nombre ?? "—"}</TableCell>
                      <TableCell>
                        {v?.color} {v?.talla ? `/ ${v.talla}` : ""} <br/>
                        <span className="font-mono text-xs text-muted-foreground">{v?.sku ?? ""}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.cantidad}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        Bs {Number(d.precio_unitario).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        Bs {Number(d.subtotal).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Grid de Pagos y Entregas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Historial de Pagos */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="font-semibold text-foreground">Historial de Pagos</h3>
            <span className="text-xs text-muted-foreground font-semibold">{pagos?.length ?? 0} pagos</span>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!pagos?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-xs">
                      No hay pagos registrados para este pedido.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-xs">{p.metodo}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{p.referencia || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={p.estado === "PAGADO" ? "default" : "secondary"} className="text-[10px]">
                          {p.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-xs text-emerald-600">
                        Bs {Number(p.monto).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <PagoEliminarButton id={p.id} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Tickets de Entrega */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="font-semibold text-foreground">Tickets de Entrega / Despacho</h3>
            <span className="text-xs text-muted-foreground font-semibold">{entregas?.length ?? 0} entregas</span>
          </div>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Programada</TableHead>
                  <TableHead>Costo Delivery</TableHead>
                  <TableHead className="text-right">Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!entregas?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-xs">
                      No hay entregas programadas.
                    </TableCell>
                  </TableRow>
                ) : (
                  entregas.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-xs">{e.fecha_programada || "Sin fecha"}</TableCell>
                      <TableCell className="text-xs tabular-nums">
                        Bs {Number(e.costo_delivery || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <EstadoEntregaSelect entregaId={e.id} estadoActual={e.estado} />
                      </TableCell>
                      <TableCell className="text-right">
                        <EntregaEliminarButton id={e.id} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Historial de Ajustes Post-Venta (Devoluciones y Cambios) */}
      {devoluciones && devoluciones.length > 0 && (
        <div className="bg-card border-2 border-amber-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-foreground">Historial de Ajustes Post-Venta (Devoluciones / Cambios)</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              {devoluciones.length} {devoluciones.length === 1 ? "ajuste registrado" : "ajustes registrados"}
            </span>
          </div>

          <div className="space-y-3">
            {devoluciones.map((dev: any) => {
              const devueltos = dev.detalle_devolucion || [];
              const cambios = dev.detalle_cambio || [];
              const fecha = new Date(dev.created_at).toLocaleString("es-VE", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div key={dev.id} className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={dev.tipo === "CAMBIO" ? "default" : "destructive"}
                        className="text-[11px] font-bold"
                      >
                        {dev.tipo === "CAMBIO" ? "CAMBIO DE PRENDA" : "DEVOLUCIÓN DE PRENDA"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fecha}</span>
                    </div>

                    {Number(dev.monto_reembolso_bs) > 0 && (
                      <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                        Reembolso en efectivo: Bs {Number(dev.monto_reembolso_bs).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {dev.motivo && (
                    <p className="text-xs text-foreground italic">
                      <span className="font-semibold not-italic text-muted-foreground">Motivo:</span> "{dev.motivo}"
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs">
                    {/* Devueltas */}
                    <div className="p-2 rounded bg-background border border-border/70 space-y-1">
                      <span className="font-bold text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" /> Prendas que retornaron al stock:
                      </span>
                      {devueltos.length === 0 ? (
                        <p className="text-muted-foreground text-[11px] italic">Sin detalle</p>
                      ) : (
                        devueltos.map((item: any, i: number) => {
                          const vp = item.variantes_producto;
                          return (
                            <p key={i} className="text-foreground pl-2 text-[11px]">
                              • <span className="font-bold">{item.cantidad}x</span> {vp?.productos?.nombre} ({vp?.color}{vp?.talla ? ` / ${vp.talla}` : ""})
                            </p>
                          );
                        })
                      )}
                    </div>

                    {/* Entregadas en cambio */}
                    {dev.tipo === "CAMBIO" && (
                      <div className="p-2 rounded bg-background border border-border/70 space-y-1">
                        <span className="font-bold text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Nuevas prendas entregadas al cliente:
                        </span>
                        {cambios.length === 0 ? (
                          <p className="text-muted-foreground text-[11px] italic">Sin prendas de reemplazo</p>
                        ) : (
                          cambios.map((item: any, i: number) => {
                            const vp = item.variantes_producto;
                            return (
                              <p key={i} className="text-foreground pl-2 text-[11px]">
                                • <span className="font-bold">{item.cantidad}x</span> {vp?.productos?.nombre} ({vp?.color}{vp?.talla ? ` / ${vp.talla}` : ""})
                              </p>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
