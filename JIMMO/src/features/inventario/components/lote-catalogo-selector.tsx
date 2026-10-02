"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { agregarDetalleLote } from "@/features/inventario/actions";
import { crearProductoCompleto, crearVarianteDirecta, type VarianteCompletaInput } from "@/features/catalogos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  ScanLine,
  X,
  Plus,
  Minus,
  Sparkles,
  Layers,
  DollarSign,
  Truck,
  Boxes,
  Check,
  Package,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface VarianteOption {
  id: string;
  sku?: string | null;
  color: string;
  talla?: string | null;
  producto_id: string;
  stock_actual?: number;
  stock_disponible?: number;
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

export interface DetalleLoteExistente {
  id: string;
  variante_id: string;
  cantidad: number;
  costo_unitario_usd?: number | null;
  otros_costos_bs?: number;
  costo_unitario_bs?: number | null;
}

interface Props {
  loteId: string;
  numeroLote: number;
  tipoCambio: number;
  gastosExtrasLote?: number;
  isEditable: boolean;
  productos: ProductoOption[];
  variantes: VarianteOption[];
  detalles: DetalleLoteExistente[];
  categorias: CategoriaOption[];
}

export function LoteCatalogoSelector({
  loteId,
  numeroLote,
  tipoCambio: tcProp,
  gastosExtrasLote = 0,
  isEditable,
  productos: initialProductos,
  variantes: initialVariantes,
  detalles,
  categorias: initialCategorias,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Estados locales para soportar creación inline de producto y variante sin refresh
  const [localProductos, setLocalProductos] = useState<ProductoOption[]>(initialProductos);
  const [localVariantes, setLocalVariantes] = useState<VarianteOption[]>(initialVariantes);
  const [localCategorias, setLocalCategorias] = useState<CategoriaOption[]>(initialCategorias);

  // Filtros
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [productSearch, setProductSearch] = useState<string>("");

  // Modales
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  const [showNuevaVariante, setShowNuevaVariante] = useState(false);
  const [varianteParaProductoId, setVarianteParaProductoId] = useState<string>("");

  // Modal para agregar variante seleccionada al lote
  const [selectedVariant, setSelectedVariant] = useState<VarianteOption | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductoOption | null>(null);
  const [modalCantidad, setModalCantidad] = useState<number>(1);
  const [modalCostoUsd, setModalCostoUsd] = useState<string>("");
  const [modalOtrosCostosBs, setModalOtrosCostosBs] = useState<string>("");
  const [modalTipoCambio, setModalTipoCambio] = useState<number>(tcProp || 6.96);

  // Agrupar variantes por producto
  const catalogProducts = useMemo(() => {
    const map = new Map<string, {
      id: string;
      nombre: string;
      codigo_interno: string;
      descripcion: string;
      categoria_nombre: string;
      categoria_id?: string | null;
      total_stock: number;
      variantes: VarianteOption[];
    }>();

    localProductos.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        codigo_interno: p.codigo_interno || "SKU",
        descripcion: p.descripcion || "",
        categoria_nombre: (p as any).categorias?.nombre || "General",
        categoria_id: p.categoria_id,
        total_stock: 0,
        variantes: [],
      });
    });

    localVariantes.forEach((v) => {
      if (v.producto_id && map.has(v.producto_id)) {
        const prod = map.get(v.producto_id)!;
        prod.variantes.push(v);
        prod.total_stock += v.stock_disponible ?? v.stock_actual ?? 0;
      }
    });

    return Array.from(map.values());
  }, [localProductos, localVariantes]);

  // Lista de categorías para las pills
  const categoryTabs = useMemo(() => {
    const set = new Set<string>();
    set.add("Todos");
    localCategorias.forEach((c) => {
      if (c.nombre) set.add(c.nombre);
    });
    catalogProducts.forEach((p) => {
      if (p.categoria_nombre && p.categoria_nombre !== "General") {
        set.add(p.categoria_nombre);
      }
    });
    return Array.from(set);
  }, [localCategorias, catalogProducts]);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const matchCat = activeCategory === "Todos" || p.categoria_nombre === activeCategory;
      if (!matchCat) return false;
      if (!productSearch.trim()) return true;
      const q = productSearch.toLowerCase();
      const inName = p.nombre.toLowerCase().includes(q);
      const inCode = p.codigo_interno.toLowerCase().includes(q);
      const inVars = p.variantes.some(
        (v) =>
          v.color.toLowerCase().includes(q) ||
          (v.talla && v.talla.toLowerCase().includes(q)) ||
          (v.sku && v.sku.toLowerCase().includes(q))
      );
      return inName || inCode || inVars;
    });
  }, [catalogProducts, activeCategory, productSearch]);

  // Cálculos en tiempo real dentro del modal de agregar al lote
  const calculoModal = useMemo(() => {
    const cant = Math.max(1, modalCantidad || 1);
    const tc = modalTipoCambio || 6.96;
    const usdInput = parseFloat(modalCostoUsd) || 0;
    const extrasBs = parseFloat(modalOtrosCostosBs) || 0;

    const subtotalPedidoBs = usdInput * tc;
    const costoTotalBs = subtotalPedidoBs + extrasBs;
    const costoUnitarioBs = costoTotalBs / cant;

    return {
      cant,
      tc,
      usdInput,
      subtotalPedidoBs,
      extrasBs,
      costoTotalBs,
      costoUnitarioBs,
    };
  }, [modalCantidad, modalCostoUsd, modalOtrosCostosBs, modalTipoCambio]);

  // Abrir modal para ingresar variante al lote
  function handleSelectVariant(v: VarianteOption, p: ProductoOption) {
    if (!isEditable) {
      toast.error("Este lote ya no se puede modificar porque está recibido o cerrado.");
      return;
    }
    setSelectedVariant(v);
    setSelectedProduct(p);
    setModalCantidad(1);
    setModalCostoUsd("");
    setModalOtrosCostosBs("");
    setModalTipoCambio(tcProp || 6.96);
  }

  // Guardar ítem en detalle_lote
  function handleGuardarDetalle() {
    if (!selectedVariant) return;

    const formData = new FormData();
    formData.set("variante_id", selectedVariant.id);
    formData.set("cantidad", String(calculoModal.cant));
    if (calculoModal.usdInput > 0) {
      formData.set("costo_unitario_usd", String(calculoModal.usdInput / calculoModal.cant));
    }
    formData.set("otros_costos_bs", String(calculoModal.extrasBs));
    if (calculoModal.costoUnitarioBs > 0) {
      formData.set("costo_unitario_bs", calculoModal.costoUnitarioBs.toFixed(2));
    }

    startTransition(async () => {
      const res = await agregarDetalleLote(loteId, formData);
      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success(
        `Agregado al lote: ${selectedProduct?.nombre} (${selectedVariant.color} ${selectedVariant.talla || ""})`
      );
      setSelectedVariant(null);
      setSelectedProduct(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* ── Barra de Control: Categorías y Buscador ─────────────── */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Boxes className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm sm:text-base">
                Catálogo de Productos para el Lote #{numeroLote}
              </h2>
              <p className="text-xs text-muted-foreground">
                Selecciona la variante que deseas incorporar con los costos predefinidos
              </p>
            </div>
          </div>

          {/* Botón crear nuevo producto */}
          {isEditable && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNuevoProducto(true)}
              className="shrink-0 gap-1.5 border-dashed border-primary/40 text-primary hover:bg-primary/10"
            >
              <Sparkles className="w-4 h-4" />
              Nuevo Producto
            </Button>
          )}
        </div>

        {/* Categorías Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categoryTabs.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative">
          <ScanLine className="w-5 h-5 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar producto por nombre, código interno, variante o SKU..."
            className="pl-11 pr-10 h-11 bg-background rounded-xl border-border text-sm"
          />
          {productSearch && (
            <button
              type="button"
              onClick={() => setProductSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Grid de Tarjetas de Productos (Mismo estilo que pedidos/nuevo) ── */}
      {filteredProducts.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No se encontraron productos con el filtro aplicado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-xs transition-all group"
            >
              <div>
                {/* SKU & Stock Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="bg-zinc-950 text-white dark:bg-zinc-800 font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    {prod.codigo_interno}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                    {prod.total_stock} disp.
                  </span>
                </div>

                {/* Nombre y descripción */}
                <h3 className="font-bold text-sm text-foreground mt-2.5 line-clamp-1 group-hover:text-primary transition-colors">
                  {prod.nombre}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 min-h-[32px]">
                  {prod.descripcion || "Prenda de alta durabilidad y diseño original JIMMO"}
                </p>

                {/* Header de Variantes + Botón Agregar Variante */}
                <div className="flex items-center justify-between mt-3 mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Variantes para este Lote:
                  </p>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => {
                        setVarianteParaProductoId(prod.id);
                        setShowNuevaVariante(true);
                      }}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Variante
                    </button>
                  )}
                </div>

                {/* Chips de variantes en grid de 2 columnas */}
                <div className="grid grid-cols-2 gap-1.5">
                  {prod.variantes.length === 0 ? (
                    <div className="col-span-2 text-center py-2 text-[11px] text-muted-foreground bg-muted/20 rounded-lg">
                      Sin variantes. Usa "+ Variante" para crear una.
                    </div>
                  ) : (
                    prod.variantes.map((v) => {
                      const itemEnLote = detalles.find((d) => d.variante_id === v.id);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectVariant(v, prod)}
                          className={`text-left text-xs p-2 rounded-xl border transition-all flex items-center justify-between gap-1.5 ${
                            itemEnLote
                              ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                              : "border-border hover:border-zinc-400 dark:hover:border-zinc-600 bg-background text-foreground hover:bg-muted/40"
                          }`}
                        >
                          <span className="truncate text-[11px] capitalize">
                            {v.color} {v.talla ? `/ ${v.talla}` : ""}
                          </span>
                          <span
                            className={`text-[10px] font-mono shrink-0 px-1 py-0.5 rounded ${
                              itemEnLote
                                ? "bg-primary text-primary-foreground font-bold"
                                : "text-muted-foreground bg-muted"
                            }`}
                          >
                            {itemEnLote ? `×${itemEnLote.cantidad}` : "+"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Agregar Variante al Lote con Costos Calculados ── */}
      <Dialog
        open={Boolean(selectedVariant && selectedProduct)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVariant(null);
            setSelectedProduct(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-primary" />
              Agregar a Lote #{numeroLote}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && selectedVariant && (
            <div className="space-y-4 mt-1">
              {/* Resumen del producto seleccionado */}
              <div className="p-3 bg-muted/40 border border-border rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground">{selectedProduct.nombre}</h4>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedVariant.color} {selectedVariant.talla ? `/ Talla ${selectedVariant.talla}` : ""}{" "}
                    {selectedVariant.sku ? `• SKU: ${selectedVariant.sku}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  {selectedProduct.codigo_interno}
                </Badge>
              </div>

              {/* Cantidad con botones + y - */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cantidad de unidades</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setModalCantidad((prev) => Math.max(1, prev - 1))}
                    disabled={modalCantidad <= 1 || isPending}
                    className="h-10 w-10 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    min="1"
                    value={modalCantidad}
                    onChange={(e) => setModalCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={isPending}
                    className="h-10 text-center font-bold text-base"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setModalCantidad((prev) => prev + 1)}
                    disabled={isPending}
                    className="h-10 w-10 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Costo USD y Gastos Extras */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="m-costo-usd" className="text-xs font-semibold flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Costo Pedido ($ USD)
                  </Label>
                  <Input
                    id="m-costo-usd"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Total en $"
                    value={modalCostoUsd}
                    onChange={(e) => setModalCostoUsd(e.target.value)}
                    disabled={isPending}
                    className="h-10 text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="m-extras-bs" className="text-xs font-semibold flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    Costos Extras (Bs.)
                  </Label>
                  <Input
                    id="m-extras-bs"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Transporte, aduana, etc."
                    value={modalOtrosCostosBs}
                    onChange={(e) => setModalOtrosCostosBs(e.target.value)}
                    disabled={isPending}
                    className="h-10 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Tipo de Cambio (predefinido del lote) */}
              <div className="space-y-1 text-xs text-muted-foreground flex items-center justify-between px-1">
                <span>Tipo de Cambio del lote:</span>
                <span className="font-mono font-bold text-foreground">
                  {modalTipoCambio} Bs./USD
                </span>
              </div>

              {/* Tarjeta de Cálculo automático en vivo */}
              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal Pedido en Bs.:</span>
                  <span className="font-mono font-medium text-foreground">
                    Bs. {calculoModal.subtotalPedidoBs.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Costo Total del ítem (Bs.):</span>
                  <span className="font-mono font-medium text-foreground">
                    Bs. {calculoModal.costoTotalBs.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-primary/20 pt-1.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">Costo Unitario Resultante:</span>
                  <span className="text-base font-black text-primary font-mono">
                    Bs. {calculoModal.costoUnitarioBs.toFixed(2)} / u.
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedVariant(null);
                    setSelectedProduct(null);
                  }}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleGuardarDetalle}
                  disabled={isPending}
                  className="gap-2"
                >
                  {isPending ? "Guardando..." : "Agregar al Lote"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Nuevo Producto Inline ────────────────────────── */}
      <NuevoProductoInlineDialog
        categorias={localCategorias}
        open={showNuevoProducto}
        onClose={() => setShowNuevoProducto(false)}
        onCreated={(prod, variants) => {
          setLocalProductos((prev) => [prod, ...prev]);
          setLocalVariantes((prev) => [...prev, ...variants]);
          setShowNuevoProducto(false);
          toast.success(`Producto "${prod.nombre}" listo en catálogo`);
        }}
      />

      {/* ── Dialog: Nueva Variante Inline ────────────────────────── */}
      <NuevaVarianteInlineDialog
        productoId={varianteParaProductoId}
        nombreProducto={
          localProductos.find((p) => p.id === varianteParaProductoId)?.nombre || "Producto"
        }
        open={showNuevaVariante}
        onClose={() => setShowNuevaVariante(false)}
        onCreated={(v) => {
          setLocalVariantes((prev) => [...prev, v]);
          setShowNuevaVariante(false);
          toast.success(`Variante creada`);
        }}
      />
    </div>
  );
}

// ─── Componentes de Diálogos Inline ──────────────────────────────────────────

function NuevoProductoInlineDialog({
  categorias,
  open,
  onClose,
  onCreated,
}: {
  categorias: CategoriaOption[];
  open: boolean;
  onClose: () => void;
  onCreated: (producto: ProductoOption, variantes: VarianteOption[]) => void;
}) {
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

    const variantesInput: VarianteCompletaInput[] = [
      {
        color: color.trim(),
        talla: talla.trim() || null,
        sku: sku.trim() || null,
        stock_inicial: 0,
      },
    ];

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

      const catObj = categorias.find((c) => c.id === categoriaId) || null;
      const nuevoProd: ProductoOption = {
        id: res.productoId!,
        nombre: nombre.trim(),
        codigo_interno: codigo.trim(),
        descripcion: descripcion.trim() || null,
        categoria_id: categoriaId || null,
        categorias: catObj,
      };

      const variantesCreadas: VarianteOption[] =
        res.variantes && (res.variantes as any[]).length > 0
          ? (res.variantes as any[]).map((v) => ({
              id: v.id,
              color: v.color,
              talla: v.talla || null,
              sku: v.sku || null,
              producto_id: res.productoId!,
              stock_actual: 0,
              stock_disponible: 0,
            }))
          : [
              {
                id: `temp-${Date.now()}`,
                color: color.trim(),
                talla: talla.trim() || null,
                sku: sku.trim() || null,
                producto_id: res.productoId!,
                stock_actual: 0,
                stock_disponible: 0,
              },
            ];

      onCreated(nuevoProd, variantesCreadas);
      setNombre("");
      setCodigo("");
      setDescripcion("");
      setCategoriaId("");
      setNuevaCategoria("");
      setColor("");
      setTalla("");
      setSku("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Nuevo Producto Express
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="np-nombre">Nombre del Producto *</Label>
              <Input
                id="np-nombre"
                placeholder="Ej. Polo Clásico"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-codigo">Código Interno *</Label>
              <Input
                id="np-codigo"
                placeholder="Ej. POL-001"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-categoria">Categoría</Label>
              <Select value={categoriaId} onValueChange={(val) => setCategoriaId(val ?? "")} disabled={isPending}>
                <SelectTrigger id="np-categoria">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-xl space-y-3 border border-border/60">
            <p className="text-xs font-semibold text-foreground">Variante Inicial</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="np-color" className="text-[11px]">Color *</Label>
                <Input
                  id="np-color"
                  placeholder="Ej. Negro"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={isPending}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-talla" className="text-[11px]">Talla</Label>
                <Input
                  id="np-talla"
                  placeholder="Ej. M"
                  value={talla}
                  onChange={(e) => setTalla(e.target.value)}
                  disabled={isPending}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="np-sku" className="text-[11px]">SKU</Label>
                <Input
                  id="np-sku"
                  placeholder="Opcional"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={isPending}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Creando..." : "Crear Producto"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NuevaVarianteInlineDialog({
  productoId,
  nombreProducto,
  open,
  onClose,
  onCreated,
}: {
  productoId: string;
  nombreProducto: string;
  open: boolean;
  onClose: () => void;
  onCreated: (variante: VarianteOption) => void;
}) {
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

      onCreated({
        id: res.variante!.id,
        color: color.trim(),
        talla: talla.trim() || null,
        sku: sku.trim() || null,
        producto_id: productoId,
        stock_actual: 0,
        stock_disponible: 0,
      });

      setColor("");
      setTalla("");
      setSku("");
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
        <p className="text-xs text-muted-foreground -mt-1">
          Para: <span className="font-semibold text-foreground">{nombreProducto}</span>
        </p>

        <div className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nv-color">Color *</Label>
            <Input
              id="nv-color"
              placeholder="Ej. Rojo, Azul Marino..."
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="nv-talla">Talla</Label>
              <Input
                id="nv-talla"
                placeholder="Ej. L"
                value={talla}
                onChange={(e) => setTalla(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nv-sku">SKU</Label>
              <Input
                id="nv-sku"
                placeholder="Opcional"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
