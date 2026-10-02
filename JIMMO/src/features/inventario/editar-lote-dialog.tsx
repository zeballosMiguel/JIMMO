"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarLote } from "@/features/inventario/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface LoteData {
  id: string;
  numero_lote: number;
  proveedor?: string | null;
  fecha_compra?: string | null;
  fecha_recepcion?: string | null;
  tipo_cambio?: number | null;
  notas?: string | null;
  inversionista_id?: string | null;
  gastos_extras_bs?: number | null;
  estado?: string | null;
}

// Extraer únicamente las notas redactadas por el usuario, filtrando los bloques JSON del sistema
function getCleanNotes(notas?: string | null): string {
  if (!notas) return "";
  const marker = "[ITEMS_COMPRA:";
  const idx = notas.indexOf(marker);
  if (idx === -1) return notas.trim();
  let depth = 0;
  let endIdx = idx + marker.length;
  for (let i = idx + marker.length; i < notas.length; i++) {
    if (notas[i] === "[") depth++;
    else if (notas[i] === "]") {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  return (notas.slice(0, idx) + notas.slice(endIdx)).trim();
}

export function EditarLoteDialog({
  lote,
  inversionistas = [],
  iconOnly = false,
}: {
  lote: LoteData;
  inversionistas?: Array<{ id: string; nombre: string }>;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedInv, setSelectedInv] = useState(lote.inversionista_id || "");

  const isFinalizado =
    lote.estado === "RECIBIDO" || lote.estado === "CERRADO" || lote.estado === "EN_INVENTARIO";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (selectedInv) {
      formData.set("inversionista_id", selectedInv);
    }

    startTransition(async () => {
      const res = await actualizarLote(lote.id, formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Lote #${lote.numero_lote} actualizado correctamente`);
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {iconOnly ? (
        <Button onClick={() => setOpen(true)} variant="ghost" size="sm" title="Editar lote">
          <Pencil className="w-4 h-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-2">
          <Pencil className="w-4 h-4" /> Editar Lote
        </Button>
      )}
      <DialogContent className="sm:max-w-md w-full overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lote #{lote.numero_lote}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="proveedor">Proveedor</Label>
            <Input
              id="proveedor"
              name="proveedor"
              defaultValue={lote.proveedor || ""}
              placeholder="Ej. Textil Boliviana S.R.L."
              disabled={isPending}
            />
          </div>

          {inversionistas.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-inversionista">Inversionista</Label>
              <select
                id="edit-inversionista"
                value={selectedInv}
                onChange={(e) => setSelectedInv(e.target.value)}
                disabled={isPending}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sin inversionista asignado</option>
                {inversionistas.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fecha_compra">Fecha de compra</Label>
              <Input
                id="fecha_compra"
                name="fecha_compra"
                type="date"
                defaultValue={lote.fecha_compra || ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha_recepcion">Fecha de llegada</Label>
              <Input
                id="fecha_recepcion"
                name="fecha_recepcion"
                type="date"
                defaultValue={lote.fecha_recepcion || ""}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tipo_cambio">T/C (USD/BOB)</Label>
              <Input
                id="tipo_cambio"
                name="tipo_cambio"
                type="number"
                step="0.01"
                defaultValue={lote.tipo_cambio || 6.96}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gastos_extras_bs">Gastos Extras (Bs.)</Label>
              <Input
                id="gastos_extras_bs"
                name="gastos_extras_bs"
                type="number"
                step="0.01"
                defaultValue={lote.gastos_extras_bs ?? 0}
                disabled={isPending}
              />
            </div>
          </div>

          {isFinalizado && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs">
              ⚠️ <strong>Lote en Inventario:</strong> Cambiar el T/C o los Gastos Extras actualizará la ficha del lote, pero no recalculará los registros contables ya ingresados a Kardex.
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas / Observaciones</Label>
            <Textarea
              id="notas"
              name="notas"
              defaultValue={getCleanNotes(lote.notas)}
              placeholder="Factura, detalles de importación..."
              disabled={isPending}
              className="w-full resize-y min-h-[80px] max-h-[160px] text-xs leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
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
