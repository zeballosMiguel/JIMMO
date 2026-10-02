export type PeriodoFinanciero = "mes" | "hoy" | "semana" | "anio" | "todo" | "custom";

export function formatBs(monto: number): string {
  return "Bs " + monto.toLocaleString("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBsSinDecimales(monto: number): string {
  return "Bs " + Math.round(monto).toLocaleString("es-BO");
}

/** Formats a local Date to "YYYY-MM-DD" */
function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns ISO string representing start of a local day (00:00:00 local → UTC) */
function localDayStart(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
}

/** Returns ISO string representing end of a local day (23:59:59.999 local → UTC) */
function localDayEnd(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
}

const MESES_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function getRangoPeriodo(
  periodo: PeriodoFinanciero = "todo",
  desdeParam?: string,
  hastaParam?: string
) {
  const now = new Date();
  let desde: string | null = null;
  let hasta: string | null = null;
  let label = "Este mes";
  let sublabel = "";

  if (periodo === "hoy") {
    desde = localDayStart(now);
    hasta = localDayEnd(now);
    const d = String(now.getDate()).padStart(2, "0");
    const mes = MESES_ES[now.getMonth()];
    const y = now.getFullYear();
    label = "Hoy";
    sublabel = `${d} de ${mes} de ${y}`;
  } else if (periodo === "semana") {
    const day = now.getDay();
    const diffLunes = day === 0 ? -6 : 1 - day;
    const lunes = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffLunes);
    const domingo = new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() + 6);
    desde = localDayStart(lunes);
    hasta = localDayEnd(domingo);
    const dl = String(lunes.getDate()).padStart(2, "0");
    const ml = MESES_ES[lunes.getMonth()];
    const dd = String(domingo.getDate()).padStart(2, "0");
    const md = MESES_ES[domingo.getMonth()];
    label = "Esta semana";
    sublabel = `${dl} ${ml} — ${dd} ${md}`;
  } else if (periodo === "anio") {
    const y = now.getFullYear();
    const inicio = new Date(y, 0, 1);
    const fin = new Date(y, 11, 31);
    desde = localDayStart(inicio);
    hasta = localDayEnd(fin);
    label = `Año ${y}`;
    sublabel = `1 ene — 31 dic ${y}`;
  } else if (periodo === "todo") {
    desde = null;
    hasta = null;
    label = "Todo el histórico";
    sublabel = "Sin filtro de fecha";
  } else if (periodo === "custom" && desdeParam && hastaParam) {
    desde = localDayStart(new Date(`${desdeParam}T12:00:00`));
    hasta = localDayEnd(new Date(`${hastaParam}T12:00:00`));
    label = "Personalizado";
    sublabel = `${desdeParam} a ${hastaParam}`;
  } else {
    // Default: "mes"
    const y = now.getFullYear();
    const m = now.getMonth();
    const inicio = new Date(y, m, 1);
    const fin = new Date(y, m + 1, 0);
    desde = localDayStart(inicio);
    hasta = localDayEnd(fin);
    const mes = MESES_ES[m];
    label = "Este mes";
    sublabel = `${mes.charAt(0).toUpperCase() + mes.slice(1)} ${y}`;
  }

  return { desde, hasta, label, sublabel, periodo };
}
