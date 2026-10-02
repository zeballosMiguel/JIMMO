import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ReportePeriodoSelect } from "@/features/reportes/components/reporte-periodo-select";
import { KpiFinancialCards } from "@/features/reportes/components/kpi-financial-cards";
import { VendedoresRendimiento, type VendedorRendimientoItem } from "@/features/reportes/components/vendedores-rendimiento";
import { ProductosEstadoTable, type ProductoEstadoItem } from "@/features/reportes/components/productos-estado-table";
import { getRangoPeriodo, type PeriodoFinanciero } from "@/features/reportes/lib/date-utils";

export const metadata = { title: "Reporte Financiero" };

interface Props {
  searchParams: Promise<{
    periodo?: PeriodoFinanciero;
    desde?: string;
    hasta?: string;
  }>;
}

export default async function ReportesFinancieroPage({ searchParams }: Props) {
  await requireAdmin();

  const sp = await searchParams;
  const { desde, hasta, label, sublabel } = getRangoPeriodo(sp.periodo, sp.desde, sp.hasta);
  const supabase = await createClient();

  // ── 1. Period calculations ─────────────────────────────────────────
  let dpQuery = supabase
    .from("detalle_pedido")
    .select(`
      id,
      subtotal,
      costo_total,
      utilidad,
      cantidad,
      variante_id,
      variantes_producto (
        producto_id,
        productos (
          id,
          nombre,
          categorias (nombre)
        )
      ),
      pedidos!inner (
        id,
        estado,
        created_at,
        vendedor_id,
        vendedores (id, nombre, comision_porcentaje)
      )
    `)
    .eq("activo", true)
    .eq("pedidos.estado", "COMPLETADO");

  if (desde) {
    dpQuery = dpQuery.gte("pedidos.created_at", desde);
  }
  if (hasta) {
    dpQuery = dpQuery.lte("pedidos.created_at", hasta);
  }

  let retirosPeriodoQuery = supabase
    .from("retiros")
    .select("monto, origen, fecha");

  if (desde) {
    retirosPeriodoQuery = retirosPeriodoQuery.gte("fecha", desde.split("T")[0]);
  }
  if (hasta) {
    retirosPeriodoQuery = retirosPeriodoQuery.lte("fecha", hasta.split("T")[0]);
  }

  const [{ data: itemsPeriodo }, { data: retirosPeriodo }] = await Promise.all([
    dpQuery,
    retirosPeriodoQuery,
  ]);

  const items = itemsPeriodo ?? [];
  const retiros = retirosPeriodo ?? [];

  const ventasPeriodo = items.reduce((s, i) => s + Number(i.subtotal), 0);
  const utilidadPeriodo = items.reduce((s, i) => s + Number(i.utilidad), 0);
  const capitalPeriodo = items.reduce((s, i) => s + Number(i.costo_total), 0);

  const margenUtilidadPct = ventasPeriodo > 0 ? (utilidadPeriodo / ventasPeriodo) * 100 : 0;
  const capitalRetornoPct = ventasPeriodo > 0 ? (capitalPeriodo / ventasPeriodo) * 100 : 0;

  const retirosCapitalPeriodo = retiros
    .filter((r) => r.origen === "CAPITAL")
    .reduce((s, r) => s + Number(r.monto), 0);
  const retirosUtilidadPeriodo = retiros
    .filter((r) => r.origen === "UTILIDAD")
    .reduce((s, r) => s + Number(r.monto), 0);
  const totalRetirosPeriodo = retirosCapitalPeriodo + retirosUtilidadPeriodo;

  // ── Fórmulas EXACTAS del negocio ──────────────────────────────────
  // Capital en caja = Capital recuperado − retiros de capital
  const capitalEnCaja = capitalPeriodo - retirosCapitalPeriodo;

  // Utilidad en caja = Utilidad generada − retiros de utilidad
  const utilidadEnCaja = utilidadPeriodo - retirosUtilidadPeriodo;

  // Dinero en caja = Capital en caja + Utilidad en caja
  const dineroEnCaja = capitalEnCaja + utilidadEnCaja;

  const capitalEnCajaPct = dineroEnCaja > 0 ? (Math.max(0, capitalEnCaja) / dineroEnCaja) * 100 : 50;
  const utilidadEnCajaPct = dineroEnCaja > 0 ? (Math.max(0, utilidadEnCaja) / dineroEnCaja) * 100 : 50;

  const utilidadGeneradaPeriodo = utilidadPeriodo;
  const utilidadRetiradaPeriodo = retirosUtilidadPeriodo;
  const utilidadPendientePeriodo = utilidadEnCaja;

  // ── 3. Rendimiento por Vendedor en el período ───────────────────────
  const vendedorMap = new Map<string, {
    id: string;
    nombre: string;
    utilidad: number;
    comisionPorcentaje: number;
    pedidosSet: Set<string>;
  }>();

  for (const item of items) {
    const pedido = item.pedidos as any;
    const vendedor = pedido?.vendedores as { id?: string; nombre?: string; comision_porcentaje?: number } | null;
    const vendedorId = vendedor?.id || pedido?.vendedor_id;
    if (!vendedorId) continue;

    const nombre = vendedor?.nombre || "Vendedor";
    const comisionPorcentaje = Number(vendedor?.comision_porcentaje || 0);

    const prev = vendedorMap.get(vendedorId) ?? {
      id: vendedorId,
      nombre,
      utilidad: 0,
      comisionPorcentaje,
      pedidosSet: new Set<string>(),
    };

    prev.utilidad += Number(item.utilidad);
    if (pedido?.id) prev.pedidosSet.add(pedido.id);
    vendedorMap.set(vendedorId, prev);
  }

  const totalUtilidadVendedores = Array.from(vendedorMap.values()).reduce(
    (s, v) => s + v.utilidad,
    0
  );

  const vendedores: VendedorRendimientoItem[] = Array.from(vendedorMap.values())
    .map((v) => ({
      id: v.id,
      nombre: v.nombre,
      utilidad: v.utilidad,
      comision: (v.utilidad * v.comisionPorcentaje) / 100,
      pedidosCount: v.pedidosSet.size,
      porcentaje: totalUtilidadVendedores > 0 ? (v.utilidad / totalUtilidadVendedores) * 100 : 0,
    }))
    .sort((a, b) => b.utilidad - a.utilidad);

  // ── 4. Estado por Producto en el período ────────────────────────────
  const productoMap = new Map<string, {
    id: string;
    nombre: string;
    categoria?: string | null;
    capital: number;
    utilidad: number;
  }>();

  for (const item of items) {
    const variante = item.variantes_producto as any;
    const producto = variante?.productos;
    const productoId = producto?.id;
    if (!productoId) continue;

    const nombre = producto.nombre;
    const categoria = producto.categorias?.nombre ?? null;

    const prev = productoMap.get(productoId) ?? {
      id: productoId,
      nombre,
      categoria,
      capital: 0,
      utilidad: 0,
    };

    prev.capital += Number(item.costo_total);
    prev.utilidad += Number(item.utilidad);
    productoMap.set(productoId, prev);
  }

  const productos: ProductoEstadoItem[] = Array.from(productoMap.values())
    .map((p) => {
      // Proporción de dinero en caja que le corresponde a este producto
      const totalProducto = p.capital + p.utilidad;
      const factorCaja = ventasPeriodo > 0 ? Math.min(1, dineroEnCaja / ventasPeriodo) : 1;
      const enCaja = totalProducto * factorCaja;

      return {
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        capital: p.capital,
        utilidad: p.utilidad,
        enCaja: Number(enCaja.toFixed(2)),
      };
    })
    .sort((a, b) => b.utilidad - a.utilidad);

  const totalCapitalProductos = productos.reduce((s, p) => s + p.capital, 0);
  const totalUtilidadProductos = productos.reduce((s, p) => s + p.utilidad, 0);
  const totalEnCajaProductos = productos.reduce((s, p) => s + p.enCaja, 0);

  return (
    <div className="space-y-6">
      {/* ── Header con Título y Selector de Período ───────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-6 bg-red-600 rounded-full" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase">
              Reporte Financiero
            </h1>
            {sublabel && (
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {label} · {sublabel}
              </p>
            )}
          </div>
        </div>

        <ReportePeriodoSelect />
      </div>

      {/* ── Tarjetas Financieras (Ventas, Utilidad, Caja, Retiros) */}
      <KpiFinancialCards
        data={{
          ventasPeriodo,
          utilidadPeriodo,
          capitalPeriodo,
          margenUtilidadPct,
          capitalRetornoPct,
          dineroEnCaja,
          capitalEnCaja,
          utilidadEnCaja,
          capitalEnCajaPct,
          utilidadEnCajaPct,
          utilidadGenerada: utilidadGeneradaPeriodo,
          utilidadRetirada: utilidadRetiradaPeriodo,
          utilidadPendiente: utilidadPendientePeriodo,
          retirosCapital: retirosCapitalPeriodo,
          retirosUtilidad: retirosUtilidadPeriodo,
          totalRetiros: totalRetirosPeriodo,
        }}
      />

      {/* ── Rendimiento por Vendedor ─────────────────────────── */}
      <VendedoresRendimiento vendedores={vendedores} />

      {/* ── Estado por Producto (Auditoría) ───────────────────── */}
      <ProductosEstadoTable
        productos={productos}
        totalCapital={totalCapitalProductos}
        totalUtilidad={totalUtilidadProductos}
        totalEnCaja={totalEnCajaProductos}
      />
    </div>
  );
}
