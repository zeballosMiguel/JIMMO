import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductoDialog, EditarProductoDialog } from "@/features/catalogos/components/producto-dialog";
import { ProductoEliminarButton } from "@/features/catalogos/components/producto-eliminar-button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Productos" };

export default async function ProductosPage() {
  const supabase = await createClient();
  const [{ data: productos }, { data: categorias }] = await Promise.all([
    supabase.from("productos").select("*, categorias(nombre)").order("nombre"),
    supabase.from("categorias").select("id, nombre").order("nombre"),
  ]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/catalogos" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
            <p className="text-sm text-muted-foreground">
              {productos?.length ?? 0} productos registrados.
            </p>
          </div>
        </div>
        <ProductoDialog categorias={categorias || []} />
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!productos?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No hay productos registrados todavía.
                </TableCell>
              </TableRow>
            ) : (
              productos.map((prod: any) => (
                <TableRow key={prod.id}>
                  <TableCell className="font-mono text-xs font-semibold">{prod.codigo_interno}</TableCell>
                  <TableCell className="font-medium">{prod.nombre}</TableCell>
                  <TableCell>{prod.categorias?.nombre || "Sin categoría"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditarProductoDialog producto={prod} categorias={categorias || []} />
                      <ProductoEliminarButton id={prod.id} nombre={prod.nombre} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
