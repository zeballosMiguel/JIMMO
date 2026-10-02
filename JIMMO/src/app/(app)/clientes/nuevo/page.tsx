"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearCliente } from "@/features/clientes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NuevoClientePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await crearCliente(formData);
      if (res?.error) {
        setError(res.error);
        toast.error(res.error);
      } else {
        toast.success("Cliente creado correctamente");
        router.push("/clientes");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/clientes" className="p-2 hover:bg-accent rounded-lg">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo cliente</h1>
          <p className="text-sm text-muted-foreground">
            Registra los datos de un nuevo cliente en el sistema.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nombre">Nombre completo *</Label>
            <Input id="nombre" name="nombre" required placeholder="Ej: María González" disabled={isPending} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" placeholder="+591 70000000" disabled={isPending} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input id="ciudad" name="ciudad" placeholder="Ej: La Paz" disabled={isPending} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas u observaciones</Label>
            <Textarea id="notas" name="notas" placeholder="Detalles de contacto o preferencias del cliente..." disabled={isPending} />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Crear cliente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
