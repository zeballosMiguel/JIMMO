"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { crearLoteConMultiplesProductos, type ItemCompraProductoInput } from "@/features/inventario/actions";
import { crearProductoCompleto } from "@/features/catalogos/actions";
import { ProductoTodoEnUnoDialog } from "@/features/catalogos/components/producto-todo-en-uno-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Truck,
  Calendar,
  DollarSign,
  User,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  Boxes,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface InversionistaOption {
  id: string;
  nombre: string;
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

interface CrearLoteFormProps {
  inversionistas: InversionistaOption[];
  productos?: ProductoOption[];
  categorias?: CategoriaOption[];
}

export function CrearLoteForm({
  inversionistas,
  productos: initialProductos = [],
  categorias = [],
}: CrearLoteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const todayStr = new Date().toISOString().split("T")[0];

  // Lista local de productos
  const [localProductos, setLocalProductos] = useState<ProductoOption[]>(initialProductos);
  const [showNuevoProductoModal, setShowNuevoProductoModal] = useState(false);

  // Cabecera general de la compra
  const [proveedor, setProveedor] = useState("");
  const [fechaCompra, setFechaCompra] = useState(todayStr);
  const [fechaRecepcion, setFechaRecepcion] = useState("");
  const [tipoCambio, setTipoCambio] = useState("6.96");
  const [inversionistaId, setInversionistaId] = useState("");
  const [gastosExtrasLote, setGastosExtrasLote] = useState("0");
  const [notas, setNotas] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Lista de productos que componen esta compra / bulto
  const [itemsCompra, setItemsCompra] = useState<ItemCompraProductoInput[]>([]);

  // Estado para el producto que se está agregando actualmente
  const [currentProductoId, setCurrentProductoId] = useState<string>("");
  const [currentCantidad, setCurrentCantidad] = useState<string>("20");
  const [currentCostoUsd, setCurrentCostoUsd] = useState<string>("");

  const tcNum = parseFloat(tipoCambio) || 6.96;

  // Función helper para redistribuir gastos extras del lote en partes iguales entre la cantidad de productos
  function aplicarDistribucionExtras(list: ItemCompraProductoInput[], extraTotalVal: string) {
    const extraNum = parseFloat(extraTotalVal) || 0;
    const numProds = list.length;
    if (numProds <= 0 || extraNum <= 0) {
      return list.map((item) => ({ ...item, otros_costos_bs: 0 }));
    }
    const extraPorProducto = Number((extraNum / numProds).toFixed(2));
    return list.map((item) => ({
      ...item,
      otros_costos_bs: extraPorProducto,
    }));
  }

  // Cuando cambian los gastos extras del lote, redistribuir entre los productos
  function handleGastosExtrasChange(newVal: string) {
    setGastosExtrasLote(newVal);
    setItemsCompra((prev) => aplicarDistribucionExtras(prev, newVal));
  }

  // Agregar producto a la lista de la compra
  function handleAgregarProductoALista() {
    if (!currentProductoId) {
      toast.error("Selecciona un producto del catálogo");
      setFormErrors((prev) => ({ ...prev, currentProducto: "Selecciona un producto" }));
      return;
    }

    const cant = parseInt(currentCantidad);
    if (!cant || cant <= 0 || isNaN(cant)) {
      toast.error("Ingresa una cantidad estimada mayor a 0");
      setFormErrors((prev) => ({ ...prev, currentCantidad: "Cantidad inválida" }));
      return;
    }

    const usd = parseFloat(currentCostoUsd);
    if (isNaN(usd) || usd <= 0) {
      toast.error("Ingresa el costo en dólares ($ USD) del producto");
      setFormErrors((prev) => ({ ...prev, currentCostoUsd: "Ingresa el costo en USD" }));
      return;
    }

    const prodObj = localProductos.find((p) => p.id === currentProductoId);
    if (!prodObj) return;

    // Limpiar errores del ítem
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.currentProducto;
      delete next.currentCantidad;
      delete next.currentCostoUsd;
      delete next.items;
      return next;
    });

    // Si hay gastos extras ingresados en la cabecera, los redistribuimos
    let newList: ItemCompraProductoInput[];
    const existsIndex = itemsCompra.findIndex((i) => i.producto_id === currentProductoId);

    if (existsIndex >= 0) {
      newList = [...itemsCompra];
      newList[existsIndex] = {
        producto_id: prodObj.id,
        nombre_producto: prodObj.nombre,
        cantidad: cant,
        costo_total_usd: usd,
        otros_costos_bs: 0, // se distribuye desde cabecera
      };
      toast.info(`Producto "${prodObj.nombre}" actualizado en la lista`);
    } else {
      newList = [
        ...itemsCompra,
        {
          producto_id: prodObj.id,
          nombre_producto: prodObj.nombre,
          cantidad: cant,
          costo_total_usd: usd,
          otros_costos_bs: 0, // se distribuye desde cabecera
        },
      ];
      toast.success(`"${prodObj.nombre}" añadido a la compra`);
    }

    // Redistribuir si se ingresó costo extra total del lote
    const extraNum = parseFloat(gastosExtrasLote) || 0;
    if (extraNum > 0) {
      newList = aplicarDistribucionExtras(newList, gastosExtrasLote);
    }

    setItemsCompra(newList);

    // Reset campos de adición
    setCurrentProductoId("");
    setCurrentCantidad("20");
    setCurrentCostoUsd("");
  }

  function handleQuitarProducto(index: number) {
    setItemsCompra((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      const extraNum = parseFloat(gastosExtrasLote) || 0;
      return extraNum > 0 ? aplicarDistribucionExtras(filtered, gastosExtrasLote) : filtered;
    });
  }

  // Totales acumulados consolidados
  const totales = useMemo(() => {
    const totalUds = itemsCompra.reduce((acc, i) => acc + (i.cantidad || 0), 0);
    const totalUsd = itemsCompra.reduce((acc, i) => acc + (i.costo_total_usd || 0), 0);
    const totalExtrasBs = itemsCompra.reduce((acc, i) => acc + (i.otros_costos_bs || 0), 0);
    const subtotalBs = totalUsd * tcNum;
    const inversionTotalBs = subtotalBs + totalExtrasBs;

    return {
      totalUds,
      totalUsd,
      totalExtrasBs,
      subtotalBs,
      inversionTotalBs,
    };
  }, [itemsCompra, tcNum]);

  // Guardar Lote Completo con Validaciones Estrictas
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!proveedor.trim()) {
      errors.proveedor = "El proveedor es obligatorio.";
    }

    if (!fechaCompra) {
      errors.fechaCompra = "La fecha de compra es obligatoria.";
    }

    if (isNaN(tcNum) || tcNum <= 0) {
      errors.tipoCambio = "El tipo de cambio debe ser mayor a 0.";
    }

    if (itemsCompra.length === 0) {
      errors.items = "Debes agregar al menos 1 producto a la compra.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    startTransition(async () => {
      const res = await crearLoteConMultiplesProductos({
        proveedor: proveedor.trim(),
        fecha_compra: fechaCompra || null,
        fecha_recepcion: fechaRecepcion || null,
        tipo_cambio: tcNum,
        inversionista_id: inversionistaId || null,
        notas: notas.trim() || null,
        estado: "EN_TRANSITO",
        productos: itemsCompra,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success("¡Compra registrada en tránsito exitosamente!");
      router.push(`/lotes/${res.id}`);
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Encabezado ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/lotes"
            className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Registrar Nueva Compra / Lote</h1>
            <p className="text-muted-foreground text-xs mt-0.5">
              Agrega los productos y bultos de tu pedido antes de que lleguen. Las variantes (color/talla) se desglosan en la recepción.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* ── BLOQUE 1: Datos Generales y Proveedor ──────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-primary" />
            1. Cabecera del Pedido &amp; Proveedor
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="proveedor" className="text-xs font-semibold">Proveedor *</Label>
              <Input
                id="proveedor"
                placeholder="Ej. Textil Boliviana..."
                value={proveedor}
                onChange={(e) => {
                  setProveedor(e.target.value);
                  if (formErrors.proveedor) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.proveedor;
                      return next;
                    });
                  }
                }}
                disabled={isPending}
                className={`h-10 text-sm ${formErrors.proveedor ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                required
              />
              {formErrors.proveedor && (
                <p className="text-[11px] text-destructive font-medium">{formErrors.proveedor}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tipo_cambio" className="text-xs font-semibold">
                Tipo de Cambio (Bs./USD) *
              </Label>
              <Input
                id="tipo_cambio"
                type="number"
                step="0.01"
                min="0.01"
                value={tipoCambio}
                onChange={(e) => {
                  setTipoCambio(e.target.value);
                  if (formErrors.tipoCambio) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.tipoCambio;
                      return next;
                    });
                  }
                }}
                disabled={isPending}
                className={`h-10 text-sm font-mono font-bold ${formErrors.tipoCambio ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                required
              />
              {formErrors.tipoCambio && (
                <p className="text-[11px] text-destructive font-medium">{formErrors.tipoCambio}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gastos_extras_lote" className="text-xs font-semibold flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                Costos Extras Totales (Bs.)
              </Label>
              <Input
                id="gastos_extras_lote"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ej. 100.00"
                value={gastosExtrasLote}
                onChange={(e) => handleGastosExtrasChange(e.target.value)}
                disabled={isPending}
                className="h-10 text-sm font-mono text-blue-600 dark:text-blue-400 font-bold"
              />
              {itemsCompra.length > 0 && parseFloat(gastosExtrasLote) > 0 && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  ~ Bs. {(parseFloat(gastosExtrasLote) / itemsCompra.length).toFixed(2)} / producto ({itemsCompra.length} {itemsCompra.length === 1 ? "producto" : "productos"})
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inversionista" className="text-xs font-semibold">
                Inversionista / Socio (opcional)
              </Label>
              <Select
                value={inversionistaId}
                onValueChange={(val) => setInversionistaId(val ?? "")}
                disabled={isPending}
              >
                <SelectTrigger id="inversionista" className="h-10 text-sm bg-background">
                  <SelectValue placeholder="Sin asignar..." />
                </SelectTrigger>
                <SelectContent>
                  {inversionistas.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha_compra" className="text-xs font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Fecha de Compra
              </Label>
              <Input
                id="fecha_compra"
                type="date"
                value={fechaCompra}
                onChange={(e) => {
                  setFechaCompra(e.target.value);
                  if (formErrors.fechaCompra) {
                    setFormErrors((prev) => {
                      const next = { ...prev };
                      delete next.fechaCompra;
                      return next;
                    });
                  }
                }}
                disabled={isPending}
                className={`h-10 text-sm ${formErrors.fechaCompra ? "border-destructive ring-1 ring-destructive/30" : ""}`}
                required
              />
              {formErrors.fechaCompra && (
                <p className="text-[11px] text-destructive font-medium">{formErrors.fechaCompra}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fecha_recepcion" className="text-xs font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Fecha Estimada de Llegada
              </Label>
              <Input
                id="fecha_recepcion"
                type="date"
                value={fechaRecepcion}
                onChange={(e) => setFechaRecepcion(e.target.value)}
                disabled={isPending}
                className="h-10 text-sm"
              />
            </div>
          </div>
        </div>

        {/* ── BLOQUE 2: Agregar Productos al Pedido (Multi-producto) ─ */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-primary" />
                2. Productos y Bultos en esta Compra
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Indica qué modelos compraste y cuántas unidades aproximadas vienen por modelo.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNuevoProductoModal(true)}
              className="gap-1.5 text-xs border-dashed border-primary/40 text-primary hover:bg-primary/10"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Nuevo Producto
            </Button>
          </div>

          {/* Formulario de Entrada de Ítem */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              
              {/* Selector de Producto */}
              <div className="sm:col-span-5 space-y-1.5">
                <Label className="text-xs font-semibold">Producto / Modelo *</Label>
                <Select
                  value={currentProductoId}
                  onValueChange={(val) => setCurrentProductoId(val ?? "")}
                >
                  <SelectTrigger className="h-10 text-sm bg-background">
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {localProductos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} ({p.codigo_interno})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cantidad */}
              <div className="sm:col-span-3 space-y-1.5">
                <Label className="text-xs font-semibold">Cantidad estimada *</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="20"
                  value={currentCantidad}
                  onChange={(e) => setCurrentCantidad(e.target.value)}
                  className="h-10 text-sm font-semibold"
                />
              </div>

              {/* Costo USD */}
              <div className="sm:col-span-4 space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Costo Total ($ USD)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 150.00"
                  value={currentCostoUsd}
                  onChange={(e) => setCurrentCostoUsd(e.target.value)}
                  className="h-10 text-sm font-mono font-medium"
                />
              </div>
            </div>

            {/* Nota informativa: extras se distribuyen desde cabecera */}
            {parseFloat(gastosExtrasLote) > 0 && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Truck className="w-3 h-3" />
                El costo extra (Bs. {parseFloat(gastosExtrasLote).toFixed(2)}) se distribuirá por igual entre todos los productos al agregar.
              </p>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                onClick={handleAgregarProductoALista}
                className="gap-1.5 text-xs bg-primary hover:bg-primary/90"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir a la Lista
              </Button>
            </div>
          </div>

          {/* Tabla de Productos Añadidos a la Compra */}
          {itemsCompra.length === 0 ? (
            <div className={`py-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed p-4 ${formErrors.items ? "border-destructive/60 bg-destructive/5 text-destructive" : "border-border"}`}>
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
              <p className="font-semibold text-foreground">Aún no has agregado productos a esta compra</p>
              <p className="mt-0.5 text-muted-foreground">Selecciona un producto arriba, ingresa la cantidad y costo en USD, y haz clic en "Añadir a la Lista".</p>
              {formErrors.items && (
                <p className="mt-2 font-bold text-destructive flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.items}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">
                Productos en este Lote ({itemsCompra.length}):
              </p>
              
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-background">
                {itemsCompra.map((item, idx) => {
                  const prodUsd = item.costo_total_usd || 0;
                  const prodSubtotalBs = prodUsd * tcNum;
                  const prodTotalBs = prodSubtotalBs + (item.otros_costos_bs || 0);
                  const prodUnitBs = item.cantidad > 0 ? prodTotalBs / item.cantidad : 0;
                  const prodObj = localProductos.find((p) => p.id === item.producto_id);

                  return (
                    <div key={item.producto_id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground truncate">
                            {item.nombre_producto}
                          </p>
                          {prodObj?.codigo_interno && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              {prodObj.codigo_interno}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Cantidad pedida: <strong className="text-foreground">{item.cantidad} uds</strong> • Inversión:{" "}
                          <span className="font-mono text-emerald-600 font-semibold">${prodUsd.toFixed(2)} USD</span>
                          {item.otros_costos_bs > 0 && (
                            <span className="text-blue-600 font-mono"> + Extra Bs. {item.otros_costos_bs.toFixed(2)}</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block text-[11px]">Costo Estimado</span>
                          <span className="font-bold text-sm text-primary font-mono">
                            Bs. {prodUnitBs.toFixed(2)} / u
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleQuitarProducto(idx)}
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="Quitar de la lista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── BLOQUE 3: Resumen Total de Inversión ────────────────── */}
        {itemsCompra.length > 0 && (
          <div className="bg-primary/10 border border-primary/25 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              Resumen Total de la Compra
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-background/80 p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[11px]">Prendas Totales</span>
                <span className="font-bold text-base text-foreground font-mono">
                  {totales.totalUds} uds
                </span>
              </div>

              <div className="bg-background/80 p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[11px]">Total Pedido USD</span>
                <span className="font-bold text-base text-emerald-600 font-mono">
                  ${totales.totalUsd.toFixed(2)}
                </span>
              </div>

              <div className="bg-background/80 p-3 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[11px]">Total Costos Extras</span>
                <span className="font-bold text-base text-blue-600 font-mono">
                  Bs. {totales.totalExtrasBs.toFixed(2)}
                </span>
              </div>

              <div className="bg-primary/20 p-3 rounded-xl border border-primary/40">
                <span className="text-primary font-bold block text-[11px]">Inversión Total Bs</span>
                <span className="font-black text-base text-primary font-mono">
                  Bs. {totales.inversionTotalBs.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1.5">
          <Label htmlFor="notas" className="text-xs font-semibold">
            Notas u Observaciones (opcional)
          </Label>
          <Textarea
            id="notas"
            placeholder="Nro. de tracking, factura del proveedor o detalles de los fardos..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={isPending}
            className="text-sm resize-none h-18"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={itemsCompra.length === 0 || isPending}
            className="gap-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            {isPending ? (
              "Guardando Compra..."
            ) : (
              <>
                <span>Guardar Compra en Tránsito</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </form>

      {/* ── Modal Auxiliar: Nuevo Producto Modelo Rápido ──────── */}
      <NuevoProductoSimpleModal
        categorias={categorias}
        open={showNuevoProductoModal}
        onClose={() => setShowNuevoProductoModal(false)}
        onCreated={(nuevoProd) => {
          setLocalProductos((prev) => [nuevoProd, ...prev]);
          setCurrentProductoId(nuevoProd.id);
          setShowNuevoProductoModal(false);
          toast.success(`¡Modelo "${nuevoProd.nombre}" creado y seleccionado!`);
        }}
      />
    </div>
  );
}

// ─── Modal Auxiliar: Crear Modelo de Producto Simple ──────────────────────────
function NuevoProductoSimpleModal({
  categorias,
  open,
  onClose,
  onCreated,
}: {
  categorias: CategoriaOption[];
  open: boolean;
  onClose: () => void;
  onCreated: (producto: ProductoOption) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoriaId, setCategoriaId] = useState("");

  function handleSubmit() {
    if (!nombre.trim() || !codigo.trim()) {
      toast.error("Nombre y código interno son obligatorios");
      return;
    }

    startTransition(async () => {
      const res = await crearProductoCompleto({
        nombre: nombre.trim(),
        codigo_interno: codigo.trim().toUpperCase(),
        categoria_id: categoriaId || null,
        variantes: [
          {
            color: "Estándar",
            stock_inicial: 0,
          },
        ],
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      const catObj = categorias.find((c) => c.id === categoriaId) || null;
      onCreated({
        id: res.productoId!,
        nombre: nombre.trim(),
        codigo_interno: codigo.trim().toUpperCase(),
        categoria_id: categoriaId || null,
        categorias: catObj,
      });

      setNombre("");
      setCodigo("");
      setCategoriaId("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Sparkles className="w-5 h-5 text-primary" />
            Crear Modelo de Producto para la Compra
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Registra el nombre del modelo. Los colores y tallas exactos los desglosarás al recepcionar la mercadería.
          </p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nps-nombre" className="text-xs font-semibold">Nombre del Producto / Modelo *</Label>
            <Input
              id="nps-nombre"
              placeholder="Ej. Chamarra Cazadora Bomber"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isPending}
              className="h-10 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="nps-codigo" className="text-xs font-semibold">Código Interno *</Label>
              <Input
                id="nps-codigo"
                placeholder="Ej. CHA-001"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                disabled={isPending}
                className="h-10 text-sm font-mono font-bold uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nps-cat" className="text-xs font-semibold">Categoría</Label>
              <Select value={categoriaId} onValueChange={(val) => setCategoriaId(val ?? "")} disabled={isPending}>
                <SelectTrigger id="nps-cat" className="h-10 text-sm bg-background">
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

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending} className="bg-primary text-primary-foreground">
              {isPending ? "Creando..." : "Crear y Seleccionar"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
