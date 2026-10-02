"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { desglosarYRecibirLote, soloDesgloseDetalleLote, type DesgloseVarianteItem } from "@/features/inventario/actions";
import { crearVarianteDirecta } from "@/features/catalogos/actions";
import { EditarProductoLoteDialog } from "@/features/inventario/editar-producto-lote-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PackageOpen,
  Plus,
  Minus,
  CheckCircle2,
  Save,
  Package,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CircleDot,
  Check,
  Trash2,
} from "lucide-react";

export interface VarianteOption {
  id: string;
  sku?: string | null;
  color: string;
  talla?: string | null;
  producto_id: string;
  productos?: {
    id: string;
    nombre: string;
    codigo_interno: string;
  } | null;
}

export interface ProductoLoteInfo {
  id: string;
  nombre: string;
  codigo_interno?: string | null;
  cantidad_estimada?: number | null;
  costo_usd?: number | null;
  otros_costos_bs?: number | null;
}

interface Props {
  lote: {
    id: string;
    numero_lote: number;
    costo_total_usd?: number | null;
    tipo_cambio?: number | null;
    gastos_extras_bs?: number | null;
    cantidad_estimada?: number | null;
    cantidad_bultos?: number | null;
    producto_id?: string | null;
    estado?: string | null;
    notas?: string | null;
    productos_compra?: any;
    productos?: {
      id: string;
      nombre: string;
      codigo_interno: string;
    } | null;
  };
  productosLote: ProductoLoteInfo[];
  catalogoProductos: { id: string; nombre: string; codigo_interno: string }[];
  variantesProducto: VarianteOption[];
  detallesActuales: {
    id?: string;
    variante_id: string;
    cantidad: number;
  }[];
  soloDesglose?: boolean;
  onClose?: () => void;
  onCountChange?: (count: number) => void;
}

function isEstandar(color?: string | null, talla?: string | null) {
  if (!color) return false;
  const c = color.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return c === "estandar" && (!talla || talla.trim() === "");
}

// Iniciales o miniatura a partir del código interno
function getProductCodeBadge(codigoInterno?: string | null, nombre?: string): string {
  if (codigoInterno && codigoInterno.trim()) {
    return codigoInterno.trim().toUpperCase();
  }
  if (!nombre) return "PR";
  const words = nombre.trim().split(/\s+/);
  if (words.length > 1) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return nombre.slice(0, 3).toUpperCase();
}

