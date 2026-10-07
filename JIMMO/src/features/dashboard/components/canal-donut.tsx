"use client";

interface CanalData {
  nombre: string;
  cantidad: number;
  pct: number;
}

// Paleta de colores: negro/zinc dominante + acentos de color
const COLORS = [
  "#18181b", // zinc-900
  "#71717a", // zinc-500
  "#a1a1aa", // zinc-400
  "#d4d4d8", // zinc-300
  "#e4e4e7", // zinc-200
  "#f4f4f5", // zinc-100
];

interface DonutSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  largeArc: number;
  color: string;
  pct: number;
  nombre: string;
  cantidad: number;
  startAngle: number;
  endAngle: number;
}

function buildSegments(canales: CanalData[]): DonutSegment[] {
  const cx = 80;
  const cy = 80;
  const r = 62;
  const gap = 0.03;

  const total = canales.reduce((s, c) => s + c.cantidad, 0);
  if (total === 0) return [];

  let angle = -Math.PI / 2;
  return canales.map((canal, i) => {
    const fraction = canal.cantidad / total;
    const sweep = fraction * 2 * Math.PI - gap;
    const startAngle = angle + gap / 2;
    const endAngle = startAngle + sweep;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sweep > Math.PI ? 1 : 0;

    angle += fraction * 2 * Math.PI;

    return {
      x1, y1, x2, y2,
      largeArc,
      color: COLORS[i % COLORS.length],
      pct: canal.pct,
      nombre: canal.nombre,
      cantidad: canal.cantidad,
      startAngle,
      endAngle,
    };
  });
}

export function CanalDonut({ canales }: { canales: CanalData[] }) {
  const segments = buildSegments(canales);
  const total = canales.reduce((s, c) => s + c.cantidad, 0);
  const cx = 80;
  const cy = 80;
  const outerR = 62;
  const innerR = 40;

  return (
    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
      {/* Donut SVG */}
      <div className="relative shrink-0">
        <svg width={160} height={160} viewBox="0 0 160 160">
          {segments.map((seg, i) => {
            const path = [
              `M ${seg.x1} ${seg.y1}`,
              `A ${outerR} ${outerR} 0 ${seg.largeArc} 1 ${seg.x2} ${seg.y2}`,
              `L ${cx + innerR * Math.cos(seg.endAngle)} ${cy + innerR * Math.sin(seg.endAngle)}`,
              `A ${innerR} ${innerR} 0 ${seg.largeArc} 0 ${cx + innerR * Math.cos(seg.startAngle)} ${cy + innerR * Math.sin(seg.startAngle)}`,
              "Z",
            ].join(" ");

            return (
              <path
                key={i}
                d={path}
                fill={seg.color}
                className="transition-opacity hover:opacity-80 cursor-default"
              />
            );
          })}
          {/* Center label */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 18, fontWeight: 800, fontFamily: "inherit" }}
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9, fontWeight: 500, fontFamily: "inherit" }}
          >
            pedidos
          </text>
        </svg>
      </div>

      {/* Leyenda */}
      <div className="flex flex-col gap-2.5 w-full min-w-0">
        {canales.map((canal, i) => (
          <div key={canal.nombre} className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs text-foreground font-medium truncate flex-1 min-w-0">
              {canal.nombre}
            </span>
            <div className="flex flex-col items-end shrink-0 leading-tight">
              <span className="text-xs font-bold text-foreground tabular-nums">
                {canal.pct}%
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {canal.cantidad} ped.
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
