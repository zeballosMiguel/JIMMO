"use client";

import { eliminarCategoria } from "@/features/catalogos/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function CategoriaEliminarButton({ id, nombre }: { id: string; nombre: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarCategoria(id)}
      entityName={`categoría "${nombre}"`}
    />
  );
}
