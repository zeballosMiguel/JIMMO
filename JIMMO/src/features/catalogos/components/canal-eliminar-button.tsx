"use client";

import { eliminarCanal } from "@/features/catalogos/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function CanalEliminarButton({ id, nombre }: { id: string; nombre: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarCanal(id)}
      entityName={`canal "${nombre}"`}
    />
  );
}
