"use client";

import { useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Layers, Tag, ExternalLink, Calendar, Boxes, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getColorHex } from "@/features/catalogos/components/producto-detalle-sheet";

export interface VarianteInventario {
  id: string;
  color: string;
  talla: string | null;
  sku: string | null;
  stock_actual: number;
  stock_reservado: number;
  stock_minimo: number;
  activa?: boolean;
}

export interface DetalleLoteItem {
  id: string;
  lote_id: string;
  variante_id: string;
  cantidad: number;
  cantidad_disponible: number;
  costo_unitario_bs: number | null;
  lotes: {
    id: string;
    numero_lote: number;
    fecha_compra: string | null;
    fecha_recepcion: string | null;
    estado: string;
    proveedor: string | null;
  } | null;
  variantes_producto: {
    id: string;
    producto_id: string;
    color: string;
    talla: string | null;
    sku: string | null;
  } | null;
}

export interface ProductoInventario {
  id: string;
  nombre: string;
  codigo_interno: string;
  categoria_id?: string | null;
  descripcion?: string | null;
  categorias?: { id?: string; nombre: string } | null;
  variantes_producto: VarianteInventario[];
}

interface InventarioDetalleSheetProps {
  producto: ProductoInventario | null;
  detallesLote: DetalleLoteItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatFecha(fechaStr?: string | null): string {
  if (!fechaStr) return "—";
  try {
    const parts = fechaStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(fechaStr).toLocaleDateString("es-BO");
  } catch {
    return fechaStr;
  }
}

export function InventarioDetalleSheet({
  producto,
  detallesLote,
  open,
  onOpenChange,
}: InventarioDetalleSheetProps) {
  if (!producto) return null;

  const totalStock = producto.variantes_producto.reduce(
    (acc, v) => acc + (v.stock_actual || 0),
    0
  );
  const totalReservado = producto.variantes_producto.reduce(
    (acc, v) => acc + (v.stock_reservado || 0),
    0
  );
  const totalDisponible = Math.max(0, totalStock - totalReservado);
  const totalSkus = producto.variantes_producto.length;

  // Filtrar los registros de detalle_lote que pertenecen a este producto
  const lotesDelProducto = useMemo(() => {
    const items = detallesLote.filter(
      (dl) => dl.variantes_producto?.producto_id === producto.id
    );

    // Agrupar por lote_id
    const grouped = new Map<
      string,
      {
        lote_id: string;
        numero_lote: number;
        fecha: string | null;
        proveedor: string | null;
        estado: string;
        cantidad: number;
        costo_unitario_bs: number | null;
        cantidad_disponible: number;
        variantes: Array<{
          color: string;
          talla: string | null;
          cantidad: number;
          cantidad_disponible: number;
          costo_unitario_bs: number | null;
        }>;
      }
    >();

    for (const item of items) {
      const lote = item.lotes;
      if (!lote) continue;

      const existing = grouped.get(lote.id);
      const varInfo = {
        color: item.variantes_producto?.color || "—",
        talla: item.variantes_producto?.talla || null,
        cantidad: item.cantidad,
        cantidad_disponible: item.cantidad_disponible,
        costo_unitario_bs: item.costo_unitario_bs,
      };

      if (!existing) {
        grouped.set(lote.id, {
          lote_id: lote.id,
          numero_lote: lote.numero_lote,
          fecha: lote.fecha_recepcion || lote.fecha_compra,
          proveedor: lote.proveedor,
          estado: lote.estado,
          cantidad: item.cantidad,
          costo_unitario_bs: item.costo_unitario_bs,
          cantidad_disponible: item.cantidad_disponible,
          variantes: [varInfo],
        });
      } else {
        existing.cantidad += item.cantidad;
        existing.cantidad_disponible += item.cantidad_disponible;
        existing.variantes.push(varInfo);
      }
    }

    return Array.from(grouped.values()).sort((a, b) => b.numero_lote - a.numero_lote);
  }, [detallesLote, producto.id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl sm:max-w-xl md:max-w-2xl w-full p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl"
      >
        {/* ── Encabezado ─────────────────────────────────────────── */}
        <div className="p-5 border-b border-border/70 bg-muted/20 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border/80 text-foreground">
                  SKU: {producto.codigo_interno}
                </span>
                {producto.categorias ? (
                  <Badge variant="outline" className="text-xs gap-1 font-normal">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {producto.categorias.nombre}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Sin categoría</span>
                )}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {producto.nombre}
              </h2>
            </div>
          </div>

          {/* Micro KPI Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="rounded-xl border border-border/60 bg-card p-2.5 flex items-center gap-2.5 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">SKUs</p>
                <p className="text-sm font-bold text-foreground">{totalSkus}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-2.5 flex items-center gap-2.5 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">Stock Físico</p>
                <p
                  className={`text-sm font-bold ${
                    totalStock === 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {totalStock} uds.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-2.5 flex items-center gap-2.5 shadow-2xs">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Boxes className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase">Disponible</p>
                <p className="text-sm font-bold text-foreground">{totalDisponible} uds.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Cuerpo del Drawer ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ── Sección 1: Desglose por Variante & Stock ──────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Desglose por Variante
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {producto.variantes_producto.length} variante{producto.variantes_producto.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs divide-y divide-border/60">
              {producto.variantes_producto.map((v) => {
                const hex = getColorHex(v.color);
                const isLight = ["#F9FAFB", "#F5F5DC", "#EFEBD9", "#D7C4A5", "#D1D5DB"].includes(hex);
                const isZero = v.stock_actual === 0;
                const isLow = v.stock_actual <= v.stock_minimo;

                return (
                  <div key={v.id} className="p-3 flex items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-2xs"
                        title={v.color}
                        style={{
                          backgroundColor: hex,
                          border: isLight ? "1px solid #d1d5db" : "none",
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-foreground capitalize">
                            {v.color}
                          </span>
                          {v.talla && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium uppercase">
                              {v.talla}
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-[11px] text-muted-foreground truncate">
                          {v.sku || "Sin SKU"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      {v.stock_reservado > 0 && (
                        <div className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">{v.stock_reservado}</span> res.
                        </div>
                      )}

                      <div>
                        <span
                          className={`text-xs font-bold ${
                            isZero ? "text-destructive" : isLow ? "text-amber-500" : "text-foreground"
                          }`}
                        >
                          {v.stock_actual} uds.
                        </span>
                        {v.stock_minimo > 0 && (
                          <p className="text-[10px] text-muted-foreground">
                            Mín: {v.stock_minimo}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Sección 2: Historial de Lotes (Abajito) ──────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Historial de Lotes & Entradas
              </h3>
              <span className="text-[11px] text-muted-foreground">
                {lotesDelProducto.length} lote{lotesDelProducto.length !== 1 ? "s" : ""}
              </span>
            </div>

            {lotesDelProducto.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-xl text-muted-foreground space-y-1">
                <Boxes className="w-7 h-7 mx-auto opacity-40 mb-1" />
                <p className="text-xs font-medium">No hay lotes registrados para este producto.</p>
                <p className="text-[11px] text-muted-foreground/70">
                  Las compras o ingresos por lotes aparecerán detallados aquí.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Lote
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Fecha
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                        Cantidad
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        Costo unit.
                      </TableHead>
                      <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        Disponible lote
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lotesDelProducto.map((lote) => {
                      const loteFormatted = `#${String(lote.numero_lote).padStart(4, "0")}`;
                      const isAgotado = lote.cantidad_disponible === 0;

                      return (
                        <TableRow key={lote.lote_id} className="hover:bg-muted/20 transition-colors">
                          {/* Lote */}
                          <TableCell className="py-2.5">
                            <Link
                              href={`/lotes/${lote.lote_id}`}
                              className="font-mono text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
                              title="Ver lote completo"
                            >
                              {loteFormatted}
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </Link>
                            {lote.proveedor && (
                              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                {lote.proveedor}
                              </p>
                            )}
                          </TableCell>

                          {/* Fecha */}
                          <TableCell className="text-xs text-muted-foreground py-2.5">
                            {formatFecha(lote.fecha)}
                          </TableCell>

                          {/* Cantidad */}
                          <TableCell className="text-xs font-semibold text-center py-2.5">
                            {lote.cantidad}
                          </TableCell>

                          {/* Costo unit. */}
                          <TableCell className="text-xs text-right font-medium py-2.5">
                            {lote.costo_unitario_bs != null
                              ? `Bs ${Number(lote.costo_unitario_bs).toFixed(2)}`
                              : "—"}
                          </TableCell>

                          {/* Disponible lote */}
                          <TableCell className="text-xs text-right font-bold py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] ${
                                isAgotado
                                  ? "bg-muted text-muted-foreground/60"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {lote.cantidad_disponible}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
