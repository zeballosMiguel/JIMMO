"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { desglosarYRecibirLote, soloDesgloseDetalleLote, type DesgloseVarianteItem } from "@/features/inventario/actions";
import { crearVarianteDirecta } from "@/features/catalogos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  PackageOpen,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  Save,
  Package,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  X,
  CircleDot,
  Check,
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
  productosLote?: ProductoLoteInfo[];
  catalogoProductos?: { id: string; nombre: string; codigo_interno: string }[];
  variantesProducto: VarianteOption[];
  detallesActuales?: {
    id?: string;
    variante_id: string;
    cantidad: number;
  }[];
  open: boolean;
  soloDesglose?: boolean;
  onClose: () => void;
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

export function DesglosarBultoDialog({
  lote,
  productosLote = [],
  catalogoProductos = [],
  variantesProducto: initialVariantes,
  detallesActuales = [],
  open,
  soloDesglose = false,
  onClose,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Lista local de productos asociados a este lote
  const [localProductos, setLocalProductos] = useState<ProductoLoteInfo[]>(productosLote);

  // Producto activo seleccionado en el Sidebar
  const [activeProdId, setActiveProdId] = useState<string>("");

  // Lista local de variantes
  const [localVariantes, setLocalVariantes] = useState<VarianteOption[]>(initialVariantes);

  // Mapa de conteo de unidades físicas por varianteId: { [varianteId]: cantidad }
  const [conteos, setConteos] = useState<Record<string, number>>({});

  // Control para abrir el formulario de "+ Agregar color / talla"
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [nuevoColor, setNuevoColor] = useState("");
  const [nuevaTalla, setNuevaTalla] = useState("");
  const [nuevaCantidad, setNuevaCantidad] = useState("1");

  // Diálogo de confirmación para ingreso parcial
  const [showConfirmacionIncompleto, setShowConfirmacionIncompleto] = useState(false);

  // Selector para agregar producto adicional del catálogo
  const [showAddExtraProd, setShowAddExtraProd] = useState(false);
  const [selectedExtraProdId, setSelectedExtraProdId] = useState("");

  // Sincronizar cuando se abre el modal
  useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      (detallesActuales || []).forEach((d) => {
        if (d.variante_id) {
          initial[d.variante_id] = d.cantidad || 0;
        }
      });
      setConteos(initial);

      // Filtrar variantes ficticias "Estándar"
      setLocalVariantes(
        initialVariantes.filter((v) => !isEstandar(v.color, v.talla))
      );

      setLocalProductos(productosLote);
      if (productosLote.length > 0) {
        setActiveProdId(productosLote[0].id);
      }
      setIsAddingVariant(false);
      setNuevoColor("");
      setNuevaTalla("");
      setNuevaCantidad("1");
      setShowConfirmacionIncompleto(false);
      setShowAddExtraProd(false);
      setSelectedExtraProdId("");
    }
  }, [open, initialVariantes, detallesActuales, productosLote]);

  // Asegurar que activeProdId apunte siempre a un producto válido
  useEffect(() => {
    if (localProductos.length > 0 && (!activeProdId || !localProductos.some((p) => p.id === activeProdId))) {
      setActiveProdId(localProductos[0].id);
    }
  }, [localProductos, activeProdId]);

  // Valores financieros del lote
  const tc = Number(lote.tipo_cambio) || 6.96;
  const usdTotal = Number(lote.costo_total_usd) || 0;
  const extrasBs = Number(lote.gastos_extras_bs) || 0;
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

  // Costo unitario real prorrateado
  const costoUnitarioRealBs = useMemo(() => {
    if (totalContadas <= 0 || inversionTotalBs <= 0) return 0;
    return inversionTotalBs / totalContadas;
  }, [inversionTotalBs, totalContadas]);

  const costoUnitarioUsd = useMemo(() => {
    if (totalContadas <= 0 || usdTotal <= 0) return null;
    return usdTotal / totalContadas;
  }, [usdTotal, totalContadas]);

  // Estadísticas y variantes por producto
  const productosStats = useMemo(() => {
    return localProductos.map((prod) => {
      const vars = localVariantes.filter(
        (v) => v.producto_id === prod.id && !isEstandar(v.color, v.talla)
      );
      const totalCount = vars.reduce((acc, v) => acc + (conteos[v.id] || 0), 0);
      const isCompleted = prod.cantidad_estimada
        ? totalCount >= prod.cantidad_estimada
        : totalCount > 0;
      const isPending = totalCount === 0;

      // Costo estimado o prorrateado para este producto
      let costoUnitBs = 0;
      let costoUnitUsdItem = 0;
      let costoPedidoUsd = prod.costo_usd || 0;

      if (prod.costo_usd && prod.cantidad_estimada && prod.cantidad_estimada > 0) {
        costoUnitUsdItem = prod.costo_usd / prod.cantidad_estimada;
        costoUnitBs = costoUnitUsdItem * tc;
      } else if (costoUnitarioRealBs > 0) {
        costoUnitBs = costoUnitarioRealBs;
        costoUnitUsdItem = costoUnitarioUsd || 0;
        costoPedidoUsd = costoUnitUsdItem * (prod.cantidad_estimada || totalCount || 0);
      }

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
  }, [localProductos, localVariantes, conteos, tc, costoUnitarioRealBs, costoUnitarioUsd]);

  const totalProductosCount = localProductos.length;
  const productosContadosCount = productosStats.filter((p) => p.totalCount > 0).length;
  const productosSinContar = productosStats.filter((p) => p.isPending);

  // Producto activo actual
  const activeStat = productosStats.find((p) => p.prod.id === activeProdId) || productosStats[0];
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

    const prodInfo = localProductos.find((p) => p.id === productoId);
    const prefix = (prodInfo?.codigo_interno || prodInfo?.nombre?.slice(0, 3) || "PRD")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const colorPart = nuevoColor.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const tallaPart = nuevaTalla.trim() ? `-${nuevaTalla.trim().toUpperCase()}` : "";
    const autoSku = `${prefix}-${colorPart}${tallaPart}`;

    startTransition(async () => {
      const res = await crearVarianteDirecta({
        producto_id: productoId,
        color: nuevoColor.trim(),
        talla: nuevaTalla.trim() || null,
        sku: autoSku,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      const created: VarianteOption = {
        id: res.variante!.id,
        color: nuevoColor.trim(),
        talla: nuevaTalla.trim() || null,
        sku: res.variante!.sku || autoSku,
        producto_id: productoId,
        productos: prodInfo
          ? { id: prodInfo.id, nombre: prodInfo.nombre, codigo_interno: prodInfo.codigo_interno || "" }
          : null,
      };

      setLocalVariantes((prev) => [...prev, created]);
      const cant = parseInt(nuevaCantidad) || 1;
      setConteos((prev) => ({ ...prev, [created.id]: cant }));

      setNuevoColor("");
      setNuevaTalla("");
      setNuevaCantidad("1");
      setIsAddingVariant(false);
      toast.success(`Variante "${created.color}${created.talla ? ` / ${created.talla}` : ""}" agregada con SKU: ${created.sku}`);
    });
  }

  // Agregar un producto extra al conteo si no estaba en la lista inicial
  function handleAddExtraProducto() {
    if (!selectedExtraProdId) return;
    const prod = catalogoProductos.find((p) => p.id === selectedExtraProdId);
    if (!prod) return;

    if (localProductos.some((p) => p.id === prod.id)) {
      toast.info("Este producto ya está en la lista");
      return;
    }

    const newProdItem: ProductoLoteInfo = {
      id: prod.id,
      nombre: prod.nombre,
      codigo_interno: prod.codigo_interno,
    };

    setLocalProductos((prev) => [...prev, newProdItem]);
    setActiveProdId(prod.id);
    setShowAddExtraProd(false);
    setSelectedExtraProdId("");
    setIsAddingVariant(true);
    toast.success(`"${prod.nombre}" agregado al pedido para contar`);
  }

  // Guardar conteo
  function handleGuardar(recibirEnInventario: boolean, forzarIncompleto = false) {
    if (totalContadas <= 0) {
      toast.error("Debes ingresar al menos 1 prenda contada.");
      return;
    }

    // Si intenta ingresar al inventario pero hay productos con 0 prendas contadas, advertir
    if (recibirEnInventario && productosSinContar.length > 0 && !forzarIncompleto) {
      setShowConfirmacionIncompleto(true);
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

        toast.success(`Borrador de conteo guardado (${totalContadas} prendas registradas).`);
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

        toast.success(`¡Lote #${lote.numero_lote} ingresado a inventario! ${totalContadas} prendas activas en Kardex.`);
      }

      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isPending) onClose(); }}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[95vw] h-[90vh] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-card border-border shadow-2xl">
        {/* ── BARRA SUPERIOR (HEADER) ─────────────────────────────────────────── */}
        <div className="px-5 py-3.5 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2 tracking-tight">
                <PackageOpen className="w-4 h-4 text-primary" />
                CONTAR PEDIDO #{String(lote.numero_lote).padStart(4, "0")}
                {soloDesglose && (
                  <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                    Re-conteo
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                Recepción física de prendas · Registro por producto, color y talla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGuardar(false)}
              disabled={totalContadas <= 0 || isPending}
              className="h-8 text-xs gap-1.5 font-medium"
            >
              <Save className="w-3.5 h-3.5 text-muted-foreground" />
              Guardar borrador
            </Button>

            {!soloDesglose && (
              <Button
                type="button"
                size="sm"
                onClick={() => handleGuardar(true)}
                disabled={totalContadas <= 0 || isPending}
                className="h-8 text-xs gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Finalizar e Ingresar
              </Button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── ALERTA DE CONFIRMACIÓN SI HAY PRODUCTOS SIN CONTAR ───────────────── */}
        {showConfirmacionIncompleto && (
          <div className="p-3 mx-5 mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 shrink-0">
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
        <div className="flex-1 flex overflow-hidden">
          {/* 1. SIDEBAR IZQUIERDA: RESUMEN DE PRODUCTOS ──────────────────────── */}
          <div className="w-72 sm:w-80 border-r border-border bg-muted/10 flex flex-col shrink-0">
            {/* Header del Sidebar */}
            <div className="p-3.5 border-b border-border bg-muted/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Resumen del Pedido
                </span>
                <Badge variant="outline" className="text-[10px] font-mono font-semibold px-1.5 py-0">
                  {totalProductosCount} {totalProductosCount === 1 ? "producto" : "productos"}
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
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${productosContadosCount === totalProductosCount && totalProductosCount > 0
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
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {productosStats.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground px-4">
                  No hay productos registrados en este lote.
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
                      className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${isSelected
                        ? "bg-card border-primary/50 shadow-xs ring-1 ring-primary/20"
                        : "bg-background/60 hover:bg-muted/30 border-border/70"
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
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] shrink-0 ${isSelected
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
                            className={`font-mono text-xs font-bold shrink-0 ${item.isCompleted
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
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                              Bs. {item.costoUnitBs.toFixed(2)}/u
                            </span>
                          )}
                          {item.costoPedidoUsd > 0 && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40">
                              ${item.costoPedidoUsd.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}

              {/* Botón para añadir otro producto del catálogo al pedido */}
              {catalogoProductos.length > 0 && (
                <div className="pt-2">
                  {showAddExtraProd ? (
                    <div className="p-2.5 bg-muted/30 rounded-xl border border-border space-y-2">
                      <p className="text-[11px] font-bold text-foreground">
                        Incluir otro producto
                      </p>
                      <select
                        value={selectedExtraProdId}
                        onChange={(e) => setSelectedExtraProdId(e.target.value)}
                        className="w-full h-8 text-xs rounded-lg border border-border bg-background px-2"
                      >
                        <option value="">Selecciona del catálogo...</option>
                        {catalogoProductos
                          .filter((cp) => !localProductos.some((lp) => lp.id === cp.id))
                          .map((cp) => (
                            <option key={cp.id} value={cp.id}>
                              {cp.nombre} {cp.codigo_interno ? `(${cp.codigo_interno})` : ""}
                            </option>
                          ))}
                      </select>
                      <div className="flex items-center gap-1.5 pt-1">
                        <Button
                          size="sm"
                          onClick={handleAddExtraProducto}
                          disabled={!selectedExtraProdId}
                          className="h-7 text-xs flex-1"
                        >
                          Incluir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAddExtraProd(false)}
                          className="h-7 text-xs"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddExtraProd(true)}
                      className="w-full py-2 px-2.5 rounded-xl border border-dashed border-border hover:border-primary/50 text-[11px] text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5 transition-colors bg-muted/5 hover:bg-primary/5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar otro producto del catálogo
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. PANEL DERECHO: ÁREA DE CONTEO DEL PRODUCTO ACTIVO ────────────── */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-background p-5 sm:p-6">
            {activeStat ? (
              <div className="space-y-5 max-w-3xl">
                {/* Encabezado del Producto Activo */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-muted/20 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-mono font-black text-sm shrink-0">
                      {getProductCodeBadge(activeStat.prod.codigo_interno, activeStat.prod.nombre)}
                    </div>
                    <div>
                      <h3 className="font-black text-base tracking-tight text-foreground uppercase">
                        {activeStat.prod.nombre}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {activeStat.prod.codigo_interno && (
                          <span className="font-mono text-[11px] bg-muted px-1.5 py-0.2 rounded font-semibold text-foreground">
                            {activeStat.prod.codigo_interno}
                          </span>
                        )}
                        {/*<span>·</span>*/}
                        <span>
                          Esp:{" "}
                          <strong className="text-foreground">
                            ~{activeStat.prod.cantidad_estimada ?? "—"} uds
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Cont:{" "}
                          <strong className="text-primary font-mono">
                            {activeStat.totalCount} uds
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fichas Financieras Discretas */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
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
                  </div>
                </div>

                {/* Tabla de Variantes: Variante | SKU | Cantidad */}
                <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
                  <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <span className="w-1/3">Variante (Color / Talla)</span>
                    <span className="w-1/4">SKU</span>
                    <span className="w-5/12 text-right">Cantidad Física</span>
                  </div>

                  {activeStat.vars.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                      <p className="font-semibold text-foreground">
                        Aún no hay colores ni tallas agregadas para este producto
                      </p>
                      <p>
                        Presiona el botón de abajo para registrar el primer color y talla que llegó en el paquete.
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
                            className={`p-3 sm:px-4 flex items-center justify-between gap-3 transition-colors ${cant > 0 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/20"
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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Formulario rápido para añadir color / talla */}
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
                        + Agregar color / talla a este producto
                      </button>
                    </div>
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
        <div className="px-5 py-3 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
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

          {/* Derecha: Botón de Cancelar */}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isPending}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
