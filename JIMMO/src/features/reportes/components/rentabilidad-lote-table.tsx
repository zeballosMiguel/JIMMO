"useClient";
"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, TrendingUp, DollarSign, PackageCheck, Boxes, Percent, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface RentabilidadLoteItem {
  lote_id: string;
  numero_lote: number;
  estado: string;
  fecha_compra?: string | null;
  fecha_recepcion?: string | null;
  unidades_compradas: number;
  unidades_vendidas: number;
  unidades_disponibles: number;
  costo_total_inversion: number;
  ventas_totales: number;
  costo_ventas: number;
  utilidad_real: number;
  porcentaje_vendido: number;
  roi_porcentaje: number;
}

interface Props {
  data: RentabilidadLoteItem[];
}

export function RentabilidadLoteTable({ data }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("TODOS");
  const [selectedLote, setSelectedLote] = useState<RentabilidadLoteItem | null>(null);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchSearch =
        searchTerm === "" ||
        item.numero_lote.toString().includes(searchTerm) ||
        `lote ${item.numero_lote}`.toLowerCase().includes(searchTerm.toLowerCase());

      const matchEstado =
        estadoFilter === "TODOS" || item.estado?.toUpperCase() === estadoFilter.toUpperCase();

      return matchSearch && matchEstado;
    });
  }, [data, searchTerm, estadoFilter]);

  // Overall KPIs
  const totals = useMemo(() => {
    const totalInversion = data.reduce((acc, i) => acc + Number(i.costo_total_inversion || 0), 0);
    const totalVentas = data.reduce((acc, i) => acc + Number(i.ventas_totales || 0), 0);
    const totalCostoVentas = data.reduce((acc, i) => acc + Number(i.costo_ventas || 0), 0);
    const totalUtilidad = data.reduce((acc, i) => acc + Number(i.utilidad_real || 0), 0);
    const totalCompradas = data.reduce((acc, i) => acc + Number(i.unidades_compradas || 0), 0);
    const totalVendidas = data.reduce((acc, i) => acc + Number(i.unidades_vendidas || 0), 0);

    const roiGlobal = totalInversion > 0 ? (totalUtilidad / totalInversion) * 100 : 0;
    const pctVendidoGlobal = totalCompradas > 0 ? (totalVendidas / totalCompradas) * 100 : 0;

    return {
      totalInversion,
      totalVentas,
      totalCostoVentas,
      totalUtilidad,
      totalCompradas,
      totalVendidas,
      roiGlobal,
      pctVendidoGlobal,
    };
  }, [data]);

  const getEstadoBadge = (estado?: string) => {
    switch (estado?.toUpperCase()) {
      case "RECIBIDO":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Recibido</Badge>;
      case "TRANSITO":
      case "EN TRANSITO":
      case "EN_TRANSITO":
        return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">En Tránsito</Badge>;
      case "CERRADO":
        return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 font-medium">Cerrado</Badge>;
      default:
        return <Badge variant="outline">{estado || "Desconocido"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invertido */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Inversión Total Lotes</p>
              <h3 className="text-xl font-bold mt-1 tabular-nums text-foreground">
                Bs {totals.totalInversion.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {data.length} lotes registrados
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Ventas Generadas */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ventas Recaudadas</p>
              <h3 className="text-xl font-bold mt-1 tabular-nums text-emerald-600 dark:text-emerald-400">
                Bs {totals.totalVentas.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {totals.totalVendidas} de {totals.totalCompradas} unids. vendidas
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
              <PackageCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Utilidad Real */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Utilidad Neta Real</p>
              <h3 className={`text-xl font-bold mt-1 tabular-nums ${totals.totalUtilidad >= 0 ? "text-primary font-black" : "text-destructive"}`}>
                Bs {totals.totalUtilidad.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ganancia limpia efectivizada
              </p>
            </div>
            <div className="p-3 bg-red-600/10 text-red-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* ROI Promedio */}
        <Card className="bg-card border-border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ROI Retorno Global</p>
              <h3 className="text-xl font-bold mt-1 tabular-nums text-foreground">
                {totals.roiGlobal.toFixed(2)}%
              </h3>
              <div className="w-28 mt-1.5 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, totals.pctVendidoGlobal))}%` }}
                />
              </div>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
              <Percent className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nro. de lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {["TODOS", "RECIBIDO", "TRANSITO", "CERRADO"].map((st) => (
            <Button
              key={st}
              variant={estadoFilter === st ? "default" : "outline"}
              size="sm"
              onClick={() => setEstadoFilter(st)}
              className="h-8 text-xs font-medium whitespace-nowrap"
            >
              {st === "TRANSITO" ? "En Tránsito" : st.charAt(0) + st.slice(1).toLowerCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Rentabilidad por Lote Table ───────────────────────── */}
      <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="font-bold text-xs uppercase tracking-wider">Lote Nro.</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">Estado</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider">Avance de Venta</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Inversión Lote</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Ventas Recaudadas</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Costo Ventas</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">Utilidad Real</TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-right">ROI</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Boxes className="w-8 h-8 opacity-40 stroke-1" />
                    <p className="text-sm font-medium">No se encontraron lotes para este filtro.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((r) => {
                const inversion = Number(r.costo_total_inversion || 0);
                const ventas = Number(r.ventas_totales || 0);
                const costoVentas = Number(r.costo_ventas || 0);
                const utilidad = Number(r.utilidad_real || 0);
                const roi = Number(r.roi_porcentaje || 0);
                const pctVendido = Number(r.porcentaje_vendido || 0);

                return (
                  <TableRow key={r.lote_id} className="hover:bg-muted/30 transition-colors">
                    {/* Lote */}
                    <TableCell className="font-mono font-black text-sm">
                      #{r.numero_lote}
                    </TableCell>

                    {/* Estado */}
                    <TableCell>
                      {getEstadoBadge(r.estado)}
                    </TableCell>

                    {/* Avance Venta */}
                    <TableCell className="w-48">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span>{r.unidades_vendidas} / {r.unidades_compradas} unids.</span>
                          <span className="font-bold text-muted-foreground">{pctVendido.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-red-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, pctVendido))}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>

                    {/* Inversión */}
                    <TableCell className="text-right tabular-nums text-muted-foreground font-medium">
                      Bs {inversion.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* Ventas */}
                    <TableCell className="text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      Bs {ventas.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* Costo Ventas */}
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      Bs {costoVentas.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* Utilidad Real */}
                    <TableCell className={`text-right tabular-nums font-bold ${utilidad >= 0 ? "text-primary font-black" : "text-destructive"}`}>
                      Bs {utilidad.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* ROI */}
                    <TableCell className="text-right tabular-nums font-black">
                      <Badge variant={roi >= 0 ? "outline" : "destructive"} className={roi >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : ""}>
                        {roi >= 0 ? `+${roi.toFixed(1)}%` : `${roi.toFixed(1)}%`}
                      </Badge>
                    </TableCell>

                    {/* Detalle Dialog */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setSelectedLote(r)}
                        title="Ver detalle del lote"
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

      {/* ── Dialog de Detalle de Lote ───────────────────────────── */}
      {selectedLote && (
        <Dialog open={!!selectedLote} onOpenChange={(open) => !open && setSelectedLote(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                Resumen Financiero - Lote #{selectedLote.numero_lote}
                {getEstadoBadge(selectedLote.estado)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">Inversión Total</p>
                  <p className="font-bold text-base mt-0.5 tabular-nums">
                    Bs {Number(selectedLote.costo_total_inversion).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">Ventas Recaudadas</p>
                  <p className="font-bold text-base mt-0.5 tabular-nums text-emerald-600">
                    Bs {Number(selectedLote.ventas_totales).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">Costo de Unids. Vendidas</p>
                  <p className="font-bold text-base mt-0.5 tabular-nums text-muted-foreground">
                    Bs {Number(selectedLote.costo_ventas).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-muted/40 p-3 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground">Utilidad Neta Actual</p>
                  <p className={`font-bold text-base mt-0.5 tabular-nums ${Number(selectedLote.utilidad_real) >= 0 ? "text-primary" : "text-destructive"}`}>
                    Bs {Number(selectedLote.utilidad_real).toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="bg-muted/20 p-3 rounded-lg border border-border/40 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Unidades Compradas:</span>
                  <span className="font-bold">{selectedLote.unidades_compradas} unids.</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Unidades Vendidas:</span>
                  <span className="font-bold text-emerald-600">{selectedLote.unidades_vendidas} unids.</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Unidades Disponibles en Stock:</span>
                  <span className="font-bold text-blue-600">{selectedLote.unidades_disponibles} unids.</span>
                </div>
                <div className="flex justify-between text-xs pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">Retorno ROI del Lote:</span>
                  <span className="font-black text-foreground">{Number(selectedLote.roi_porcentaje).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
