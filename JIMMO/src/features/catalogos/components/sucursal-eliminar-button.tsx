"use client";

import { eliminarSucursal } from "@/features/catalogos/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function SucursalEliminarButton({ id, nombre }: { id: string; nombre: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarSucursal(id)}
      entityName={`sucursal "${nombre}"`}
    />
  );
}
