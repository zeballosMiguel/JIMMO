"use client";

import { useState, useTransition } from "react";
import { actualizarCliente } from "@/features/clientes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit } from "lucide-react";

interface ClienteData {
  id: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  ciudad?: string | null;
  direccion?: string | null;
  notas?: string | null;
}

export function EditarClienteDialog({
  cliente,
  iconOnly = false,
}: {
  cliente: ClienteData;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await actualizarCliente(cliente.id, formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Cliente actualizado correctamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {iconOnly ? (
        <Button onClick={() => setOpen(true)} variant="ghost" size="sm" title="Editar cliente">
          <Edit className="w-4 h-4" />
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
          <Edit className="w-4 h-4" /> Editar Cliente
        </Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" name="nombre" defaultValue={cliente.nombre} required disabled={isPending} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" defaultValue={cliente.telefono || ""} disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input id="ciudad" name="ciudad" defaultValue={cliente.ciudad || ""} disabled={isPending} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas</Label>
            <Textarea id="notas" name="notas" defaultValue={cliente.notas || ""} disabled={isPending} />
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
