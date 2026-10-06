import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";

import { EditarClienteDialog } from "@/features/clientes/editar-cliente-dialog";
import { ClienteEliminarButton } from "@/features/clientes/cliente-eliminar-button";

import { RefreshButton } from "@/components/ui/refresh-button";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("clientes")
    .select("*, pedidos(id)")
    .order("nombre");

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,telefono.ilike.%${q}%,ciudad.ilike.%${q}%`);
  }

  const { data: clientes } = await query;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h1>
            <RefreshButton />
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {clientes?.length ?? 0} clientes registrados en el sistema.
          </p>
        </div>
        <Link href="/clientes/nuevo" id="crear-cliente-btn" className={buttonVariants({ variant: "default" })}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo cliente
        </Link>
      </div>

      {/* Buscador estilo Lotes */}
      <form className="flex items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, teléfono o ciudad..."
            className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            id="clientes-search"
          />
        </div>
        {q && (
          <Link
            href="/clientes"
            className="text-xs text-muted-foreground hover:text-foreground font-medium shrink-0"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Tabla */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nombre</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Teléfono</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ciudad</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Cant. Pedidos</TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!clientes?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  <Users className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    {q ? `Sin resultados para "${q}"` : "No hay clientes registrados."}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((c) => {
                const cantPedidos = Array.isArray(c.pedidos) ? c.pedidos.length : 0;
                return (
                  <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-semibold text-foreground">{c.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.telefono ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.ciudad ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold font-mono text-[11px]">
                        {cantPedidos} {cantPedidos === 1 ? "pedido" : "pedidos"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/clientes/${c.id}`} id={`cliente-ver-${c.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Ver</Link>
                        <EditarClienteDialog cliente={c} iconOnly />
                        <ClienteEliminarButton id={c.id} nombre={c.nombre} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
