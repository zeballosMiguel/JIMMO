"use client";

import { useState, useTransition } from "react";
import { crearVariante, actualizarVariante } from "@/features/catalogos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";

interface ProductoOption {
  id: string;
  nombre: string;
  codigo_interno: string;
}

export function VarianteDialog({ productos }: { productos: ProductoOption[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [productoId, setProductoId] = useState<string>("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productoId) {
      toast.error("Debes seleccionar un producto");
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("producto_id", productoId);

    startTransition(async () => {
      const res = await crearVariante(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Variante / SKU creada exitosamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="w-4 h-4" /> Nueva Variante / SKU
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Variante / SKU</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Producto Base *</Label>
            <Select value={productoId} onValueChange={(val) => setProductoId(val ?? "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto..." />
              </SelectTrigger>
              <SelectContent>
                {productos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} ({p.codigo_interno})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="color">Color *</Label>
              <Input id="color" name="color" required placeholder="Ej. Negro, Azul" disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="talla">Talla / Tamaño</Label>
              <Input id="talla" name="talla" placeholder="Ej. M, L, XL, 42" disabled={isPending} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU (opcional)</Label>
              <Input id="sku" name="sku" placeholder="Ej. POL-NEGRO-M" disabled={isPending} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stock_minimo">Stock Mínimo</Label>
              <Input id="stock_minimo" name="stock_minimo" type="number" min="0" defaultValue="0" disabled={isPending} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar variante"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditarVarianteDialog({
  variante,
  productos,
}: {
  variante: {
    id: string;
    producto_id: string;
    color: string;
    talla?: string | null;
    sku?: string | null;
    stock_minimo?: number | null;
  };
  productos: ProductoOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [productoId, setProductoId] = useState<string>(variante.producto_id);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!productoId) {
      toast.error("Debes seleccionar un producto");
      return;
    }
    const formData = new FormData(e.currentTarget);
    formData.set("producto_id", productoId);

    startTransition(async () => {
      const res = await actualizarVariante(variante.id, formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Variante actualizada exitosamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} variant="ghost" size="sm" title="Editar variante">
        <Pencil className="w-4 h-4" />
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Variante / SKU</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Producto Base *</Label>
            <Select value={productoId} onValueChange={(val) => setProductoId(val ?? "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto..." />
              </SelectTrigger>
              <SelectContent>
                {productos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} ({p.codigo_interno})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-color">Color *</Label>
              <Input
                id="edit-color"
                name="color"
                defaultValue={variante.color}
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-talla">Talla / Tamaño</Label>
              <Input
                id="edit-talla"
                name="talla"
                defaultValue={variante.talla || ""}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-sku">SKU (opcional)</Label>
              <Input
                id="edit-sku"
                name="sku"
                defaultValue={variante.sku || ""}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-stock_minimo">Stock Mínimo</Label>
              <Input
                id="edit-stock_minimo"
                name="stock_minimo"
                type="number"
                min="0"
                defaultValue={variante.stock_minimo ?? 0}
                disabled={isPending}
              />
            </div>
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

