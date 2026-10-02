"use client";

import { useState, useTransition } from "react";
import { crearRetiro } from "@/features/retiros/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { InversionistaDialog } from "@/features/catalogos/components/config-dialogs";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Inversionista {
  id: string;
  nombre: string;
}
interface Vendedor {
  id: string;
  nombre: string;
}

interface NuevoRetiroDialogProps {
  inversionistas: Inversionista[];
  vendedores: Vendedor[];
}

export function NuevoRetiroDialog({ inversionistas, vendedores }: NuevoRetiroDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [origen, setOrigen] = useState<string>("CAPITAL");
  const [tipoDestinatario, setTipoDestinatario] = useState<string>("inversionista");
  const [destinatarioId, setDestinatarioId] = useState<string>("");
  const [inversionistasList, setInversionistasList] = useState<Inversionista[]>(inversionistas);

  // Keep list updated if server prop changes
  if (inversionistas.length !== inversionistasList.length && !inversionistasList.some(item => !inversionistas.find(p => p.id === item.id))) {
    setInversionistasList(inversionistas);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("origen", origen);

    if (tipoDestinatario === "inversionista") {
      formData.set("inversionista_id", destinatarioId);
      formData.delete("vendedor_id");
    } else {
      formData.set("vendedor_id", destinatarioId);
      formData.delete("inversionista_id");
    }

    startTransition(async () => {
      const res = await crearRetiro(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Retiro registrado exitosamente");
        setOpen(false);
        setDestinatarioId("");
      }
    });
  }

  const destinatarios = tipoDestinatario === "inversionista" ? inversionistasList : vendedores;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        onClick={() => setOpen(true)}
        className="gap-2 bg-red-600 hover:bg-red-700 text-white shadow-sm"
      >
        <Plus className="w-4 h-4" /> Nuevo Retiro
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Registrar Nuevo Retiro</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Monto */}
          <div className="space-y-1.5">
            <Label htmlFor="retiro-monto">Monto (Bs.) *</Label>
            <Input
              id="retiro-monto"
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              required
              disabled={isPending}
            />
          </div>

          {/* Origen */}
          <div className="space-y-1.5">
            <Label>Origen del retiro *</Label>
            <Select value={origen} onValueChange={(val) => setOrigen(val ?? "CAPITAL")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CAPITAL">Capital (Operativo)</SelectItem>
                <SelectItem value="UTILIDAD">Utilidad (Ganancias)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de destinatario */}
          <div className="space-y-1.5">
            <Label>Tipo de destinatario *</Label>
            <Select
              value={tipoDestinatario}
              onValueChange={(val) => {
                setTipoDestinatario(val ?? "inversionista");
                setDestinatarioId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inversionista">Inversionista / Socio</SelectItem>
                <SelectItem value="vendedor">Vendedor / Operativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Destinatario */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>
                {tipoDestinatario === "inversionista" ? "Inversionista" : "Vendedor"} *
              </Label>
              {tipoDestinatario === "inversionista" && (
                <InversionistaDialog
                  onCreated={(newInv) => {
                    setInversionistasList((prev) => [...prev, newInv]);
                    setDestinatarioId(newInv.id);
                  }}
                  trigger={
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-700 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Registrar inversionista
                    </button>
                  }
                />
              )}
            </div>
            <Select value={destinatarioId} onValueChange={(val) => setDestinatarioId(val ?? "")}>
              <SelectTrigger>
                <SelectValue
                  placeholder={`Seleccionar ${tipoDestinatario === "inversionista" ? "inversionista" : "vendedor"}`}
                />
              </SelectTrigger>
              <SelectContent>
                {destinatarios.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No hay {tipoDestinatario === "inversionista" ? "inversionistas" : "vendedores"} registrados
                  </SelectItem>
                ) : (
                  destinatarios.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nombre}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {destinatarios.length === 0 && tipoDestinatario === "inversionista" && (
              <p className="text-xs text-muted-foreground">
                No tienes inversionistas registrados. Usa el botón de arriba o ve a <strong>Configuración</strong>.
              </p>
            )}
          </div>

          {/* Descripcion */}
          <div className="space-y-1.5">
            <Label htmlFor="retiro-descripcion">Descripción / Concepto</Label>
            <Textarea
              id="retiro-descripcion"
              name="descripcion"
              placeholder="Ej. Retiro de capital operativo para compra de suministros..."
              rows={3}
              disabled={isPending}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || !destinatarioId}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isPending ? "Registrando..." : "Guardar Retiro"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
