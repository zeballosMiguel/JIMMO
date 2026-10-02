"use client";

import { useTransition } from "react";
import { actualizarEstadoEntrega } from "@/features/entregas/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Props {
  entregaId: string;
  estadoActual: string;
}

export function EstadoEntregaSelect({ entregaId, estadoActual }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleChange(nuevoEstado: string) {
    startTransition(async () => {
      const res = await actualizarEstadoEntrega(entregaId, nuevoEstado);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Estado de entrega actualizado a ${nuevoEstado}`);
      }
    });
  }

  const isEntregado = estadoActual === "ENTREGADO";

  return (
    <Select value={estadoActual} onValueChange={(val) => val && handleChange(val)} disabled={isPending}>
      <SelectTrigger className={`w-36 h-8 text-xs font-bold rounded-lg border transition-all ${
        isEntregado
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
      }`}>
        <SelectValue placeholder="Estado..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="PENDIENTE" className="text-xs font-semibold text-amber-600">
          PENDIENTE (Por entregar)
        </SelectItem>
        <SelectItem value="ENTREGADO" className="text-xs font-semibold text-emerald-600">
          ENTREGADO (Ya se dejó)
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
