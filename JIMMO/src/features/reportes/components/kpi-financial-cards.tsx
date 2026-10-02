import { TrendingUp, Landmark, ShoppingBag, Wallet, PlusCircle, MinusCircle, Clock, ArrowDownRight } from "lucide-react";
import { formatBs, formatBsSinDecimales } from "../lib/date-utils";

interface FinancialMetrics {
  // Period metrics
  ventasPeriodo: number;
  utilidadPeriodo: number;
  capitalPeriodo: number;
  margenUtilidadPct: number;
  capitalRetornoPct: number;

  // Real cash box metrics (All-time)
  dineroEnCaja: number;
  capitalEnCaja: number;
  utilidadEnCaja: number;
  capitalEnCajaPct: number;
  utilidadEnCajaPct: number;

  // Gains state (period or all-time)
  utilidadGenerada: number;
  utilidadRetirada: number;
  utilidadPendiente: number;

  // Withdrawals breakdown (period)
  retirosCapital: number;
  retirosUtilidad: number;
  totalRetiros: number;
}

export function KpiFinancialCards({ data }: { data: FinancialMetrics }) {
  return (
    <div className="space-y-6">
      {/* ── Top 3 KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Ventas (Dark) */}
        <div className="bg-zinc-950 text-white border border-zinc-900 rounded-2xl p-5 shadow-md flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Ventas
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-300">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-zinc-400 font-medium">Monto bruto registrado</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-white">
              {formatBsSinDecimales(data.ventasPeriodo)}
            </p>
          </div>
        </div>

        {/* Card 2: Utilidad */}
        <div className="bg-card text-foreground border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between relative">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Utilidad
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground font-medium">Margen neto acumulado</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-red-600">
              {formatBsSinDecimales(data.utilidadPeriodo)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              {data.margenUtilidadPct.toFixed(2)}% sobre ventas totales
            </p>
          </div>
        </div>

        {/* Card 3: Capital Recuperado */}
        <div className="bg-card text-foreground border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between relative">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Capital Recuperado
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground font-medium">Costo base retornado</p>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-foreground">
              {formatBsSinDecimales(data.capitalPeriodo)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
              {data.capitalRetornoPct.toFixed(2)}% de reinversión en inventario
            </p>
          </div>
        </div>
      </div>

      {/* ── Hero Card: Dinero en Caja ─────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xs text-center flex flex-col items-center relative overflow-hidden">
        {/* Subtle top indicator */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 text-xs font-bold tracking-wider uppercase mb-2">
          <Wallet className="w-3.5 h-3.5" />
          Dinero en Caja
        </div>

        {/* Big Amount */}
        <div className="my-2">
          <span className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            {formatBs(data.dineroEnCaja)}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
          Disponibilidad total líquida en bóveda y cuentas operativas
        </p>

        {/* Two split pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mt-6">
          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border">
            <div className="flex items-center gap-2 text-left">
              <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Capital en Caja
                </p>
                <p className="text-base font-bold text-foreground">
                  {formatBs(data.capitalEnCaja)}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-background border border-border text-muted-foreground">
              {data.capitalEnCajaPct.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-xl border border-border">
            <div className="flex items-center gap-2 text-left">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Utilidad en Caja
                </p>
                <p className="text-base font-bold text-red-600">
                  {formatBs(data.utilidadEnCaja)}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600">
              {data.utilidadEnCajaPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Two Middle Cards: Utilidad & Retiros ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Utilidad (Estado de Ganancias) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-red-600 rounded-full" />
              <h2 className="text-sm font-bold tracking-tight uppercase">Utilidad</h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Estado de Ganancias
            </span>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Generada</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {formatBsSinDecimales(data.utilidadGenerada)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <MinusCircle className="w-4 h-4 text-red-600" />
                <span>Retirada</span>
              </div>
              <span className="text-sm font-bold text-red-600">
                {formatBsSinDecimales(data.utilidadRetirada)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Pendiente</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {formatBsSinDecimales(data.utilidadPendiente)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Retiros (Flujo de Salida) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
              <h2 className="text-sm font-bold tracking-tight uppercase">Retiros</h2>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Flujo de Salida
            </span>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Landmark className="w-4 h-4 text-zinc-500" />
                <span>Capital</span>
              </div>
              <span className="text-sm font-bold text-foreground">
                {formatBsSinDecimales(data.retirosCapital)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <ArrowDownRight className="w-4 h-4 text-red-600" />
                <span>Utilidad</span>
              </div>
              <span className="text-sm font-bold text-red-600">
                {formatBsSinDecimales(data.retirosUtilidad)}
              </span>
            </div>

            {/* Total retiros dark bar */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 text-white font-bold">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-300">
                <Wallet className="w-4 h-4" />
                <span>Total</span>
              </div>
              <span className="text-base text-white">
                {formatBsSinDecimales(data.totalRetiros)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
