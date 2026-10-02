"use client";

import { eliminarCliente } from "@/features/clientes/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function ClienteEliminarButton({ id, nombre }: { id: string; nombre: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarCliente(id)}
      entityName={`cliente "${nombre}"`}
    />
  );
}
