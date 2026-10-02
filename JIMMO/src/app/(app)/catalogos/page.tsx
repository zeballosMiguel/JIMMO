import { createClient } from "@/lib/supabase/server";
import { Package, Tag, Layers } from "lucide-react";
import { ProductoTodoEnUnoDialog } from "@/features/catalogos/components/producto-todo-en-uno-dialog";
import { CatalogoHub } from "@/features/catalogos/components/catalogo-hub";
import Link from "next/link";

export const metadata = { title: "Catálogo" };

export default async function CatalogosPage() {
  const supabase = await createClient();

  const [
    { data: productos },
    { data: categorias },
    { count: totalVariantes },
  ] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "id, nombre, codigo_interno, categoria_id, descripcion, nomenclatura, activo, categorias(id, nombre), variantes_producto(id, producto_id, color, talla, sku, stock_actual, stock_minimo)"
      )
      .eq("activo", true)
      .order("nombre"),
    supabase.from("categorias").select("id, nombre").order("nombre"),
    supabase
      .from("variantes_producto")
      .select("*", { count: "exact", head: true })
      .eq("activa", true),
  ]);

  // Enrich categories with product count
  const categoriasConCount = (categorias || []).map((cat) => ({
    ...cat,
    _count: (productos || []).filter((p) => p.categoria_id === cat.id).length,
  }));

  const totalProductos = productos?.length ?? 0;
  const totalCategorias = categorias?.length ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todos tus productos, variantes y colores en un vistazo.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/catalogos/categorias"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Tag className="w-3.5 h-3.5" />
            Categorías
          </Link>
          <ProductoTodoEnUnoDialog categorias={categorias || []} />
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Productos */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col gap-3 hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Productos activos
            </span>
            <span className="p-1.5 rounded-lg bg-primary/10">
              <Package className="w-4 h-4 text-primary" />
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {totalProductos}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              En {totalCategorias} categoría{totalCategorias !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Variantes / SKUs */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col gap-3 hover:border-violet-400/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Variantes / SKUs
            </span>
            <span className="p-1.5 rounded-lg bg-violet-500/10">
              <Layers className="w-4 h-4 text-violet-500" />
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {totalVariantes ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Distribuidos en colores y tallas
            </p>
          </div>
        </div>

        {/* Categorías */}
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm flex flex-col gap-3 hover:border-amber-400/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categorías
            </span>
            <span className="p-1.5 rounded-lg bg-amber-500/10">
              <Tag className="w-4 h-4 text-amber-500" />
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {totalCategorias}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalCategorias === 0
                ? "Sin categorías creadas"
                : `Promedio ${totalCategorias > 0 ? Math.round(totalProductos / totalCategorias) : 0} producto${totalProductos !== 1 ? "s" : ""} c/u`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Hub interactivo (client component) ──────────────────── */}
      <CatalogoHub
        productos={(productos as any) || []}
        categorias={categoriasConCount}
      />
    </div>
  );
}
