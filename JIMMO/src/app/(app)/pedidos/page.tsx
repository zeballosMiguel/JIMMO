import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/auth/session";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Pencil, ShoppingBag, Search } from "lucide-react";
import { ExportarPedidosExcelButton } from "@/features/pedidos/components/exportar-pedidos-excel-button";
import { RefreshButton } from "@/components/ui/refresh-button";

export const metadata = { title: "Pedidos y Ventas" };

const estadoVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  RESERVADO: "default",
  COMPLETADO: "outline",
  CANCELADO: "destructive",
};

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const { estado, q } = await searchParams;
  const supabase = await createClient();
  const perfil = await getPerfil();

  let query = supabase
    .from("vw_pedidos")
    .select("*")
    .order("created_at", { ascending: false });

  // Si el usuario es Rol VENDEDOR, solo ve sus propias ventas
  if (perfil?.rol === "vendedor") {
    const { data: vendedorRecord } = await supabase
      .from("vendedores")
      .select("id, nombre")
      .eq("perfil_id", perfil.id)
      .maybeSingle();

    if (vendedorRecord?.nombre) {
      query = query.eq("vendedor", vendedorRecord.nombre);
    } else {
      // Vendedor sin perfil vinculado: lista vacía por seguridad
      query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    }
  }

  if (estado) query = query.eq("estado", estado);
  if (q) query = query.or(`cliente.ilike.%${q}%,vendedor.ilike.%${q}%`);

  const { data: pedidos } = await query;

  const pedidoIds = (pedidos || []).map((p) => p.id);

  // Obtener detalle de productos vendidos para cada pedido
  const { data: todosDetalles } = pedidoIds.length > 0
    ? await supabase
        .from("detalle_pedido")
        .select(`
          id,
          pedido_id,
          cantidad,
          precio_unitario,
          variantes_producto (
            sku,
            color,
            talla,
            productos (
              nombre
            )
          )
        `)
        .in("pedido_id", pedidoIds)
        .eq("activo", true)
    : { data: [] };

  // Agrupar items por pedido
  const itemsByPedido: Record<string, any[]> = {};
  for (const d of todosDetalles || []) {
    if (!itemsByPedido[d.pedido_id]) {
      itemsByPedido[d.pedido_id] = [];
    }
    itemsByPedido[d.pedido_id].push(d);
  }

  const estados = ["RESERVADO", "COMPLETADO"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Pedidos y Ventas</h1>
            <RefreshButton />
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {pedidos?.length ?? 0} registros en el sistema.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ExportarPedidosExcelButton estadoActual={estado} />
          <Link href="/pedidos/nuevo" id="crear-pedido-btn" className={buttonVariants({ variant: "default" })}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva venta / pedido
          </Link>
        </div>
      </div>

      {/* Filtros + Buscador */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/pedidos"
            className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              !estado ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary"
            }`}
            id="filtro-todos"
          >
            Todos
          </Link>
          {estados.map((e) => (
            <Link
              key={e}
              href={`/pedidos?estado=${e}${q ? `&q=${q}` : ""}`}
              id={`filtro-${e.toLowerCase()}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                estado === e ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:border-primary"
              }`}
            >
              {e}
            </Link>
          ))}
        </div>

        {/* Buscador estilo Lotes */}
        <form className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Buscar cliente o vendedor..."
              className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              id="pedidos-search"
            />
          </div>
          {(estado || q) && (
            <Link
              href="/pedidos"
              className="text-xs text-muted-foreground hover:text-foreground font-medium shrink-0"
            >
              Limpiar
            </Link>
          )}
        </form>
      </div>

      <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-16 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nro.</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Vendedor</TableHead>
              <TableHead className="min-w-[260px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Lo que se vendió</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Canal</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pagado</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Saldo</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!pedidos?.length ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-12">
                  <ShoppingBag className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-medium text-foreground">No hay ventas o pedidos en este filtro.</p>
                </TableCell>
              </TableRow>
            ) : (
              pedidos.map((p) => {
                const items = itemsByPedido[p.id] || [];
                return (
                  <TableRow key={p.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-mono font-bold align-top pt-3">
                      #{p.numero}
                    </TableCell>
                    <TableCell className="align-top pt-3">
                      <span className="font-medium text-foreground">{p.cliente ?? "Cliente Ocasional"}</span>
                    </TableCell>
                    <TableCell className="align-top pt-3 text-muted-foreground">
                      {p.vendedor ?? "—"}
                    </TableCell>

                    {/* Columna: Lo que se vendió (añade una fila por cada prenda vendida) */}
                    <TableCell className="py-2.5 align-top">
                      {items.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">Sin productos</span>
                      ) : (
                        <div className="space-y-1.5">
                          {items.map((it: any) => {
                            const vp = it.variantes_producto;
                            const prodNombre = vp?.productos?.nombre || "Prenda / Producto";
                            const color = vp?.color;
                            const talla = vp?.talla;
                            const sku = vp?.sku;
                            return (
                              <div
                                key={it.id}
                                className="flex items-center justify-between gap-2 text-xs bg-muted/40 hover:bg-muted/70 px-2.5 py-1.5 rounded-md border border-border/50 transition-colors"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-bold text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                                    {it.cantidad}x
                                  </span>
                                  <span className="font-medium text-foreground truncate" title={prodNombre}>
                                    {prodNombre}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {(color || talla) && (
                                    <span className="text-[11px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/60">
                                      {color}{color && talla ? " / " : ""}{talla}
                                    </span>
                                  )}
                                  {sku && (
                                    <span className="font-mono text-[10px] text-muted-foreground hidden sm:inline">
                                      {sku}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="align-top pt-3 text-muted-foreground">
                      {p.canal ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-foreground align-top pt-3">
                      Bs {Number(p.total).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600 font-medium align-top pt-3">
                      Bs {Number(p.total_pagado).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums align-top pt-3 ${Number(p.saldo) > 0 ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      Bs {Number(p.saldo).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="align-top pt-3">
                      <Badge variant={estadoVariant[p.estado] ?? "secondary"}>
                        {p.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right align-top pt-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/pedidos/${p.id}`} id={`pedido-ver-${p.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                          Ver
                        </Link>
                        {p.estado === "RESERVADO" && (
                          <Link
                            href={`/pedidos/${p.id}/editar`}
                            id={`pedido-edit-${p.id}`}
                            className={buttonVariants({ variant: "ghost", size: "sm" })}
                            title="Editar pedido reservado"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                        )}
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
