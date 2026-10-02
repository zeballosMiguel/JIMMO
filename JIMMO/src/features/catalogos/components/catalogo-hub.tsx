"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductoEliminarButton } from "@/features/catalogos/components/producto-eliminar-button";
import { ProductoDetalleSheet, getColorHex } from "@/features/catalogos/components/producto-detalle-sheet";
import { Search, Package, Tag, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Variante {
  id: string;
  producto_id?: string;
  color: string;
  talla: string | null;
  sku: string | null;
  stock_actual: number;
  stock_minimo: number;
}

interface Producto {
  id: string;
  nombre: string;
  codigo_interno: string;
  categoria_id: string | null;
  descripcion: string | null;
  nomenclatura?: string | null;
  activo: boolean;
  categorias: { id?: string; nombre: string } | null;
  variantes_producto: Variante[];
}

interface Categoria {
  id: string;
  nombre: string;
  _count?: number;
}

interface Props {
  productos: Producto[];
  categorias: Categoria[];
}

// ── Component ─────────────────────────────────────────────────────────────────
export function CatalogoHub({ productos, categorias }: Props) {
  const [search, setSearch] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = productos.filter((p) => {
    const matchSearch =
      !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo_interno.toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoriaFiltro || p.categoria_id === categoriaFiltro;
    return matchSearch && matchCat;
  });

  function scrollCats(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 140 : -140, behavior: "smooth" });
  }

  function handleOpenDetail(prod: Producto) {
    setSelectedProducto(prod);
    setDrawerOpen(true);
  }

  // Mantener producto seleccionado sincronizado con la lista fresca de productos
  const activeSelectedProd = selectedProducto
    ? productos.find((p) => p.id === selectedProducto.id) || selectedProducto
    : null;

  return (
    <div className="space-y-4">
      {/* ── Barra de filtros ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Buscador — tamaño fijo, nunca se achica */}
        <div className="relative shrink-0 w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm bg-background"
          />
        </div>

        {/* Categoría pills — scroll horizontal con flechas */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {/* Flecha izquierda */}
          <button
            type="button"
            onClick={() => scrollCats("left")}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Desplazar izquierda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Scroll container */}
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
                  : "bg-background border-border/70 text-muted-foreground hover:border-primary/50"
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
                    : "bg-background border-border/70 text-muted-foreground hover:border-primary/50"
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

          {/* Flecha derecha */}
          <button
            type="button"
            onClick={() => scrollCats("right")}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Desplazar derecha"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Tabla de productos ───────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-2xl">
          <Package className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {search || categoriaFiltro
              ? "No hay productos que coincidan con los filtros."
              : "Todavía no hay productos. ¡Crea el primero!"}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          {/* Cabecera de tabla */}
          <div className="flex items-center gap-4 px-4 py-2.5 bg-muted/40 border-b border-border/60">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 w-28 text-center">
              Código
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex-1 min-w-0">
              Producto / Categoría
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 hidden sm:block w-32 text-center">
              Colores
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 hidden sm:block w-20 text-center">
              SKUs
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shrink-0 hidden md:block w-20 text-center">
              Stock
            </span>
            {/* espacio acciones */}
            <span className="shrink-0 w-24 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pr-2 hidden sm:block">
              Gestión
            </span>
          </div>

          {/* Filas */}
          <div className="divide-y divide-border/50">
            {filtered.map((prod) => {
              const uniqueColors = Array.from(
                new Map(
                  prod.variantes_producto.map((v) => [v.color.toLowerCase(), v.color])
                ).values()
              );
              const totalSkus = prod.variantes_producto.length;
              const totalStock = prod.variantes_producto.reduce(
                (acc, v) => acc + (v.stock_actual || 0),
                0
              );
              const lowStock = prod.variantes_producto.some(
                (v) => v.stock_actual <= v.stock_minimo
              );

              return (
                <div
                  key={prod.id}
                  onClick={() => handleOpenDetail(prod)}
                  className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors group cursor-pointer"
                  title="Haz clic para ver variantes, stock y editar producto"
                >
                  {/* Código */}
                  <span className="font-mono text-[11px] font-bold text-muted-foreground bg-muted/50 border border-border/60 px-2 py-0.5 rounded-md shrink-0 w-28 text-center truncate">
                    {prod.codigo_interno}
                  </span>

                  {/* Nombre + categoría */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                      {prod.nombre}
                    </p>
                    {prod.categorias ? (
                      <span className="text-[11px] text-muted-foreground">
                        {prod.categorias.nombre}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground/50 italic">
                        Sin categoría
                      </span>
                    )}
                  </div>

                  {/* Color dots */}
                  <div className="hidden sm:flex items-center gap-1 shrink-0 w-32 justify-center">
                    {uniqueColors.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground/50">—</span>
                    ) : (
                      <>
                        {uniqueColors.slice(0, 8).map((color) => {
                          const hex = getColorHex(color);
                          const isLight =
                            ["#F9FAFB", "#F5F5DC", "#EFEBD9", "#D7C4A5", "#D1D5DB"].includes(hex);
                          return (
                            <span
                              key={color}
                              title={color}
                              className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                              style={{
                                backgroundColor: hex,
                                border: isLight ? "1px solid #d1d5db" : "none",
                              }}
                            />
                          );
                        })}
                        {uniqueColors.length > 8 && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            +{uniqueColors.length - 8}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* SKUs */}
                  <div className="shrink-0 hidden sm:flex w-20 justify-center">
                    <Badge variant="secondary" className="text-[11px] font-semibold">
                      {totalSkus} SKU{totalSkus !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  {/* Stock */}
                  <div className="shrink-0 hidden md:flex w-20 justify-center">
                    <Badge
                      variant={totalStock === 0 || lowStock ? "destructive" : "outline"}
                      className={`text-[11px] font-semibold ${
                        totalStock > 0 && !lowStock
                          ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/10"
                          : ""
                      }`}
                    >
                      {totalStock} uds.
                    </Badge>
                  </div>

                  {/* Acciones */}
                  <div
                    className="flex items-center gap-1 shrink-0 w-24 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title="Ver variantes y editar"
                      className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1"
                      onClick={() => handleOpenDetail(prod)}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span className="hidden xl:inline text-[11px]">Detalle</span>
                    </Button>
                    <ProductoEliminarButton id={prod.id} nombre={prod.nombre} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} de {productos.length} productos
        </p>
      )}

      {/* ── Drawer lateral de Detalle y Gestión de Producto ─────── */}
      <ProductoDetalleSheet
        producto={activeSelectedProd}
        categorias={categorias}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
