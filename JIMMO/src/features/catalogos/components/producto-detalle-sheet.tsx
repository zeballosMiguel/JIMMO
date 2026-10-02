"use client";

import { useState, useTransition, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  actualizarProducto,
  crearVarianteDirecta,
  actualizarVariante,
  eliminarVariante,
} from "@/features/catalogos/actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import {
  Package,
  Layers,
  Tag,
  Plus,
  Pencil,
  Trash2,
  Search,
  Check,
  AlertTriangle,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Color detection ───────────────────────────────────────────────────────────
const COLOR_NAMES_MAP: Record<string, string> = {
  negro: "#111827", black: "#111827",
  blanco: "#F9FAFB", white: "#F9FAFB",
  gris: "#6B7280", gray: "#6B7280", plomo: "#64748B",
  "gris oscuro": "#374151", "gris claro": "#D1D5DB",
  azul: "#2563EB", blue: "#2563EB",
  "azul marino": "#1E3A8A", navy: "#1E3A8A",
  celeste: "#38BDF8", turquesa: "#06B6D4", petroleo: "#0F4C5C",
  rojo: "#DC2626", red: "#DC2626",
  vino: "#722F37", bordo: "#6B1D2F", borgoña: "#800020", granate: "#800000",
  verde: "#16A34A", green: "#16A34A",
  "verde militar": "#4B5320", oliva: "#556B2F", esmeralda: "#059669",
  musgo: "#355E3B", menta: "#86EFAC",
  beige: "#D7C4A5", crema: "#F5F5DC", hueso: "#EFEBD9", arena: "#C2B280",
  marron: "#78350F", cafe: "#5C3317", chocolate: "#3D2314",
  terracota: "#C85A32", ladrillo: "#B22222", canela: "#7B3F00",
  amarillo: "#EAB308", yellow: "#EAB308",
  mostaza: "#D97706", dorado: "#D4AF37",
  naranja: "#F97316", orange: "#F97316",
  coral: "#FB7185", salmon: "#FA8072",
  rosa: "#EC4899", rosado: "#F472B6", pink: "#EC4899",
  fucsia: "#D946EF", lila: "#C084FC", lavanda: "#A855F7",
  morado: "#7C3AED", purpura: "#6D28D9", violeta: "#8B5CF6",
  unico: "#9CA3AF", única: "#9CA3AF",
};

