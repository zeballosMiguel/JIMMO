"use client";

import { useState, useTransition, useMemo } from "react";
import { realizarTraspaso } from "@/features/traspasos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRightLeft, Package, AlertCircle } from "lucide-react";

export interface SucursalOption {
  id: string;
  nombre: string;
}

export interface VarianteStockItem {
  variante_id: string;
  sku: string;
  nombre_producto: string;
  color: string;
  talla: string | null;
  stock_ea: number;
  stock_lp: number;
}

export interface TraspasoHistorialItem {
  id: string;
  origen_sucursal_nombre: string;
  destino_sucursal_nombre: string;
  nombre_producto: string | null;
  variante_sku: string;
  variante_color: string;
  cantidad: number;
  motivo: string | null;
  created_at: string;
}

interface TraspasoFormProps {
  sucursales: SucursalOption[];
  variantes: VarianteStockItem[];
  historial: TraspasoHistorialItem[];
  elAltoId: string;
  laPazId: string;
}

export function TraspasoForm({
  sucursales,
  variantes,
  historial,
  elAltoId,
  laPazId,
}: TraspasoFormProps) {
  const [isPending, startTransition] = useTransition();
  const [origenId, setOrigenId] = useState(elAltoId);
  const [destinoId, setDestinoId] = useState(laPazId);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState("");

  const origenNombre = sucursales.find((s) => s.id === origenId)?.nombre ?? "Origen";
  const destinoNombre = sucursales.find((s) => s.id === destinoId)?.nombre ?? "Destino";

  // Stock disponible según sucursal seleccionada como origen
  const isOrigenEA = origenId === elAltoId;

  const variantesConStock = useMemo(
    () =>
      variantes.filter((v) =>
        isOrigenEA ? v.stock_ea > 0 : v.stock_lp > 0
      ),
    [variantes, isOrigenEA]
  );

  function getStockOrigen(v: VarianteStockItem) {
    return isOrigenEA ? v.stock_ea : v.stock_lp;
  }

  function handleSwap() {
    setOrigenId(destinoId);
    setDestinoId(origenId);
    setCantidades({});
  }

  function handleCantidadChange(varianteId: string, val: string) {
    setCantidades((prev) => ({ ...prev, [varianteId]: val }));
  }

  function handleConfirmar() {
    const items = Object.entries(cantidades)
      .map(([varianteId, val]) => ({ varianteId, cantidad: parseInt(val, 10) || 0 }))
      .filter((i) => i.cantidad > 0);

    if (items.length === 0) {
      toast.error("Ingresa al menos una cantidad para traspasar");
      return;
    }

    // Validar que ninguna cantidad exceda el stock del origen
    for (const item of items) {
      const v = variantes.find((v) => v.variante_id === item.varianteId);
      if (v && item.cantidad > getStockOrigen(v)) {
        toast.error(
          `Stock insuficiente para ${v.color}${v.talla ? ` / ${v.talla}` : ""}: máximo ${getStockOrigen(v)} unids`
        );
        return;
      }
    }

    startTransition(async () => {
      let errores = 0;
      for (const item of items) {
        const res = await realizarTraspaso({
          origenSucursalId: origenId,
          destinoSucursalId: destinoId,
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          motivo: motivo.trim() || undefined,
        });
        if (res.error) {
          errores++;
          toast.error(res.error);
        }
      }
      if (errores === 0) {
        toast.success(`Traspaso realizado: ${items.length} variante(s) enviadas a ${destinoNombre}`);
        setCantidades({});
        setMotivo("");
      }
    });
  }

  const totalUnidades = Object.values(cantidades).reduce(
    (acc, v) => acc + (parseInt(v, 10) || 0),
    0
  );

  function formatTalla(talla?: string | null) {
    if (!talla || talla.trim() === "" || talla.toLowerCase() === "u" || talla.toLowerCase() === "unica") return "Talla Única";
    return talla;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Selector de Dirección ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
          Dirección del Traspaso
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Desde */}
          <div className="flex-1 w-full">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Desde</label>
            <select
              value={origenId}
              onChange={(e) => {
                const newOrigen = e.target.value;
                setOrigenId(newOrigen);
                setDestinoId(sucursales.find((s) => s.id !== newOrigen)?.id ?? destinoId);
                setCantidades({});
              }}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwap}
            className="mt-5 sm:mt-0 p-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
            title="Invertir dirección"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          {/* Hasta */}
          <div className="flex-1 w-full">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Hasta</label>
            <select
              value={destinoId}
              onChange={(e) => {
                const newDestino = e.target.value;
                setDestinoId(newDestino);
                setOrigenId(sucursales.find((s) => s.id !== newDestino)?.id ?? origenId);
                setCantidades({});
              }}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Motivo */}
        <div className="mt-4">
          <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
            Motivo (opcional)
          </label>
          <Input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Reposición para evento, pedido cliente La Paz..."
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* ── Tabla de Variantes ── */}
      <div className="bg-card border border-border rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Variantes Disponibles en{" "}
              <span className="text-primary">{origenNombre}</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ingresa la cantidad a enviar a {destinoNombre}
            </p>
          </div>
          {totalUnidades > 0 && (
            <span className="text-xs font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full">
              {totalUnidades} uds a traspasar
            </span>
          )}
        </div>

        {variantesConStock.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Package className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">Sin stock disponible en {origenNombre}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cambia la sucursal de origen o realiza un traspaso en sentido inverso.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-2.5 bg-muted/40 border-b border-border grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <span className="col-span-4">Producto / Variante</span>
              <span className="col-span-2">SKU</span>
              <span className="col-span-2 text-center">Stock {origenId === elAltoId ? "EA" : "LP"}</span>
              <span className="col-span-2 text-center">Stock {destinoId === elAltoId ? "EA" : "LP"}</span>
              <span className="col-span-2 text-right">Cantidad</span>
            </div>

            <div className="divide-y divide-border/60">
              {variantesConStock.map((v) => {
                const stockOrigen = getStockOrigen(v);
                const stockDestino = isOrigenEA ? v.stock_lp : v.stock_ea;
                const cantVal = parseInt(cantidades[v.variante_id] || "0", 10) || 0;
                const excede = cantVal > stockOrigen;

                return (
                  <div
                    key={v.variante_id}
                    className={`px-5 py-3 grid grid-cols-12 gap-2 items-center transition-colors ${
                      cantVal > 0 ? "bg-primary/5" : "hover:bg-muted/20"
                    }`}
                  >
                    <div className="col-span-4 min-w-0">
                      <p className="font-semibold text-xs text-foreground truncate">{v.nombre_producto}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {v.color}
                        {v.talla ? ` / ${formatTalla(v.talla)}` : ""}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-mono text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/50 truncate block">
                        {v.sku}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-xs font-bold text-foreground">{stockOrigen}</span>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-xs text-muted-foreground">{stockDestino}</span>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <div className="relative w-20">
                        <Input
                          type="number"
                          min={0}
                          max={stockOrigen}
                          value={cantidades[v.variante_id] || ""}
                          onChange={(e) => handleCantidadChange(v.variante_id, e.target.value)}
                          placeholder="0"
                          className={`h-8 text-sm text-right font-mono pr-2 ${
                            excede
                              ? "border-destructive focus-visible:ring-destructive/30"
                              : ""
                          }`}
                        />
                        {excede && (
                          <AlertCircle className="absolute -left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-destructive" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer / Confirmar */}
            <div className="px-5 py-4 border-t border-border bg-muted/10 flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                {origenNombre} → {destinoNombre}
                {totalUnidades > 0 && (
                  <span className="ml-1 font-semibold text-foreground">
                    · {totalUnidades} unidades
                  </span>
                )}
              </p>
              <Button
                onClick={handleConfirmar}
                disabled={isPending || totalUnidades === 0}
                className="bg-primary text-primary-foreground font-bold gap-2 shadow-2xs"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {isPending ? "Procesando..." : "Confirmar Traspaso"}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Historial / Órdenes de Envío ── */}
      <div className="bg-card border border-border rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Órdenes de Envío / Historial de Traspasos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Últimos 20 envíos registrados entre sucursales</p>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {historial.length} mov.
          </span>
        </div>
        {historial.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Aún no se han registrado órdenes de traspaso entre sucursales.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {historial.map((h) => {
              const eaNombre = sucursales.find((s) => s.id === elAltoId)?.nombre ?? "";
              const isFromEA = eaNombre ? h.origen_sucursal_nombre === eaNombre : true;
              const isToLP = eaNombre ? h.destino_sucursal_nombre !== eaNombre : true;
              return (
                <div key={h.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground truncate">
                        {h.nombre_producto ?? h.variante_sku}
                      </span>
                      <span className="text-muted-foreground capitalize">
                        · {h.variante_color}
                      </span>
                      <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">
                        {h.variante_sku}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                        {isFromEA ? "EA" : "LP"} · {h.origen_sucursal_nombre}
                      </span>
                      <span className="text-muted-foreground font-bold">→</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium">
                        {isToLP ? "LP" : "EA"} · {h.destino_sucursal_nombre}
                      </span>
                      {h.motivo && (
                        <span className="text-muted-foreground italic ml-1">· "{h.motivo}"</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-1">
                    <span className="inline-flex items-center font-bold text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {h.cantidad} uds
                    </span>
                    <p className="text-[11px] text-muted-foreground/80">{formatDate(h.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
