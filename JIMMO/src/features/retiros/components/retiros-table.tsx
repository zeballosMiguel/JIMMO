"use client";

import { useTransition } from "react";
import { eliminarRetiro } from "@/features/retiros/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface RetiroRow {
  id: string;
  fecha: string;
  monto: number;
  origen: "CAPITAL" | "UTILIDAD";
  descripcion: string | null;
  destinatario: string;
  tipo_destinatario: "inversionista" | "vendedor";
}

interface RetirosTableProps {
  retiros: RetiroRow[];
  sumaFiltrada: number;
}

function formatBs(value: number) {
  return Number(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const origenBadge: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  CAPITAL: { variant: "outline", color: "bg-amber-50 text-amber-700 border-amber-200" },
  UTILIDAD: { variant: "outline", color: "bg-violet-50 text-violet-700 border-violet-200" },
};

function EliminarRetiroBtn({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("¿Estás seguro de eliminar este retiro? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      const res = await eliminarRetiro(id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Retiro eliminado");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
      className="text-muted-foreground hover:text-red-600 h-8 w-8 p-0"
    >
      <Trash2 className="w-4 h-4" />
    </Button>
  );
}

export function RetirosTable({ retiros, sumaFiltrada }: RetirosTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold text-foreground">Historial de Egresos y Retiros</h2>
          <span className="text-[11px] text-muted-foreground bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded font-medium">
            {retiros.length} transaccion{retiros.length !== 1 ? "es" : ""}
          </span>
        </div>
        <div className="text-sm text-muted-foreground">
          Suma del período filtrado{" "}
          <span className="font-bold text-foreground tabular-nums">
            Bs {formatBs(sumaFiltrada)}
          </span>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">FECHA</TableHead>
            <TableHead className="text-right">MONTO</TableHead>
            <TableHead>ORIGEN</TableHead>
            <TableHead>DESTINO / SOLICITANTE</TableHead>
            <TableHead>DETALLE DEL EGRESO</TableHead>
            <TableHead className="text-right w-[80px]">ACCIÓN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {retiros.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                No hay retiros registrados para los filtros aplicados.
              </TableCell>
            </TableRow>
          ) : (
            retiros.map((r) => {
              const badge = origenBadge[r.origen];
              return (
                <TableRow key={r.id} className="hover:bg-zinc-50/50">
                  <TableCell className="tabular-nums text-sm">
                    {new Date(r.fecha).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-foreground">
                    Bs {formatBs(r.monto)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant} className={badge.color}>
                      {r.origen === "CAPITAL" ? "● Capital" : "● Utilidad"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium text-sm text-foreground">{r.destinatario}</span>
                      <span className="block text-[11px] text-muted-foreground capitalize">
                        {r.tipo_destinatario === "inversionista" ? "Socio Inversionista" : "Vendedor / Operativo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground line-clamp-2">
                      {r.descripcion || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <EliminarRetiroBtn id={r.id} />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
