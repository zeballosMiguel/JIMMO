import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { RetirosStats } from "@/features/retiros/components/retiros-stats";
import { RetirosFilters } from "@/features/retiros/components/retiros-filters";
import { RetirosTable, type RetiroRow } from "@/features/retiros/components/retiros-table";
import { NuevoRetiroDialog } from "@/features/retiros/components/nuevo-retiro-dialog";
import { RefreshButton } from "@/components/ui/refresh-button";
import { Suspense } from "react";

export const metadata = { title: "Retiros" };

interface Props {
  searchParams: Promise<{
    desde?: string;
    hasta?: string;
    origen?: string;
    persona?: string;
    buscar?: string;
  }>;
}

export default async function RetirosPage({ searchParams }: Props) {
  await requireAdmin();

  const sp = await searchParams;
  const supabase = await createClient();

  // ── Fetch retiros with joins ──────────────────────────────
  let query = supabase
    .from("retiros")
    .select("*, inversionistas(nombre), vendedores(nombre)")
    .order("fecha", { ascending: false });

  // Apply filters
  if (sp.desde) {
    query = query.gte("fecha", `${sp.desde}T00:00:00`);
  }
  if (sp.hasta) {
    query = query.lte("fecha", `${sp.hasta}T23:59:59`);
  }
  if (sp.origen === "CAPITAL" || sp.origen === "UTILIDAD") {
    query = query.eq("origen", sp.origen);
  }
  if (sp.persona) {
    const [tipo, id] = sp.persona.split(":");
    if (tipo === "inversionista" && id) {
      query = query.eq("inversionista_id", id);
    } else if (tipo === "vendedor" && id) {
      query = query.eq("vendedor_id", id);
    }
  }
  if (sp.buscar) {
    query = query.ilike("descripcion", `%${sp.buscar}%`);
  }

  const { data: retiros } = await query;

  // ── Map retiros to table rows ─────────────────────────────
  const rows: RetiroRow[] = (retiros ?? []).map((r) => {
    const inv = r.inversionistas as { nombre: string } | null;
    const vend = r.vendedores as { nombre: string } | null;
    return {
      id: r.id,
      fecha: r.fecha,
      monto: Number(r.monto),
      origen: r.origen as "CAPITAL" | "UTILIDAD",
      descripcion: r.descripcion,
      destinatario: inv?.nombre ?? vend?.nombre ?? "—",
      tipo_destinatario: inv ? "inversionista" : "vendedor",
    };
  });

  // ── Calculate stats from filtered data ────────────────────
  const totalRetiros = rows.reduce((sum, r) => sum + r.monto, 0);
  const retirosCapital = rows.filter((r) => r.origen === "CAPITAL").reduce((s, r) => s + r.monto, 0);
  const retirosUtilidad = rows.filter((r) => r.origen === "UTILIDAD").reduce((s, r) => s + r.monto, 0);
  const cantidadCapital = rows.filter((r) => r.origen === "CAPITAL").length;
  const cantidadUtilidad = rows.filter((r) => r.origen === "UTILIDAD").length;

  // ── Calculate saldo disponible (ALL-TIME, not filtered) ───
  // Capital recuperado = sum costo_total from detalle_pedido where pedido completado
  // Utilidad generada = sum utilidad from detalle_pedido where pedido completado
  const { data: rentabilidad } = await supabase
    .from("detalle_pedido")
    .select("costo_total, utilidad, pedidos!inner(estado)")
    .eq("activo", true)
    .eq("pedidos.estado", "COMPLETADO");

  const capitalRecuperado = (rentabilidad ?? []).reduce(
    (sum, d) => sum + Number(d.costo_total ?? 0),
    0
  );
  const utilidadGenerada = (rentabilidad ?? []).reduce(
    (sum, d) => sum + Number(d.utilidad ?? 0),
    0
  );

  // ALL retiros (unfiltered) for saldo calculation
  const { data: todosRetiros } = await supabase
    .from("retiros")
    .select("monto, origen");

  const totalRetirosCapitalGlobal = (todosRetiros ?? [])
    .filter((r) => r.origen === "CAPITAL")
    .reduce((s, r) => s + Number(r.monto), 0);
  const totalRetirosUtilidadGlobal = (todosRetiros ?? [])
    .filter((r) => r.origen === "UTILIDAD")
    .reduce((s, r) => s + Number(r.monto), 0);

  const capitalEnCaja = capitalRecuperado - totalRetirosCapitalGlobal;
  const utilidadEnCaja = utilidadGenerada - totalRetirosUtilidadGlobal;
  const saldoDisponible = capitalEnCaja + utilidadEnCaja;

  // ── Fetch personas for filters + dialog ───────────────────
  const [{ data: inversionistas }, { data: vendedores }] = await Promise.all([
    supabase.from("inversionistas").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("vendedores").select("id, nombre").eq("activo", true).order("nombre"),
  ]);

  const personas = [
    ...(inversionistas ?? []).map((i) => ({ id: i.id, nombre: i.nombre, tipo: "inversionista" as const })),
    ...(vendedores ?? []).map((v) => ({ id: v.id, nombre: v.nombre, tipo: "vendedor" as const })),
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Retiros</h1>
            <RefreshButton />
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Gestión de egresos, retiros de capital y utilidad.
          </p>
        </div>
        <NuevoRetiroDialog
          inversionistas={inversionistas ?? []}
          vendedores={vendedores ?? []}
        />
      </div>

      {/* Stats Cards */}
      <RetirosStats
        totalRetiros={totalRetiros}
        cantidadRetiros={rows.length}
        retirosCapital={retirosCapital}
        cantidadCapital={cantidadCapital}
        retirosUtilidad={retirosUtilidad}
        cantidadUtilidad={cantidadUtilidad}
        saldoDisponible={saldoDisponible}
        capitalEnCaja={capitalEnCaja}
        utilidadEnCaja={utilidadEnCaja}
      />

      {/* Filters */}
      <Suspense>
        <RetirosFilters personas={personas} />
      </Suspense>

      {/* Table */}
      <RetirosTable retiros={rows} sumaFiltrada={totalRetiros} />
    </div>
  );
}
