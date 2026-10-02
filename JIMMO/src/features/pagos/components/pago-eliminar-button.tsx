"use client";

import { eliminarPago } from "@/features/pagos/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function PagoEliminarButton({ id }: { id: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarPago(id)}
      entityName="pago"
    />
  );
}
