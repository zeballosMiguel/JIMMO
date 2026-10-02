import { createClient } from "@/lib/supabase/server";
import { getPerfil } from "@/lib/auth/session";
import { NuevoPedidoForm } from "@/features/pedidos/components/nuevo-pedido-form";

export const metadata = { title: "Nuevo Pedido" };

export default async function NuevoPedidoPage() {
  const supabase = await createClient();
  const perfil = await getPerfil();

  const [
    { data: clientes },
    { data: vendedores },
    { data: sucursales },
    { data: canales },
    { data: tiposEntrega },
    { data: variantesRaw },
    { data: productosRaw },
    { data: categoriasRaw },
    { data: detalleLoteRaw },
  ] = await Promise.all([
    supabase.from("clientes").select("id, nombre, telefono, ciudad").eq("activo", true).order("nombre"),
    supabase.from("vendedores").select("id, nombre, perfil_id").eq("activo", true).order("nombre"),
    supabase.from("sucursales").select("id, nombre").eq("activa", true).order("nombre"),
    supabase.from("canales_venta").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("tipos_entrega").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("vw_inventario").select("*"),
    supabase.from("productos").select("id, nombre, codigo_interno, descripcion, categoria_id, categorias(id, nombre)").eq("activo", true).order("nombre"),
    supabase.from("categorias").select("id, nombre").order("nombre"),
    supabase.from("detalle_lote").select("variante_id, precio_detalle, costo_unitario_bs"),
  ]);

  // Vendedor actual
  const currentVendedor = vendedores?.find((v) => v.perfil_id === perfil?.id);

  // Mapeo de precios y costos recientes
  const priceMap = new Map<string, { precio: number; costo: number }>();
  (detalleLoteRaw || []).forEach((dl: any) => {
    if (dl.variante_id && !priceMap.has(dl.variante_id)) {
      priceMap.set(dl.variante_id, {
        precio: Number(dl.precio_detalle || 0),
        costo: Number(dl.costo_unitario_bs || 0),
      });
    }
  });

  const variantes = (variantesRaw || []).map((v: any) => {
    const pInfo = priceMap.get(v.variante_id);
    return {
      id: v.variante_id,
      producto_id: v.producto_id,
      sku: v.sku || "SKU-S/N",
      nombre_producto: v.producto || "Producto",
      color: v.color || "",
      talla: v.talla || "",
      precio_sugerido: pInfo?.precio && pInfo.precio > 0 ? pInfo.precio : 0,
      costo_unitario: pInfo?.costo || 0,
      stock_disponible: v.stock_disponible ?? 0,
    };
  });

  const productos = (productosRaw || []).map((p: any) => ({
    id: p.id,
    nombre: p.nombre,
    codigo_interno: p.codigo_interno,
    descripcion: p.descripcion,
    categoria_id: p.categoria_id,
    categorias: Array.isArray(p.categorias) ? p.categorias[0] ?? null : p.categorias ?? null,
  }));

  return (
    <div className="max-w-[1440px] mx-auto pb-12">
      <NuevoPedidoForm
        clientes={clientes || []}
        vendedores={vendedores || []}
        sucursales={sucursales || []}
        canales={canales || []}
        tiposEntrega={tiposEntrega || []}
        variantes={variantes}
        productos={productos}
        categorias={categoriasRaw || []}
        currentVendedorId={currentVendedor?.id}
        isAdmin={perfil?.rol === "admin"}
      />
    </div>
  );
}
