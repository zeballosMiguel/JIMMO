"use client";

import { useState, useTransition } from "react";
import { crearEntrega } from "@/features/entregas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Truck } from "lucide-react";

interface Props {
  pedidoId: string;
}

export function CrearEntregaDialog({ pedidoId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("pedido_id", pedidoId);

    startTransition(async () => {
      const res = await crearEntrega(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Entrega programada exitosamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
        <Truck className="w-4 h-4" /> Programar Entrega
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Programar Entrega / Envíos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="fecha_programada">Fecha Programada</Label>
            <Input id="fecha_programada" name="fecha_programada" type="date" disabled={isPending} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas de Entrega / Instrucción</Label>
            <Input id="notas" name="notas" placeholder="Ej. Entregar en la tarde..." disabled={isPending} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Crear Entrega"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
