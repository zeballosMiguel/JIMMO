"use client";

import { useState, useTransition } from "react";
import { crearProductoCompleto, type VarianteCompletaInput } from "@/features/catalogos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Package,
  Check,
  X,
  Palette,
  Boxes,
  Copy,
  ChevronRight,
} from "lucide-react";

interface CategoriaOption {
  id: string;
  nombre: string;
}

interface ProductoTodoEnUnoDialogProps {
  categorias: CategoriaOption[];
  triggerButton?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (nuevoProducto: any) => void;
}

interface VarianteRow extends VarianteCompletaInput {
  idLocal: string;
}

interface ColorConfig {
  id: string;
  color: string;
  hex?: string;
  tallas: string[];
}

// 5 Colores esenciales más usados
const PRESET_COLORES = [
  { nombre: "Negro", hex: "#111827" },
  { nombre: "Blanco", hex: "#F9FAFB", border: true },
  { nombre: "Gris", hex: "#6B7280" },
  { nombre: "Beige", hex: "#D7C4A5" },
  { nombre: "Azul Marino", hex: "#1E3A8A" },
];

// Diccionario inteligente de colores en español
const COLOR_NAMES_MAP: Record<string, string> = {
  negro: "#111827",
  black: "#111827",
  blanco: "#F9FAFB",
  white: "#F9FAFB",
  gris: "#6B7280",
  gray: "#6B7280",
  plomo: "#64748B",
  "gris oscuro": "#374151",
  "gris claro": "#D1D5DB",
  azul: "#2563EB",
  blue: "#2563EB",
  "azul marino": "#1E3A8A",
  navy: "#1E3A8A",
  celeste: "#38BDF8",
  turquesa: "#06B6D4",
  petroleo: "#0F4C5C",
  rojo: "#DC2626",
  red: "#DC2626",
  vino: "#722F37",
  bordo: "#6B1D2F",
  borgoña: "#800020",
  granate: "#800000",
  verde: "#16A34A",
  green: "#16A34A",
  "verde militar": "#4B5320",
  oliva: "#556B2F",
  esmeralda: "#059669",
  musgo: "#355E3B",
  menta: "#86EFAC",
  beige: "#D7C4A5",
  crema: "#F5F5DC",
  hueso: "#EFEBD9",
  arena: "#C2B280",
  marron: "#78350F",
  cafe: "#5C3317",
  chocolate: "#3D2314",
  terracota: "#C85A32",
  ladrillo: "#B22222",
  canela: "#7B3F00",
  amarillo: "#EAB308",
  yellow: "#EAB308",
  mostaza: "#D97706",
  dorado: "#D4AF37",
  naranja: "#F97316",
  orange: "#F97316",
  coral: "#FB7185",
  salmon: "#FA8072",
  rosa: "#EC4899",
  rosado: "#F472B6",
  pink: "#EC4899",
  fucsia: "#D946EF",
  lila: "#C084FC",
  lavanda: "#A855F7",
  morado: "#7C3AED",
  purpura: "#6D28D9",
  violeta: "#8B5CF6",
};

