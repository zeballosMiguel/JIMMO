import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatBs } from "../lib/date-utils";
import { Shirt, Tag, Box } from "lucide-react";

export interface ProductoEstadoItem {
  id: string;
  nombre: string;
  categoria?: string | null;
  capital: number;
  utilidad: number;
  enCaja: number;
}

export function ProductosEstadoTable({
  productos,
  totalCapital,
  totalUtilidad,
  totalEnCaja,
}: {
  productos: ProductoEstadoItem[];
  totalCapital: number;
  totalUtilidad: number;
  totalEnCaja: number;
}) {
  const icons = [Shirt, Tag, Box];

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 bg-red-600 rounded-full" />
          <h2 className="text-sm font-bold tracking-tight uppercase">
            Estado por Producto
          </h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {productos.length} {productos.length === 1 ? "artículo auditado" : "artículos auditados"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <TableHead className="w-[40%]">Producto</TableHead>
              <TableHead className="text-right">Capital</TableHead>
              <TableHead className="text-right">Utilidad</TableHead>
              <TableHead className="text-right">En Caja</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8 text-xs">
                  No hay productos con ventas completadas en este período.
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p, idx) => {
                const IconComponent = icons[idx % icons.length];
                return (
                  <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {p.nombre}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {p.categoria ?? "Colección Activa"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs sm:text-sm tabular-nums text-foreground">
                      {formatBs(p.capital)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs sm:text-sm tabular-nums text-red-600">
                      {formatBs(p.utilidad)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs sm:text-sm tabular-nums text-foreground">
                      {formatBs(p.enCaja)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}

            {/* Total consolidado footer row */}
            {productos.length > 0 && (
              <TableRow className="bg-muted/30 font-bold border-t-2 border-border">
                <TableCell className="text-xs uppercase tracking-wider text-foreground">
                  Total Consolidado
                </TableCell>
                <TableCell className="text-right font-bold text-xs sm:text-sm tabular-nums text-foreground">
                  {formatBs(totalCapital)}
                </TableCell>
                <TableCell className="text-right font-black text-xs sm:text-sm tabular-nums text-red-600">
                  {formatBs(totalUtilidad)}
                </TableCell>
                <TableCell className="text-right font-bold text-xs sm:text-sm tabular-nums text-foreground">
                  {formatBs(totalEnCaja)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
