"use client";

import { cancelarPedido } from "@/features/pedidos/actions";
import { EliminarButton } from "@/components/ui/eliminar-button";

export function PedidoEliminarButton({ id, numero }: { id: string; numero: number }) {
  return (
    <EliminarButton
      onEliminar={() => cancelarPedido(id)}
      entityName={`pedido #${numero}`}
    />
  );
}
