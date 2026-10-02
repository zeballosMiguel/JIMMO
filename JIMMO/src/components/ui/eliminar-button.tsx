"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface EliminarButtonProps {
  /** The server action to call — should return { error?: string; success?: boolean } */
  onEliminar: () => Promise<{ error?: string; success?: boolean }>;
  /** Name of the entity being deleted, for the confirmation message */
  entityName?: string;
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
}

export function EliminarButton({
  onEliminar,
  entityName = "este registro",
  size = "sm",
}: EliminarButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const res = await onEliminar();
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`${entityName} eliminado correctamente`);
      }
      setConfirmOpen(false);
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`¿Eliminar ${entityName}?`}
        description={`Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar ${entityName}?`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        loading={isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
