"use client";

import { eliminarLote, eliminarDetalleLote } from "@/features/inventario/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function LoteEliminarButton({ id, numero }: { id: string; numero: number }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarLote(id)}
      entityName={`lote #${numero}`}
    />
  );
}

export function DetalleLoteEliminarButton({ id, loteId }: { id: string; loteId: string }) {
  return (
    <EliminarButton
      onEliminar={() => eliminarDetalleLote(id, loteId)}
      entityName="ítem de lote"
    />
  );
}
