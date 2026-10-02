"use client";

import { useTransition } from "react";
import { completarPedido, cancelarPedido } from "@/features/pedidos/actions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";

interface Props {
  pedidoId: string;
  estado: string;
}

export function AccionesPedido({ pedidoId, estado }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleCompletar() {
    if (!confirm("¿Deseas marcar este pedido como COMPLETADO? Esto deducirá el stock del inventario permanentemente via FIFO y cerrará la venta.")) {
      return;
    }
    startTransition(async () => {
      const res = await completarPedido(pedidoId);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Pedido COMPLETADO exitosamente");
      }
    });
  }

  function handleCancelar() {
    if (!confirm("¿Deseas CANCELAR este pedido? Las reservas de stock serán liberadas inmediatamente y devueltas al inventario disponible.")) {
      return;
    }
    startTransition(async () => {
      const res = await cancelarPedido(pedidoId);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Pedido CANCELADO exitosamente (stock liberado)");
      }
    });
  }

  if (estado === "COMPLETADO" || estado === "CANCELADO") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleCompletar}
        disabled={isPending}
        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
      >
        <CheckCircle2 className="w-4 h-4" />
        {isPending ? "Completando..." : "Completar Venta"}
      </Button>

      <Button
        onClick={handleCancelar}
        disabled={isPending}
        variant="destructive"
        className="gap-2"
      >
        <XCircle className="w-4 h-4" />
        {isPending ? "Cancelando..." : "Cancelar Reserva"}
      </Button>
    </div>
  );
}
