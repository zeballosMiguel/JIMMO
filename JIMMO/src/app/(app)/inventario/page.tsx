import { createClient } from "@/lib/supabase/server";
import { InventarioHub } from "@/features/inventario/components/inventario-hub";
import { Boxes, Package, AlertTriangle, Layers } from "lucide-react";

export const metadata = { title: "Inventario" };

export default async function InventarioPage() {
  const supabase = await createClient();

  // Auto-recibir lotes que llegaron a su fecha para tener inventario al día
  await supabase.rpc("auto_recibir_lotes_vencidos");

  const [
    { data: productos },
    { data: categorias },
    { data: detallesLote },
  ] = await Promise.all([
    supabase
      .from("productos")
      .select(
        "id, nombre, codigo_interno, categoria_id, descripcion, activo, categorias(id, nombre), variantes_producto(id, color, talla, sku, stock_actual, stock_reservado, stock_minimo, activa)"
      )
      .eq("activo", true)
      .order("nombre"),
    supabase.from("categorias").select("id, nombre").order("nombre"),
    supabase
      .from("detalle_lote")
      .select(
        "id, lote_id, variante_id, cantidad, cantidad_disponible, costo_unitario_bs, lotes(id, numero_lote, fecha_compra, fecha_recepcion, estado, proveedor), variantes_producto(id, producto_id, color, talla, sku)"
      )
      .order("created_at", { ascending: false }),
  ]);

  // Enriquecer categorías con conteo de productos
  const categoriasConCount = (categorias || []).map((cat) => ({
    ...cat,
    _count: (productos || []).filter((p) => p.categoria_id === cat.id).length,
  }));

  // Métricas rápidas
  const totalProductos = productos?.length ?? 0;
  const totalVariantes = (productos || []).reduce(
    (acc, p) => acc + (p.variantes_producto?.length || 0),
    0
  );
  const totalStock = (productos || []).reduce(
    (acc, p) =>
      acc +
      (p.variantes_producto || []).reduce((subAcc, v) => subAcc + (v.stock_actual || 0), 0),
    0
  );
  const variantesBajoStock = (productos || []).reduce(
    (acc, p) =>
      acc +
      (p.variantes_producto || []).filter((v) => v.stock_actual <= v.stock_minimo).length,
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Encabezado ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Existencias físicas en tiempo real y disponibilidad por lote FIFO.
          </p>
        </div>
      </div>

      {/* ── Stat Cards Rápidas ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Productos */}
        <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Productos</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-foreground">{totalProductos}</p>
            <p className="text-[11px] text-muted-foreground">En catálogo</p>
          </div>
        </div>

        {/* Variantes / SKUs */}
        <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Variantes</span>
            <Layers className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-foreground">{totalVariantes}</p>
            <p className="text-[11px] text-muted-foreground">Colores y tallas</p>
          </div>
        </div>

        {/* Unidades Totales */}
        <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Stock Total</span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalStock}
            </p>
            <p className="text-[11px] text-muted-foreground">Unidades físicas</p>
          </div>
        </div>

        {/* Bajo Stock */}
        <div className="bg-card border border-border/80 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Bajo Stock</span>
            <AlertTriangle className={`w-4 h-4 ${variantesBajoStock > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </div>
          <div className="mt-2">
            <p
              className={`text-2xl font-bold tracking-tight ${
                variantesBajoStock > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"
              }`}
            >
              {variantesBajoStock}
            </p>
            <p className="text-[11px] text-muted-foreground">Requieren reposición</p>
          </div>
        </div>
      </div>

      {/* ── Hub interactivo con Grid de Tarjetas ─────────────────── */}
      <InventarioHub
        productos={(productos as any) || []}
        categorias={categoriasConCount}
        detallesLote={(detallesLote as any) || []}
      />
    </div>
  );
}
