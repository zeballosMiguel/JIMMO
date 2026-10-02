"use client";

import { eliminarVendedor } from "@/features/catalogos/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function VendedorEliminarButton({ id, nombre }: { id: string; nombre: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarVendedor(id)}
      entityName={`vendedor "${nombre}"`}
    />
  );
}
