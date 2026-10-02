"use client";

import { eliminarInversionista } from "@/features/catalogos/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function InversionistaEliminarButton({ id, nombre }: { id: string; nombre: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarInversionista(id)}
      entityName={`inversionista "${nombre}"`}
    />
  );
}
