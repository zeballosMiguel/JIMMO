"use client";

import { useState, useTransition } from "react";
import { crearCliente } from "@/features/clientes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface Props {
  onClienteCreado: (nuevoCliente: { id: string; nombre: string }) => void;
}

export function NuevoClienteInlineDialog({ onClienteCreado }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const nombre = String(formData.get("nombre") || "");

    startTransition(async () => {
      const res = await crearCliente(formData);
      if (res?.error) {
        toast.error(res.error);
      } else if (res?.data) {
        toast.success("Nuevo cliente creado");
        setOpen(false);
        // Inform parent component with actual UUID and name
        onClienteCreado({ id: res.data.id, nombre: res.data.nombre });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-7 text-xs text-primary gap-1 px-2">
        <UserPlus className="w-3.5 h-3.5" /> + Rápido
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente Rápido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre_inline">Nombre completo *</Label>
            <Input id="nombre_inline" name="nombre" required placeholder="Ej: Roberto Solíz" disabled={isPending} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="telefono_inline">Teléfono</Label>
              <Input id="telefono_inline" name="telefono" placeholder="70000000" disabled={isPending} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ciudad_inline">Ciudad</Label>
              <Input id="ciudad_inline" name="ciudad" placeholder="La Paz" disabled={isPending} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
