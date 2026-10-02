"use client";

import { useState, useTransition } from "react";
import { actualizarProducto } from "@/features/catalogos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

interface CategoriaOption {
  id: string;
  nombre: string;
}

import { ProductoTodoEnUnoDialog } from "./producto-todo-en-uno-dialog";

export { ProductoTodoEnUnoDialog };

export function ProductoDialog({ categorias }: { categorias: CategoriaOption[] }) {
  return <ProductoTodoEnUnoDialog categorias={categorias} />;
}

export function EditarProductoDialog({
  producto,
  categorias,
}: {
  producto: {
    id: string;
    nombre: string;
    codigo_interno: string;
    categoria_id?: string | null;
    nomenclatura?: string | null;
    descripcion?: string | null;
  };
  categorias: CategoriaOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [categoriaId, setCategoriaId] = useState<string>(producto.categoria_id || "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (categoriaId) formData.set("categoria_id", categoriaId);

    startTransition(async () => {
      const res = await actualizarProducto(producto.id, formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Producto actualizado exitosamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} variant="ghost" size="sm" title="Editar producto">
        <Pencil className="w-4 h-4" />
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-nombre">Nombre del producto *</Label>
            <Input
              id="edit-nombre"
              name="nombre"
              defaultValue={producto.nombre}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-codigo_interno">Código interno *</Label>
            <Input
              id="edit-codigo_interno"
              name="codigo_interno"
              defaultValue={producto.codigo_interno}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={categoriaId} onValueChange={(val) => setCategoriaId(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría..." />
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

