"use client";

import { useState, useTransition } from "react";
import { registrarPago } from "@/features/pagos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

interface Props {
  pedidoId: string;
  saldoPendiente: number;
}

export function RegistrarPagoDialog({ pedidoId, saldoPendiente }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [metodo, setMetodo] = useState<string>("TRANSFERENCIA");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("pedido_id", pedidoId);
    formData.set("metodo", metodo);

    startTransition(async () => {
      const res = await registrarPago(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Pago registrado exitosamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
        <DollarSign className="w-4 h-4" /> Registrar Pago
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago del Pedido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="monto">Monto a pagar (Bs.) *</Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={saldoPendiente > 0 ? saldoPendiente : ""}
              required
              disabled={isPending}
            />
            {saldoPendiente > 0 && (
              <p className="text-xs text-muted-foreground">Saldo pendiente actual: Bs. {saldoPendiente.toFixed(2)}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Método de Pago *</Label>
            <Select value={metodo} onValueChange={(val) => setMetodo(val ?? "TRANSFERENCIA")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRANSFERENCIA">Transferencia bancaria</SelectItem>
                <SelectItem value="QR">Pago QR</SelectItem>
                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                <SelectItem value="TARJETA">Tarjeta de crédito / débito</SelectItem>
                <SelectItem value="DEPOSITO">Depósito bancario</SelectItem>
                <SelectItem value="OTRO">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="referencia">Nro. de Referencia / Comprobante</Label>
            <Input id="referencia" name="referencia" placeholder="Ej. Transacción #987654" disabled={isPending} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas u observaciones</Label>
            <Input id="notas" name="notas" placeholder="Ej. Pago a cuenta..." disabled={isPending} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isPending ? "Registrando..." : "Guardar Pago"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
