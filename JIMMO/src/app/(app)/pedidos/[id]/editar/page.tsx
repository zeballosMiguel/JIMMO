import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { EditarPedidoForm } from "@/features/pedidos/components/editar-pedido-form";
import { getPerfil } from "@/lib/auth/session";

export const metadata = { title: "Editar Pedido" };

export default async function EditarPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    perfil,
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
    getPerfil(),
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

  const esAdmin = perfil?.rol === "admin";
  const esCompletado = pedido.estado === "COMPLETADO";

  // Solo RESERVADO o (COMPLETADO + admin)
  if (pedido.estado !== "RESERVADO" && !(esCompletado && esAdmin)) {
    redirect(`/pedidos/${id}`);
  }

  // Para pedidos COMPLETADOS, ajustamos el stock disponible sumando
  // la cantidad actual del pedido (esas unidades "vuelven" al editar)
  const cantidadesPedido = new Map<string, number>();
  if (esCompletado && detalles) {
    for (const d of detalles) {
      const prev = cantidadesPedido.get(d.variante_id) ?? 0;
      cantidadesPedido.set(d.variante_id, prev + d.cantidad);
    }
  }

  const variantes = (variantesRaw || []).map((v: any) => ({
    id: v.variante_id,
    producto_id: v.producto_id,
    sku: v.sku,
    nombre_producto: v.producto,
    color: v.color,
    talla: v.talla,
    precio_sugerido: v.precio_sugerido,
    // Para COMPLETADO: mostrar stock_disponible + lo que ya tiene este pedido
    stock_disponible:
      (v.stock_disponible ?? 0) +
      (esCompletado ? (cantidadesPedido.get(v.variante_id) ?? 0) : 0),
  }));

  const initialItems = (detalles || []).map((d) => ({
    variante_id: d.variante_id,
    cantidad: d.cantidad,
    precio_unitario: Number(d.precio_unitario),
  }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {esCompletado && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
          <strong>⚠️ Editando venta completada #{pedido.numero}.</strong> Al guardar, el sistema revertirá
          el stock actual, recalculará utilidades, repartos e inventario con los nuevos productos
          seleccionados. Los pagos existentes NO se modificarán.
        </div>
      )}
      <EditarPedidoForm
        pedido={pedido}
        initialItems={initialItems}
        clientes={clientes || []}
        vendedores={vendedores || []}
        sucursales={sucursales || []}
        canales={canales || []}
        tiposEntrega={tiposEntrega || []}
        variantes={variantes}
        productos={(productos || []) as any}
        categorias={categorias || []}
        esCompletado={esCompletado}
      />
    </div>
  );
}
