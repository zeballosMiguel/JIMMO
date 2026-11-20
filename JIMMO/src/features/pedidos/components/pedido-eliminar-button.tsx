"use client";

import { useState, useTransition } from "react";
import { cancelarPedido, anularPedidoCompletado } from "@/features/pedidos/actions";
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

  const isReservado = estado === "RESERVADO";
  const isCompletado = estado === "COMPLETADO";

  function handleConfirm() {
    startTransition(async () => {
      let res;
      if (isCompletado) {
        res = await anularPedidoCompletado(pedidoId);
      } else {
        res = await cancelarPedido(pedidoId);
      }

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(
          isCompletado
            ? `Pedido #${numero} anulado. Stock restaurado, pagos anulados y reportes actualizados.`
            : `Pedido #${numero} cancelado y stock liberado correctamente`
        );
      }
      setConfirmOpen(false);
    });
  }

  if (!isReservado && !isCompletado) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
        title={isCompletado ? "Anular venta completada" : "Cancelar / Eliminar pedido"}
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          isCompletado
            ? `⚠️ Anular Venta Completada #${numero}`
            : `¿Eliminar / Cancelar Pedido #${numero}?`
        }
        description={
          isCompletado
            ? `Esta acción revertirá COMPLETAMENTE la venta #${numero} de "${cliente || "Cliente Ocasional"}". Se restaurará el stock a los lotes originales, se anularán todos los pagos, se eliminarán los repartos de utilidad y los reportes/dashboard se actualizarán automáticamente. Esta acción NO se puede deshacer.`
            : `El pedido #${numero} de "${cliente || "Cliente Ocasional"}" será cancelado. Todas las prendas reservadas serán liberadas al inventario.`
        }
        confirmLabel={isCompletado ? "Sí, anular venta" : "Sí, eliminar pedido"}
        cancelLabel="Cancelar"
        variant="destructive"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
