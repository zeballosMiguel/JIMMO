"use client";

import { eliminarVariante } from "@/features/catalogos/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function VarianteEliminarButton({ id, sku }: { id: string; sku: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarVariante(id)}
      entityName={`variante "${sku}"`}
    />
  );
}
