import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { VarianteDialog, EditarVarianteDialog } from "@/features/catalogos/components/variante-dialog";
import { VarianteEliminarButton } from "@/features/catalogos/components/variante-eliminar-button";
import { ProductoTodoEnUnoDialog } from "@/features/catalogos/components/producto-todo-en-uno-dialog";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Variantes / SKU" };

export default async function VariantesPage() {
  const supabase = await createClient();
  const [{ data: variantes }, { data: productos }, { data: categorias }] = await Promise.all([
    supabase.from("variantes_producto").select("*, productos(nombre, codigo_interno)").order("created_at", { ascending: false }),
    supabase.from("productos").select("id, nombre, codigo_interno").eq("activo", true).order("nombre"),
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
            <h1 className="text-2xl font-bold tracking-tight">Variantes / SKU</h1>
            <p className="text-sm text-muted-foreground">
              {variantes?.length ?? 0} variantes configuradas.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProductoTodoEnUnoDialog categorias={categorias || []} />
          <VarianteDialog productos={productos || []} />
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto Base</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Talla</TableHead>
              <TableHead>Stock Mínimo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!variantes?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No hay variantes o SKUs registrados todavía.
                </TableCell>
              </TableRow>
            ) : (
              variantes.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs font-semibold">{v.sku || "—"}</TableCell>
                  <TableCell className="font-medium">{v.productos?.nombre}</TableCell>
                  <TableCell>{v.color || "—"}</TableCell>
                  <TableCell>{v.talla || "—"}</TableCell>
                  <TableCell>{v.stock_minimo ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EditarVarianteDialog variante={v} productos={productos || []} />
                      <VarianteEliminarButton id={v.id} sku={v.sku || `${v.productos?.nombre || ""} ${v.color}`} />
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
