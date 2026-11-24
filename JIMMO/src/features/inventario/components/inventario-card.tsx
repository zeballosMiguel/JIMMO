"use client";

import { Eye } from "lucide-react";
import type { ProductoInventario, DetalleLoteItem } from "./inventario-detalle-sheet";
import type { StockSucursalItem } from "./inventario-hub";

interface InventarioCardProps {
  producto: ProductoInventario;
  detallesLote?: DetalleLoteItem[];
  stockSucursal?: StockSucursalItem[];
  onVer: (producto: ProductoInventario) => void;
}

export function InventarioCard({ producto, stockSucursal = [], onVer }: InventarioCardProps) {
  const totalStock = producto.variantes_producto.reduce(
    (acc, v) => acc + (v.stock_actual || 0),
    0
  );

  const hasLowStock = producto.variantes_producto.some(
    (v) => v.stock_actual <= v.stock_minimo
  );

  // Estilo para el badge de Total
  let totalBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800";
  if (totalStock === 0) {
    totalBadgeStyle = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800";
  } else if (hasLowStock) {
    totalBadgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800";
  }

  function formatTalla(talla?: string | null): string {
    if (!talla || talla.trim() === "" || talla.trim().toLowerCase() === "u") {
      return "Talla Única";
    }
    const clean = talla.trim();
    if (clean.toLowerCase().startsWith("talla")) {
      return clean;
    }
    return `Talla ${clean}`;
  }

  // Obtener stock por sucursal para una variante
  function getStockSucursal(varianteId: string) {
    const rows = stockSucursal.filter((s) => s.variante_id === varianteId);
    const ea = rows.find((s) => s.sucursal_nombre.toLowerCase().includes("alto"))?.stock_disponible_sucursal ?? null;
    const lp = rows.find((s) => s.sucursal_nombre.toLowerCase().includes("paz"))?.stock_disponible_sucursal ?? null;
    return { ea, lp };
  }

  const hayDatosSucursal = stockSucursal.length > 0;

  return (
    <div
      onClick={() => onVer(producto)}
      className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-sm transition-all group cursor-pointer h-[340px]"
    >
      {/* ── Encabezado de la Tarjeta ───────────────────────────────── */}
      <div>
        {/* Fila SKU + Botón Ver + Total */}
        <div className="flex items-center justify-between gap-2">
          {/* Badge SKU */}
          <span className="bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full truncate max-w-[130px]">
            {producto.codigo_interno}
          </span>

          {/* Lado derecho: Botón Ver + Total Stock */}
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onVer(producto)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-border/80 bg-background hover:bg-muted text-foreground transition-all shadow-2xs hover:border-primary/50"
              title="Ver detalle del producto y lotes"
            >
              <Eye className="w-3 h-3 text-muted-foreground" />
              <span>Ver</span>
            </button>

            <span className={`font-bold text-[11px] px-2.5 py-0.5 rounded-full border ${totalBadgeStyle}`}>
              Total: {totalStock}
            </span>
          </div>
        </div>

        {/* Nombre del Producto */}
        <h3 className="font-bold text-sm text-foreground mt-2 line-clamp-1 group-hover:text-primary transition-colors">
          {producto.nombre}
        </h3>

        {/* Categoría */}
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {producto.categorias?.nombre || producto.descripcion || "Sin categoría"}
        </p>

        {/* Encabezado: DESGLOSE POR VARIANTE */}
        <div className="mt-3.5 mb-1.5 border-t border-border/40 pt-2.5 flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            DESGLOSE POR VARIANTE
          </p>
          <span className="text-[10px] text-muted-foreground/60 font-mono">
            {producto.variantes_producto.length} var.
          </span>
        </div>
      </div>

      {/* ── Desglose de Variantes ── */}
      <div
        className="flex-1 overflow-y-auto pr-1 min-h-0 divide-y divide-border/20"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "var(--border) transparent",
        }}
      >
        {producto.variantes_producto.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 italic py-4 text-center">
            Sin variantes registradas
          </p>
        ) : (
          producto.variantes_producto.map((v) => {
            const isZero = v.stock_actual <= 0;
            const { ea, lp } = getStockSucursal(v.id);
            const hasSucursalData = hayDatosSucursal && (ea !== null || lp !== null);

            return (
              <div
                key={v.id}
                className="flex items-center justify-between py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors gap-2"
              >
                {/* Nombre de la variante */}
                <span className="truncate font-normal capitalize min-w-0">
                  {v.color} / {formatTalla(v.talla)}
                </span>

                {/* Badges de sucursal o total */}
                <div className="flex items-center gap-1 shrink-0">
                  {hasSucursalData ? (
                    <>
                      {ea !== null && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          🏠{ea}
                        </span>
                      )}
                      {lp !== null && lp > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700">
                          📍{lp}
                        </span>
                      )}
                    </>
                  ) : (
                    <span
                      className={`tabular-nums text-xs font-bold ${
                        isZero ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {v.stock_actual} unids
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