// SKU automático para variantes
function getVariantSku(v: VarianteOption, prod?: ProductoLoteInfo | null): string {
  if (v.sku && v.sku.trim()) return v.sku.trim();
  const prefix = (prod?.codigo_interno || prod?.nombre?.slice(0, 3) || "PRD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const colorPart = v.color
    .slice(0, 3)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const tallaPart = v.talla ? `-${v.talla.toUpperCase().trim()}` : "";
  return `${prefix}-${colorPart}${tallaPart}`;
}

export function LoteContarWorkstation({
  lote,
  productosLote = [],
  catalogoProductos = [],
  variantesProducto: initialVariantes = [],
  detallesActuales = [],
  soloDesglose = false,
  onClose,
  onCountChange,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Lista local de productos asociados a este lote
  const [localProductos, setLocalProductos] = useState<ProductoLoteInfo[]>(productosLote);

  // Producto activo seleccionado en el Sidebar
  const [activeProdId, setActiveProdId] = useState<string>(
    productosLote[0]?.id || ""
  );

  // Lista local de variantes
  const [localVariantes, setLocalVariantes] = useState<VarianteOption[]>(
    initialVariantes.filter((v) => !isEstandar(v.color, v.talla))
  );

  // Mapa de conteo de unidades físicas por varianteId: { [varianteId]: cantidad }
  const [conteos, setConteos] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    (detallesActuales || []).forEach((d) => {
      if (d.variante_id) {
        initial[d.variante_id] = d.cantidad || 0;
      }
    });
    return initial;
  });

  // Control para abrir el formulario de "+ Agregar color / talla"
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [nuevoColor, setNuevoColor] = useState("");
  const [nuevaTalla, setNuevaTalla] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState("1");

  const isFinalizado =
    lote.estado === "RECIBIDO" || lote.estado === "CERRADO" || lote.estado === "EN_INVENTARIO";

  // Diálogo de resumen y confirmación al finalizar recepción
  const [showConfirmacionFinalizar, setShowConfirmacionFinalizar] = useState(false);

  // Diálogo de confirmación para ingreso parcial
  const [showConfirmacionIncompleto, setShowConfirmacionIncompleto] = useState(false);

  // Eliminar variante de la lista local
  function handleEliminarVariante(varianteId: string) {
    if (isFinalizado) return;
    setLocalVariantes((prev) => prev.filter((v) => v.id !== varianteId));
    setConteos((prev) => {
      const next = { ...prev };
      delete next[varianteId];
      return next;
    });
    toast.info("Variante removida de la lista de conteo");
  }

  // Sincronizar props cuando cambian sin borrar productos ni variantes creados localmente
  useEffect(() => {
    setLocalProductos((prev) => {
      const map = new Map<string, ProductoLoteInfo>();
      for (const p of prev) {
        if (p.id) map.set(p.id, p);
      }
      for (const p of productosLote) {
        if (p.id) {
          const existing = map.get(p.id);
          map.set(p.id, existing ? { ...existing, ...p } : p);
        }
      }
      return Array.from(map.values());
    });
    if (productosLote.length > 0 && !activeProdId) {
      setActiveProdId(productosLote[0].id);
    }
  }, [productosLote]);

  useEffect(() => {
    const incomingFiltered = initialVariantes.filter((v) => !isEstandar(v.color, v.talla));
    setLocalVariantes((prev) => {
      const map = new Map<string, VarianteOption>();
      // 1. Conservar todas las variantes locales existentes (incluyendo recién creadas)
      for (const v of prev) {
        if (v.id) map.set(v.id, v);
      }
      // 2. Integrar o actualizar con las que vienen de props
      for (const v of incomingFiltered) {
        if (v.id) {
          const existing = map.get(v.id);
          map.set(v.id, existing ? { ...existing, ...v } : v);
        }
      }
      return Array.from(map.values());
    });
  }, [initialVariantes]);

  useEffect(() => {
    if (detallesActuales && detallesActuales.length > 0) {
      setConteos((prev) => {
        const next = { ...prev };
        detallesActuales.forEach((d) => {
          if (d.variante_id && (next[d.variante_id] === undefined || next[d.variante_id] === 0)) {
            next[d.variante_id] = d.cantidad || 0;
          }
        });
        return next;
      });
    }
  }, [detallesActuales]);

  // Asegurar que activeProdId apunte siempre a un producto válido
  useEffect(() => {
    if (localProductos.length > 0 && (!activeProdId || !localProductos.some((p) => p.id === activeProdId))) {
      setActiveProdId(localProductos[0].id);
    }
  }, [localProductos, activeProdId]);

  // Valores financieros del lote
  const tc = Number(lote.tipo_cambio) || 6.96;
  const usdTotal = Number(lote.costo_total_usd) || localProductos.reduce((acc, p) => acc + (p.costo_usd || 0), 0);
  const extrasBs = Number(lote.gastos_extras_bs) || localProductos.reduce((acc, p) => acc + (p.otros_costos_bs || 0), 0);
  const subtotalBs = usdTotal * tc;
  const inversionTotalBs = subtotalBs + extrasBs;
  const estimadoPrendasTotal = lote.cantidad_estimada || localProductos.reduce((acc, p) => acc + (p.cantidad_estimada || 0), 0);

  // Modificar cantidad contada
  function handleSetCantidad(varianteId: string, cant: number) {
    setConteos((prev) => ({
      ...prev,
      [varianteId]: Math.max(0, cant),
    }));
  }

  function handleIncrementCantidad(varianteId: string, delta: number) {
    setConteos((prev) => {
      const current = prev[varianteId] || 0;
      return {
        ...prev,
        [varianteId]: Math.max(0, current + delta),
      };
    });
  }

  // Total global de prendas contadas
  const totalContadas = useMemo(() => {
    return Object.values(conteos).reduce((acc, c) => acc + (c || 0), 0);
  }, [conteos]);

  // Notificar al componente padre el conteo en tiempo real de forma estable
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  useEffect(() => {
    onCountChangeRef.current?.(totalContadas);
  }, [totalContadas]);

  // Costo unitario real prorrateado: (costo pedido en Bs + costos extras) / cantidad contada
  const costoUnitarioRealBs = useMemo(() => {
    if (totalContadas <= 0) return 0;
    const totalBs = (usdTotal * tc) + extrasBs;
    if (totalBs <= 0) return 0;
    return totalBs / totalContadas;
  }, [usdTotal, tc, extrasBs, totalContadas]);

  const costoUnitarioUsd = useMemo(() => {
    if (totalContadas <= 0 || usdTotal <= 0) return null;
    return usdTotal / totalContadas;
  }, [usdTotal, totalContadas]);

  // Estadísticas y variantes por producto
  const productosStats = useMemo(() => {
    return localProductos.map((prod) => {
      const vars = localVariantes.filter(
        (v) =>
          String(v.producto_id || "").toLowerCase() === String(prod.id || "").toLowerCase() &&
          !isEstandar(v.color, v.talla)
      );
      const totalCount = vars.reduce((acc, v) => acc + (conteos[v.id] || 0), 0);
      const isCompleted = prod.cantidad_estimada
        ? totalCount >= prod.cantidad_estimada
        : totalCount > 0;
      const isPending = totalCount === 0;

      // Costo unitario real basado en la cantidad contada (o estimada si aún no se ha contado nada)
      const prodUsd = prod.costo_usd || (usdTotal / (localProductos.length || 1));
      const prodExtrasBs = localProductos.length > 0 ? (extrasBs / localProductos.length) : 0;
      const prodTotalBs = (prodUsd * tc) + prodExtrasBs;

      const divisor = totalCount > 0 ? totalCount : (prod.cantidad_estimada && prod.cantidad_estimada > 0 ? prod.cantidad_estimada : 1);
      const costoUnitBs = prodTotalBs / divisor;
      const costoUnitUsdItem = prodUsd / divisor;
      const costoPedidoUsd = prodUsd;

      return {
        prod,
        vars,
        totalCount,
        isCompleted,
        isPending,
        costoUnitBs,
        costoUnitUsd: costoUnitUsdItem,
        costoPedidoUsd,
      };
    });
  }, [localProductos, localVariantes, conteos, tc, usdTotal, extrasBs]);

  const totalProductosCount = localProductos.length;
  const productosContadosCount = productosStats.filter((p) => p.totalCount > 0).length;
  const productosSinContar = productosStats.filter((p) => p.isPending);

  // Producto activo actual
  const activeStat =
    productosStats.find(
      (p) => String(p.prod.id || "").toLowerCase() === String(activeProdId || "").toLowerCase()
    ) || productosStats[0];
  const activeIndex = productosStats.findIndex((p) => p.prod.id === activeStat?.prod.id);
  const prevProd = activeIndex > 0 ? productosStats[activeIndex - 1] : null;
  const nextProd = activeIndex >= 0 && activeIndex < productosStats.length - 1 ? productosStats[activeIndex + 1] : null;

  // Crear variante rápida vinculada al producto activo
  function handleCrearVarianteParaProducto(productoId: string) {
    if (!productoId) {
      toast.error("No se pudo identificar el producto");
      return;
    }
    if (!nuevoColor.trim()) {
      toast.error("Ingresa el color de la prenda");
      return;
    }

    // Si no se especificó talla, usar "UNICA" por defecto
    const tallaFinal = nuevaTalla.trim() || "UNICA";

    const prodInfo = localProductos.find(
      (p) => String(p.id || "").toLowerCase() === String(productoId || "").toLowerCase()
    );
    const prefix = (prodInfo?.codigo_interno || prodInfo?.nombre?.slice(0, 3) || "PRD")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const colorPart = nuevoColor.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const tallaPart = `-${tallaFinal.toUpperCase()}`;
    const autoSku = `${prefix}-${colorPart}${tallaPart}`;

    startTransition(async () => {
      const res = await crearVarianteDirecta({
        producto_id: productoId,
        color: nuevoColor.trim(),
        talla: tallaFinal,
        sku: autoSku,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      const varianteDb = res.variante!;
      const created: VarianteOption = {
        id: varianteDb.id,
        color: varianteDb.color || nuevoColor.trim(),
        talla: varianteDb.talla || tallaFinal,
        sku: varianteDb.sku || autoSku,
        producto_id: varianteDb.producto_id || productoId,
        productos: prodInfo
          ? { id: prodInfo.id, nombre: prodInfo.nombre, codigo_interno: prodInfo.codigo_interno || "" }
          : null,
      };

      setLocalVariantes((prev) => {
        const idx = prev.findIndex((v) => v.id === created.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = created;
          return updated;
        }
        return [...prev, created];
      });

      const cant = Math.max(1, parseInt(nuevaCantidad) || 1);
      setConteos((prev) => ({
        ...prev,
        [created.id]: (prev[created.id] || 0) + cant,
      }));

      setNuevoColor("");
      setNuevaTalla("");
      setNuevaCantidad("1");
      setIsAddingVariant(false);
      setActiveProdId(productoId);
      toast.success(
        `Agregadas ${cant} un. a la variante "${created.color}${created.talla ? ` / ${created.talla}` : ""}"`
      );
    });
  }



  // Guardar conteo
  function handleGuardar(recibirEnInventario: boolean, forzarConfirmado = false) {
    if (totalContadas <= 0) {
      toast.error("Debes ingresar al menos 1 prenda contada.");
      return;
    }

    // Si requiere confirmación antes de finalizar e ingresar al inventario
    if (recibirEnInventario && !forzarConfirmado) {
      if (productosSinContar.length > 0 && !showConfirmacionIncompleto) {
        setShowConfirmacionIncompleto(true);
        return;
      }
      setShowConfirmacionFinalizar(true);
      return;
    }

    const items: DesgloseVarianteItem[] = Object.entries(conteos)
      .filter(([_, cant]) => cant > 0)
      .map(([varianteId, cant]) => ({
        variante_id: varianteId,
        cantidad: cant,
      }));

    startTransition(async () => {
      if (!recibirEnInventario) {
        const res = await soloDesgloseDetalleLote({
          loteId: lote.id,
          items,
          costoUnitarioBs: costoUnitarioRealBs,
          costoUnitarioUsd: costoUnitarioUsd,
          otrosCostosBs: extrasBs,
        });

        if (res?.error) {
          toast.error(res.error);
          return;
        }

        toast.success(`Borrador guardado: ${totalContadas} prendas registradas. Puedes salir o cambiar de pestaña sin perder tu conteo.`);
      } else {
        const res = await desglosarYRecibirLote({
          loteId: lote.id,
          items,
          costoUnitarioBs: costoUnitarioRealBs,
          costoUnitarioUsd: costoUnitarioUsd,
          otrosCostosBs: extrasBs,
        });

        if (res?.error) {
          toast.error(res.error);
          return;
        }

        setShowConfirmacionFinalizar(false);
        toast.success(`¡Conteo finalizado! Lote #${lote.numero_lote} ingresado a inventario en Kardex.`);
      }

      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-2xs overflow-hidden">
      {/* ── BARRA SUPERIOR (HEADER) ─────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Volver al detalle del lote"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link
              href="/lotes"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Volver a lista de lotes"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <h2 className="text-base font-bold flex items-center gap-2 tracking-tight text-foreground uppercase">
              <PackageOpen className="w-4 h-4 text-primary" />
              CONTAR PEDIDO #{String(lote.numero_lote).padStart(4, "0")}
              {soloDesglose && (
                <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                  Ajuste
                </Badge>
              )}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Recepción física de prendas · Registro por producto, color y talla
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {isFinalizado ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border-emerald-500/30 gap-1 px-3 py-1 text-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Conteo Finalizado • En Inventario
            </Badge>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleGuardar(false)}
                disabled={totalContadas <= 0 || isPending}
                className="h-8 text-xs gap-1.5 font-medium shadow-2xs"
              >
                <Save className="w-3.5 h-3.5 text-muted-foreground" />
                Guardar borrador
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleGuardar(true)}
                disabled={totalContadas <= 0 || isPending}
                className="h-8 text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Finalizar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── ALERTA DE CONFIRMACIÓN SI HAY PRODUCTOS SIN CONTAR ───────────────── */}
      {showConfirmacionIncompleto && (
        <div className="p-3 mx-4 mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Hay <strong>{productosSinContar.length} productos sin contar</strong> (
              {productosSinContar.map((p) => p.prod.nombre).join(", ")}).
              ¿Deseas ingresar a inventario solo las prendas contadas?
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowConfirmacionIncompleto(false)}
              className="h-7 text-xs bg-background"
            >
              Volver a contar
            </Button>
            <Button
              size="sm"
              onClick={() => handleGuardar(true, true)}
              disabled={isPending}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium"
            >
              Ingresar solo contados
            </Button>
          </div>
        </div>
      )}

      {/* ── CUERPO PRINCIPAL: MAESTRO-DETALLE (SIDEBAR + WORKSPACE) ─────────── */}
      <div className="flex flex-col md:flex-row min-h-[460px]">
        {/* 1. SIDEBAR IZQUIERDA: RESUMEN DE PRODUCTOS ──────────────────────── */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-border bg-muted/10 flex flex-col shrink-0">
          {/* Header del Sidebar */}
          <div className="p-3.5 border-b border-border bg-muted/20 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Resumen del Pedido
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-semibold px-1.5 py-0">
                {totalProductosCount} {totalProductosCount === 1 ? "prod" : "prods"}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground text-[11px]">
                {totalContadas} {estimadoPrendasTotal > 0 ? `de ~${estimadoPrendasTotal}` : ""} prendas contadas
              </span>
              <span className="text-primary font-bold font-mono text-[11px]">
                {productosContadosCount}/{totalProductosCount} listos
              </span>
            </div>

            {/* Mini barra de progreso */}
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  productosContadosCount === totalProductosCount && totalProductosCount > 0
                    ? "bg-emerald-500"
                    : "bg-primary"
                }`}
                style={{
                  width: `${Math.min(100, Math.round((productosContadosCount / Math.max(1, totalProductosCount)) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Lista de productos comprados */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[500px]">
            {productosStats.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground px-4">
                No hay productos identificados en este lote.
              </div>
            ) : (
              productosStats.map((item) => {
                const isSelected = activeStat?.prod.id === item.prod.id;
                const codeBadge = getProductCodeBadge(item.prod.codigo_interno, item.prod.nombre);

                return (
                  <button
                    key={item.prod.id}
                    type="button"
                    onClick={() => {
                      setActiveProdId(item.prod.id);
                      setIsAddingVariant(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-card border-primary/50 shadow-xs ring-1 ring-primary/20"
                        : "bg-background hover:bg-muted/40 border-border/80"
                    }`}
                  >
                    {/* Estado visual e Iniciales / Código Interno */}
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      {/* Estado: Check / Punto activo / Circulo */}
                      <div className="w-4 flex items-center justify-center">
                        {item.isCompleted ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        ) : isSelected ? (
                          <CircleDot className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-muted-foreground/40" />
                        )}
                      </div>

                      {/* Miniatura / Avatar con código interno */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {codeBadge.slice(0, 3)}
                      </div>
                    </div>

                    {/* Información de Producto y Unidades */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-xs text-foreground truncate leading-tight">
                          {item.prod.nombre}
                        </p>
                        <span
                          className={`font-mono text-xs font-bold shrink-0 ${
                            item.isCompleted
                              ? "text-emerald-600 dark:text-emerald-400"
                              : item.totalCount > 0
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        >
                          {item.totalCount}
                          {item.prod.cantidad_estimada ? `/${item.prod.cantidad_estimada}` : ""}
                        </span>
                      </div>

                      {/* Fichas discretas: Costo Unitario y Costo Pedido */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {item.costoUnitBs > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                            Bs. {item.costoUnitBs.toFixed(2)}/u
                          </span>
                        )}
                        {item.costoPedidoUsd > 0 && (
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/50">
                            ${item.costoPedidoUsd.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 2. PANEL DERECHO: ÁREA DE CONTEO DEL PRODUCTO ACTIVO ────────────── */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 bg-background space-y-4">
          {activeStat ? (
            <div className="space-y-4">
              {/* Encabezado del Producto Activo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-muted/20 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-mono font-black text-sm shrink-0">
                    {getProductCodeBadge(activeStat.prod.codigo_interno, activeStat.prod.nombre)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base tracking-tight text-foreground uppercase">
                      {activeStat.prod.nombre}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                      {activeStat.prod.codigo_interno && (
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.2 rounded font-semibold text-foreground">
                          {activeStat.prod.codigo_interno}
                        </span>
                      )}
                      <span>·</span>
                      <span>
                        Esperadas:{" "}
                        <strong className="text-foreground">
                          ~{activeStat.prod.cantidad_estimada ?? "—"} uds
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Contadas:{" "}
                        <strong className="text-primary font-mono">
                          {activeStat.totalCount} uds
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fichas Financieras Discretas */}
                <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                  {activeStat.costoUnitBs > 0 && (
                    <div className="px-2.5 py-1 rounded-xl bg-card border border-border text-right">
                      <span className="text-[10px] text-muted-foreground block leading-tight">
                        Costo Unit.
                      </span>
                      <span className="font-bold text-xs font-mono text-foreground">
                        Bs. {activeStat.costoUnitBs.toFixed(2)}/u
                      </span>
                    </div>
                  )}
                  {activeStat.costoPedidoUsd > 0 && (
                    <div className="px-2.5 py-1 rounded-xl bg-card border border-border text-right">
                      <span className="text-[10px] text-muted-foreground block leading-tight">
                        Costo Pedido
                      </span>
                      <span className="font-bold text-xs font-mono text-emerald-600 dark:text-emerald-400">
                        ${activeStat.costoPedidoUsd.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {activeStat.isCompleted ? (
                    <Badge variant="outline" className="h-8 px-2.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold gap-1 text-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Completo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="h-8 px-2.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold gap-1 text-xs">
                      <CircleDot className="w-3.5 h-3.5" />
                      {activeStat.totalCount > 0 ? "En conteo" : "Por contar"}
                    </Badge>
                  )}

                  {/* Botón editar costo del producto (solo en POR_CONTAR) */}
                  {!isFinalizado && (
                    <EditarProductoLoteDialog
                      loteId={lote.id}
                      productoId={activeStat.prod.id}
                      nombreProducto={activeStat.prod.nombre}
                      costoUsdActual={activeStat.prod.costo_usd ?? 0}
                      gastosExtrasBsActual={activeStat.prod.otros_costos_bs ?? 0}
                      estadoLote={lote.estado}
                    />
                  )}
                </div>
              </div>

              {/* Tabla de Variantes: Variante | SKU | Cantidad */}
              <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="w-1/3">Variante</span>
                  <span className="w-1/4">SKU</span>
                  <span className="w-5/12 text-right">Cantidad</span>
                </div>

                {activeStat.vars.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                    <p className="font-semibold text-foreground">
                      Aún no hay variantes agregadas para este producto
                    </p>
                    <p>
                      Haz clic en el botón de abajo para registrar el primer color y talla que llegó en el paquete.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {activeStat.vars.map((v) => {
                      const cant = conteos[v.id] || 0;
                      const skuDisplay = getVariantSku(v, activeStat.prod);

                      return (
                        <div
                          key={v.id}
                          className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors ${
                            cant > 0 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"
                          }`}
                        >
                          {/* Variante: Color / Talla */}
                          <div className="w-1/3 min-w-0">
                            <p className="font-bold text-xs text-foreground capitalize truncate">
                              {v.color}
                              {v.talla ? (
                                <span className="ml-1 text-muted-foreground font-normal">
                                  / {v.talla}
                                </span>
                              ) : (
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  (Sin talla)
                                </span>
                              )}
                            </p>
                          </div>

                          {/* SKU Automático */}
                          <div className="w-1/4 min-w-0">
                            <span className="font-mono text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/50 truncate block">
                              {skuDisplay}
                            </span>
                          </div>

                          {/* Cantidad Física con Stepper y Botones de Pack */}
                          <div className="w-5/12 flex items-center justify-end gap-1.5 shrink-0">
                            {isFinalizado ? (
                              <span className="font-mono font-black text-sm text-foreground bg-muted/60 px-3 py-1 rounded-lg border border-border">
                                {cant} uds
                              </span>
                            ) : (
                              <>
                                {/* Atajos rápidos +6 y +12 */}
                                <div className="hidden sm:flex items-center gap-1 mr-1">
                                  <button
                                    type="button"
                                    onClick={() => handleIncrementCantidad(v.id, 6)}
                                    disabled={isPending}
                                    className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Sumar media docena (+6)"
                                  >
                                    +6
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleIncrementCantidad(v.id, 12)}
                                    disabled={isPending}
                                    className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Sumar una docena (+12)"
                                  >
                                    +12
                                  </button>
                                </div>

                                {/* Stepper [ - ] [ cant ] [ + ] */}
                                <button
                                  type="button"
                                  onClick={() => handleSetCantidad(v.id, cant - 1)}
                                  disabled={cant <= 0 || isPending}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-foreground disabled:opacity-30 transition-colors shadow-2xs"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <Input
                                  type="number"
                                  min="0"
                                  value={cant === 0 ? "" : cant}
                                  placeholder="0"
                                  onChange={(e) => handleSetCantidad(v.id, parseInt(e.target.value) || 0)}
                                  disabled={isPending}
                                  className="w-14 h-8 text-center font-bold text-xs px-1 bg-background"
                                />

                                <button
                                  type="button"
                                  onClick={() => handleSetCantidad(v.id, cant + 1)}
                                  disabled={isPending}
                                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-2xs"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                {/* Botón para eliminar variante si hubo error */}
                                <button
                                  type="button"
                                  onClick={() => handleEliminarVariante(v.id)}
                                  disabled={isPending}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 ml-1"
                                  title="Eliminar variante"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Formulario rápido para añadir color / talla (solo si no está finalizado) */}
                {!isFinalizado && (
                  <>
                    {isAddingVariant ? (
                      <div className="p-3.5 bg-muted/40 border-t border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-primary" />
                            Añadir nuevo color / talla a {activeStat.prod.nombre}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddingVariant(false)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancelar
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            placeholder="Color (ej. Negro, Azul, Plomo...)"
                            value={nuevoColor}
                            onChange={(e) => setNuevoColor(e.target.value)}
                            disabled={isPending}
                            autoFocus
                            className="h-8 text-xs flex-1 min-w-[140px] bg-background"
                          />
                          <Input
                            placeholder="Talla (ej. M, L, XL...)"
                            value={nuevaTalla}
                            onChange={(e) => setNuevaTalla(e.target.value)}
                            disabled={isPending}
                            className="h-8 text-xs w-28 bg-background"
                          />
                          <Input
                            type="number"
                            min="1"
                            placeholder="Cant."
                            value={nuevaCantidad}
                            onChange={(e) => setNuevaCantidad(e.target.value)}
                            disabled={isPending}
                            className="h-8 text-xs w-16 text-center font-bold bg-background"
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleCrearVarianteParaProducto(activeStat.prod.id)}
                            disabled={isPending || !nuevoColor.trim()}
                            className="h-8 text-xs gap-1 font-semibold px-3.5 bg-primary text-primary-foreground"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Añadir al conteo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/20 border-t border-border flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingVariant(true);
                            setNuevoColor("");
                            setNuevaTalla("");
                            setNuevaCantidad("1");
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-bold py-1 px-3 rounded-lg hover:bg-primary/5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          + Agregar color / talla
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <Package className="w-10 h-10 mx-auto opacity-30 text-primary" />
              <p className="font-semibold text-sm">Selecciona un producto de la izquierda</p>
            </div>
          )}
        </div>
      </div>

      {/* ── FOOTER DE CONTROL Y NAVEGACIÓN ───────────────────────────────────── */}
      <div className="px-5 py-3 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Izquierda: Resumen general */}
        <div className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">
            {productosContadosCount} de {totalProductosCount} productos
          </span>
          {" · "}
          <span className="font-bold text-primary font-mono">
            {totalContadas} prendas contadas
          </span>
          {costoUnitarioRealBs > 0 && (
            <>
              {" · "}
              <span className="font-mono text-[11px]">
                Costo prom: Bs. {costoUnitarioRealBs.toFixed(2)}/u
              </span>
            </>
          )}
        </div>

        {/* Centro: Navegación entre productos [ Anterior ] [ Siguiente ] */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!prevProd || isPending}
            onClick={() => {
              if (prevProd) {
                setActiveProdId(prevProd.prod.id);
                setIsAddingVariant(false);
              }
            }}
            className="h-8 text-xs gap-1.5 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {prevProd ? `Anterior: ${prevProd.prod.nombre.slice(0, 15)}...` : "Anterior"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!nextProd || isPending}
            onClick={() => {
              if (nextProd) {
                setActiveProdId(nextProd.prod.id);
                setIsAddingVariant(false);
              }
            }}
            className="h-8 text-xs gap-1.5 font-medium"
          >
            {nextProd ? `Siguiente: ${nextProd.prod.nombre.slice(0, 15)}...` : "Siguiente"}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Derecha: Botón de Guardar / Finalizar al pie */}
        <div className="flex items-center gap-2">
          {isFinalizado ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold border-emerald-500/30 gap-1 px-3 py-1 text-xs">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Conteo Finalizado • En Inventario
            </Badge>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleGuardar(false)}
                disabled={totalContadas <= 0 || isPending}
                className="h-8 text-xs gap-1.5 font-medium"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar borrador
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleGuardar(true)}
                disabled={totalContadas <= 0 || isPending}
                className="h-8 text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Finalizar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── DIÁLOGO DE CONFIRMACIÓN TIPO TICKET ──────────────────────────────── */}
      <Dialog open={showConfirmacionFinalizar} onOpenChange={setShowConfirmacionFinalizar}>
        <DialogContent className="max-w-sm">
          {/* Cabecera del ticket */}
          <div className="text-center pt-2 pb-1 border-b border-dashed border-border">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resumen de Recepción</p>
            <p className="text-base font-extrabold text-foreground mt-0.5">Lote #{String(lote.numero_lote).padStart(4, "0")}</p>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
              {new Date().toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>

          {/* Líneas del ticket: productos */}
          <div className="py-2 space-y-0.5">
            {productosStats
              .filter((p) => p.totalCount > 0)
              .map((p) => (
                <div key={p.prod.id} className="flex items-center justify-between text-xs py-1.5 border-b border-dashed border-border/40 last:border-0">
                  <span className="text-foreground font-medium truncate max-w-[55%]">{p.prod.nombre}</span>
                  <span className="font-mono font-bold text-foreground">{p.totalCount} uds</span>
                </div>
              ))}
          </div>

          {/* Totales del ticket */}
          <div className="border-t border-dashed border-border pt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total prendas</span>
              <span className="font-extrabold font-mono text-foreground">{totalContadas} uds</span>
            </div>
            {estimadoPrendasTotal > 0 && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Esperadas</span>
                <span className="font-mono text-muted-foreground">~{estimadoPrendasTotal} uds</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Costo unitario</span>
              <span className="font-bold font-mono text-primary">Bs. {costoUnitarioRealBs.toFixed(2)}/u</span>
            </div>
            {costoUnitarioUsd && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Costo USD/u</span>
                <span className="font-mono text-muted-foreground">${costoUnitarioUsd.toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <span className="font-bold text-foreground">Inversión total</span>
              <span className="font-extrabold font-mono text-foreground">Bs. {((usdTotal * tc) + extrasBs).toFixed(2)}</span>
            </div>
          </div>

          {/* Advertencia corta */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>Una vez confirmado, se agrega al inventario sin cambios posteriores.</span>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmacionFinalizar(false)}
              disabled={isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleGuardar(true, true)}
              disabled={isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
