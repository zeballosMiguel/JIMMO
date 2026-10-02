"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { crearLoteCompleto, type DetalleLoteInput } from "@/features/inventario/actions";
import { crearProductoCompleto, crearVarianteDirecta, type VarianteCompletaInput } from "@/features/catalogos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Plus,
  X,
  Package,
  DollarSign,
  Truck,
  Calendar,
  User,
  Layers,
  Minus,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Sparkles,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface VarianteOption {
  id: string;
  sku?: string | null;
  color: string;
  talla?: string | null;
  producto_id: string;
  productos?: {
    id: string;
    nombre: string;
    codigo_interno: string;
    categoria_id?: string | null;
    categorias?: { id: string; nombre: string } | null;
  } | null;
}

export interface ProductoOption {
  id: string;
  nombre: string;
  codigo_interno: string;
  descripcion?: string | null;
  categoria_id?: string | null;
  categorias?: { id: string; nombre: string } | null;
}

export interface CategoriaOption {
  id: string;
  nombre: string;
}

export interface InversionistaOption {
  id: string;
  nombre: string;
}

interface LoteItem extends DetalleLoteInput {
  nombre_producto: string;
  color: string;
  talla?: string | null;
  sku?: string | null;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface NuevoLoteFormProps {
  variantes: VarianteOption[];
  productos: ProductoOption[];
  categorias: CategoriaOption[];
  inversionistas: InversionistaOption[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Diccionario de colores
const COLOR_MAP: Record<string, string> = {
  negro: "#111827", blanco: "#F9FAFB", gris: "#6B7280", beige: "#D7C4A5",
  "azul marino": "#1E3A8A", azul: "#2563EB", celeste: "#38BDF8", rojo: "#DC2626",
  verde: "#16A34A", amarillo: "#EAB308", naranja: "#F97316", rosa: "#EC4899",
  morado: "#7C3AED", cafe: "#5C3317", crema: "#F5F5DC", coral: "#FB7185",
  turquesa: "#06B6D4", vino: "#722F37", mostaza: "#D97706", oliva: "#556B2F",
};

function colorHex(name: string): string {
  const key = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  for (const [k, v] of Object.entries(COLOR_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function NuevoLoteForm({
  variantes,
  productos,
  categorias,
  inversionistas,
}: NuevoLoteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Datos del lote ─────────────────────────────────────────
  const [proveedor, setProveedor] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");
  const [fechaRecepcion, setFechaRecepcion] = useState("");
  const [tipoCambio, setTipoCambio] = useState<string>("");
  const [inversionistaId, setInversionistaId] = useState<string>("");
  const [notas, setNotas] = useState("");

  // ── Productos en el lote ───────────────────────────────────
  const [items, setItems] = useState<LoteItem[]>([]);

  // ── Búsqueda de productos ──────────────────────────────────
  const [productSearch, setProductSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const catScrollRef = useRef<HTMLDivElement>(null);

  // ── Lista dinámica de variantes (se actualiza al crear nuevas) ─────────────
  const [localVariantes, setLocalVariantes] = useState<VarianteOption[]>(variantes);
  const [localProductos, setLocalProductos] = useState<ProductoOption[]>(productos);
  const [localCategorias, setLocalCategorias] = useState<CategoriaOption[]>(categorias);

  // ── Dialogs ────────────────────────────────────────────────
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  const [showNuevaVariante, setShowNuevaVariante] = useState(false);
  const [varianteParaProductoId, setVarianteParaProductoId] = useState<string>("");

  // ─── Catálogo agrupado ────────────────────────────────────────────────────

  const catalogProducts = useMemo(() => {
    const map = new Map<string, {
      id: string;
      nombre: string;
      codigo_interno: string;
      categoria_nombre: string;
      variantes: VarianteOption[];
    }>();

    localProductos.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        codigo_interno: p.codigo_interno,
        categoria_nombre: (p as any).categorias?.nombre || "General",
        variantes: [],
      });
    });

    localVariantes.forEach((v) => {
      const pId = v.producto_id;
      const cat = (v.productos as any)?.categorias?.nombre || "General";
      if (pId && map.has(pId)) {
        map.get(pId)!.variantes.push(v);
      } else {
        const key = v.productos?.nombre || `prod-${pId}`;
        if (!map.has(pId)) {
          map.set(pId, {
            id: pId,
            nombre: v.productos?.nombre || "Producto",
            codigo_interno: v.productos?.codigo_interno || "",
            categoria_nombre: cat,
            variantes: [],
          });
        }
        map.get(pId)!.variantes.push(v);
      }
    });

    return Array.from(map.values()).filter((p) => p.variantes.length > 0);
  }, [localProductos, localVariantes]);

  const categoryTabs = useMemo(() => {
    const set = new Set<string>(["Todos"]);
    localCategorias.forEach((c) => { if (c.nombre) set.add(c.nombre); });
    catalogProducts.forEach((p) => { if (p.categoria_nombre && p.categoria_nombre !== "General") set.add(p.categoria_nombre); });
    return Array.from(set);
  }, [localCategorias, catalogProducts]);

  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      if (activeCategory !== "Todos") {
        if (p.categoria_nombre.toLowerCase() !== activeCategory.toLowerCase()) return false;
      }
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase();
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.codigo_interno.toLowerCase().includes(q) ||
          p.variantes.some((v) =>
            v.sku?.toLowerCase().includes(q) ||
            v.color.toLowerCase().includes(q) ||
            v.talla?.toLowerCase().includes(q)
          )
        );
      }
      return true;
    });
  }, [catalogProducts, activeCategory, productSearch]);

  // ─── Manejar items ────────────────────────────────────────────────────────

  function addVariant(v: VarianteOption) {
    const idx = items.findIndex((i) => i.variante_id === v.id);
    if (idx >= 0) {
      setItems((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], cantidad: updated[idx].cantidad + 1 };
        return updated;
      });
    } else {
      setItems((prev) => [
        ...prev,
        {
          variante_id: v.id,
          cantidad: 1,
          costo_unitario_usd: null,
          otros_costos_bs: 0,
          nombre_producto: v.productos?.nombre || "Producto",
          color: v.color,
          talla: v.talla,
          sku: v.sku,
        },
      ]);
    }
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItemField<K extends keyof LoteItem>(idx: number, field: K, value: LoteItem[K]) {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  }

  // ─── Cálculos por item ────────────────────────────────────────────────────

  const tc = tipoCambio && parseFloat(tipoCambio) > 0 ? parseFloat(tipoCambio) : null;

  function calcCostoUnitarioBs(item: LoteItem): number | null {
    const costoPedidoBs = tc && item.costo_unitario_usd ? item.costo_unitario_usd * tc : 0;
    const total = costoPedidoBs + (item.otros_costos_bs || 0);
    return item.cantidad > 0 ? total / item.cantidad : null;
  }

  // ─── Totales del lote ─────────────────────────────────────────────────────

  const totalUnidades = items.reduce((a, i) => a + i.cantidad, 0);
  const totalUSD = items.reduce((a, i) => a + (i.costo_unitario_usd || 0) * i.cantidad, 0);
  const totalExtras = items.reduce((a, i) => a + (i.otros_costos_bs || 0), 0);

  // ─── Guardar lote ─────────────────────────────────────────────────────────

  function handleSubmit() {
    startTransition(async () => {
      const res = await crearLoteCompleto({
        proveedor: proveedor || null,
        fecha_compra: fechaCompra || null,
        fecha_recepcion: fechaRecepcion || null,
        tipo_cambio: tc,
        inversionista_id: inversionistaId || null,
        notas: notas || null,
        items: items.map((i) => ({
          variante_id: i.variante_id,
          cantidad: i.cantidad,
          costo_unitario_usd: i.costo_unitario_usd,
          otros_costos_bs: i.otros_costos_bs || 0,
        })),
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("¡Lote creado exitosamente!");
        router.push(`/lotes/${res.id}`);
      }
    });
  }

  // ─── Scroll de categorías ─────────────────────────────────────────────────

  function scrollCats(dir: "left" | "right") {
    if (catScrollRef.current) {
      catScrollRef.current.scrollBy({ left: dir === "right" ? 120 : -120, behavior: "smooth" });
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/lotes" className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo Lote de Inventario</h1>
          <p className="text-sm text-muted-foreground">Registra la compra, los costos y los productos en un solo paso.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

        {/* ═══ COLUMNA IZQUIERDA: Catálogo de productos ═══════════════════════ */}
        <div className="space-y-4">

          {/* Buscador + Categorías */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar producto, SKU, color, talla..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
              {/* Botón crear nuevo producto */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 border-dashed"
                onClick={() => setShowNuevoProducto(true)}
              >
                <Sparkles className="w-4 h-4" />
                Nuevo Producto
              </Button>
            </div>

            {/* Tabs de categorías con scroll horizontal */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollCats("left")}
                className="p-1 rounded hover:bg-accent text-muted-foreground shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div
                ref={catScrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-hide"
                style={{ scrollbarWidth: "none" }}
              >
                {categoryTabs.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => scrollCats("right")}
                className="p-1 rounded hover:bg-accent text-muted-foreground shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Grid de productos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{prod.nombre}</p>
                    <p className="text-xs text-muted-foreground">{prod.codigo_interno}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">{prod.categoria_nombre}</Badge>
                </div>

                {/* Variantes */}
                <div className="space-y-1.5">
                  {prod.variantes.map((v) => {
                    const inCart = items.find((i) => i.variante_id === v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => addVariant(v)}
                        className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all border ${
                          inCart
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "border-transparent hover:bg-accent/60 text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                            style={{ background: colorHex(v.color) }}
                          />
                          <span className="truncate font-medium">{v.color}</span>
                          {v.talla && <span className="text-muted-foreground">/ {v.talla}</span>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {v.sku && <span className="text-muted-foreground hidden sm:inline">{v.sku}</span>}
                          {inCart
                            ? <span className="font-bold text-primary">×{inCart.cantidad}</span>
                            : <Plus className="w-3 h-3 text-muted-foreground" />
                          }
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Agregar variante */}
                <button
                  type="button"
                  onClick={() => {
                    setVarianteParaProductoId(prod.id);
                    setShowNuevaVariante(true);
                  }}
                  className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-1 rounded-lg hover:bg-accent/40 border border-dashed border-border transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Agregar variante
                </button>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-3">
                <Package className="w-10 h-10 opacity-30" />
                <div>
                  <p className="font-medium">No se encontraron productos</p>
                  <p className="text-xs">Intenta con otra búsqueda o crea uno nuevo</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowNuevoProducto(true)}
                >
                  <Plus className="w-4 h-4" />
                  Crear producto
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ═══ COLUMNA DERECHA: Datos del lote + Items seleccionados ═══════════ */}
        <div className="space-y-4">

          {/* ── Información del lote ── */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Truck className="w-4 h-4 text-primary" />
              Información del Lote
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="proveedor" className="text-xs">Proveedor / Origen</Label>
                <Input
                  id="proveedor"
                  placeholder="Ej. Importadora Textil X"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_compra" className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fecha Compra
                  </Label>
                  <Input
                    id="fecha_compra"
                    type="date"
                    value={fechaCompra}
                    onChange={(e) => setFechaCompra(e.target.value)}
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fecha_recepcion" className="text-xs flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Llegada Estimada
                  </Label>
                  <Input
                    id="fecha_recepcion"
                    type="date"
                    value={fechaRecepcion}
                    onChange={(e) => setFechaRecepcion(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tipo_cambio" className="text-xs flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Tipo de Cambio (USD → Bs.)
                </Label>
                <Input
                  id="tipo_cambio"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 6.96"
                  value={tipoCambio}
                  onChange={(e) => setTipoCambio(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {inversionistas.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    <User className="w-3 h-3" /> Inversionista / Socio
                  </Label>
                  <Select
                    value={inversionistaId}
                    onValueChange={(v) => setInversionistaId(!v || v === "__none__" ? "" : v)}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin inversionista asignado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin asignar</SelectItem>
                      {inversionistas.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="notas" className="text-xs">Notas / Observaciones</Label>
                <Textarea
                  id="notas"
                  placeholder="Nro de factura, guía de transporte..."
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  disabled={isPending}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* ── Productos seleccionados ── */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Boxes className="w-4 h-4 text-primary" />
                Productos del Lote
              </div>
              {items.length > 0 && (
                <Badge variant="secondary">{totalUnidades} uds.</Badge>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Selecciona variantes desde el catálogo de la izquierda
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {items.map((item, idx) => {
                  const costoUnit = calcCostoUnitarioBs(item);
                  return (
                    <div key={item.variante_id} className="bg-muted/40 rounded-lg p-3 space-y-2.5">
                      {/* Nombre + quitar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/20"
                              style={{ background: colorHex(item.color) }}
                            />
                            <span className="text-xs font-semibold truncate">{item.nombre_producto}</span>
                          </div>
                          <p className="text-xs text-muted-foreground ml-4">
                            {item.color}{item.talla ? ` / ${item.talla}` : ""}{item.sku ? ` — ${item.sku}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Cantidad */}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-16 shrink-0">Cantidad</Label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateItemField(idx, "cantidad", Math.max(1, item.cantidad - 1))}
                            className="w-6 h-6 flex items-center justify-center rounded border border-border hover:bg-accent transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <Input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => {
                              const v = parseInt(e.target.value);
                              if (!isNaN(v) && v > 0) updateItemField(idx, "cantidad", v);
                            }}
                            className="w-16 h-6 text-center text-xs px-1"
                          />
                          <button
                            type="button"
                            onClick={() => updateItemField(idx, "cantidad", item.cantidad + 1)}
                            className="w-6 h-6 flex items-center justify-center rounded border border-border hover:bg-accent transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Costo USD */}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-16 shrink-0">$ Pedido</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="USD total"
                          value={item.costo_unitario_usd ?? ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            updateItemField(idx, "costo_unitario_usd", isNaN(v) ? null : v);
                          }}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Otros costos Bs */}
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground w-16 shrink-0">Extras Bs.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Transporte, etc."
                          value={item.otros_costos_bs || ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            updateItemField(idx, "otros_costos_bs", isNaN(v) ? 0 : v);
                          }}
                          className="h-7 text-xs"
                        />
                      </div>

                      {/* Costo unitario calculado */}
                      {costoUnit !== null && costoUnit > 0 && (
                        <div className="bg-primary/5 border border-primary/20 rounded px-2.5 py-1.5 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Costo unitario:</span>
                          <span className="text-xs font-bold text-primary">
                            Bs. {costoUnit.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resumen de totales */}
            {items.length > 0 && (
              <div className="border-t border-border pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Unidades totales</span>
                  <span className="font-medium text-foreground">{totalUnidades}</span>
                </div>
                {totalUSD > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Inversión total USD</span>
                    <span className="font-medium text-foreground">$ {totalUSD.toFixed(2)}</span>
                  </div>
                )}
                {totalExtras > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Costos extras Bs.</span>
                    <span className="font-medium text-foreground">Bs. {totalExtras.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Botones ── */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="flex-1 gap-2"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? "Guardando..." : "Crear Lote"}
            </Button>
          </div>
        </div>
      </div>

      {/* ══════ Dialogs ═══════════════════════════════════════════════════════ */}

      {/* Dialog: Nuevo Producto */}
      <NuevoProductoInlineDialog
        categorias={localCategorias}
        open={showNuevoProducto}
        onClose={() => setShowNuevoProducto(false)}
        onCreated={(prod, variants) => {
          setLocalProductos((prev) => [...prev, prod]);
          setLocalVariantes((prev) => [...prev, ...variants]);
          if (!localCategorias.find((c) => c.id === prod.categoria_id)) {
            // Si se creó una categoría nueva, la agregamos también
          }
          setShowNuevoProducto(false);
        }}
      />

      {/* Dialog: Nueva Variante */}
      <NuevaVarianteInlineDialog
        productoId={varianteParaProductoId}
        nombreProducto={localProductos.find((p) => p.id === varianteParaProductoId)?.nombre || "Producto"}
        open={showNuevaVariante}
        onClose={() => setShowNuevaVariante(false)}
        onCreated={(v) => {
          setLocalVariantes((prev) => [...prev, v]);
          setShowNuevaVariante(false);
        }}
      />
    </div>
  );
}

// ─── Dialog: Nuevo Producto Inline ────────────────────────────────────────────

interface NuevoProductoInlineDialogProps {
  categorias: CategoriaOption[];
  open: boolean;
  onClose: () => void;
  onCreated: (producto: ProductoOption, variantes: VarianteOption[]) => void;
}

function NuevoProductoInlineDialog({
  categorias,
  open,
  onClose,
  onCreated,
}: NuevoProductoInlineDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [color, setColor] = useState("");
  const [talla, setTalla] = useState("");
  const [sku, setSku] = useState("");

  function handleSubmit() {
    if (!nombre.trim() || !codigo.trim() || !color.trim()) {
      toast.error("Nombre, código interno y al menos un color son obligatorios");
      return;
    }

    const variantesInput: VarianteCompletaInput[] = [{
      color: color.trim(),
      talla: talla.trim() || null,
      sku: sku.trim() || null,
      stock_inicial: 0,
    }];

    startTransition(async () => {
      const res = await crearProductoCompleto({
        nombre: nombre.trim(),
        codigo_interno: codigo.trim(),
        categoria_id: categoriaId || null,
        nueva_categoria: nuevaCategoria.trim() || null,
        descripcion: descripcion.trim() || null,
        variantes: variantesInput,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Producto creado exitosamente");

      // Construir objetos locales para actualizar el catálogo sin reload
      const catObj = categorias.find((c) => c.id === categoriaId) || null;
      const nuevoProd: ProductoOption = {
        id: res.productoId!,
        nombre: nombre.trim(),
        codigo_interno: codigo.trim(),
        descripcion: descripcion.trim() || null,
        categoria_id: categoriaId || null,
        categorias: catObj,
      };

      // Mapeamos las variantes creadas con sus IDs reales devueltos por la base de datos
      const variantesCreadas: VarianteOption[] = (res.variantes && (res.variantes as any[]).length > 0)
        ? (res.variantes as any[]).map((v) => ({
            id: v.id,
            color: v.color,
            talla: v.talla || null,
            sku: v.sku || null,
            producto_id: res.productoId!,
            productos: { ...nuevoProd, categorias: catObj ? catObj : undefined } as any,
          }))
        : [{
            id: `temp-${Date.now()}`,
            color: color.trim(),
            talla: talla.trim() || null,
            sku: sku.trim() || null,
            producto_id: res.productoId!,
            productos: { ...nuevoProd, categorias: catObj ? catObj : undefined } as any,
          }];

      onCreated(nuevoProd, variantesCreadas);

      // Reset
      setNombre(""); setCodigo(""); setDescripcion(""); setCategoriaId("");
      setNuevaCategoria(""); setColor(""); setTalla(""); setSku("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Nuevo Producto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="np-nombre">Nombre del Producto *</Label>
              <Input id="np-nombre" placeholder="Ej. Polo Básico" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-codigo">Código Interno *</Label>
              <Input id="np-codigo" placeholder="Ej. POL-001" value={codigo} onChange={(e) => setCodigo(e.target.value)} disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={categoriaId} onValueChange={(v) => setCategoriaId(!v || v === "__none__" ? "" : v)} disabled={isPending}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin categoría</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!categoriaId && (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="np-nueva-cat">O crea una categoría nueva</Label>
                <Input id="np-nueva-cat" placeholder="Ej. Polos" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} disabled={isPending} />
              </div>
            )}
          </div>

          <div className="border-t border-border pt-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Primera variante</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="np-color">Color *</Label>
                <Input id="np-color" placeholder="Negro" value={color} onChange={(e) => setColor(e.target.value)} disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-talla">Talla</Label>
                <Input id="np-talla" placeholder="M" value={talla} onChange={(e) => setTalla(e.target.value)} disabled={isPending} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-sku">SKU</Label>
                <Input id="np-sku" placeholder="POL-NEG-M" value={sku} onChange={(e) => setSku(e.target.value)} disabled={isPending} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Creando..." : "Crear Producto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog: Nueva Variante Inline ───────────────────────────────────────────

interface NuevaVarianteInlineDialogProps {
  productoId: string;
  nombreProducto: string;
  open: boolean;
  onClose: () => void;
  onCreated: (variante: VarianteOption) => void;
}

function NuevaVarianteInlineDialog({
  productoId,
  nombreProducto,
  open,
  onClose,
  onCreated,
}: NuevaVarianteInlineDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [color, setColor] = useState("");
  const [talla, setTalla] = useState("");
  const [sku, setSku] = useState("");

  function handleSubmit() {
    if (!color.trim()) {
      toast.error("El color es obligatorio");
      return;
    }
    startTransition(async () => {
      const res = await crearVarianteDirecta({
        producto_id: productoId,
        color: color.trim(),
        talla: talla.trim() || null,
        sku: sku.trim() || null,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("Variante creada");

      const nueva: VarianteOption = {
        id: res.variante!.id,
        color: color.trim(),
        talla: talla.trim() || null,
        sku: sku.trim() || null,
        producto_id: productoId,
      };

      onCreated(nueva);
      setColor(""); setTalla(""); setSku("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Agregar Variante
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-xs text-muted-foreground -mt-1 mb-2">
          Producto: <span className="font-medium text-foreground">{nombreProducto}</span>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="nv-color">Color *</Label>
              <Input id="nv-color" placeholder="Ej. Rojo" value={color} onChange={(e) => setColor(e.target.value)} disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nv-talla">Talla / Tamaño</Label>
              <Input id="nv-talla" placeholder="Ej. XL" value={talla} onChange={(e) => setTalla(e.target.value)} disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nv-sku">SKU (opcional)</Label>
              <Input id="nv-sku" placeholder="Ej. POL-ROJO-XL" value={sku} onChange={(e) => setSku(e.target.value)} disabled={isPending} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Guardando..." : "Agregar Variante"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
