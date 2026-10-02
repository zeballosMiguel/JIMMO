"use client";

import { eliminarProducto } from "@/features/catalogos/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function ProductoEliminarButton({ id, nombre }: { id: string; nombre: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarProducto(id)}
      entityName={`producto "${nombre}"`}
    />
  );
}
