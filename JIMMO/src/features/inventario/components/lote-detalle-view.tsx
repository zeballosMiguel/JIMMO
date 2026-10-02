"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DetalleLoteEliminarButton } from "@/features/inventario/lote-eliminar-button";
import { EditarLoteDialog } from "@/features/inventario/editar-lote-dialog";
import { EditarDetalleLoteDialog } from "@/features/inventario/editar-detalle-lote-dialog";
import { EditarProductoLoteDialog } from "@/features/inventario/editar-producto-lote-dialog";
import { LoteContarWorkstation } from "@/features/inventario/components/lote-contar-workstation";
import {
  ArrowLeft,
  Package,
  DollarSign,
  Truck,
  Calculator,
  Boxes,
  User,
  Calendar,
  Layers,
  PackageOpen,
  CheckCircle2,
  Clock,
  Lock,
  Ban,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Props {
  lote: any;
  detalles: any[];
  variantes: any[];
  productos: any[];
  categorias: any[];
  inversionistas: any[];
  initialTab?: string;
  initialAction?: string;
}

// ─── Stepper de 3 pasos del flujo de lote ────────────────────────────────────
function LoteFlujoStepper({
  estado,
  detallesCount,
}: {
  estado: string;
  detallesCount: number;
}) {
  // Paso 1: Compra Registrada (PENDIENTE)
  // Paso 2: Registrar Recepción (EN_TRANSITO o conteo en proceso)
  // Paso 3: En Inventario (RECIBIDO / COMPLETADO / CERRADO)
  let currentStep = 1;
  if (estado === "RECIBIDO" || estado === "COMPLETADO" || estado === "CERRADO") {
    currentStep = 3;
  } else if (estado === "EN_TRANSITO" || detallesCount > 0) {
    currentStep = 2;
  } else {
    currentStep = 1;
  }

  const steps = [
    {
      num: 1,
      titulo: "Compra Registrada",
      desc: "Pedido al proveedor",
      icon: Clock,
    },
    {
      num: 2,
      titulo: "Registrar Recepción",
      desc: detallesCount > 0 ? "Conteo registrado" : "Conteo físico de prendas",
      icon: PackageOpen,
    },
    {
      num: 3,
      titulo: "En Inventario",
      desc: "Stock activo en Kardex",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-2xs space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Flujo del Lote
        </span>
        <span className="text-[11px] font-bold text-primary font-mono">
          Paso {currentStep} de 3
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {steps.map((step) => {
          const isCompleted =
            step.num < currentStep ||
            (step.num === 3 && currentStep === 3);
          const isCurrent =
            step.num === currentStep && currentStep < 3;
          const Icon = step.icon;

          return (
            <div
              key={step.num}
              className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                isCompleted
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : isCurrent
                  ? "bg-primary/10 border-primary/40 text-primary ring-1 ring-primary/30"
                  : "bg-muted/20 border-border/60 text-muted-foreground opacity-50"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  isCompleted
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold truncate leading-tight">
                  {step.titulo}
                </p>
                <p className="text-[10px] opacity-80 truncate">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Vista principal del detalle de un lote ───────────────────────────────────
export function LoteDetalleView({
  lote,
  detalles,
  variantes,
  productos,
  categorias,
  inversionistas,
  initialAction,
}: Props) {
  const isEditable =
    lote.estado === "PENDIENTE" || lote.estado === "EN_TRANSITO";
  const puedeContar =
    lote.estado !== "CANCELADO" && lote.estado !== "CERRADO";
  const tcLote = lote.tipo_cambio ? Number(lote.tipo_cambio) : 6.96;

  // Estado del workstation inline (auto-abre si se navegó con ?action=contar o ?action=ingresar)
  const [showWorkstation, setShowWorkstation] = useState(
    initialAction === "contar" || initialAction === "ingresar" || initialAction === "ajustar"
  );
  const [soloDesglose, setSoloDesglose] = useState(initialAction === "ajustar");
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const handleCountChange = useCallback((cnt: number) => {
    setLiveCount(cnt);
  }, []);

  function abrirConteo(reconteo = false) {
    setSoloDesglose(reconteo);
    setShowWorkstation(true);
  }

  // Lista de productos que componen esta compra / lote
  const productosLote = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; codigo_interno?: string | null; cantidad_estimada?: number | null; costo_usd?: number | null; otros_costos_bs?: number | null }>();

    // 1. Desde lote.productos_compra (si fue guardado como columna/JSON)
    if (Array.isArray(lote.productos_compra)) {
      for (const p of lote.productos_compra) {
        if (p.producto_id) {
          map.set(p.producto_id, {
            id: p.producto_id,
            nombre: p.nombre_producto || "Producto",
            codigo_interno: p.codigo_interno || null,
            cantidad_estimada: Number(p.cantidad ?? p.cantidad_estimada) || undefined,
            costo_usd: Number(p.costo_total_usd ?? p.costo_usd) || undefined,
            otros_costos_bs: Number(p.otros_costos_bs) || undefined,
          });
        }
      }
    }

    // 2. Desde lote.notas [ITEMS_COMPRA:[...]] — parser robusto que maneja corchetes anidados
    try {
      const notas: string = lote.notas || "";
      const marker = "[ITEMS_COMPRA:";
      const markerIdx = notas.indexOf(marker);
      if (markerIdx !== -1) {
        // El JSON del array empieza justo en el '[' tras el marcador
        const jsonStart = markerIdx + marker.length;
        let depth = 0;
        let jsonEnd = jsonStart;
        for (let i = jsonStart; i < notas.length; i++) {
          if (notas[i] === "[") depth++;
          else if (notas[i] === "]") {
            depth--;
            if (depth === 0) { jsonEnd = i + 1; break; }
          }
        }
        const jsonStr = notas.slice(jsonStart, jsonEnd);
        const items = JSON.parse(jsonStr);
        if (Array.isArray(items)) {
          for (const p of items) {
            if (p.producto_id && !map.has(p.producto_id)) {
              const catProd = productos.find((cp) => cp.id === p.producto_id);
              map.set(p.producto_id, {
                id: p.producto_id,
                nombre: catProd?.nombre || p.nombre_producto || "Producto",
                codigo_interno: catProd?.codigo_interno || p.codigo_interno || null,
                cantidad_estimada: Number(p.cantidad ?? p.cantidad_estimada) || undefined,
                costo_usd: Number(p.costo_total_usd ?? p.costo_usd) || undefined,
                otros_costos_bs: Number(p.otros_costos_bs) || undefined,
              });
            }
          }
        }
      }
    } catch {}

    // 3. Desde detalle_lote existente
    for (const d of detalles) {
      const vp = d.variantes_producto;
      const prodId = vp?.producto_id || vp?.productos?.id;
      if (prodId && !map.has(prodId)) {
        const catProd = productos.find((cp) => cp.id === prodId);
        map.set(prodId, {
          id: prodId,
          nombre: vp?.productos?.nombre || catProd?.nombre || "Producto",
          codigo_interno: vp?.productos?.codigo_interno || catProd?.codigo_interno || null,
          otros_costos_bs: Number(d.otros_costos_bs) || undefined,
        });
      }
    }

    // 4. Desde lote.producto_id / lote.productos
    if (lote.producto_id && !map.has(lote.producto_id)) {
      const catProd = productos.find((cp) => cp.id === lote.producto_id);
      map.set(lote.producto_id, {
        id: lote.producto_id,
        nombre: lote.productos?.nombre || catProd?.nombre || "Producto",
        codigo_interno: lote.productos?.codigo_interno || catProd?.codigo_interno || null,
        cantidad_estimada: lote.cantidad_estimada || undefined,
        costo_usd: lote.costo_total_usd || undefined,
        otros_costos_bs: lote.gastos_extras_bs || undefined,
      });
    }

    // (No fallback al primer producto del catálogo — si no hay datos reales, devolver vacío)

    return Array.from(map.values());
  }, [lote, detalles, productos]);

  // Variantes correspondientes a los productos de este lote, sin variantes "Estándar" dummy
  const variantesBulto = useMemo(() => {
    const map = new Map<string, any>();

    // 1. Variantes de los detalles de lote guardados/recibidos
    for (const d of detalles) {
      const vp = d.variantes_producto;
      if (vp && vp.id) {
        const c = vp.color ? vp.color.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        if (!(c === "estandar" && (!vp.talla || vp.talla.trim() === ""))) {
          map.set(vp.id, {
            id: vp.id,
            color: vp.color,
            talla: vp.talla,
            sku: vp.sku,
            producto_id: vp.producto_id || (vp.productos?.id as string),
            productos: vp.productos,
          });
        }
      }
    }

    // 2. Variantes del catálogo asociadas a los productos del lote
    const prodIds = new Set(productosLote.map((p) => p.id));
    for (const v of variantes) {
      if (prodIds.has(v.producto_id)) {
        const c = v.color ? v.color.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        if (!(c === "estandar" && (!v.talla || v.talla.trim() === ""))) {
          if (!map.has(v.id)) {
            map.set(v.id, v);
          }
        }
      }
    }

    return Array.from(map.values());
  }, [variantes, productosLote, detalles]);

  // Cálculos robustos del lote para métricas y cards
  const totalCantidad = detalles.reduce(
    (acc, d) => acc + (d.cantidad || 0),
    0
  );

  const totalEstimadoProductos = useMemo(() => {
    return productosLote.reduce((acc, p) => acc + (p.cantidad_estimada || 0), 0);
  }, [productosLote]);

  const totalCostoUsdMulti = useMemo(() => {
    return productosLote.reduce((acc, p) => acc + (p.costo_usd || 0), 0);
  }, [productosLote]);

  const totalCostoUsdDetalles = detalles.reduce(
    (acc, d) =>
      acc + (Number(d.costo_unitario_usd) || 0) * (Number(d.cantidad) || 0),
    0
  );

  // Si detalles tiene costo > 0, usamos ese; si no, el del lote o la suma de productos comprados
  const totalCostoUsd =
    totalCostoUsdDetalles > 0
      ? totalCostoUsdDetalles
      : (Number(lote.costo_total_usd) || totalCostoUsdMulti || 0);

  const totalOtrosCostosBsDetalles = detalles.reduce(
    (acc, d) => acc + (Number(d.otros_costos_bs) || 0),
    0
  );

  const totalOtrosCostosBsMulti = useMemo(() => {
    return productosLote.reduce((acc, p) => acc + (p.otros_costos_bs || 0), 0);
  }, [productosLote]);

  const totalOtrosCostosBs =
    lote.gastos_extras_bs != null
      ? Number(lote.gastos_extras_bs)
      : (totalOtrosCostosBsDetalles > 0 ? totalOtrosCostosBsDetalles : (totalOtrosCostosBsMulti || 0));

  // Always calculate total Bs from the canonical formula to ensure consistency
  const totalCostoBs = (totalCostoUsd * tcLote) + totalOtrosCostosBs;

  const unidadesDisplay =
    liveCount !== null && liveCount > 0
      ? liveCount
      : totalCantidad > 0
      ? totalCantidad
      : lote.cantidad_estimada && Number(lote.cantidad_estimada) > 0
      ? `~${lote.cantidad_estimada}`
      : totalEstimadoProductos > 0
      ? `~${totalEstimadoProductos}`
      : "0";

  // Badge del estado actual
  const estadoBadge = (() => {
    if (lote.estado === "RECIBIDO" || lote.estado === "COMPLETADO") {
      return (
        <Badge
          variant="outline"
          className="text-xs px-2.5 py-0.5 border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          En Inventario
        </Badge>
      );
    }
    if (lote.estado === "EN_TRANSITO") {
      if (detalles.length > 0) {
        return (
          <Badge
            variant="outline"
            className="text-xs px-2.5 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1"
          >
            <Layers className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            En Conteo (borrador guardado)
          </Badge>
        );
      }
      return (
        <Badge
          variant="outline"
          className="text-xs px-2.5 py-0.5 border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium inline-flex items-center gap-1"
        >
          <Truck className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          En Transito (pendiente de contar)
        </Badge>
      );
    }
    if (lote.estado === "PENDIENTE") {
      return (
        <Badge
          variant="outline"
          className="text-xs px-2.5 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 font-medium inline-flex items-center gap-1"
        >
          <Clock className="w-3 h-3 text-zinc-500" />
          Pendiente
        </Badge>
      );
    }
    if (lote.estado === "CERRADO") {
      return (
        <Badge
          variant="outline"
          className="text-xs px-2.5 py-0.5 border border-zinc-200 dark:border-zinc-800 bg-muted text-muted-foreground font-medium inline-flex items-center gap-1"
        >
          <Lock className="w-3 h-3" />
          Cerrado
        </Badge>
      );
    }
    if (lote.estado === "CANCELADO") {
      return (
        <Badge
          variant="outline"
          className="text-xs px-2.5 py-0.5 border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400 font-medium inline-flex items-center gap-1"
        >
          <Ban className="w-3 h-3 text-red-600" />
          Cancelado
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs font-semibold">
        {lote.estado}
      </Badge>
    );
  })();

  // El workstation se muestra en la misma pantalla durante Paso 2 (conteo/recepción) o si se activa el ajuste
  const isCountingView = isEditable || showWorkstation;

  // Estado para controlar qué filas de producto tienen desplegadas sus variantes
  const [expandedProds, setExpandedProds] = useState<Record<string, boolean>>({});

  function toggleExpandProd(prodId: string) {
    setExpandedProds((prev) => ({
      ...prev,
      [prodId]: !prev[prodId],
    }));
  }

  // Agrupar los ítems por Producto sincronizando los costos de compra del pedido y extras
  const productosGrouped = useMemo(() => {
    const map = new Map<
      string,
      {
        productoId: string;
        nombre: string;
        codigoInterno: string;
        cantidadTotal: number;
        cantidadDisponibleTotal: number;
        totalUsd: number;
        totalOtrosCostosBs: number;
        totalCostoBs: number;
        pedidoUsd: number;
        pedidoExtrasBs: number;
        hasDetalles: boolean;
        detallesItems: any[];
      }
    >();

    // 1. Pre-poblar con todos los productos registrados en la compra/pedido
    for (const p of productosLote) {
      if (p.id) {
        const catProd = productos.find((cp: any) => String(cp.id).toLowerCase() === String(p.id).toLowerCase());
        const codigo = catProd?.codigo_interno || p.codigo_interno || "---";

        map.set(p.id, {
          productoId: p.id,
          nombre: p.nombre || catProd?.nombre || "Producto",
          codigoInterno: codigo,
          cantidadTotal: 0,
          cantidadDisponibleTotal: 0,
          totalUsd: 0,
          totalOtrosCostosBs: 0,
          totalCostoBs: 0,
          pedidoUsd: Number(p.costo_usd) || 0,
          pedidoExtrasBs: Number(p.otros_costos_bs) || 0,
          hasDetalles: false,
          detallesItems: [],
        });
      }
    }

    // 2. Acumular unidades y costos reales de las variantes existentes en detalles_lote
    for (const d of detalles) {
      const vp = d.variantes_producto as {
        color: string;
        talla: string | null;
        sku: string | null;
        productos: { id?: string; nombre: string; codigo_interno?: string | null } | null;
      } | null;

      const prod = vp?.productos;
      const prodId = prod?.id || (vp as any)?.producto_id || "desconocido";
      const catProd = productos.find((cp: any) => String(cp.id).toLowerCase() === String(prodId).toLowerCase());
      const prodNombre = prod?.nombre || catProd?.nombre || "Producto sin nombre";
      const prodCodigo = catProd?.codigo_interno || prod?.codigo_interno || "---";

      const cant = Number(d.cantidad) || 0;
      const cantDisp = Number(d.cantidad_disponible) || 0;
      const costUnitUsd = Number(d.costo_unitario_usd) || 0;
      const otrosBs = Number(d.otros_costos_bs) || 0;

      if (!map.has(prodId)) {
        map.set(prodId, {
          productoId: prodId,
          nombre: prodNombre,
          codigoInterno: prodCodigo,
          cantidadTotal: cant,
          cantidadDisponibleTotal: cantDisp,
          totalUsd: costUnitUsd * cant,
          totalOtrosCostosBs: otrosBs,
          totalCostoBs: 0,
          pedidoUsd: 0,
          pedidoExtrasBs: 0,
          hasDetalles: true,
          detallesItems: [d],
        });
      } else {
        const item = map.get(prodId)!;
        item.cantidadTotal += cant;
        item.cantidadDisponibleTotal += cantDisp;
        item.hasDetalles = true;
        // Always accumulate from detalle rows
        item.totalUsd += costUnitUsd * cant;
        item.totalOtrosCostosBs += otrosBs;
        item.detallesItems.push(d);
        if (item.codigoInterno === "---" && prodCodigo !== "---") {
          item.codigoInterno = prodCodigo;
        }
      }
    }

    // 3. Finalizar cálculos financieros exactos por producto
    return Array.from(map.values()).map((item) => {
      let usd = item.totalUsd;
      let otrosBs = item.totalOtrosCostosBs;

      // If no detalles exist yet, use pedido data or fallback
      if (!item.hasDetalles) {
        usd = item.pedidoUsd;
        otrosBs = Number(lote.gastos_extras_bs) > 0 && productosLote.length > 0 ? (Number(lote.gastos_extras_bs) / productosLote.length) : 0;
        if (usd === 0 && Number(lote.costo_total_usd) > 0 && productosLote.length > 0) {
          usd = Number(lote.costo_total_usd) / productosLote.length;
        }
        if (otrosBs === 0 && Number(lote.gastos_extras_bs) > 0 && productosLote.length > 0) {
          otrosBs = Number(lote.gastos_extras_bs) / productosLote.length;
        }
      } else if (usd === 0 && item.pedidoUsd > 0) {
        // Si los detalles perdieron el costo del pedido (una recalcación antigua
        // errónea lo dejó en cero), caemos al costo registrado en la compra para
        // que "Costo Pedido ($)" no se muestre vacío
        usd = item.pedidoUsd;
      }

      const totalCostoBs = (usd * tcLote) + otrosBs;
      const divisor = item.cantidadTotal > 0 ? item.cantidadTotal : 1;
      const costoUnitarioPromedioBs = totalCostoBs / divisor;

      return {
        ...item,
        totalUsd: usd,
        totalOtrosCostosBs: otrosBs,
        totalCostoBs,
        costoUnitarioPromedioBs: item.cantidadTotal > 0 ? costoUnitarioPromedioBs : 0,
      };
    });
  }, [detalles, productosLote, productos, lote, tcLote]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Encabezado ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/lotes"
            className="p-2 hover:bg-accent rounded-xl text-muted-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Lote #{String(lote.numero_lote).padStart(4, "0")}
              </h1>
              {estadoBadge}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
              {/* Productos del lote: nombre si es 1, cantidad si son varios */}
              {productosLote.length === 1 ? (
                <>
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    {productosLote[0].nombre}
                  </span>
                  <span>·</span>
                </>
              ) : productosLote.length > 1 ? (
                <>
                  <span
                    className="flex items-center gap-1 font-semibold text-foreground cursor-help"
                    title={productosLote.map((p) => p.nombre).join(", ")}
                  >
                    <Package className="w-3.5 h-3.5 text-primary" />
                    {productosLote.length} productos
                  </span>
                  <span>·</span>
                </>
              ) : null}

              <span className="flex items-center gap-1 font-medium text-foreground">
                <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                {lote.proveedor || "Sin proveedor"}
              </span>

              <span>·</span>

              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                T/C: {tcLote} Bs./$
              </span>

              {lote.inversionistas?.nombre && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    Inversionista: {lote.inversionistas.nombre}
                  </span>
                </>
              )}

              {lote.gastos_extras_bs != null &&
                Number(lote.gastos_extras_bs) > 0 && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                      Costos Extras: Bs. {Number(lote.gastos_extras_bs).toFixed(2)}
                    </span>
                  </>
                )}

              {lote.fecha_compra && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    Compra: {lote.fecha_compra}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Acciones del encabezado */}
        <div className="flex items-center gap-2 flex-wrap">
          <EditarLoteDialog lote={lote} inversionistas={inversionistas} />

          {/* Si estamos en inventario finalizado, botón para ajustar conteo */}
          {!isCountingView && puedeContar && (
            <Button
              variant="outline"
              onClick={() => abrirConteo(true)}
              className="gap-1.5 text-xs h-9"
            >
              <Layers className="w-4 h-4" />
              Ajustar Conteo
            </Button>
          )}

          {/* Si se abrió ajuste de un lote ya recibido, botón para volver a ver la tabla */}
          {isCountingView && !isEditable && (
            <Button
              variant="outline"
              onClick={() => setShowWorkstation(false)}
              className="gap-1.5 text-xs h-9"
            >
              <ArrowLeft className="w-4 h-4" />
              Ver Inventario
            </Button>
          )}

          {/* Si el lote está en tránsito y ya tiene conteos guardados, botón para ingresar a inventario */}
          {isEditable && detalles.length > 0 && (
            <Button
              onClick={() => abrirConteo(false)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              Ingresar a Inventario
            </Button>
          )}
        </div>
      </div>

      {/* ── Stepper ────────────────────────────────────────────────── */}
      <LoteFlujoStepper estado={lote.estado} detallesCount={detalles.length} />

      {/* ── Stats de costos ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card className="p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Unidades
            </span>
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {unidadesDisplay}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {totalCantidad > 0 || (liveCount !== null && liveCount > 0)
                ? "Total contadas"
                : "Estimadas en camino"}
            </p>
          </div>
        </Card>

        <Card className="p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Pedido ($ USD)
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              ${totalCostoUsd.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground">Costo de compra USD</p>
          </div>
        </Card>

        <Card className="p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Costos Extras (Bs)
            </span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              Bs. {totalOtrosCostosBs.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Transporte, aduana, etc.
            </p>
          </div>
        </Card>

        <Card className="p-3.5 shadow-2xs border-primary/40 bg-primary/5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Inversion Total (Bs)
            </span>
            <Calculator className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold tracking-tight text-primary">
              Bs. {totalCostoBs.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground">Costo total acumulado</p>
          </div>
        </Card>
      </div>

      {/* ── CUERPO PRINCIPAL EN LA MISMA PANTALLA: WORKSTATION O TABLA ── */}
      {isCountingView ? (
        <LoteContarWorkstation
          lote={lote}
          productosLote={productosLote}
          catalogoProductos={productos}
          variantesProducto={variantesBulto}
          detallesActuales={detalles}
          soloDesglose={soloDesglose}
          onCountChange={handleCountChange}
          onClose={!isEditable ? () => setShowWorkstation(false) : undefined}
        />
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
          <div className="px-4 py-3 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Desglose Físico por Producto ({productosGrouped.length} productos en inventario)
              </h2>
              <p className="text-xs text-muted-foreground">
                Costo Unitario = (Compra USD x T/C + Extras Bs) / Cantidad total de prendas
              </p>
            </div>
            {puedeContar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => abrirConteo(true)}
                className="gap-1.5 text-xs h-8"
              >
                <Layers className="w-3.5 h-3.5" />
                Ajustar Conteo
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Producto
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Código Interno
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Cant.
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Costo Pedido ($)
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Costos Extras (Bs)
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Costo Total (Bs)
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right font-bold text-primary">
                  Costo Unit. (Bs)
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
                  Disp.
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">
                  Acción
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productosGrouped.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-12"
                  >
                    <PackageOpen className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      Pedido sin prendas contadas aún
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Haz clic en <strong>"Ajustar Conteo"</strong> para registrar las prendas físicas recibidas.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                productosGrouped.map((pg) => {
                  const isExpanded = !!expandedProds[pg.productoId];

                  return (
                    <Fragment key={pg.productoId}>
                      <TableRow
                        className="hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => toggleExpandProd(pg.productoId)}
                      >
                        <TableCell className="font-medium text-xs">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                            <div>
                              <p className="font-bold text-foreground leading-snug">
                                {pg.nombre}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {pg.detallesItems.length} variante{pg.detallesItems.length > 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs font-bold text-primary">
                          {pg.codigoInterno}
                        </TableCell>

                        <TableCell className="text-center text-xs font-bold tabular-nums">
                          {pg.cantidadTotal}
                        </TableCell>

                        <TableCell className="text-right text-xs tabular-nums">
                          {pg.totalUsd > 0 ? (
                            <span className="font-semibold">${pg.totalUsd.toFixed(2)}</span>
                          ) : (
                            "---"
                          )}
                        </TableCell>

                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          {pg.totalOtrosCostosBs > 0 ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              +Bs. {pg.totalOtrosCostosBs.toFixed(2)}
                            </span>
                          ) : (
                            "Bs. 0.00"
                          )}
                        </TableCell>

                        <TableCell className="text-right text-xs tabular-nums font-semibold">
                          Bs. {pg.totalCostoBs.toFixed(2)}
                        </TableCell>

                        <TableCell className="text-right text-xs tabular-nums font-extrabold text-primary">
                          Bs. {pg.costoUnitarioPromedioBs.toFixed(2)}
                        </TableCell>

                        <TableCell className="text-center text-xs font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] ${
                              pg.cantidadDisponibleTotal === 0
                                ? "bg-muted text-muted-foreground/60"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {pg.cantidadDisponibleTotal}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <EditarProductoLoteDialog
                              loteId={lote.id}
                              productoId={pg.productoId}
                              nombreProducto={pg.nombre}
                              costoUsdActual={pg.totalUsd}
                              gastosExtrasBsActual={pg.totalOtrosCostosBs}
                              estadoLote={lote.estado}
                            />
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Fila desplegable con el desglose de variantes de este producto */}
                      {isExpanded && (
                        <TableRow className="bg-muted/15 border-b border-border/60">
                          <TableCell colSpan={9} className="p-3 pl-10">
                            <div className="rounded-xl border border-border/80 bg-background/80 p-3 space-y-2">
                              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Boxes className="w-3.5 h-3.5 text-primary" />
                                Variantes recibidas de {pg.nombre} ({pg.codigoInterno})
                              </p>
                              <div className="divide-y divide-border/40">
                                {pg.detallesItems.map((d: any) => {
                                  const v = d.variantes_producto as {
                                    color: string;
                                    talla: string | null;
                                    sku: string | null;
                                  } | null;

                                  return (
                                    <div
                                      key={d.id}
                                      className="py-1.5 flex items-center justify-between text-xs hover:bg-muted/30 px-2 rounded-md transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="font-semibold text-foreground capitalize">
                                          {v?.color || "Estándar"}
                                          {v?.talla ? ` · Talla ${v.talla}` : ""}
                                        </div>
                                        <div className="text-[10px] font-mono text-muted-foreground">
                                          SKU: {v?.sku || "---"}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-6">
                                        <div className="text-right">
                                          <span className="text-muted-foreground text-[11px]">Contadas: </span>
                                          <span className="font-bold text-foreground font-mono">{d.cantidad}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-muted-foreground text-[11px]">Disp: </span>
                                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{d.cantidad_disponible}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                             </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
