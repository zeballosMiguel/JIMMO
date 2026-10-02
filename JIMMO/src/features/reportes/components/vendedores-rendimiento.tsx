import { formatBsSinDecimales } from "../lib/date-utils";

export interface VendedorRendimientoItem {
  id: string;
  nombre: string;
  utilidad: number;
  comision: number;
  pedidosCount: number;
  porcentaje: number;
}

export function VendedoresRendimiento({
  vendedores,
}: {
  vendedores: VendedorRendimientoItem[];
}) {
  const barColors = [
    "bg-red-600",
    "bg-zinc-900 dark:bg-zinc-100",
    "bg-zinc-500",
    "bg-zinc-400",
  ];

  function getInitials(name: string) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-red-600 rounded-full" />
          <h2 className="text-sm font-bold tracking-tight uppercase">
            Utilidad Generada por Vendedor
          </h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Indicador de Rendimiento
        </span>
      </div>

      {vendedores.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No hay ventas registradas por vendedores en este período.
        </p>
      ) : (
        <div className="space-y-4 pt-1">
          {vendedores.map((v, index) => {
            const color = barColors[index % barColors.length];
            return (
              <div key={v.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-zinc-800 text-white flex items-center justify-center text-xs font-bold shrink-0 font-mono">
                      {getInitials(v.nombre)}
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-semibold text-foreground block">
                        {v.nombre}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {v.pedidosCount} {v.pedidosCount === 1 ? "pedido" : "pedidos"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-bold text-red-600 block">
                      {formatBsSinDecimales(v.utilidad)}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {v.porcentaje.toFixed(1)}% del total
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden flex items-center">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${Math.min(100, Math.max(3, v.porcentaje))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
