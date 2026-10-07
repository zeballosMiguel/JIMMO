import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { EditarPedidoForm } from "@/features/pedidos/components/editar-pedido-form";

export const metadata = { title: "Editar Pedido" };

export default async function EditarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: pedido },
    { data: detalles },
    { data: clientes },
    { data: vendedores },
    { data: sucursales },
    { data: canales },
    { data: tiposEntrega },
    { data: variantesRaw },
    { data: productos },
    { data: categorias },
  ] = await Promise.all([
    supabase.from("pedidos").select("*").eq("id", id).single(),
    supabase.from("detalle_pedido").select("*").eq("pedido_id", id).eq("activo", true),
    supabase.from("clientes").select("id, nombre, telefono, ciudad").eq("activo", true).order("nombre"),
    supabase.from("vendedores").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("canales_venta").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("tipos_entrega").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("vw_inventario").select("*"),
    supabase.from("productos").select("id, nombre, codigo_interno, descripcion, categorias(nombre)").eq("activo", true),
    supabase.from("categorias").select("id, nombre").order("nombre"),
  ]);

  if (!pedido) notFound();

  // Solo se pueden editar pedidos en estado RESERVADO
  if (pedido.estado !== "RESERVADO") {
    redirect(`/pedidos/${id}`);
  }

  const variantes = (variantesRaw || []).map((v: any) => ({
    id: v.variante_id,
    producto_id: v.producto_id,
    sku: v.sku,
    nombre_producto: v.producto,
    color: v.color,
    talla: v.talla,
    precio_sugerido: v.precio_sugerido,
    stock_disponible: v.stock_disponible ?? 0,
  }));

  const initialItems = (detalles || []).map((d) => ({
    variante_id: d.variante_id,
    cantidad: d.cantidad,
    precio_unitario: Number(d.precio_unitario),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <EditarPedidoForm
        pedido={pedido}
        initialItems={initialItems}
        clientes={clientes || []}
        vendedores={vendedores || []}
        sucursales={sucursales || []}
        canales={canales || []}
        tiposEntrega={tiposEntrega || []}
        variantes={variantes}
        productos={productos || []}
        categorias={categorias || []}
      />
    </div>
  );
}
