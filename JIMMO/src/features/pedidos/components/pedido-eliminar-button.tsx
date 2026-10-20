"use client";

import { useState, useTransition } from "react";
import { cancelarPedido } from "@/features/pedidos/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface Props {
  pedidoId: string;
  numero: number;
  cliente?: string | null;
  estado: string;
}

export function PedidoEliminarButton({ pedidoId, numero, cliente, estado }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Solo se pueden cancelar / eliminar pedidos RESERVADOS (libera reservas de stock)
  // o ya CANCELADOS. Pedidos COMPLETADOS no deben borrarse directamente porque ya afectaron Kardex contable.
  const isReservado = estado === "RESERVADO";

  function handleConfirm() {
    startTransition(async () => {
      const res = await cancelarPedido(pedidoId);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(
          isReservado
            ? `Pedido #${numero} cancelado y stock liberado correctamente`
            : `Pedido #${numero} procesado correctamente`
        );
      }
      setConfirmOpen(false);
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
        title="Cancelar / Eliminar pedido"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`¿Eliminar / Cancelar Pedido #${numero}?`}
        description={
          isReservado
            ? `El pedido #${numero} de "${cliente || "Cliente Ocasional"}" será cancelado inmediatamente. Todas las prendas reservadas serán liberadas y devueltas al inventario disponible, actualizando Dashboard, Reportes, Lotes y Clientes.`
            : `El pedido #${numero} será marcado como cancelado. ¿Deseas continuar?`
        }
        confirmLabel="Sí, eliminar pedido"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
