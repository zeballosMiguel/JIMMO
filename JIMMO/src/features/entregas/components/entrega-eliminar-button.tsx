"use client";

import { eliminarEntrega } from "@/features/entregas/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function EntregaEliminarButton({ id }: { id: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarEntrega(id)}
      entityName="entrega"
    />
  );
}
