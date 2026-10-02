import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

import { EditarClienteDialog } from "@/features/clientes/editar-cliente-dialog";
import { ClienteEliminarButton } from "@/features/clientes/cliente-eliminar-button";

export const metadata = { title: "Clientes" };

const estadoBadge: Record<string, "default" | "secondary"> = {
  true: "default",
  false: "secondary",
};

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {clientes?.length ?? 0} clientes registrados.
          </p>
        </div>
        <Link href="/clientes/nuevo" id="crear-cliente-btn" className={buttonVariants({ variant: "default" })}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo cliente
        </Link>
      </div>

      {/* Search */}
      <form className="flex gap-3">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, teléfono o ciudad..."
          className="flex h-9 w-80 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          id="clientes-search"
        />
        <Button type="submit" variant="outline" size="sm">Buscar</Button>
      </form>

      <div className="rounded-lg border border-border overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-center">Cant. Pedidos</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!clientes?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay clientes registrados.
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((c) => {
                const cantPedidos = Array.isArray(c.pedidos) ? c.pedidos.length : 0;
                return (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-foreground">{c.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{c.telefono ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.ciudad ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-bold font-mono">
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