function detectColorHex(name: string): string {
  const clean = name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!clean) return "#9CA3AF";
  if (COLOR_NAMES_MAP[clean]) return COLOR_NAMES_MAP[clean];
  for (const [key, hex] of Object.entries(COLOR_NAMES_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return hex;
    }
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 45%)`;
}



function getAbbreviation(text: string, len: number = 3): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, len)
    .toUpperCase();
}

export function ProductoTodoEnUnoDialog({
  categorias,
  triggerButton,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  onSuccess,
}: ProductoTodoEnUnoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (isControlled) {
      externalOnOpenChange?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [isPending, startTransition] = useTransition();

  // Paso 1: Producto base
  const [nombre, setNombre] = useState("");
  const [codigoInterno, setCodigoInterno] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");

  // Crear categoría en caliente
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");

  // Paso 2: Colores y sus tallas específicas
  const [coloresConfig, setColoresConfig] = useState<ColorConfig[]>([]);
  const [nuevoColor, setNuevoColor] = useState("");
  const [curvaPorDefecto, setCurvaPorDefecto] = useState<string[]>([
    "PP",
    "P",
    "M",
    "G",
    "GG",
  ]);

  // Input de talla inline por color: Map { [colorId]: string }
  const [inputTallaPorColor, setInputTallaPorColor] = useState<Record<string, string>>({});

  // Paso 3: Variantes generadas
  const [variantes, setVariantes] = useState<VarianteRow[]>([]);



  // Sincroniza las filas de variantes cuando cambian los colores/tallas
  function syncVariantes(
    newConfig: ColorConfig[],
    code: string = codigoInterno
  ) {
    const baseCode = code.trim().toUpperCase() || "PROD";

    setVariantes((prevVariantes) => {
      // Guardar mapa de valores existentes para no perder stock/costo ya tipeados
      const prevMap = new Map<string, VarianteRow>();
      prevVariantes.forEach((v) => {
        const key = `${v.color.toLowerCase()}__${(v.talla || "Única").toLowerCase()}`;
        prevMap.set(key, v);
      });

      const nextRows: VarianteRow[] = [];

      newConfig.forEach((cfg) => {
        const tallas = cfg.tallas.length > 0 ? cfg.tallas : ["Única"];
        tallas.forEach((t) => {
          const key = `${cfg.color.toLowerCase()}__${t.toLowerCase()}`;
          const existing = prevMap.get(key);

          if (existing) {
            nextRows.push({
              ...existing,
              color: cfg.color,
              talla: t === "Única" ? null : t,
            });
          } else {
            const colorAbbr = getAbbreviation(cfg.color, 3);
            const tallaAbbr = t === "Única" ? "UNI" : getAbbreviation(t, 4);
            nextRows.push({
              idLocal: `${cfg.color}-${t}-${Math.random().toString(36).substr(2, 6)}`,
              color: cfg.color,
              talla: t === "Única" ? null : t,
              sku: `${baseCode}-${colorAbbr}-${tallaAbbr}`,
              stock_minimo: 0,
              stock_inicial: 0,
              costo_unitario_bs: null,
            });
          }
        });
      });

      return nextRows;
    });
  }

  // Sugerencia automática de código interno
  function handleNombreChange(val: string) {
    setNombre(val);
    if (!codigoInterno || codigoInterno.trim() === "") {
      const words = val.trim().split(/\s+/).filter(Boolean);
      if (words.length > 0) {
        const auto = words
          .slice(0, 3)
          .map((w) => getAbbreviation(w, 3))
          .join("-");
        setCodigoInterno(auto);
        syncVariantes(coloresConfig, auto);
      }
    }
  }

  function handleCodigoChange(val: string) {
    const upper = val.toUpperCase();
    setCodigoInterno(upper);
    syncVariantes(coloresConfig, upper);
  }

  // Alternar selección de un color preestablecido
  function togglePresetColor(c: { nombre: string; hex: string }) {
    const exists = coloresConfig.some(
      (item) => item.color.toLowerCase() === c.nombre.toLowerCase()
    );

    let next: ColorConfig[];
    if (exists) {
      next = coloresConfig.filter((item) => item.color.toLowerCase() !== c.nombre.toLowerCase());
    } else {
      // Si ya hay otros colores con tallas, copiar la curva del primero; si no, la curva por defecto
      const tallasIniciales =
        coloresConfig.length > 0 && coloresConfig[0].tallas.length > 0
          ? [...coloresConfig[0].tallas]
          : [...curvaPorDefecto];

      next = [
        ...coloresConfig,
        {
          id: `${c.nombre}-${Date.now()}`,
          color: c.nombre,
          hex: c.hex,
          tallas: tallasIniciales,
        },
      ];
    }
    setColoresConfig(next);
    syncVariantes(next);
  }

  // Agregar color personalizado
  function handleAddCustomColor(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const clean = nuevoColor.trim();
    if (!clean) return;

    if (!coloresConfig.some((item) => item.color.toLowerCase() === clean.toLowerCase())) {
      const tallasIniciales =
        coloresConfig.length > 0 && coloresConfig[0].tallas.length > 0
          ? [...coloresConfig[0].tallas]
          : [...curvaPorDefecto];

      const next = [
        ...coloresConfig,
        {
          id: `${clean}-${Date.now()}`,
          color: clean,
          hex: detectColorHex(clean),
          tallas: tallasIniciales,
        },
      ];
      setColoresConfig(next);
      syncVariantes(next);
    }
    setNuevoColor("");
  }

  // Eliminar tarjeta de color
  function removeColorCard(colorId: string) {
    const next = coloresConfig.filter((c) => c.id !== colorId);
    setColoresConfig(next);
    syncVariantes(next);
  }

  // Aplicar curva de tallas a un color específico
  function applyCurvaToColor(colorId: string, tallas: string[]) {
    const next = coloresConfig.map((c) => (c.id === colorId ? { ...c, tallas: [...tallas] } : c));
    setColoresConfig(next);
    syncVariantes(next);
  }

  // Copiar tallas de un color específico a todos los demás
  function copySizesFromColorToAll(sourceColorId: string) {
    const source = coloresConfig.find((c) => c.id === sourceColorId);
    if (!source) return;
    const next = coloresConfig.map((c) => ({ ...c, tallas: [...source.tallas] }));
    setColoresConfig(next);
    syncVariantes(next);
    toast.success(`Tallas de ${source.color} copiadas a todos los colores.`);
  }

  // Quitar una talla de un color específico
  function removeSizeFromColor(colorId: string, tallaToRemove: string) {
    const next = coloresConfig.map((c) =>
      c.id === colorId ? { ...c, tallas: c.tallas.filter((t) => t !== tallaToRemove) } : c
    );
    setColoresConfig(next);
    syncVariantes(next);
  }

  // Agregar una talla a un color específico (con botón o Enter)
  function addSizeToColor(colorId: string) {
    const raw = (inputTallaPorColor[colorId] || "").trim().toUpperCase();
    if (!raw) return;

    const next = coloresConfig.map((c) => {
      if (c.id !== colorId) return c;
      if (c.tallas.some((t) => t.toUpperCase() === raw)) return c;
      return { ...c, tallas: [...c.tallas, raw] };
    });

    setColoresConfig(next);
    syncVariantes(next);
    setInputTallaPorColor((prev) => ({ ...prev, [colorId]: "" }));
  }

  // Toggle rápido de una talla en un color específico
  function toggleSizeInColor(colorId: string, sizeName: string) {
    const target = coloresConfig.find((c) => c.id === colorId);
    if (!target) return;

    const hasIt = target.tallas.includes(sizeName);
    const updatedSizes = hasIt
      ? target.tallas.filter((t) => t !== sizeName)
      : [...target.tallas, sizeName];

    const next = coloresConfig.map((c) => (c.id === colorId ? { ...c, tallas: updatedSizes } : c));
    setColoresConfig(next);
    syncVariantes(next);
  }


  // Modificar campo de una variante específica
  function updateVariante(idLocal: string, field: keyof VarianteRow, val: any) {
    setVariantes((prev) =>
      prev.map((v) => (v.idLocal === idLocal ? { ...v, [field]: val } : v))
    );
  }

  // Eliminar variante de la tabla
  function removeVariante(idLocal: string) {
    setVariantes((prev) => prev.filter((v) => v.idLocal !== idLocal));
  }

  // Reset del formulario
  function resetForm() {
    setNombre("");
    setCodigoInterno("");
    setDescripcion("");
    setCategoriaId("");
    setIsCreatingCat(false);
    setNuevaCategoriaNombre("");
    setColoresConfig([]);
    setVariantes([]);
    setInputTallaPorColor({});
  }


  // Submit final
  function handleSubmit() {
    if (!nombre.trim()) {
      toast.error("Por favor ingresa el nombre del producto.");
      return;
    }
    if (!codigoInterno.trim()) {
      toast.error("Por favor ingresa el código interno del producto.");
      return;
    }

    if (variantes.length === 0) {
      toast.error("Selecciona al menos un color y una talla para generar el producto.");
      return;
    }

    startTransition(async () => {
      const payload = {
        nombre: nombre.trim(),
        codigo_interno: codigoInterno.trim().toUpperCase(),
        categoria_id: categoriaId && categoriaId !== "nueva" ? categoriaId : null,
        nueva_categoria: isCreatingCat ? nuevaCategoriaNombre.trim() : null,
        descripcion: descripcion.trim() || null,
        nomenclatura: null,
        variantes: variantes.map((v) => ({
          color: v.color.trim(),
          talla: v.talla ? v.talla.trim() : null,
          sku: v.sku ? v.sku.trim().toUpperCase() : null,
          stock_minimo: Number(v.stock_minimo) || 0,
          stock_inicial: 0,
          costo_unitario_bs: null,
        })),
      };

      const res = await crearProductoCompleto(payload);

      if (res?.error) {
        toast.error(res.error);
      } else {
        const unidades = res.unidadesStock ?? 0;
        toast.success(
          `¡Producto "${nombre}" creado con éxito con ${res.variantesCount ?? 0} variantes!` +
            (unidades > 0 ? ` (${unidades} unidades ingresadas a inventario)` : "")
        );
        resetForm();
        setOpen(false);
        if (onSuccess) {
          onSuccess(res);
        }
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) resetForm();
      }}
    >
      {triggerButton ? (
        <span onClick={() => setOpen(true)} className="inline-block cursor-pointer">
          {triggerButton}
        </span>
      ) : (
        <Button
          onClick={() => setOpen(true)}
          className="gap-2 bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-all font-medium"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          Nuevo producto (Todo en uno)
        </Button>
      )}

      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Cabecera fija */}
        <DialogHeader className="p-6 pb-4 border-b border-border/80 shrink-0 bg-card">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Boxes className="w-5 h-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Nuevo Producto — Todo en Uno
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Define el producto base, asigna tallas exactas por cada color y carga tu stock inicial en un solo paso.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECCIÓN 1: DATOS DEL PRODUCTO BASE */}
          <div className="space-y-4 bg-muted/20 border border-border/70 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="w-4 h-4 text-primary" />
              <span>1. Información del Producto Base</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                <Label htmlFor="prod-nombre" className="text-xs font-medium">
                  Nombre del producto *
                </Label>
                <Input
                  id="prod-nombre"
                  placeholder="Ej. Polera Oversize Heavyweight"
                  value={nombre}
                  onChange={(e) => handleNombreChange(e.target.value)}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-codigo" className="text-xs font-medium">
                  Código interno *
                </Label>
                <Input
                  id="prod-codigo"
                  placeholder="Ej. POL-OVR"
                  value={codigoInterno}
                  onChange={(e) => handleCodigoChange(e.target.value)}
                  disabled={isPending}
                  className="font-mono uppercase font-semibold"
                />
              </div>

              {/* Categoría con creación inline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Categoría</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs text-primary gap-1"
                    onClick={() => {
                      setIsCreatingCat(!isCreatingCat);
                      setCategoriaId("");
                    }}
                  >
                    {isCreatingCat ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {isCreatingCat ? "Cancelar" : "+ Nueva"}
                  </Button>
                </div>

                {isCreatingCat ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre de la categoría..."
                      value={nuevaCategoriaNombre}
                      onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                      disabled={isPending}
                      className="border-primary/50 focus-visible:ring-primary"
                      autoFocus
                    />
                  </div>
                ) : (
                  <Select
                    value={categoriaId}
                    onValueChange={(val) => setCategoriaId(val ?? "")}
                    disabled={isPending}
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
                )}
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: COLORES Y TALLAS POR COLOR */}
          <div className="space-y-4 bg-muted/20 border border-border/70 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Palette className="w-4 h-4 text-primary" />
                <span>2. Colores y Tallas por Color</span>
              </div>
              <Badge variant="outline" className="text-xs font-medium self-start sm:self-auto">
                {coloresConfig.length} colores •{" "}
                <strong className="text-primary ml-1">{variantes.length} variantes</strong>
              </Badge>
            </div>

            {/* Selector de colores superior (solo 5 básicos + input con detección en vivo) */}
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground block font-medium">
                Paso A: Elige los colores de la prenda:
              </span>

              <div className="flex flex-wrap items-center gap-2.5">
                {/* 5 Colores básicos infaltables */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] font-medium text-muted-foreground mr-1">Básicos:</span>
                  {PRESET_COLORES.map((c) => {
                    const selected = coloresConfig.some(
                      (item) => item.color.toLowerCase() === c.nombre.toLowerCase()
                    );
                    return (
                      <button
                        key={c.nombre}
                        type="button"
                        onClick={() => togglePresetColor(c)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background border-border/80 text-foreground hover:border-primary/60"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: c.hex,
                            border: c.border ? "1px solid #d1d5db" : "none",
                          }}
                        />
                        {c.nombre}
                        {selected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>

                <div className="hidden sm:block h-4 w-px bg-border/80" />

                {/* Escribir cualquier color con detección visual en vivo */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[240px] max-w-sm">
                  <div className="relative flex-1">
                    <span
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-border/70 transition-all duration-300 shadow-xs"
                      style={{
                        backgroundColor: nuevoColor.trim() ? detectColorHex(nuevoColor) : "#9CA3AF",
                      }}
                    />
                    <Input
                      placeholder="Escribe otro color (ej. Vino, Mostaza, Militar)..."
                      value={nuevoColor}
                      onChange={(e) => setNuevoColor(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomColor();
                        }
                      }}
                      className="h-8 pl-8 text-xs bg-background"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCustomColor}
                    className="h-8 px-2.5 text-xs font-medium gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </Button>
                </div>
              </div>
            </div>



            {/* Tarjetas individuales por Color */}
            <div className="space-y-2.5 pt-1">
              <span className="text-xs text-muted-foreground block font-medium">
                Paso B: Personaliza las tallas de cada color (pueden variar según lo que tengas en stock):
              </span>

              {coloresConfig.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                  Selecciona uno o más colores arriba para definir sus tallas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {coloresConfig.map((cfg) => {
                    const colorInputTalla = inputTallaPorColor[cfg.id] || "";
                    return (
                      <div
                        key={cfg.id}
                        className="rounded-xl border border-border/80 bg-card p-3 shadow-xs space-y-2.5 hover:border-primary/40 transition-colors"
                      >
                        {/* Cabecera de la tarjeta del color */}
                        <div className="flex items-center justify-between border-b border-border/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full border border-border/50 shrink-0"
                              style={{ backgroundColor: cfg.hex || "#333" }}
                            />
                            <span className="text-xs font-bold text-foreground">{cfg.color}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {cfg.tallas.length} tallas
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1">
                            {coloresConfig.length > 1 && (
                              <button
                                type="button"
                                onClick={() => copySizesFromColorToAll(cfg.id)}
                                className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-muted"
                                title="Copiar estas mismas tallas a todos los demás colores"
                              >
                                <Copy className="w-3 h-3" />
                                Copiar a todos
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeColorCard(cfg.id)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10"
                              title="Quitar color"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Atajos de curvas rápidas para este color */}
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mr-0.5">
                            Curva:
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              applyCurvaToColor(cfg.id, ["PP", "P", "M", "G", "GG"])
                            }
                            className="text-[9px] font-medium px-1.5 py-[1.5px] rounded border border-border/60 bg-muted/40 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all leading-tight"
                          >
                            PP-GG
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              applyCurvaToColor(cfg.id, [
                                "S",
                                "M",
                                "L",
                                "XL",
                                "2XL",
                                "3XL",
                                "4XL",
                              ])
                            }
                            className="text-[9px] font-medium px-1.5 py-[1.5px] rounded border border-border/60 bg-muted/40 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all leading-tight"
                          >
                            S-4XL
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              applyCurvaToColor(cfg.id, [
                                "28",
                                "30",
                                "32",
                                "34",
                                "36",
                                "38",
                              ])
                            }
                            className="text-[9px] font-medium px-1.5 py-[1.5px] rounded border border-border/60 bg-muted/40 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all leading-tight"
                          >
                            28-38
                          </button>
                          <button
                            type="button"
                            onClick={() => applyCurvaToColor(cfg.id, ["Única"])}
                            className="text-[9px] font-medium px-1.5 py-[1.5px] rounded border border-border/60 bg-muted/40 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all leading-tight"
                          >
                            Única
                          </button>
                        </div>

                        {/* Pills de tallas activas para este color */}
                        <div className="flex flex-wrap gap-1 items-center min-h-7">
                          {cfg.tallas.length === 0 ? (
                            <span className="text-[11px] text-amber-500 italic">
                              Sin tallas (se creará como Talla Única)
                            </span>
                          ) : (
                            cfg.tallas.map((t) => (
                              <span
                                key={t}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                              >
                                {t}
                                <button
                                  type="button"
                                  onClick={() => removeSizeFromColor(cfg.id, t)}
                                  className="hover:text-destructive hover:bg-destructive/10 rounded p-0.5"
                                  title={`Quitar talla ${t}`}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))
                          )}
                        </div>

                        {/* Input inline para tipear cualquier talla libre a este color */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <Input
                            placeholder="Escribe otra talla (ej. 3XL, 42, XL)..."
                            value={colorInputTalla}
                            onChange={(e) =>
                              setInputTallaPorColor((prev) => ({
                                ...prev,
                                [cfg.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addSizeToColor(cfg.id);
                              }
                            }}
                            className="h-7 text-xs"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => addSizeToColor(cfg.id)}
                            className="h-7 px-2 text-xs font-medium"
                          >
                            + Talla
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 3: TABLA DE VARIANTES RESULTANTES Y STOCK */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <span>3. Tabla de Variantes Generadas</span>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {variantes.length} combinaciones
                  </Badge>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Se generan automáticamente según las tallas que asignaste a cada color.
                </p>
              </div>
            </div>



            {/* Tabla de variantes */}
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-32">Color</TableHead>
                    <TableHead className="w-24">Talla</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="w-24 text-center">Stock Mín.</TableHead>
                    <TableHead className="w-12 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantes.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground text-xs"
                      >
                        Elige al menos un color arriba para visualizar las variantes que se crearán.
                      </TableCell>
                    </TableRow>
                  ) : (
                    variantes.map((v) => (
                      <TableRow key={v.idLocal} className="hover:bg-muted/20">
                        <TableCell>
                          <span className="font-medium text-xs text-foreground">{v.color}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold text-xs">
                            {v.talla || "Única"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={v.sku || ""}
                            onChange={(e) =>
                              updateVariante(v.idLocal, "sku", e.target.value.toUpperCase())
                            }
                            className="h-8 text-xs font-mono uppercase"
                            placeholder="SKU-AUTO"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={v.stock_minimo ?? 0}
                            onChange={(e) =>
                              updateVariante(v.idLocal, "stock_minimo", Number(e.target.value))
                            }
                            className="h-8 text-xs text-center"
                          />
                        </TableCell>

                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => removeVariante(v.idLocal)}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="Remover variante"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        {/* Footer fijo con resumen y botón de guardado */}
        <DialogFooter className="p-4 border-t border-border/80 bg-muted/40 shrink-0 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              Total: <strong className="text-foreground">{variantes.length}</strong> variantes
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="gap-2 bg-primary text-primary-foreground font-semibold px-5"
            >
              {isPending ? (
                <>Guardando y configurando inventario...</>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Guardar Producto y Variantes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
