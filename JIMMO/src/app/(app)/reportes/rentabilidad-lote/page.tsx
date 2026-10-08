import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { RentabilidadLoteTable, type RentabilidadLoteItem } from "@/features/reportes/components/rentabilidad-lote-table";
import { ReportePeriodoSelect } from "@/features/reportes/components/reporte-periodo-select";
import { getRangoPeriodo, type PeriodoFinanciero } from "@/features/reportes/lib/date-utils";

export const metadata = { title: "Reporte: Rentabilidad por Lote" };

interface Props {
  searchParams: Promise<{
    periodo?: PeriodoFinanciero;
    desde?: string;
    hasta?: string;
  }>;
}

export default async function ReporteRentabilidadLotePage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const { desde, hasta, sublabel } = getRangoPeriodo(sp.periodo, sp.desde, sp.hasta);
  const supabase = await createClient();

  // Si no hay filtro de fecha (histórico acumulado), usamos la vista SQL oficial que es perfecta y precisa
  if (!desde && !hasta) {
    const { data: reporte, error } = await supabase
      .from("vw_rentabilidad_lote")
      .select("*")
      .order("numero_lote", { ascending: false });

    if (error) {
      console.error("Error fetching vw_rentabilidad_lote:", error);
    }

    const loteData: RentabilidadLoteItem[] = (reporte || []).map((r: any) => ({
      lote_id: r.lote_id,
      numero_lote: Number(r.numero_lote || 0),
      estado: r.estado || "RECIBIDO",
      fecha_compra: r.fecha_compra || null,
      fecha_recepcion: r.fecha_recepcion || null,
      unidades_compradas: Number(r.unidades_compradas || 0),
      unidades_vendidas: Number(r.unidades_vendidas || 0),
      unidades_disponibles: Number(r.unidades_disponibles || 0),
      costo_total_inversion: Number(r.costo_total_inversion || 0),
      ventas_totales: Number(r.ventas_totales || 0),
      costo_ventas: Number(r.costo_ventas || 0),
      utilidad_real: Number(r.utilidad_real || 0),
      porcentaje_vendido: Number(r.porcentaje_vendido || 0),
      roi_porcentaje: Number(r.roi_porcentaje || 0),
    }));

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
              Rentabilidad por Lote
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Métricas de inversión, ventas y retorno (ROI) por lote {sublabel ? `(${sublabel})` : ""}.
            </p>
          </div>
          <ReportePeriodoSelect />
        </div>

        <RentabilidadLoteTable data={loteData} />
      </div>
    );
  }

  // 1. Con filtro de fecha: Obtener los lotes base con sus costos fijos
  const { data: lotesBase } = await supabase
    .from("lotes")
    .select(`
      id,
      numero_lote,
      estado,
      fecha_compra,
      fecha_recepcion,
      costo_total_usd,
      tipo_cambio,
      gastos_extras_bs,
      detalle_lote (
        cantidad,
        cantidad_disponible,
        costo_unitario_bs
      ),
      costos_lote (
        monto_bs
      )
    `)
    .order("numero_lote", { ascending: false });

  // 2. Obtener ventas del período (pedidos COMPLETADO)
  let ventasQuery = supabase
    .from("asignaciones_lote_pedido")
    .select(`
      cantidad,
      costo_unitario_bs,
      detalle_lote!inner (
        lote_id
      ),
      detalle_pedido!inner (
        precio_unitario,
        pedidos!inner (
          id,
          estado,
          created_at
        )
      )
    `)
    .eq("activa", true)
    .eq("detalle_pedido.pedidos.estado", "COMPLETADO");

  if (desde) ventasQuery = ventasQuery.gte("detalle_pedido.pedidos.created_at", desde);
  if (hasta) ventasQuery = ventasQuery.lte("detalle_pedido.pedidos.created_at", hasta);

  const { data: rawAsignaciones, error: errVentas } = await ventasQuery;
  if (errVentas) {
    console.error("Error al consultar ventas del lote por período:", errVentas);
  }
  const asignaciones = rawAsignaciones ?? [];

  // Mapa: lote_id -> { unidades_vendidas, ventas_totales, costo_ventas }
  const ventasMap = new Map<string, { unidades_vendidas: number; ventas_totales: number; costo_ventas: number }>();
  for (const asig of asignaciones) {
    const loteId = (asig as any).detalle_lote?.lote_id;
    if (!loteId) continue;

    const cant = Number(asig.cantidad || 0);
    const precioUnit = Number((asig as any).detalle_pedido?.precio_unitario || 0);
    const costoUnit = Number(asig.costo_unitario_bs || 0);

    const prev = ventasMap.get(loteId) ?? { unidades_vendidas: 0, ventas_totales: 0, costo_ventas: 0 };
    prev.unidades_vendidas += cant;
    prev.ventas_totales += cant * precioUnit;
    prev.costo_ventas += cant * costoUnit;
    ventasMap.set(loteId, prev);
  }

  const loteData: RentabilidadLoteItem[] = (lotesBase || []).map((l: any) => {
    const detalles = l.detalle_lote || [];
    const costosExtras = l.costos_lote || [];

    const unidadesCompradas = detalles.reduce((sum: number, d: any) => sum + Number(d.cantidad || 0), 0);
    const unidadesDisponibles = detalles.reduce((sum: number, d: any) => sum + Number(d.cantidad_disponible || 0), 0);
    const costoMercaderiaBs = detalles.reduce((sum: number, d: any) => sum + Number(d.cantidad || 0) * Number(d.costo_unitario_bs || 0), 0);
    const costosAdicionalesBs = costosExtras.reduce((sum: number, c: any) => sum + Number(c.monto_bs || 0), 0);
    const costoTotalInversion = costoMercaderiaBs + costosAdicionalesBs;

    const v = ventasMap.get(l.id) ?? { unidades_vendidas: 0, ventas_totales: 0, costo_ventas: 0 };
    const utilidadReal = v.ventas_totales - v.costo_ventas;
    const porcentajeVendido = unidadesCompradas > 0 ? Number(((v.unidades_vendidas / unidadesCompradas) * 100).toFixed(2)) : 0;
    const roiPorcentaje = costoTotalInversion > 0 ? Number(((utilidadReal / costoTotalInversion) * 100).toFixed(2)) : 0;

    return {
      lote_id: l.id,
      numero_lote: Number(l.numero_lote || 0),
      estado: l.estado || "RECIBIDO",
      fecha_compra: l.fecha_compra || null,
      fecha_recepcion: l.fecha_recepcion || null,
      unidades_compradas: unidadesCompradas,
      unidades_vendidas: v.unidades_vendidas,
      unidades_disponibles: unidadesDisponibles,
      costo_total_inversion: costoTotalInversion,
      ventas_totales: v.ventas_totales,
      costo_ventas: v.costo_ventas,
      utilidad_real: utilidadReal,
      porcentaje_vendido: porcentajeVendido,
      roi_porcentaje: roiPorcentaje,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
            Rentabilidad por Lote
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Métricas de inversión, ventas y retorno (ROI) por lote {sublabel ? `(${sublabel})` : ""}.
          </p>
        </div>
        <ReportePeriodoSelect />
      </div>

      <RentabilidadLoteTable data={loteData} />
    </div>
  );
}
