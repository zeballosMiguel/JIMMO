"use client";

import { TrendingDown, TrendingUp, Wallet, Landmark } from "lucide-react";

interface RetirosStatsProps {
  totalRetiros: number;
  cantidadRetiros: number;
  retirosCapital: number;
  cantidadCapital: number;
  retirosUtilidad: number;
  cantidadUtilidad: number;
  saldoDisponible: number;
  capitalEnCaja: number;
  utilidadEnCaja: number;
}

function formatBs(value: number) {
  return Number(value).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function RetirosStats({
  totalRetiros,
  cantidadRetiros,
  retirosCapital,
  cantidadCapital,
  retirosUtilidad,
  cantidadUtilidad,
  saldoDisponible,
  capitalEnCaja,
  utilidadEnCaja,
}: RetirosStatsProps) {
  const pctCapital = totalRetiros > 0 ? ((retirosCapital / totalRetiros) * 100).toFixed(1) : "0";
  const pctUtilidad = totalRetiros > 0 ? ((retirosUtilidad / totalRetiros) * 100).toFixed(1) : "0";

  const cards = [
    {
      label: "TOTAL RETIROS DEL MES",
      value: totalRetiros,
      sub: `${cantidadRetiros} egreso${cantidadRetiros !== 1 ? "s" : ""} registrado${cantidadRetiros !== 1 ? "s" : ""}`,
      icon: TrendingDown,
      accent: "text-red-600",
      iconBg: "bg-red-50 border-red-100 text-red-600",
      badge: null,
    },
    {
      label: "RETIROS DE CAPITAL",
      value: retirosCapital,
      sub: `${cantidadCapital} registro${cantidadCapital !== 1 ? "s" : ""}`,
      icon: Wallet,
      accent: "text-amber-600",
      iconBg: "bg-amber-50 border-amber-100 text-amber-600",
      badge: `${pctCapital}% del total`,
    },
    {
      label: "RETIROS DE UTILIDAD",
      value: retirosUtilidad,
      sub: `${cantidadUtilidad} retiro${cantidadUtilidad !== 1 ? "s" : ""}`,
      icon: TrendingUp,
      accent: "text-violet-600",
      iconBg: "bg-violet-50 border-violet-100 text-violet-600",
      badge: `${pctUtilidad}% del total`,
    },
    {
      label: "SALDO DISPONIBLE ACTUAL",
      value: saldoDisponible,
      sub: `Capital: Bs ${formatBs(capitalEnCaja)} · Utilidad: Bs ${formatBs(utilidadEnCaja)}`,
      icon: Landmark,
      accent: saldoDisponible >= 0 ? "text-emerald-600" : "text-red-600",
      iconBg: saldoDisponible >= 0
        ? "bg-emerald-50 border-emerald-100 text-emerald-600"
        : "bg-red-50 border-red-100 text-red-600",
      badge: saldoDisponible >= 0 ? "Óptimo" : "Déficit",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`px-5 py-5 rounded-xl border-2 border-border bg-card shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-600 transition-all overflow-hidden relative`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
              {c.label}
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${c.iconBg}`}
            >
              <c.icon className="w-4 h-4" aria-hidden="true" />
            </div>
          </div>

          {/* Value */}
          <p className={`text-2xl font-extrabold tracking-tight tabular-nums ${c.accent}`}>
            Bs {formatBs(c.value)}
          </p>

          {/* Sub line */}
          <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{c.sub}</p>

          {/* Badge */}
          {c.badge && (
            <span className="absolute top-5 right-14 text-[10px] font-semibold text-muted-foreground bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-1.5 py-0.5 rounded">
              {c.badge}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
