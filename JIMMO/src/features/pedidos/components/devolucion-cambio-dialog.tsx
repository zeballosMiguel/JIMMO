"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  RotateCcw,
  ArrowLeftRight,
  Package,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Plus,
  Trash2,
} from "lucide-react";
import {
  procesarDevolucionOCambio,
  obtenerVariantesDisponiblesParaCambio,
  type DevolucionCambioInput,
} from "@/features/pedidos/devoluciones-actions";

interface DetallePedidoItem {
  id: string;
  variante_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  variantes_producto?: {
    color?: string | null;
    talla?: string | null;
    sku?: string | null;
    productos?: {
      nombre?: string | null;
    } | null;
  } | null;
}

interface Props {
  pedidoId: string;
  numeroPedido: number;
  detalles: DetallePedidoItem[];
  totalPedido: number;
  esAdmin: boolean;
}

export function DevolucionCambioDialog({
  pedidoId,
  numeroPedido,
  detalles,
  totalPedido,
  esAdmin,
}: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Tipo: DEVOLUCION o CAMBIO
  const [tipoOperacion, setTipoOperacion] = useState<"DEVOLUCION" | "CAMBIO">("DEVOLUCION");
  const [motivo, setMotivo] = useState("");

  // Items seleccionados para devolución: { [detalle_id]: cantidad_a_devolver }
  const [cantidadesDevolver, setCantidadesDevolver] = useState<Record<string, number>>({});

  // Reembolso de dinero
  const [hacerReembolso, setHacerReembolso] = useState(true);
  const [montoReembolsoManual, setMontoReembolsoManual] = useState<string>("");

  // Estado para el modo CAMBIO: catálogo disponible y prendas a entregar
  const [variantesDisponibles, setVariantesDisponibles] = useState<any[]>([]);
  const [cargandoVariantes, setCargandoVariantes] = useState(false);

  // Prenda a entregar a cambio: [{ variante_id, cantidad, precio_unitario }]
  const [itemsCambio, setItemsCambio] = useState<
    Array<{ variante_id: string; cantidad: number; precio_unitario: number }>
  >([]);

  // Inicializar o resetear cuando se abre el diálogo
  useEffect(() => {
    if (open) {
      setTipoOperacion("DEVOLUCION");
      setMotivo("");
      setCantidadesDevolver({});
      setHacerReembolso(true);
      setMontoReembolsoManual("");
      setItemsCambio([]);

      // Si el pedido solo tiene un item, preseleccionarlo con su cantidad
      if (detalles.length === 1) {
        setCantidadesDevolver({ [detalles[0].id]: detalles[0].cantidad });
      }

      // Cargar catálogo para cambios
      setCargandoVariantes(true);
      obtenerVariantesDisponiblesParaCambio().then((res) => {
        if (res.variantes) {
          setVariantesDisponibles(res.variantes);
        }
        setCargandoVariantes(false);
      });
    }
  }, [open, detalles]);

  if (!esAdmin) {
    return null;
  }

  // Cálculo del valor de lo que se devuelve
  const totalDevueltoBs = detalles.reduce((acc, d) => {
    const cant = cantidadesDevolver[d.id] || 0;
    return acc + cant * Number(d.precio_unitario || 0);
  }, 0);

  // Cálculo del valor de lo que se entrega en cambio
  const totalCambioBs = itemsCambio.reduce((acc, it) => {
    return acc + (it.cantidad || 0) * (it.precio_unitario || 0);
  }, 0);

  // Diferencia financiera (en modo CAMBIO)
  const diferenciaBs = totalCambioBs - totalDevueltoBs;

  // Monto final a reembolsar sugerido
  const montoReembolsoCalculado =
    tipoOperacion === "DEVOLUCION"
      ? totalDevueltoBs
      : diferenciaBs < 0
      ? Math.abs(diferenciaBs)
      : 0;

  const montoReembolsoFinal = montoReembolsoManual !== ""
    ? Number(montoReembolsoManual)
    : montoReembolsoCalculado;

  function handleCantidadChange(detalleId: string, max: number, value: number) {
    const valid = Math.min(Math.max(0, value), max);
    setCantidadesDevolver((prev) => ({
      ...prev,
      [detalleId]: valid,
    }));
  }

  function handleAgregarItemCambio() {
    if (variantesDisponibles.length === 0) return;
    const primera = variantesDisponibles[0];
    setItemsCambio((prev) => [
      ...prev,
      {
        variante_id: primera.variante_id,
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
  }

  function handleRemoverItemCambio(index: number) {
    setItemsCambio((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    // Validar que se seleccionó al menos un item para devolver
    const devueltos = detalles
      .filter((d) => (cantidadesDevolver[d.id] || 0) > 0)
      .map((d) => ({
        detalle_pedido_id: d.id,
        variante_id: d.variante_id,
        cantidad: cantidadesDevolver[d.id],
        precio_unitario: Number(d.precio_unitario || 0),
      }));

    if (devueltos.length === 0) {
      toast.error("Selecciona al menos una prenda para devolver");
      return;
    }

    if (!motivo.trim()) {
      toast.error("Por favor ingresa un motivo para el ajuste (ej. cambio de talla, devolución de prenda, etc.)");
      return;
    }

    if (tipoOperacion === "CAMBIO" && itemsCambio.length === 0) {
      toast.error("En modo cambio, debes agregar al menos una prenda a entregar");
      return;
    }

    const payload: DevolucionCambioInput = {
      pedido_id: pedidoId,
      tipo: tipoOperacion,
      motivo: motivo.trim(),
      monto_reembolso_bs: hacerReembolso ? montoReembolsoFinal : 0,
      items_devueltos: devueltos,
      items_cambio: tipoOperacion === "CAMBIO" ? itemsCambio : undefined,
    };

    startTransition(async () => {
      const res = await procesarDevolucionOCambio(payload);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(
          res.esAnulacionTotal
            ? "Devolución total procesada. El pedido quedó anulado y el stock fue restaurado."
            : "Ajuste procesado exitosamente. Stock, caja y reportes actualizados."
        );
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className:
            "gap-2 border-amber-500/40 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-950/20 font-medium cursor-pointer",
        })}
      >
        <RotateCcw className="w-4 h-4" />
        Devolución / Cambio
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            Ajuste Post-Venta: Pedido #{numeroPedido}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Solo Administrador: Permite registrar devoluciones de prendas o cambios de talla/producto una vez completada la venta.
          </p>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Selector de Tipo de Operación */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipoOperacion("DEVOLUCION")}
              className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col gap-1 ${
                tipoOperacion === "DEVOLUCION"
                  ? "border-primary bg-primary/5 text-foreground shadow-xs"
                  : "border-border hover:border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <RotateCcw className="w-4 h-4 text-primary" />
                Devolución de Prendas
              </div>
              <p className="text-xs text-muted-foreground">
                El cliente devuelve prendas y se le reembolsa el dinero en efectivo.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTipoOperacion("CAMBIO")}
              className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col gap-1 ${
                tipoOperacion === "CAMBIO"
                  ? "border-primary bg-primary/5 text-foreground shadow-xs"
                  : "border-border hover:border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
                Cambio de Prenda / Talla
              </div>
              <p className="text-xs text-muted-foreground">
                Devuelve una prenda y se le entrega otra diferente o de otra talla.
              </p>
            </button>
          </div>

          {/* 1. Prendas que devuelve el cliente */}
          <div className="space-y-2 border border-border rounded-xl p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                1. Prendas que devuelve el cliente (Retorno al Stock)
              </Label>
              <span className="text-xs text-muted-foreground font-mono">
                Total devuelto: Bs {totalDevueltoBs.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {detalles.map((d) => {
                const vp = d.variantes_producto;
                const prodNombre = vp?.productos?.nombre || "Producto";
                const color = vp?.color;
                const talla = vp?.talla;
                const cantActual = cantidadesDevolver[d.id] || 0;

                return (
                  <div
                    key={d.id}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border transition-colors ${
                      cantActual > 0
                        ? "bg-amber-50/60 border-amber-300 dark:bg-amber-950/20 dark:border-amber-700/50"
                        : "bg-background border-border"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-foreground truncate">{prodNombre}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {color} {talla ? `/ ${talla}` : ""} • Precio unit: Bs {Number(d.precio_unitario).toFixed(2)} • Compradas: {d.cantidad}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Label className="text-xs text-muted-foreground">Cant. a devolver:</Label>
                      <Input
                        type="number"
                        min="0"
                        max={d.cantidad}
                        value={cantActual}
                        onChange={(e) => handleCantidadChange(d.id, d.cantidad, parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-center font-bold text-xs"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Prendas a entregar en CAMBIO (solo si tipo === CAMBIO) */}
          {tipoOperacion === "CAMBIO" && (
            <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
                  2. Nuevas prendas a entregar al cliente (Salida de Stock)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAgregarItemCambio}
                  className="h-7 text-xs gap-1"
                  disabled={cargandoVariantes || variantesDisponibles.length === 0}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar prenda
                </Button>
              </div>

              {itemsCambio.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg bg-background">
                  Haz clic en "+ Agregar prenda" para seleccionar la prenda del catálogo que se llevará el cliente.
                </div>
              ) : (
                <div className="space-y-2">
                  {itemsCambio.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg border bg-background">
                      <div className="flex-1">
                        <select
                          className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
                          value={it.variante_id}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItemsCambio((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, variante_id: val } : item))
                            );
                          }}
                        >
                          {variantesDisponibles.map((v) => (
                            <option key={v.variante_id} value={v.variante_id}>
                              {v.producto} — {v.color} {v.talla ? `/ ${v.talla}` : ""} (Disp: {v.stock_actual})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-16 shrink-0">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Cant"
                          value={it.cantidad}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setItemsCambio((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, cantidad: val } : item))
                            );
                          }}
                          className="h-8 text-xs text-center font-bold"
                        />
                      </div>

                      <div className="w-24 shrink-0">
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="Precio Bs"
                          value={it.precio_unitario || ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setItemsCambio((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, precio_unitario: val } : item))
                            );
                          }}
                          className="h-8 text-xs text-right font-bold"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoverItemCambio(idx)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Resumen de diferencia de cambio */}
              <div className="p-3 rounded-lg bg-background border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">Valor devuelto: </span>
                  <span className="font-bold text-foreground">Bs {totalDevueltoBs.toFixed(2)}</span>
                  {"  •  "}
                  <span className="text-muted-foreground">Valor entregado: </span>
                  <span className="font-bold text-foreground">Bs {totalCambioBs.toFixed(2)}</span>
                </div>
                <div>
                  {diferenciaBs > 0 ? (
                    <Badge variant="default" className="bg-emerald-600 text-white">
                      Cliente paga diferencia: +Bs {diferenciaBs.toFixed(2)}
                    </Badge>
                  ) : diferenciaBs < 0 ? (
                    <Badge variant="destructive">
                      Reembolsar a cliente: Bs {Math.abs(diferenciaBs).toFixed(2)}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Mismo valor (Sin diferencia)</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. Reembolso de dinero (Efectivo) */}
          <div className="space-y-3 border border-border rounded-xl p-4 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                3. Ajuste de Caja / Reembolso en Efectivo
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hacer-reembolso"
                  checked={hacerReembolso}
                  onChange={(e) => setHacerReembolso(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="hacer-reembolso" className="text-xs font-medium cursor-pointer">
                  Descontar dinero de caja (reembolso en efectivo)
                </label>
              </div>
            </div>

            {hacerReembolso && (
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    Monto en Bs que se le entregó en efectivo al cliente. Se restará del historial de pagos y de la caja en el Dashboard y Reportes.
                  </p>
                </div>
                <div className="w-36">
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder={`Bs ${montoReembolsoCalculado.toFixed(2)}`}
                    value={montoReembolsoManual !== "" ? montoReembolsoManual : montoReembolsoCalculado || ""}
                    onChange={(e) => setMontoReembolsoManual(e.target.value)}
                    className="h-9 text-right font-bold text-emerald-600 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Motivo obligatorio */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              4. Motivo del ajuste <span className="text-destructive">*</span>
            </Label>
            <Textarea
              placeholder="Ej. El cliente devolvió la prenda por error en la talla / cambio por otro modelo..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Resumen de impacto visual */}
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Impacto inmediato en el sistema:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pl-1">
              <li>El stock devuelto se sumará inmediatamente al inventario y al Kardex (<span className="font-mono text-foreground">DEVOLUCION_VENTA</span>).</li>
              {tipoOperacion === "CAMBIO" && (
                <li>Las nuevas prendas entregadas se descontarán del stock (<span className="font-mono text-foreground">SALIDA_VENTA</span>).</li>
              )}
              {hacerReembolso && montoReembolsoFinal > 0 && (
                <li>Se descontarán <span className="font-bold text-foreground">Bs {montoReembolsoFinal.toFixed(2)}</span> del total recaudado en efectivo y caja.</li>
              )}
              <li>Los reportes de utilidad, vendedores y el Dashboard se actualizarán al instante.</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || totalDevueltoBs <= 0}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isPending ? "Procesando ajuste..." : "Confirmar Devolución / Cambio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