export function getColorHex(name: string): string {
  const clean = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!clean) return "#9CA3AF";
  if (COLOR_NAMES_MAP[clean]) return COLOR_NAMES_MAP[clean];
  for (const [key, hex] of Object.entries(COLOR_NAMES_MAP)) {
    if (clean.includes(key) || key.includes(clean)) return hex;
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`;
}

export interface VarianteItem {
  id: string;
  producto_id?: string;
  color: string;
  talla: string | null;
  sku: string | null;
  stock_actual: number;
  stock_minimo: number;
}

export interface ProductoDetalle {
  id: string;
  nombre: string;
  codigo_interno: string;
  categoria_id?: string | null;
  descripcion?: string | null;
  nomenclatura?: string | null;
  activo?: boolean;
  categorias?: { id?: string; nombre: string } | null;
  variantes_producto: VarianteItem[];
}

interface CategoriaOption {
  id: string;
  nombre: string;
}

interface ProductoDetalleSheetProps {
  producto: ProductoDetalle | null;
  categorias: CategoriaOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductoDetalleSheet({
  producto,
  categorias,
  open,
  onOpenChange,
}: ProductoDetalleSheetProps) {
  const [tab, setTab] = useState<"variantes" | "info">("variantes");
  const [searchVariante, setSearchVariante] = useState("");
  const [colorFilter, setColorFilter] = useState<string | null>(null);

  // Form nueva variante
  const [showAddForm, setShowAddForm] = useState(false);
  const [newColor, setNewColor] = useState("");
  const [newTalla, setNewTalla] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newStockMin, setNewStockMin] = useState(0);
  const [isPendingAdd, startAddTransition] = useTransition();

  // Edición general del producto
  const [editNombre, setEditNombre] = useState("");
  const [editCodigo, setEditCodigo] = useState("");
  const [editCategoriaId, setEditCategoriaId] = useState("");
  const [editDescripcion, setEditDescripcion] = useState("");
  const [editNomenclatura, setEditNomenclatura] = useState("");
  const [isPendingEditProd, startEditProdTransition] = useTransition();

  // Modal editar variante
  const [editingVariante, setEditingVariante] = useState<VarianteItem | null>(null);
  const [editVarColor, setEditVarColor] = useState("");
  const [editVarTalla, setEditVarTalla] = useState("");
  const [editVarSku, setEditVarSku] = useState("");
  const [editVarStockMin, setEditVarStockMin] = useState(0);
  const [isPendingEditVar, startEditVarTransition] = useTransition();

  // Eliminar variante
  const [deletingVariante, setDeletingVariante] = useState<VarianteItem | null>(null);
  const [isPendingDeleteVar, startDeleteVarTransition] = useTransition();

  // Sincronizar estado cuando se abre con un producto
  const [lastProdId, setLastProdId] = useState<string | null>(null);
  if (producto && producto.id !== lastProdId) {
    setLastProdId(producto.id);
    setEditNombre(producto.nombre);
    setEditCodigo(producto.codigo_interno);
    setEditCategoriaId(producto.categoria_id || "");
    setEditDescripcion(producto.descripcion || "");
    setEditNomenclatura(producto.nomenclatura || "");
    setShowAddForm(false);
    setSearchVariante("");
    setColorFilter(null);
  }

  if (!producto) return null;

  const totalStock = producto.variantes_producto.reduce(
    (acc, v) => acc + (v.stock_actual || 0),
    0
  );
  const totalSkus = producto.variantes_producto.length;
  const uniqueColors = Array.from(
    new Map(
      producto.variantes_producto.map((v) => [v.color.toLowerCase().trim(), v.color.trim()])
    ).values()
  );
  const hasLowStock = producto.variantes_producto.some(
    (v) => v.stock_actual <= v.stock_minimo
  );

  // Filtrar variantes para la lista
  const filteredVariantes = producto.variantes_producto.filter((v) => {
    const matchSearch =
      !searchVariante ||
      v.color.toLowerCase().includes(searchVariante.toLowerCase()) ||
      (v.talla && v.talla.toLowerCase().includes(searchVariante.toLowerCase())) ||
      (v.sku && v.sku.toLowerCase().includes(searchVariante.toLowerCase()));
    const matchColor = !colorFilter || v.color.toLowerCase().trim() === colorFilter.toLowerCase().trim();
    return matchSearch && matchColor;
  });

  // Generar sugerencia automática de SKU al tipear color o talla
  function handleColorChange(val: string) {
    setNewColor(val);
    if (producto) {
      const cCode = val.trim().substring(0, 3).toUpperCase();
      const tCode = newTalla.trim() ? `-${newTalla.trim().toUpperCase()}` : "";
      setNewSku(`${producto.codigo_interno}-${cCode}${tCode}`);
    }
  }

  function handleTallaChange(val: string) {
    setNewTalla(val);
    if (producto && newColor) {
      const cCode = newColor.trim().substring(0, 3).toUpperCase();
      const tCode = val.trim() ? `-${val.trim().toUpperCase()}` : "";
      setNewSku(`${producto.codigo_interno}-${cCode}${tCode}`);
    }
  }

  function handleCrearVariante(e: React.FormEvent) {
    e.preventDefault();
    if (!producto) return;
    if (!newColor.trim()) {
      toast.error("El color es obligatorio");
      return;
    }

    const prodId = producto.id;
    startAddTransition(async () => {
      const res = await crearVarianteDirecta({
        producto_id: prodId,
        color: newColor.trim(),
        talla: newTalla.trim() || null,
        sku: newSku.trim() || null,
        stock_minimo: Number(newStockMin) || 0,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Variante (${newColor} ${newTalla || ""}) agregada exitosamente`);
        setNewColor("");
        setNewTalla("");
        setNewSku("");
        setNewStockMin(0);
        setShowAddForm(false);
      }
    });
  }

  function handleGuardarProducto(e: React.FormEvent) {
    e.preventDefault();
    if (!producto) return;
    if (!editNombre.trim() || !editCodigo.trim()) {
      toast.error("Nombre y código interno son obligatorios");
      return;
    }

    const prodId = producto.id;
    const formData = new FormData();
    formData.set("nombre", editNombre.trim());
    formData.set("codigo_interno", editCodigo.trim());
    if (editCategoriaId) formData.set("categoria_id", editCategoriaId);
    if (editDescripcion) formData.set("descripcion", editDescripcion.trim());
    if (editNomenclatura) formData.set("nomenclatura", editNomenclatura.trim());

    startEditProdTransition(async () => {
      const res = await actualizarProducto(prodId, formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Producto actualizado correctamente");
      }
    });
  }

  function openEditVarianteModal(v: VarianteItem) {
    setEditingVariante(v);
    setEditVarColor(v.color);
    setEditVarTalla(v.talla || "");
    setEditVarSku(v.sku || "");
    setEditVarStockMin(v.stock_minimo ?? 0);
  }

  function handleActualizarVariante(e: React.FormEvent) {
    e.preventDefault();
    if (!producto || !editingVariante) return;
    if (!editVarColor.trim()) {
      toast.error("El color es obligatorio");
      return;
    }

    const prodId = producto.id;
    const formData = new FormData();
    formData.set("producto_id", prodId);
    formData.set("color", editVarColor.trim());
    if (editVarTalla.trim()) formData.set("talla", editVarTalla.trim());
    if (editVarSku.trim()) formData.set("sku", editVarSku.trim());
    formData.set("stock_minimo", String(editVarStockMin || 0));

    startEditVarTransition(async () => {
      const res = await actualizarVariante(editingVariante.id, formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Variante actualizada exitosamente");
        setEditingVariante(null);
      }
    });
  }

  function handleEliminarVarianteConfirm() {
    if (!deletingVariante) return;
    startDeleteVarTransition(async () => {
      const res = await eliminarVariante(deletingVariante.id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Variante (${deletingVariante.color} ${deletingVariante.talla || ""}) eliminada`);
        setDeletingVariante(null);
      }
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="data-[side=right]:sm:max-w-xl data-[side=right]:md:max-w-2xl sm:max-w-xl md:max-w-2xl w-full p-0 flex flex-col h-full bg-background border-l border-border shadow-2xl"
        >
          {/* ── Encabezado Principal ─────────────────────────────────── */}
          <div className="p-5 border-b border-border/70 bg-muted/20 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border border-border/80 text-foreground">
                    {producto.codigo_interno}
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
              <div className="rounded-xl border border-border/60 bg-card p-2.5 flex items-center gap-2.5 shadow-xs">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase">SKUs</p>
                  <p className="text-sm font-bold text-foreground">{totalSkus}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-2.5 flex items-center gap-2.5 shadow-xs">
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase">Colores</p>
                  <p className="text-sm font-bold text-foreground">{uniqueColors.length}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-2.5 flex items-center gap-2.5 shadow-xs">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase">Stock Total</p>
                  <p
                    className={`text-sm font-bold ${
                      totalStock === 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {totalStock} uds.
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs Segmentados */}
            <div className="flex items-center p-1 bg-muted/70 rounded-xl mt-1 border border-border/50">
              <button
                type="button"
                onClick={() => setTab("variantes")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  tab === "variantes"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Variantes & SKUs ({totalSkus})
              </button>
              <button
                type="button"
                onClick={() => setTab("info")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  tab === "info"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar Producto
              </button>
            </div>
          </div>

          {/* ── Cuerpo del Drawer ───────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {tab === "variantes" ? (
              <div className="space-y-4">
                {/* Botón para desplegar formulario de añadir variante */}
                <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {showAddForm ? "Ocultar formulario de variante" : "+ Agregar nueva variante a este producto"}
                      </span>
                    </div>
                    {showAddForm ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Formulario para añadir nueva variante */}
                  {showAddForm && (
                    <form onSubmit={handleCrearVariante} className="p-4 border-t border-border/60 bg-muted/10 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="new-color" className="text-xs">
                            Color *
                          </Label>
                          <Input
                            id="new-color"
                            value={newColor}
                            onChange={(e) => handleColorChange(e.target.value)}
                            placeholder="Ej. Negro, Azul, Verde"
                            required
                            disabled={isPendingAdd}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="new-talla" className="text-xs">
                            Talla / Medida
                          </Label>
                          <Input
                            id="new-talla"
                            value={newTalla}
                            onChange={(e) => handleTallaChange(e.target.value)}
                            placeholder="Ej. S, M, L, 32, Única"
                            disabled={isPendingAdd}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="new-sku" className="text-xs">
                            SKU (Identificador)
                          </Label>
                          <Input
                            id="new-sku"
                            value={newSku}
                            onChange={(e) => setNewSku(e.target.value)}
                            placeholder="Ej. POL-NEG-M"
                            disabled={isPendingAdd}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="new-stock-min" className="text-xs">
                            Stock Mínimo
                          </Label>
                          <Input
                            id="new-stock-min"
                            type="number"
                            min="0"
                            value={newStockMin}
                            onChange={(e) => setNewStockMin(Number(e.target.value))}
                            disabled={isPendingAdd}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddForm(false)}
                          disabled={isPendingAdd}
                          className="h-8 text-xs"
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" size="sm" disabled={isPendingAdd} className="h-8 text-xs gap-1.5">
                          {isPendingAdd ? "Guardando..." : "Guardar Variante"}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Filtros dentro de la lista de variantes */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar por color, talla o SKU..."
                      value={searchVariante}
                      onChange={(e) => setSearchVariante(e.target.value)}
                      className="pl-8 h-8 text-xs bg-card"
                    />
                  </div>
                </div>

                {/* Filtro rápido por color si hay varios */}
                {uniqueColors.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    <button
                      type="button"
                      onClick={() => setColorFilter(null)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all shrink-0 ${
                        !colorFilter
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border/70 text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      Todos ({producto.variantes_producto.length})
                    </button>
                    {uniqueColors.map((color) => {
                      const hex = getColorHex(color);
                      const isSelected = colorFilter?.toLowerCase().trim() === color.toLowerCase().trim();
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setColorFilter(isSelected ? null : color)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all shrink-0 ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border/70 text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: hex }}
                          />
                          {color}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Lista de Variantes */}
                {filteredVariantes.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-xl text-muted-foreground space-y-2">
                    <Layers className="w-8 h-8 mx-auto opacity-40" />
                    <p className="text-xs font-medium">
                      {searchVariante || colorFilter
                        ? "No hay variantes que coincidan con la búsqueda."
                        : "Este producto no tiene variantes registradas."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredVariantes.map((v) => {
                      const hex = getColorHex(v.color);
                      const isLight = ["#F9FAFB", "#F5F5DC", "#EFEBD9", "#D7C4A5", "#D1D5DB"].includes(hex);
                      const isZero = v.stock_actual === 0;
                      const isLow = v.stock_actual <= v.stock_minimo;

                      return (
                        <div
                          key={v.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-card hover:border-border transition-all shadow-2xs group"
                        >
                          {/* Color + Talla + SKU */}
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-5 h-5 rounded-full shrink-0 shadow-xs"
                              title={v.color}
                              style={{
                                backgroundColor: hex,
                                border: isLight ? "1px solid #d1d5db" : "none",
                              }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-foreground capitalize">
                                  {v.color}
                                </span>
                                {v.talla && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold uppercase">
                                    {v.talla}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-mono text-[11px] text-muted-foreground truncate">
                                {v.sku || "Sin SKU"}
                              </p>
                            </div>
                          </div>

                          {/* Stock + Acciones */}
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <Badge
                                variant={isZero || isLow ? "destructive" : "outline"}
                                className={`text-[11px] font-semibold ${
                                  !isZero && !isLow
                                    ? "text-emerald-600 border-emerald-500/40 bg-emerald-500/10"
                                    : ""
                                }`}
                              >
                                {v.stock_actual} uds.
                              </Badge>
                              {v.stock_minimo > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Mín: {v.stock_minimo}
                                </p>
                              )}
                            </div>

                            {/* Botones de acción */}
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditVarianteModal(v)}
                                title="Editar variante"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingVariante(v)}
                                title="Eliminar variante"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ── Pestaña: Editar Información del Producto ────────── */
              <form onSubmit={handleGuardarProducto} className="space-y-4">
                <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-4 shadow-xs">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    Datos Generales
                  </h3>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-sheet-nombre">Nombre del Producto *</Label>
                    <Input
                      id="edit-sheet-nombre"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      required
                      disabled={isPendingEditProd}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-sheet-codigo">Código Interno *</Label>
                    <Input
                      id="edit-sheet-codigo"
                      value={editCodigo}
                      onChange={(e) => setEditCodigo(e.target.value)}
                      required
                      disabled={isPendingEditProd}
                      className="font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Categoría</Label>
                    <Select
                      value={editCategoriaId}
                      onValueChange={(val) => setEditCategoriaId(val ?? "")}
                      disabled={isPendingEditProd}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría..." />
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

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-sheet-desc">Descripción / Nomenclatura (Opcional)</Label>
                    <Input
                      id="edit-sheet-desc"
                      value={editDescripcion}
                      onChange={(e) => setEditDescripcion(e.target.value)}
                      placeholder="Detalles sobre el producto, tela o especificación..."
                      disabled={isPendingEditProd}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditNombre(producto.nombre);
                      setEditCodigo(producto.codigo_interno);
                      setEditCategoriaId(producto.categoria_id || "");
                      setEditDescripcion(producto.descripcion || "");
                    }}
                    disabled={isPendingEditProd}
                  >
                    Revertir
                  </Button>
                  <Button type="submit" disabled={isPendingEditProd} className="gap-2">
                    <Check className="w-4 h-4" />
                    {isPendingEditProd ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Modal para Editar una Variante Individual ──────────────── */}
      {editingVariante && (
        <Dialog open={!!editingVariante} onOpenChange={(op) => !op && setEditingVariante(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-primary" />
                Editar Variante / SKU
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleActualizarVariante} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-var-color">Color *</Label>
                  <Input
                    id="edit-var-color"
                    value={editVarColor}
                    onChange={(e) => setEditVarColor(e.target.value)}
                    required
                    disabled={isPendingEditVar}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-var-talla">Talla / Medida</Label>
                  <Input
                    id="edit-var-talla"
                    value={editVarTalla}
                    onChange={(e) => setEditVarTalla(e.target.value)}
                    placeholder="Ej. S, M, 32"
                    disabled={isPendingEditVar}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-var-sku">SKU</Label>
                  <Input
                    id="edit-var-sku"
                    value={editVarSku}
                    onChange={(e) => setEditVarSku(e.target.value)}
                    disabled={isPendingEditVar}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-var-stock-min">Stock Mínimo</Label>
                  <Input
                    id="edit-var-stock-min"
                    type="number"
                    min="0"
                    value={editVarStockMin}
                    onChange={(e) => setEditVarStockMin(Number(e.target.value))}
                    disabled={isPendingEditVar}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingVariante(null)}
                  disabled={isPendingEditVar}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPendingEditVar}>
                  {isPendingEditVar ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Confirm Dialog para Eliminar Variante ───────────────────── */}
      <ConfirmDialog
        open={!!deletingVariante}
        onOpenChange={(op) => !op && setDeletingVariante(null)}
        title="¿Eliminar esta variante?"
        description={`Se eliminará la variante (${deletingVariante?.color} ${deletingVariante?.talla || ""}) con SKU "${deletingVariante?.sku || "sin SKU"}". Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar variante"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={isPendingDeleteVar}
        onConfirm={handleEliminarVarianteConfirm}
      />
    </>
  );
}
