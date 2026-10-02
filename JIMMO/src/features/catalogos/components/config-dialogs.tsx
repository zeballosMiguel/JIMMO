"use client";

import { useState, useTransition } from "react";
import {
  crearCanal,
  crearSucursal,
  crearVendedor,
  crearInversionista,
  actualizarCanal,
  actualizarSucursal,
  actualizarVendedor,
  actualizarInversionista,
} from "@/features/catalogos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function SucursalDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await crearSucursal(formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Sucursal creada exitosamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1">
        <Plus className="w-4 h-4" /> Nueva Sucursal
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Sucursal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre de la sucursal *</Label>
            <Input id="nombre" name="nombre" required placeholder="Ej. Central Cochabamba" disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" placeholder="Ej. Cochabamba" disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" name="direccion" placeholder="Av. Heroínas #456" disabled={isPending} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CanalDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await crearCanal(formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Canal de venta creado");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1">
        <Plus className="w-4 h-4" /> Nuevo Canal
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Canal de Venta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre del canal *</Label>
            <Input id="nombre" name="nombre" required placeholder="Ej. WhatsApp, Tienda Física, Facebook" disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input id="descripcion" name="descripcion" placeholder="Opcional..." disabled={isPending} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VendedorDialog({ perfiles }: { perfiles: { id: string; email: string; nombre: string }[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [perfilId, setPerfilId] = useState<string>("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (perfilId) formData.set("perfil_id", perfilId);

    startTransition(async () => {
      const res = await crearVendedor(formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Vendedor registrado exitosamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-1">
        <Plus className="w-4 h-4" /> Nuevo Vendedor
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Vendedor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" name="nombre" required placeholder="Ej. Carlos Vendedor" disabled={isPending} />
          </div>
          <input type="hidden" name="comision_porcentaje" value="0" />
          <div className="space-y-1">
            <Label>Vincular a Cuenta de Usuario (Perfil Auth)</Label>
            <Select value={perfilId} onValueChange={(val) => setPerfilId(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar perfil (opcional)..." />
              </SelectTrigger>
              <SelectContent>
                {perfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditarVendedorDialog({
  vendedor,
  perfiles,
}: {
  vendedor: { id: string; nombre: string; comision_porcentaje: number; perfil_id?: string | null };
  perfiles: { id: string; email: string; nombre: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [perfilId, setPerfilId] = useState<string>(vendedor.perfil_id || "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (perfilId) formData.set("perfil_id", perfilId);

    startTransition(async () => {
      const res = await actualizarVendedor(vendedor.id, formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Vendedor actualizado correctamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        Editar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Vendedor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" name="nombre" defaultValue={vendedor.nombre} required disabled={isPending} />
          </div>
          <input type="hidden" name="comision_porcentaje" value="0" />
          <div className="space-y-1">
            <Label>Vincular a Cuenta de Usuario (Perfil Auth)</Label>
            <Select value={perfilId} onValueChange={(val) => setPerfilId(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar perfil (opcional)..." />
              </SelectTrigger>
              <SelectContent>
                {perfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar Cambios"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditarSucursalDialog({
  sucursal,
}: {
  sucursal: { id: string; nombre: string; ciudad?: string | null; direccion?: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await actualizarSucursal(sucursal.id, formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Sucursal actualizada correctamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        Editar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Sucursal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre de la sucursal *</Label>
            <Input id="nombre" name="nombre" defaultValue={sucursal.nombre} required disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" defaultValue={sucursal.ciudad || ""} disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" name="direccion" defaultValue={sucursal.direccion || ""} disabled={isPending} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar Cambios"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditarCanalDialog({
  canal,
}: {
  canal: { id: string; nombre: string; descripcion?: string | null };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await actualizarCanal(canal.id, formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Canal de venta actualizado");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        Editar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Canal de Venta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre del canal *</Label>
            <Input id="nombre" name="nombre" defaultValue={canal.nombre} required disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input id="descripcion" name="descripcion" defaultValue={canal.descripcion || ""} disabled={isPending} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar Cambios"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InversionistaDialog({
  onCreated,
  trigger,
}: {
  onCreated?: (inversionista: { id: string; nombre: string }) => void;
  trigger?: React.ReactNode;
} = {}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await crearInversionista(formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Inversionista registrado exitosamente");
        setOpen(false);
        if (res.data && onCreated) {
          onCreated(res.data);
        }
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)} size="sm" className="gap-1">
          <Plus className="w-4 h-4" /> Nuevo Inversionista
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Inversionista</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" name="nombre" required placeholder="Ej. Roberto Gómez" disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telefono">Teléfono / WhatsApp</Label>
            <Input id="telefono" name="telefono" placeholder="Ej. 70123456" disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" placeholder="inversionista@email.com" disabled={isPending} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditarInversionistaDialog({
  inversionista,
}: {
  inversionista: { id: string; nombre: string; telefono?: string | null; email?: string | null; activo: boolean };
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activo, setActivo] = useState(inversionista.activo ? "true" : "false");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("activo", activo);
    startTransition(async () => {
      const res = await actualizarInversionista(inversionista.id, formData);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Inversionista actualizado correctamente");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        Editar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Inversionista</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" name="nombre" defaultValue={inversionista.nombre} required disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telefono">Teléfono / WhatsApp</Label>
            <Input id="telefono" name="telefono" defaultValue={inversionista.telefono || ""} disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" defaultValue={inversionista.email || ""} disabled={isPending} />
          </div>
          <div className="space-y-1">
            <Label>Estado</Label>
            <Select value={activo} onValueChange={(val) => setActivo(val ?? "true")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Activo</SelectItem>
                <SelectItem value="false">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Guardar Cambios"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

