import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import {
  InversionistasRendimientoTable,
  type InversionistaRendimientoItem,
  type InversionistaLoteDetalle,
} from "@/features/reportes/components/inversionistas-rendimiento-table";
import { ReportePeriodoSelect } from "@/features/reportes/components/reporte-periodo-select";
import { getRangoPeriodo, type PeriodoFinanciero } from "@/features/reportes/lib/date-utils";

export const metadata = { title: "Reporte: Utilidad por Inversionista" };

interface Props {
  searchParams: Promise<{
    periodo?: PeriodoFinanciero;
    desde?: string;
    hasta?: string;
  }>;
}

export default async function ReporteUtilidadInversionistaPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const { desde, hasta, sublabel } = getRangoPeriodo(sp.periodo, sp.desde, sp.hasta);
  const supabase = await createClient();

  // ── 1. Obtener todos los inversionistas activos ─────────────────────────────
  const { data: todosInversionistas } = await supabase
    .from("inversionistas")
    .select("id, nombre, activo")
    .eq("activo", true)
    .order("nombre");

  // ── 2. Obtener inversiones de la tabla inversiones_lote ────────────────────
  const { data: inversionesRaw } = await supabase
    .from("inversiones_lote")
    .select(`
      id,
      monto_invertido_bs,
      inversionista_id,
      lote_id,
      inversionistas (id, nombre, activo),
      lotes (
        id,
        numero_lote,
        estado
      )
    `);

  // ── 3. Obtener lotes que tienen inversionista_id asignado directamente ──────
  const { data: lotesDirectosRaw } = await supabase
    .from("lotes")
    .select("id, numero_lote, estado, inversionista_id, costo_total_usd, tipo_cambio, gastos_extras_bs")
    .not("inversionista_id", "is", null);

  // ── 4. Rentabilidad por lote (Histórico de vw_rentabilidad_lote o Filtrado por período) ──
  const rentabilidadMap = new Map<string, { utilidad_real: number; costo_total_inversion: number }>();

  if (!desde && !hasta) {
    const { data: rentabilidadLotes, error: errRent } = await supabase
      .from("vw_rentabilidad_lote")
      .select("lote_id, costo_total_inversion, utilidad_real");

    if (errRent) {
      console.error("Error al cargar vw_rentabilidad_lote:", errRent);
    }

    for (const r of rentabilidadLotes ?? []) {
      rentabilidadMap.set(r.lote_id, {
        utilidad_real: Number(r.utilidad_real ?? 0),
        costo_total_inversion: Number(r.costo_total_inversion ?? 0),
      });
    }
  } else {
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

    const { data: rawAsignaciones, error: errAsig } = await ventasQuery;
    if (errAsig) {
      console.error("Error al cargar ventas de lote en período:", errAsig);
    }

    for (const asig of rawAsignaciones ?? []) {
      const loteId = (asig as any).detalle_lote?.lote_id;
      if (!loteId) continue;

      const cant = Number(asig.cantidad || 0);
      const precioUnit = Number((asig as any).detalle_pedido?.precio_unitario || 0);
      const costoUnit = Number(asig.costo_unitario_bs || 0);
      const utilidadItem = cant * (precioUnit - costoUnit);

      const prev = rentabilidadMap.get(loteId) ?? { utilidad_real: 0, costo_total_inversion: 0 };
      prev.utilidad_real += utilidadItem;
      rentabilidadMap.set(loteId, prev);
    }
  }

  // ── 5. Retiros por inversionista (capital y utilidad) ───────────────────────
  let retirosQuery = supabase
    .from("retiros")
    .select("inversionista_id, monto, origen, fecha")
    .not("inversionista_id", "is", null);

  if (desde) retirosQuery = retirosQuery.gte("fecha", desde.split("T")[0]);
  if (hasta) retirosQuery = retirosQuery.lte("fecha", hasta.split("T")[0]);

  const { data: retirosRaw } = await retirosQuery;

  const listInversionistas = todosInversionistas ?? [];
  const inversiones = inversionesRaw ?? [];
  const lotesDirectos = lotesDirectosRaw ?? [];
  const retiros = retirosRaw ?? [];

  // Mapa: lote_id -> total invertido en ese lote (suma de todos los inversionistas en inversiones_lote)
  const totalPorLoteInversiones = new Map<string, number>();
  for (const inv of inversiones) {
    const prev = totalPorLoteInversiones.get(inv.lote_id) ?? 0;
    totalPorLoteInversiones.set(inv.lote_id, prev + Number(inv.monto_invertido_bs));
  }

  // Mapa: inversionista_id -> { retiros_capital, retiros_utilidad }
  const retirosMap = new Map<string, { capital: number; utilidad: number }>();
  for (const r of retiros) {
    if (!r.inversionista_id) continue;
    const prev = retirosMap.get(r.inversionista_id) ?? { capital: 0, utilidad: 0 };
    if (r.origen === "CAPITAL") {
      prev.capital += Number(r.monto);
    } else if (r.origen === "UTILIDAD") {
      prev.utilidad += Number(r.monto);
    }
    retirosMap.set(r.inversionista_id, prev);
  }

  // Estructura de almacenamiento por inversionista
  const invMap = new Map<
    string,
    {
      inversionista_id: string;
      nombre: string;
      lotesMap: Map<string, InversionistaLoteDetalle>;
      capital_aportado_total: number;
      utilidad_generada_total: number;
    }
  >();

  // Inicializar el mapa con TODOS los inversionistas registrados
  for (const inv of listInversionistas) {
    invMap.set(inv.id, {
      inversionista_id: inv.id,
      nombre: inv.nombre,
      lotesMap: new Map(),
      capital_aportado_total: 0,
      utilidad_generada_total: 0,
    });
  }

  // Procesar lote directamente asignado (cuando se selecciona Inversionista al Crear/Editar Lote)
  for (const lote of lotesDirectos) {
    if (!lote.inversionista_id) continue;

    let invRecord = invMap.get(lote.inversionista_id);
    if (!invRecord) {
      invRecord = {
        inversionista_id: lote.inversionista_id,
        nombre: "Inversionista Registrado",
        lotesMap: new Map(),
        capital_aportado_total: 0,
        utilidad_generada_total: 0,
      };
      invMap.set(lote.inversionista_id, invRecord);
    }

    const rent = rentabilidadMap.get(lote.id) ?? { utilidad_real: 0, costo_total_inversion: 0 };
    const costoLoteBs = rent.costo_total_inversion > 0
      ? rent.costo_total_inversion
      : (Number(lote.costo_total_usd ?? 0) * Number(lote.tipo_cambio ?? 6.96)) + Number(lote.gastos_extras_bs ?? 0);

    const loteDetalle: InversionistaLoteDetalle = {
      lote_id: lote.id,
      numero_lote: Number(lote.numero_lote),
      estado_lote: lote.estado,
      monto_invertido: costoLoteBs,
      costo_total_lote: costoLoteBs,
      utilidad_lote: rent.utilidad_real,
      utilidad_proporcional: rent.utilidad_real,
      pct_participacion: 100,
    };

    invRecord.lotesMap.set(lote.id, loteDetalle);
  }

  // Procesar inversiones por tabla intermedia `inversiones_lote` (participación detallada)
  for (const inv of inversiones) {
    const invData = inv.inversionistas as unknown as { id: string; nombre: string; activo: boolean } | null;
    const loteData = inv.lotes as unknown as { id: string; numero_lote: number; estado: string } | null;

    if (!invData || !loteData) continue;
    if (invData.activo === false) continue;

    let invRecord = invMap.get(invData.id);
    if (!invRecord) {
      invRecord = {
        inversionista_id: invData.id,
        nombre: invData.nombre,
        lotesMap: new Map(),
        capital_aportado_total: 0,
        utilidad_generada_total: 0,
      };
      invMap.set(invData.id, invRecord);
    }

    const montoInvertido = Number(inv.monto_invertido_bs);
    const totalLoteInvertido = totalPorLoteInversiones.get(inv.lote_id) ?? montoInvertido;
    const rent = rentabilidadMap.get(inv.lote_id) ?? { utilidad_real: 0, costo_total_inversion: 0 };

    const pctParticipacion = totalLoteInvertido > 0 ? (montoInvertido / totalLoteInvertido) * 100 : 100;
    const utilidadProporcional = rent.utilidad_real * (pctParticipacion / 100);

    const loteDetalle: InversionistaLoteDetalle = {
      lote_id: loteData.id,
      numero_lote: Number(loteData.numero_lote),
      estado_lote: loteData.estado,
      monto_invertido: montoInvertido,
      costo_total_lote: rent.costo_total_inversion > 0 ? rent.costo_total_inversion : montoInvertido,
      utilidad_lote: rent.utilidad_real,
      utilidad_proporcional: utilidadProporcional,
      pct_participacion: pctParticipacion,
    };

    invRecord.lotesMap.set(loteData.id, loteDetalle);
  }

  // ── 6. Construir el array final calculando totales ─────────────────────────
  const data: InversionistaRendimientoItem[] = Array.from(invMap.values())
    .map((inv) => {
      const lotesList = Array.from(inv.lotesMap.values());
      const capitalAportado = lotesList.reduce((acc, l) => acc + l.monto_invertido, 0);
      const utilidadGenerada = lotesList.reduce((acc, l) => acc + l.utilidad_proporcional, 0);

      const retInv = retirosMap.get(inv.inversionista_id) ?? { capital: 0, utilidad: 0 };
      const utilidadPendiente = utilidadGenerada - retInv.utilidad;
      const roiPct = capitalAportado > 0 ? (utilidadGenerada / capitalAportado) * 100 : 0;

      return {
        inversionista_id: inv.inversionista_id,
        nombre: inv.nombre,
        lotes_financiados: lotesList.length,
        capital_aportado_total: capitalAportado,
        utilidad_generada_total: utilidadGenerada,
        retiros_capital: retInv.capital,
        retiros_utilidad: retInv.utilidad,
        utilidad_pendiente: utilidadPendiente,
        roi_porcentaje: roiPct,
        lotes: lotesList.sort((a, b) => b.numero_lote - a.numero_lote),
      };
    })
    .sort((a, b) => b.capital_aportado_total - a.capital_aportado_total);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
            Utilidad por Inversionista
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Ganancia proporcional por lote financiado, retiros y saldo pendiente {sublabel ? `(${sublabel})` : ""}.
          </p>
        </div>
        <ReportePeriodoSelect />
      </div>

      <InversionistasRendimientoTable data={data} />
    </div>
  );
}
