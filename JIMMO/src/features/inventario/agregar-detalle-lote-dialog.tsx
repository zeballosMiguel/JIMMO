"use client";

import { useState, useTransition, useMemo } from "react";
import { agregarDetalleLote } from "@/features/inventario/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Calculator, DollarSign, Truck, Package, ArrowRight } from "lucide-react";

interface VariantOption {
  id: string;
  sku: string | null;
  color: string;
  talla: string | null;
  productos: { nombre: string } | null;
}

interface Props {
  loteId: string;
  tipoCambio?: number | null;
  variantes: VariantOption[];
}

export function AgregarDetalleLoteDialog({ loteId, tipoCambio: tipoCambioProp, variantes }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [varianteId, setVarianteId] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [modoUsd, setModoUsd] = useState<"total" | "unitario">("total");
  const [valorUsd, setValorUsd] = useState<string>("");
  const [tipoCambio, setTipoCambio] = useState<number>(tipoCambioProp ? Number(tipoCambioProp) : 6.96);
  const [otrosCostosBs, setOtrosCostosBs] = useState<string>("");

  // Cálculos reactivos en tiempo real
  const calculos = useMemo(() => {
    const cant = Math.max(1, Number(cantidad) || 1);
    const tc = Number(tipoCambio) || 6.96;
    const usdInput = Number(valorUsd) || 0;
    const extrasBs = Number(otrosCostosBs) || 0;

    let totalUsd = 0;
    let unitUsd = 0;

    if (modoUsd === "total") {
      totalUsd = usdInput;
      unitUsd = totalUsd / cant;
    } else {
      unitUsd = usdInput;
      totalUsd = unitUsd * cant;
    }

    const subtotalPedidoBs = totalUsd * tc;
    const costoTotalBs = subtotalPedidoBs + extrasBs;
    const costoUnitarioBs = costoTotalBs / cant;

    return {
      cant,
      tc,
      totalUsd,
      unitUsd,
      subtotalPedidoBs,
      extrasBs,
      costoTotalBs,
      costoUnitarioBs,
    };
  }, [cantidad, modoUsd, valorUsd, tipoCambio, otrosCostosBs]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!varianteId) {
      toast.error("Selecciona una variante");
      return;
    }

    const formData = new FormData();
    formData.set("variante_id", varianteId);
    formData.set("cantidad", String(calculos.cant));
    formData.set("costo_unitario_usd", calculos.unitUsd > 0 ? calculos.unitUsd.toFixed(4) : "");
    formData.set("otros_costos_bs", calculos.extrasBs > 0 ? calculos.extrasBs.toFixed(2) : "0");
    formData.set("costo_unitario_bs", calculos.costoUnitarioBs.toFixed(2));

    startTransition(async () => {
      const res = await agregarDetalleLote(loteId, formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Producto agregado al lote correctamente");
        setVarianteId("");
        setCantidad(1);
        setValorUsd("");
        setOtrosCostosBs("");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" /> Agregar Producto al Lote
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Agregar Producto al Lote
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Selección de Variante */}
          <div className="space-y-1.5">
            <Label>Producto / Variante *</Label>
            <Select value={varianteId} onValueChange={(val) => setVarianteId(val ?? "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar variante..." />
              </SelectTrigger>
              <SelectContent>
                {variantes.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.productos?.nombre ?? "Producto"} — {v.color}{v.talla ? ` / ${v.talla}` : ""} ({v.sku ?? "Sin SKU"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cantidad y Tipo de Cambio */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cantidad">Cantidad Comprada *</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipo_cambio">Tipo de Cambio (USD/Bs.)</Label>
              <Input
                id="tipo_cambio"
                type="number"
                step="0.01"
                min="0.1"
                value={tipoCambio}
                onChange={(e) => setTipoCambio(parseFloat(e.target.value) || 6.96)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Costo del Pedido en Dólares */}
          <div className="space-y-1.5 rounded-xl border border-border/70 p-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label htmlFor="costo_usd" className="flex items-center gap-1.5 font-semibold text-xs">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Costo del Pedido ($ USD)
              </Label>
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setModoUsd("total")}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    modoUsd === "total"
                      ? "bg-background text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Total pedido
                </button>
                <button
                  type="button"
                  onClick={() => setModoUsd("unitario")}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    modoUsd === "unitario"
                      ? "bg-background text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Por unidad
                </button>
              </div>
            </div>

            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
              <Input
                id="costo_usd"
                type="number"
                step="0.01"
                min="0"
                value={valorUsd}
                onChange={(e) => setValorUsd(e.target.value)}
                placeholder={modoUsd === "total" ? "Ej. 100.00 (total de este producto)" : "Ej. 5.00 (por unidad)"}
                className="pl-7"
                disabled={isPending}
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              {modoUsd === "total"
                ? `Equivale a $${calculos.unitUsd.toFixed(2)} USD c/u  ➔  Bs. ${calculos.subtotalPedidoBs.toFixed(2)}`
                : `Total pedido: $${calculos.totalUsd.toFixed(2)} USD  ➔  Bs. ${calculos.subtotalPedidoBs.toFixed(2)}`}
            </p>
          </div>

          {/* Otros Costos Extras (Transporte, flete, etc.) en Bs */}
          <div className="space-y-1.5 rounded-xl border border-border/70 p-3 bg-muted/20">
            <Label htmlFor="otros_costos_bs" className="flex items-center gap-1.5 font-semibold text-xs">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              Otros Costos Extras / Transporte (Bs.)
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Bs</span>
              <Input
                id="otros_costos_bs"
                type="number"
                step="0.01"
                min="0"
                value={otrosCostosBs}
                onChange={(e) => setOtrosCostosBs(e.target.value)}
                placeholder="0.00 (flete, aduana, transporte...)"
                className="pl-9"
                disabled={isPending}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Gastos adicionales aplicados a este producto.
            </p>
          </div>

          {/* ── Resumen de Costos y Costo Unitario Calculado ─────────── */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Costo pedido (convertido a Bs):</span>
              <span className="font-semibold text-foreground">Bs. {calculos.subtotalPedidoBs.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>(+) Costos extras (transporte):</span>
              <span className="font-semibold text-foreground">+ Bs. {calculos.extrasBs.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold border-t border-border/60 pt-1.5">
              <span>(═) Costo Total del Producto:</span>
              <span className="text-foreground">Bs. {calculos.costoTotalBs.toFixed(2)}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-primary/20 bg-background/80 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Calculator className="w-3.5 h-3.5 text-primary" />
                  Costo Unitario Final:
                </p>
                <p className="text-[10px] text-muted-foreground">
                  (Bs. {calculos.costoTotalBs.toFixed(2)} ÷ {calculos.cant} unid.)
                </p>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-primary">
                  Bs. {calculos.costoUnitarioBs.toFixed(2)}
                </span>
                <span className="text-[10px] text-muted-foreground block font-mono">
                  / unidad
                </span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? "Guardando..." : "Agregar al Lote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
