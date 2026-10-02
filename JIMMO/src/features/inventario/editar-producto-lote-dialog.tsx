"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarCostoProductoEnLote } from "@/features/inventario/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface EditarProductoLoteDialogProps {
  loteId: string;
  productoId: string;
  nombreProducto: string;
  costoUsdActual: number;
  gastosExtrasBsActual: number;
  estadoLote?: string | null;
}

export function EditarProductoLoteDialog({
  loteId,
  productoId,
  nombreProducto,
  costoUsdActual,
  gastosExtrasBsActual,
  estadoLote,
}: EditarProductoLoteDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isFinalizado =
    estadoLote === "RECIBIDO" || estadoLote === "CERRADO" || estadoLote === "EN_INVENTARIO";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const costoUsd = Number(formData.get("costo_usd")) || 0;

    startTransition(async () => {
      const res = await actualizarCostoProductoEnLote({
        loteId,
        productoId,
        costoUsd,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Costo del producto "${nombreProducto}" actualizado`);
        setOpen(false);
        // Fuerza re-fetch de datos del servidor para actualizar las cards de costo
        router.refresh();
      }
    });
  }

  if (isFinalizado) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/80"
        title="Editar costo del producto"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Editar Costo del Pedido
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Producto: <span className="font-semibold text-foreground">{nombreProducto}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="costo_usd">Costo de Compra del Producto ($ USD)</Label>
            <Input
              id="costo_usd"
              name="costo_usd"
              type="number"
              step="any"
              defaultValue={costoUsdActual || ""}
              placeholder="Ej. 120.00"
              disabled={isPending}
            />
            <p className="text-[11px] text-muted-foreground">
              Monto en dólares pactado para la compra total de este producto.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
