"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  TrendingUp,
  DollarSign,
  Wallet,
  Users,
  Eye,
  PiggyBank,
  ArrowDownCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InversionistaLoteDetalle {
  lote_id: string;
  numero_lote: number;
  estado_lote: string;
  monto_invertido: number;
  costo_total_lote: number;
  utilidad_lote: number;
  utilidad_proporcional: number;
  pct_participacion: number;
}

export interface InversionistaRendimientoItem {
  inversionista_id: string;
  nombre: string;
  lotes_financiados: number;
  capital_aportado_total: number;
  utilidad_generada_total: number;
  retiros_capital: number;
  retiros_utilidad: number;
  utilidad_pendiente: number;
  roi_porcentaje: number;
  lotes: InversionistaLoteDetalle[];
}

interface Props {
  data: InversionistaRendimientoItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `Bs ${n.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function getLoteEstadoBadge(estado: string) {
  switch (estado?.toUpperCase()) {
    case "RECIBIDO":
      return (
        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium text-[10px]">
          Recibido
        </Badge>
      );
    case "EN_TRANSITO":
    case "EN TRANSITO":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium text-[10px]">
          En Tránsito
        </Badge>
      );
    case "CERRADO":
      return (
        <Badge className="bg-slate-500/10 text-slate-600 border-slate-500/20 font-medium text-[10px]">
          Cerrado
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px]">
          {estado || "—"}
        </Badge>
      );
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InversionistasRendimientoTable({ data }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInv, setSelectedInv] = useState<InversionistaRendimientoItem | null>(null);

  const totals = useMemo(() => {
    const capitalTotal = data.reduce((s, i) => s + i.capital_aportado_total, 0);
    const utilidadTotal = data.reduce((s, i) => s + i.utilidad_generada_total, 0);
    const retiradoTotal = data.reduce((s, i) => s + i.retiros_utilidad + i.retiros_capital, 0);
    const pendienteTotal = data.reduce((s, i) => s + i.utilidad_pendiente, 0);
    const roiGlobal = capitalTotal > 0 ? (utilidadTotal / capitalTotal) * 100 : 0;
    return { capitalTotal, utilidadTotal, retiradoTotal, pendienteTotal, roiGlobal };
  }, [data]);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter((i) => i.nombre.toLowerCase().includes(q));
  }, [data, searchTerm]);

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Capital Total Invertido
              </p>
              <h3 className="text-xl font-bold mt-1 tabular-nums text-foreground">
                {fmt(totals.capitalTotal)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {data.length} inversionista{data.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Utilidad Generada Total
              </p>
              <h3 className="text-xl font-bold mt-1 tabular-nums text-red-600">
                {fmt(totals.utilidadTotal)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ROI global: {pct(totals.roiGlobal)}
              </p>
            </div>
            <div className="p-3 bg-red-500/10 text-red-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Retirado
              </p>
              <h3 className="text-xl font-bold mt-1 tabular-nums text-foreground">
                {fmt(totals.retiradoTotal)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Capital + utilidad cobrados
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Utilidad Pendiente de Pago
              </p>
              <h3
                className={`text-xl font-bold mt-1 tabular-nums ${
                  totals.pendienteTotal >= 0 ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {fmt(totals.pendienteTotal)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ganancias aún no cobradas
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar inversionista..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        {filtered.length !== data.length && (
          <p className="text-xs text-muted-foreground">
            {filtered.length} de {data.length} resultados
          </p>
        )}
      </div>

      {/* ── Main Table ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-bold text-xs uppercase tracking-wider">
                Inversionista
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-center">
                Lotes
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                Capital Invertido
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                Utilidad Generada
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                Retirado (Cap.)
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                Retirado (Util.)
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                Util. Pendiente
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">
                ROI
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-8 h-8 opacity-40 stroke-1" />
                    <p className="text-sm font-medium">
                      {data.length === 0
                        ? "No hay inversionistas registrados con lotes asociados."
                        : "No se encontraron resultados."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inv) => {
                const roi = inv.roi_porcentaje;
                const pendiente = inv.utilidad_pendiente;
                return (
                  <TableRow
                    key={inv.inversionista_id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-semibold text-sm">{inv.nombre}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      <Badge variant="outline" className="font-mono font-bold text-xs">
                        {inv.lotes_financiados}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground font-medium">
                      {fmt(inv.capital_aportado_total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-red-600">
                      {fmt(inv.utilidad_generada_total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmt(inv.retiros_capital)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmt(inv.retiros_utilidad)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums font-bold ${
                        pendiente >= 0 ? "text-emerald-600" : "text-destructive"
                      }`}
                    >
                      {fmt(pendiente)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Badge
                        variant={roi >= 0 ? "outline" : "destructive"}
                        className={
                          roi >= 0
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold"
                            : "font-bold"
                        }
                      >
                        {pct(roi)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedInv(inv)}
                        title="Ver detalle por lote"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Totales Footer ──────────────────────────────────────── */}
      {filtered.length > 1 && (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Capital total:
            </span>{" "}
            <span className="font-bold tabular-nums">{fmt(totals.capitalTotal)}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Utilidad total:
            </span>{" "}
            <span className="font-bold tabular-nums text-red-600">
              {fmt(totals.utilidadTotal)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Pendiente total:
            </span>{" "}
            <span className="font-bold tabular-nums text-emerald-600">
              {fmt(totals.pendienteTotal)}
            </span>
          </div>
        </div>
      )}

      {/* ── Detail Dialog ────────────────────────────────────────── */}
      {selectedInv && (
        <Dialog
          open={!!selectedInv}
          onOpenChange={(open) => !open && setSelectedInv(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Users className="w-5 h-5 text-red-600" />
                {selectedInv.nombre} — Detalle por Lote
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              {/* Resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <p className="text-[11px] text-muted-foreground">Capital Invertido</p>
                  <p className="font-bold text-base mt-0.5 tabular-nums">
                    {fmt(selectedInv.capital_aportado_total)}
                  </p>
                </div>
                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <p className="text-[11px] text-muted-foreground">Utilidad Generada</p>
                  <p className="font-bold text-base mt-0.5 tabular-nums text-red-600">
                    {fmt(selectedInv.utilidad_generada_total)}
                  </p>
                </div>
                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <p className="text-[11px] text-muted-foreground">Util. Pendiente</p>
                  <p
                    className={`font-bold text-base mt-0.5 tabular-nums ${
                      selectedInv.utilidad_pendiente >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                  >
                    {fmt(selectedInv.utilidad_pendiente)}
                  </p>
                </div>
                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <p className="text-[11px] text-muted-foreground">ROI Total</p>
                  <p className="font-bold text-base mt-0.5 tabular-nums">
                    {pct(selectedInv.roi_porcentaje)}
                  </p>
                </div>
              </div>

              {/* Retiros */}
              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/40 p-3 flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      Retiros de Capital
                    </p>
                    <p className="font-bold tabular-nums text-sm">
                      {fmt(selectedInv.retiros_capital)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                      Retiros de Utilidad
                    </p>
                    <p className="font-bold tabular-nums text-sm">
                      {fmt(selectedInv.retiros_utilidad)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Lotes breakdown */}
              {selectedInv.lotes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay lotes con inversión registrada.
                </p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Lote</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Estado</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Aportado</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Part. %</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Util. Lote</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Util. Proporcional</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInv.lotes.map((lote) => (
                        <TableRow key={lote.lote_id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-mono font-black text-sm">
                            #{lote.numero_lote}
                          </TableCell>
                          <TableCell>{getLoteEstadoBadge(lote.estado_lote)}</TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                            {fmt(lote.monto_invertido)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm font-medium">
                            {lote.pct_participacion.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                            {fmt(lote.utilidad_lote)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-bold text-sm text-red-600">
                            {fmt(lote.utilidad_proporcional)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
