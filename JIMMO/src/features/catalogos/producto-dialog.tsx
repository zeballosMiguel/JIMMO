"use client";

import { useState, useTransition } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { crearProducto } from "@/features/catalogos/actions";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Props {
  categorias: { id: string; nombre: string }[];
}

export function CatalogosProductoDialog({ categorias }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await crearProducto(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Producto creado correctamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ className: "gap-2" })}>
        <Plus className="w-4 h-4" />
        Nuevo producto
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear producto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombre-prod">Nombre *</Label>
            <Input id="nombre-prod" name="nombre" required disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="codigo_interno">Código interno *</Label>
            <Input id="codigo_interno" name="codigo_interno" required disabled={isPending} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categoria_id">Categoría</Label>
            <Select name="categoria_id">
              <SelectTrigger id="categoria_id" disabled={isPending}>
                <SelectValue placeholder="Sin categoría" />
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
          <div className="space-y-1.5">
            <Label htmlFor="descripcion-prod">Descripción</Label>
            <Textarea id="descripcion-prod" name="descripcion" rows={3} disabled={isPending} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} id="submit-producto">
              {isPending ? "Guardando..." : "Crear producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
