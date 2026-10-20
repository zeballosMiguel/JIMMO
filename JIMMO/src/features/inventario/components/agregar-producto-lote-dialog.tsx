"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { agregarProductoALote } from "@/features/inventario/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Package } from "lucide-react";

interface Props {
  loteId: string;
  loteNumero: number;
  catalogoProductos: Array<{ id: string; nombre: string; codigo_interno?: string | null }>;
  productosExistentesIds?: string[];
  buttonVariant?: "default" | "outline" | "secondary";
  buttonSize?: "default" | "sm" | "icon";
  buttonLabel?: string;
}

export function AgregarProductoLoteDialog({
  loteId,
  loteNumero,
  catalogoProductos = [],
  productosExistentesIds = [],
  buttonVariant = "outline",
  buttonSize = "sm",
  buttonLabel = "Añadir Producto",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [selectedProdId, setSelectedProdId] = useState("");
  const [cantidadEstimada, setCantidadEstimada] = useState("20");
  const [costoUsd, setCostoUsd] = useState("");

  const productosDisponibles = catalogoProductos.filter(
    (cp) => !productosExistentesIds.includes(cp.id)
  );

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      if (productosDisponibles.length > 0 && !selectedProdId) {
        setSelectedProdId(productosDisponibles[0].id);
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProdId) {
      toast.error("Selecciona un producto del catálogo");
      return;
    }

    const cant = parseInt(cantidadEstimada, 10);
    if (!cant || cant <= 0 || isNaN(cant)) {
      toast.error("Ingresa una cantidad estimada mayor a 0");
      return;
    }

    const usd = parseFloat(costoUsd);
    if (isNaN(usd) || usd < 0) {
      toast.error("Ingresa un costo válido en $ USD");
      return;
    }

    startTransition(async () => {
      const res = await agregarProductoALote({
        loteId,
        productoId: selectedProdId,
        cantidadEstimada: cant,
        costoUsd: usd,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Producto añadido exitosamente al lote");
        setOpen(false);
        setSelectedProdId("");
        setCostoUsd("");
        setCantidadEstimada("20");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        className="gap-1.5"
        onClick={() => handleOpenChange(true)}
      >
        <Plus className="w-3.5 h-3.5" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Añadir Producto al Lote #{String(loteNumero).padStart(4, "0")}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="producto-select">Producto del catálogo</Label>
              <select
                id="producto-select"
                value={selectedProdId}
                onChange={(e) => setSelectedProdId(e.target.value)}
                disabled={isPending}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Seleccionar producto --</option>
                {catalogoProductos.map((p) => {
                  const yaEnLote = productosExistentesIds.includes(p.id);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.codigo_interno ? `(${p.codigo_interno})` : ""} {yaEnLote ? "— [Ya en lote]" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cant-estimada">Prendas estimadas</Label>
                <Input
                  id="cant-estimada"
                  type="number"
                  min="1"
                  step="1"
                  value={cantidadEstimada}
                  onChange={(e) => setCantidadEstimada(e.target.value)}
                  placeholder="Ej. 20"
                  disabled={isPending}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="costo-usd">Costo de compra ($ USD)</Label>
                <Input
                  id="costo-usd"
                  type="number"
                  min="0"
                  step="0.01"
                  value={costoUsd}
                  onChange={(e) => setCostoUsd(e.target.value)}
                  placeholder="Ej. 150.00"
                  disabled={isPending}
                  required
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Una vez añadido, podrás desglosar las variantes físicas (colores y tallas) directamente en la estación de conteo de este lote.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                <Plus className="w-4 h-4" />
                {isPending ? "Añadiendo..." : "Añadir a la compra"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
