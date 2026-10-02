import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { RentabilidadLoteTable, type RentabilidadLoteItem } from "@/features/reportes/components/rentabilidad-lote-table";

export const metadata = { title: "Reporte: Rentabilidad por Lote" };

export default async function ReporteRentabilidadLotePage() {
  await requireAdmin();
  const supabase = await createClient();

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
            Rentabilidad por Lote
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Métricas de inversión, recuperación de capital, utilidad neta y retorno de inversión (ROI) por cada lote importado.
          </p>
        </div>
      </div>

      <RentabilidadLoteTable data={loteData} />
    </div>
  );
}
