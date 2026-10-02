"use client";

import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Tag, ChevronLeft, ChevronRight, Package, AlertTriangle, LayoutGrid, List } from "lucide-react";
import { InventarioCard } from "./inventario-card";
import {
  InventarioDetalleSheet,
  type ProductoInventario,
  type DetalleLoteItem,
} from "./inventario-detalle-sheet";

interface Categoria {
  id: string;
  nombre: string;
  _count?: number;
}

interface InventarioHubProps {
  productos: ProductoInventario[];
  categorias: Categoria[];
  detallesLote: DetalleLoteItem[];
}

export function InventarioHub({ productos, categorias, detallesLote }: InventarioHubProps) {
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [filtroBajo, setFiltroBajo] = useState(false);
  const [filtroAgotado, setFiltroAgotado] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<ProductoInventario | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollCats(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 140 : -140, behavior: "smooth" });
  }

  function handleVerDetalle(prod: ProductoInventario) {
    setSelectedProducto(prod);
    setSheetOpen(true);
  }

  // Filtrado de productos
  const filtered = useMemo(() => {
    return productos.filter((p) => {
      // Búsqueda por texto (nombre, código interno, o en alguna variante)
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo_interno.toLowerCase().includes(q) ||
        p.variantes_producto.some(
          (v) =>
            v.color.toLowerCase().includes(q) ||
            (v.talla && v.talla.toLowerCase().includes(q)) ||
            (v.sku && v.sku.toLowerCase().includes(q))
        );

      // Filtro de categoría
      const matchCat = !categoriaFiltro || p.categoria_id === categoriaFiltro;

      // Filtro de stock bajo (alguna variante con stock <= stock_minimo)
      const totalStock = p.variantes_producto.reduce((acc, v) => acc + (v.stock_actual || 0), 0);
      const hasLowStock = p.variantes_producto.some((v) => v.stock_actual <= v.stock_minimo);
      const matchBajo = !filtroBajo || hasLowStock;

      // Filtro de agotados (stock total = 0)
      const matchAgotado = !filtroAgotado || totalStock === 0;

      return matchSearch && matchCat && matchBajo && matchAgotado;
    });
  }, [productos, search, categoriaFiltro, filtroBajo, filtroAgotado]);

  // Mantener producto seleccionado actualizado si se actualiza la lista
  const activeSelected = selectedProducto
    ? productos.find((p) => p.id === selectedProducto.id) || selectedProducto
    : null;

  return (
    <div className="space-y-5">
      {/* ── Barra de Filtros ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Buscador fijo */}
        <div className="relative shrink-0 sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar producto, SKU, color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-card"
          />
        </div>

        {/* Categorías con scroll horizontal y flechas */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => scrollCats("left")}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Desplazar izquierda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={scrollRef}
            className="flex items-center gap-1.5 overflow-x-auto scroll-smooth flex-1 min-w-0"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {/* Pill "Todas" */}
            <button
              onClick={() => setCategoriaFiltro(null)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all shrink-0 ${
                !categoriaFiltro
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border/70 text-muted-foreground hover:border-primary/50"
              }`}
            >
              Todas ({productos.length})
            </button>

            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setCategoriaFiltro(categoriaFiltro === cat.id ? null : cat.id)
                }
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all shrink-0 ${
                  categoriaFiltro === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/70 text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Tag className="w-3 h-3" />
                {cat.nombre}
                {cat._count !== undefined && (
                  <span className="opacity-60 ml-0.5">({cat._count})</span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollCats("right")}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Desplazar derecha"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Botones de alerta rápida */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setFiltroBajo(!filtroBajo)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all inline-flex items-center gap-1.5 ${
              filtroBajo
                ? "bg-amber-500/10 text-amber-600 border-amber-500/30 font-semibold"
                : "bg-card border-border/80 text-muted-foreground hover:border-amber-500/40"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stock bajo
          </button>

          <button
            type="button"
            onClick={() => setFiltroAgotado(!filtroAgotado)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all inline-flex items-center gap-1.5 ${
              filtroAgotado
                ? "bg-destructive/10 text-destructive border-destructive/30 font-semibold"
                : "bg-card border-border/80 text-muted-foreground hover:border-destructive/40"
            }`}
          >
            Agotados
          </button>
        </div>
      </div>

      {/* ── Contador de Resultados ───────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Mostrando <strong className="text-foreground">{filtered.length}</strong> de{" "}
          {productos.length} productos
        </span>
      </div>

      {/* ── Grid de Tarjetas (Diseño según imagen solicitada) ─────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-card/30">
          <Package className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-semibold text-foreground">
            No se encontraron productos en el inventario.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Prueba ajustando los filtros de búsqueda o categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((prod) => (
            <InventarioCard
              key={prod.id}
              producto={prod}
              detallesLote={detallesLote}
              onVer={handleVerDetalle}
            />
          ))}
        </div>
      )}

      {/* ── Drawer lateral de Detalle del Producto & Lotes ──────── */}
      <InventarioDetalleSheet
        producto={activeSelected}
        detallesLote={detallesLote}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
