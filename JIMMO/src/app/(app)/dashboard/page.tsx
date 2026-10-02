import { getPerfil } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ShoppingCart,
  ArrowRight,
  DollarSign,
  Wallet,
  PiggyBank,
  ArrowUpRight,
} from "lucide-react";

export const metadata = { title: "Dashboard" };

async function getDashboardData() {
  const supabase = await createClient();

  // Auto-recibir lotes que llegaron a su fecha
  await supabase.rpc("auto_recibir_lotes_vencidos");

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    { count: totalPedidos },
    { count: totalClientes },
    { count: totalVariantes },
    { data: pedidosRecientes },
    { data: ventasMesData },
    { data: rentabilidadGlobal },
    { data: retirosGlobal },
  ] = await Promise.all([
    supabase
      .from("pedidos")
      .select("*", { count: "exact", head: true })
      .gte("created_at", inicioMes),
    supabase.from("clientes").select("*", { count: "exact", head: true }),
    supabase
      .from("variantes_producto")
      .select("*", { count: "exact", head: true })
      .eq("activa", true),
    supabase
      .from("vw_pedidos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("detalle_pedido")
      .select("subtotal, utilidad, pedidos!inner(estado, created_at)")
      .eq("activo", true)
      .eq("pedidos.estado", "COMPLETADO")
      .gte("pedidos.created_at", inicioMes),
    supabase
      .from("detalle_pedido")
      .select("costo_total, utilidad, pedidos!inner(estado, created_at)")
      .eq("activo", true)
      .eq("pedidos.estado", "COMPLETADO")
      .gte("pedidos.created_at", inicioMes),
    supabase
      .from("retiros")
      .select("monto, origen, created_at")
      .gte("created_at", inicioMes),
  ]);

  // Cálculo financiero
  const ventasMes = (ventasMesData ?? []).reduce((s, d) => s + Number(d.subtotal), 0);
  const utilidadMes = (ventasMesData ?? []).reduce((s, d) => s + Number(d.utilidad), 0);

  const capRecuperado = (rentabilidadGlobal ?? []).reduce((s, d) => s + Number(d.costo_total), 0);
  const utGenerada = (rentabilidadGlobal ?? []).reduce((s, d) => s + Number(d.utilidad), 0);
  const retCap = (retirosGlobal ?? []).filter((r) => r.origen === "CAPITAL").reduce((s, r) => s + Number(r.monto), 0);
  const retUt = (retirosGlobal ?? []).filter((r) => r.origen === "UTILIDAD").reduce((s, r) => s + Number(r.monto), 0);
  const totalRetiros = (retirosGlobal ?? []).reduce((s, r) => s + Number(r.monto), 0);

  // Fórmulas exactas:
  // Capital en caja = Capital recuperado − retiros de capital
  const capEnCaja = capRecuperado - retCap;

  // Utilidad en caja = Utilidad generada − retiros de utilidad
  const utEnCaja = utGenerada - retUt;

  // Dinero en caja = Capital recuperado + utilidad generada − retiros
  const dineroEnCaja = capRecuperado + utGenerada - totalRetiros;

  return {
    totalPedidos: totalPedidos ?? 0,
    totalClientes: totalClientes ?? 0,
    totalVariantes: totalVariantes ?? 0,
    pedidosRecientes: pedidosRecientes ?? [],
    ventasMes,
    utilidadMes,
    dineroEnCaja,
  };
}

const estadoBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  RESERVADO: "default",
  COMPLETADO: "outline",
  CANCELADO: "destructive",
};

export default async function DashboardPage() {
  const perfil = await getPerfil();
  const data = await getDashboardData();
  const isAdmin = perfil?.rol === "admin";



  return (
    <div className="space-y-6">
      {/* Header with JIMMO accent */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Resumen general y métricas clave de JIMMO.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/reportes"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm transition-colors shrink-0"
          >
            <span>Ver Reporte Financiero</span>
            <ArrowUpRight className="w-4 h-4 text-red-400" />
          </Link>
        )}
      </div>

      {/* KPI Summary Cards */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Dinero en Caja */}
          <Card className="border border-zinc-800 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-900 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Dinero en Caja Real
              </span>
              <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-red-500">
                <Wallet className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl lg:text-3xl font-black tracking-tight text-white tabular-nums">
                Bs {data.dineroEnCaja.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Capital + Utilidad disponible
              </p>
            </CardContent>
          </Card>

          {/* Ventas del Mes */}
          <Card className="border border-border shadow-xs hover:border-zinc-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Ventas del Mes
              </span>
              <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900">
                <DollarSign className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold text-foreground tracking-tight tabular-nums">
                Bs {data.ventasMes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total facturado en pedidos completados
              </p>
            </CardContent>
          </Card>

          {/* Utilidad del Mes */}
          <Card className="border border-border shadow-xs hover:border-zinc-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Utilidad Neta del Mes
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <PiggyBank className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold text-red-600 tracking-tight tabular-nums">
                Bs {data.utilidadMes.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ganancia neta generada este mes
              </p>
            </CardContent>
          </Card>

          {/* Pedidos del Mes */}
          <Card className="border border-border shadow-xs hover:border-zinc-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pedidos del Mes
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold text-foreground tracking-tight tabular-nums">
                {data.totalPedidos}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total registrados este mes
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border border-border shadow-xs hover:border-zinc-300 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Pedidos del Mes
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-extrabold text-foreground tracking-tight tabular-nums">
                {data.totalPedidos}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Total registrados este mes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent orders */}
      <Card className="border border-border shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Pedidos Recientes</CardTitle>
            <p className="text-xs text-muted-foreground">Últimos movimientos registrados en el sistema.</p>
          </div>
          <Link
            href="/pedidos"
            className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          {data.pedidosRecientes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay pedidos registrados aún.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {data.pedidosRecientes.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3 hover:bg-zinc-50/50 px-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-zinc-900 bg-zinc-100 px-2 py-1 rounded border border-zinc-200">
                      #{p.numero}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {p.cliente ?? "Cliente Ocasional"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        Vendido por: <span className="text-foreground font-medium">{p.vendedor}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-extrabold text-foreground tabular-nums">
                      Bs {Number(p.total).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </span>
                    <Badge variant={estadoBadgeVariant[p.estado] ?? "secondary"}>
                      {p.estado}
                    </Badge>
                    <Link
                      href={`/pedidos/${p.id}`}
                      className="text-xs text-muted-foreground hover:text-red-600 font-medium ml-1"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
