"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { buttonVariants, Button } from "@/components/ui/button";
import {
  Plus,
  Package,
  PackageOpen,
  Truck,
  CheckCircle2,
  Clock,
  Lock,
  Ban,
  Layers,
  Search,
  X,
  Boxes,
  DollarSign,
} from "lucide-react";
import { LoteEliminarButton } from "@/features/inventario/lote-eliminar-button";
import { EditarLoteDialog } from "@/features/inventario/editar-lote-dialog";

interface LotesListViewProps {
  lotes: any[];
  inversionistas?: any[];
}

function getProductosCount(l: any): number {
  if (Array.isArray(l.productos_compra) && l.productos_compra.length > 0) {
    return l.productos_compra.length;
  }
  try {
    const notas = l.notas || "";
    const marker = "[ITEMS_COMPRA:";
    const idx = notas.indexOf(marker);
    if (idx !== -1) {
      const jsonStart = idx + marker.length;
      let depth = 0;
      let jsonEnd = jsonStart;
      for (let i = jsonStart; i < notas.length; i++) {
        if (notas[i] === "[") depth++;
        else if (notas[i] === "]") {
          depth--;
          if (depth === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
      const items = JSON.parse(notas.slice(jsonStart, jsonEnd));
      if (Array.isArray(items) && items.length > 0) return items.length;
    }
  } catch {}
  return 1;
}

// Total USD de los productos del pedido (desde la columna o el marcador [ITEMS_COMPRA])
function getUsdTotalProductos(l: any): number {
  if (Array.isArray(l.productos_compra) && l.productos_compra.length > 0) {
    return l.productos_compra.reduce(
      (acc: number, p: any) => acc + (Number(p.costo_total_usd ?? p.costo_usd) || 0),
      0
    );
  }
  try {
    const notas = l.notas || "";
    const marker = "[ITEMS_COMPRA:";
    const idx = notas.indexOf(marker);
    if (idx !== -1) {
      const jsonStart = idx + marker.length;
      let depth = 0;
      let jsonEnd = jsonStart;
      for (let i = jsonStart; i < notas.length; i++) {
        if (notas[i] === "[") depth++;
        else if (notas[i] === "]") {
          depth--;
          if (depth === 0) { jsonEnd = i + 1; break; }
        }
      }
      const items = JSON.parse(notas.slice(jsonStart, jsonEnd));
      if (Array.isArray(items) && items.length > 0) {
        return items.reduce(
          (acc: number, p: any) => acc + (Number(p.costo_total_usd ?? p.costo_usd) || 0),
          0
        );
      }
    }
  } catch {}
  return 0;
}

// Limpiar notas del marcador JSON para búsquedas de texto limpio
function getCleanNotes(notas?: string | null): string {
  if (!notas) return "";
  const marker = "[ITEMS_COMPRA:";
  const idx = notas.indexOf(marker);
  if (idx === -1) return notas.trim();
  let depth = 0;
  let endIdx = idx + marker.length;
  for (let i = idx + marker.length; i < notas.length; i++) {
    if (notas[i] === "[") depth++;
    else if (notas[i] === "]") {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  return (notas.slice(0, idx) + notas.slice(endIdx)).trim();
}

export function LotesListView({ lotes = [], inversionistas = [] }: LotesListViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState<"TODOS" | "POR_CONTAR" | "EN_INVENTARIO">("TODOS");

  // Conteo de tarjetas de filtro superiores
  const totalLotesCount = lotes.length;

  const porContarCount = useMemo(() => {
    return lotes.filter(
      (l) => l.estado === "PENDIENTE" || l.estado === "EN_TRANSITO"
    ).length;
  }, [lotes]);

  const enInventarioCount = useMemo(() => {
    return lotes.filter(
      (l) => l.estado === "RECIBIDO" || l.estado === "CERRADO" || l.estado === "EN_INVENTARIO" || l.estado === "COMPLETADO"
    ).length;
  }, [lotes]);

  // Filtrado dinámico de lotes
  const filteredLotes = useMemo(() => {
    return lotes.filter((l) => {
      // 1. Filtro por Card (Estado)
      if (filterEstado === "POR_CONTAR") {
        if (l.estado !== "PENDIENTE" && l.estado !== "EN_TRANSITO") return false;
      } else if (filterEstado === "EN_INVENTARIO") {
        if (l.estado !== "RECIBIDO" && l.estado !== "CERRADO" && l.estado !== "EN_INVENTARIO" && l.estado !== "COMPLETADO") return false;
      }

      // 2. Buscador universal por texto
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();

      const nroStr = String(l.numero_lote || "").padStart(4, "0");
      const nroRaw = String(l.numero_lote || "");
      const prov = (l.proveedor || "").toLowerCase();
      const prodNombre = (l.productos?.nombre || "").toLowerCase();
      const prodCodigo = (l.productos?.codigo_interno || "").toLowerCase();
      const fechaCompra = (l.fecha_compra || "").toLowerCase();
      const fechaLlegada = (l.fecha_recepcion || "").toLowerCase();
      const cleanNotas = getCleanNotes(l.notas).toLowerCase();
      const inversionista = (l.inversionistas?.nombre || "").toLowerCase();

      return (
        nroStr.includes(q) ||
        nroRaw.includes(q) ||
        prov.includes(q) ||
        prodNombre.includes(q) ||
        prodCodigo.includes(q) ||
        fechaCompra.includes(q) ||
        fechaLlegada.includes(q) ||
        cleanNotas.includes(q) ||
        inversionista.includes(q)
      );
    });
  }, [lotes, filterEstado, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lotes de Inventario y Compras</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalLotesCount} compras y lotes registrados en el sistema.
          </p>
        </div>
        <Link href="/lotes/nuevo" id="crear-lote-btn" className={buttonVariants({ variant: "default" })}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Compra / Lote
        </Link>
      </div>

      {/* ── 3 CARDS SUPERIORES QUE ACTÚAN COMO FILTROS ───────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Total Lotes */}
        <Card
          onClick={() => setFilterEstado("TODOS")}
          className={`px-5 py-5 shadow-2xs cursor-pointer transition-all border-2 ${
            filterEstado === "TODOS"
              ? "border-primary ring-1 ring-primary/20"
              : "hover:border-primary/30 border-border"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Total Lotes
            </span>
            <Boxes className="w-5 h-5 text-primary" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-4xl font-extrabold tracking-tight text-foreground">
              {totalLotesCount}
            </p>
            <span className="text-xs text-muted-foreground font-medium">Ver todos</span>
          </div>
        </Card>

        {/* Card 2: Por Contar */}
        <Card
          onClick={() => setFilterEstado("POR_CONTAR")}
          className={`px-5 py-5 shadow-2xs cursor-pointer transition-all border-2 ${
            filterEstado === "POR_CONTAR"
              ? "border-amber-500 ring-1 ring-amber-500/20"
              : "hover:border-amber-400/30 border-border"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Por Contar
            </span>
            <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-4xl font-extrabold tracking-tight text-amber-700 dark:text-amber-400">
              {porContarCount}
            </p>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              Pendientes de recepción
            </span>
          </div>
        </Card>

        {/* Card 3: En Inventario */}
        <Card
          onClick={() => setFilterEstado("EN_INVENTARIO")}
          className={`px-5 py-5 shadow-2xs cursor-pointer transition-all border-2 ${
            filterEstado === "EN_INVENTARIO"
              ? "border-emerald-500 ring-1 ring-emerald-500/20"
              : "hover:border-emerald-400/30 border-border"
          }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              En Inventario
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-4xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
              {enInventarioCount}
            </p>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Ingresados a Kardex
            </span>
          </div>
        </Card>
      </div>

      {/* ── BUSCADOR UNIVERSAL Y ESTADO DE FILTRO ACTUAL ────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Nro, proveedor, inversionista..."
            className="pl-9 pr-8 h-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filterEstado !== "TODOS" && (
          <div className="flex items-center gap-2 self-start sm:self-center text-xs">
            <span className="text-muted-foreground">Filtro activo:</span>
            <Badge variant="secondary" className="gap-1.5 font-bold uppercase text-[11px]">
              {filterEstado === "POR_CONTAR" ? "Por Contar" : "En Inventario"}
              <button onClick={() => setFilterEstado("TODOS")} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          </div>
        )}
      </div>

      {/* ── TABLA DE LOTES REDISEÑADA Y LIMPIA ───────────────────────────────── */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-16 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nro.
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Proveedor
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                Productos
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Inversión (Bs)
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Fecha Compra
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Fecha Llegada
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Estado
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                Acción
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLotes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  <Package className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-medium text-foreground">No se encontraron lotes</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {searchQuery
                      ? `No hay resultados para "${searchQuery}"`
                      : "No hay compras registradas en este estado"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredLotes.map((l) => {
                const itemsCount = (l.detalle_lote as any[])?.[0]?.count ?? 0;
                const isActive = l.estado === "EN_TRANSITO" || l.estado === "PENDIENTE";
                const prodsCount = getProductosCount(l);

                // Fallback: si el total USD del lote está ausente/perdido, usamos la
                // suma de los costos por producto del pedido para no mostrar una inversión errónea
                const usd = Number(l.costo_total_usd) || getUsdTotalProductos(l);
                const tc = Number(l.tipo_cambio) || 6.96;
                const extrasBs = Number(l.gastos_extras_bs) || 0;
                const totalBs = (usd * tc) + extrasBs;

                return (
                  <TableRow key={l.id} className="hover:bg-muted/20 transition-colors">
                    {/* 1. Nro. */}
                    <TableCell className="font-mono font-bold text-xs">
                      #{String(l.numero_lote).padStart(4, "0")}
                    </TableCell>

                    {/* 2. Proveedor */}
                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">
                        {l.proveedor || "Sin proveedor"}
                      </div>
                      {l.inversionistas?.nombre && (
                        <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                          Inv: {l.inversionistas.nombre}
                        </div>
                      )}
                    </TableCell>

                    {/* 3. Productos (solo número) */}
                    <TableCell className="text-center text-xs">
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {prodsCount} {prodsCount === 1 ? "producto" : "productos"}
                      </Badge>
                    </TableCell>

                    {/* 4. Inversión (Bs) */}
                    <TableCell className="text-right text-xs tabular-nums">
                      {totalBs > 0 ? (
                        <span className="font-bold text-foreground">
                          Bs. {totalBs.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">---</span>
                      )}
                    </TableCell>

                    {/* 5. Fecha Compra */}
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {l.fecha_compra || "---"}
                    </TableCell>

                    {/* 6. Fecha Llegada */}
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {l.fecha_recepcion || "Pendiente"}
                    </TableCell>

                    {/* 7. Estado */}
                    <TableCell>
                      {(() => {
                        if (l.estado === "RECIBIDO" || l.estado === "COMPLETADO") {
                          return (
                            <Badge
                              variant="outline"
                              className="text-xs px-2.5 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              En Inventario
                            </Badge>
                          );
                        }
                        if (l.estado === "EN_TRANSITO") {
                          if (itemsCount > 0) {
                            return (
                              <Badge
                                variant="outline"
                                className="text-xs px-2.5 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1"
                              >
                                <Layers className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                En Conteo
                              </Badge>
                            );
                          }
                          return (
                            <Badge
                              variant="outline"
                              className="text-xs px-2.5 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1"
                            >
                              <Truck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              Por contar
                            </Badge>
                          );
                        }
                        if (l.estado === "PENDIENTE") {
                          return (
                            <Badge
                              variant="outline"
                              className="text-xs px-2.5 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 font-medium inline-flex items-center gap-1"
                            >
                              <Clock className="w-3 h-3 text-zinc-500" />
                              Pendiente
                            </Badge>
                          );
                        }
                        if (l.estado === "CERRADO") {
                          return (
                            <Badge
                              variant="outline"
                              className="text-xs px-2.5 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-muted text-muted-foreground font-medium inline-flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" />
                              Cerrado
                            </Badge>
                          );
                        }
                        if (l.estado === "CANCELADO") {
                          return (
                            <Badge
                              variant="outline"
                              className="text-xs px-2.5 py-0.5 border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400 font-medium inline-flex items-center gap-1"
                            >
                              <Ban className="w-3 h-3 text-red-600" />
                              Cancelado
                            </Badge>
                          );
                        }
                        return (
                          <Badge variant="outline" className="text-xs font-semibold">
                            {l.estado}
                          </Badge>
                        );
                      })()}
                    </TableCell>

                    {/* 8. Acción */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isActive && itemsCount === 0 && (
                          <Link
                            href={`/lotes/${l.id}?action=contar`}
                            className={buttonVariants({
                              variant: "default",
                              size: "sm",
                              className:
                                "gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8 px-2.5",
                            })}
                          >
                            <PackageOpen className="w-3.5 h-3.5" />
                            Contar Pedido
                          </Link>
                        )}
                        {isActive && itemsCount > 0 && (
                          <Link
                            href={`/lotes/${l.id}?action=ingresar`}
                            className={buttonVariants({
                              variant: "default",
                              size: "sm",
                              className:
                                "gap-1 bg-primary text-primary-foreground font-medium text-xs h-8 px-2.5",
                            })}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            Ingresar
                          </Link>
                        )}

                        <Link
                          href={`/lotes/${l.id}`}
                          id={`lote-ver-${l.id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            className: "text-xs h-8",
                          })}
                        >
                          Ver
                        </Link>

                        <EditarLoteDialog
                          lote={l}
                          inversionistas={inversionistas}
                          iconOnly
                        />

                        {l.estado !== "RECIBIDO" && l.estado !== "CERRADO" && (
                          <LoteEliminarButton id={l.id} numero={l.numero_lote} />
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
