"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { recibirLote } from "@/features/inventario/actions";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";

interface Props {
  loteId: string;
  size?: "default" | "sm";
  variant?: "default" | "outline";
  label?: string;
}

export function RecibirLoteButton({
  loteId,
  size = "default",
  variant = "default",
  label,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleRecibir() {
    startTransition(async () => {
      const result = await recibirLote(loteId);
      if (result.error) {
        toast.error(`Error al recibir lote: ${result.error}`);
      } else {
        toast.success("Lote recibido correctamente. Stock ingresado a inventario.");
      }
    });
  }

  const defaultLabel = label ?? (size === "sm" ? "Recibir" : "Recibir lote");

  return (
    <Button
      onClick={handleRecibir}
      disabled={isPending}
      id={`recibir-lote-btn-${loteId}`}
      size={size}
      variant={variant}
      className={
        variant === "default"
          ? "gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          : "gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800"
      }
      title="Marcar lote como recibido antes de la fecha (sumar stock físico al inventario)"
    >
      <PackageCheck className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {isPending ? "Recibiendo..." : defaultLabel}
    </Button>
  );
}
