"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MetodoPago } from "@/lib/supabase/types";

// ─── Crear pedido ─────────────────────────────────────────────
const itemSchema = z.object({
  variante_id: z.string().uuid(),
  cantidad: z.coerce.number().int().positive(),
  precio_unitario: z.coerce.number().min(0),
});

const crearPedidoSchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  vendedor_id: z.string().uuid(),
  sucursal_id: z.string().uuid().nullable().optional(),
  canal_id: z.string().uuid().nullable().optional(),
  tipo_entrega_id: z.string().uuid().nullable().optional(),
  reservar_stock: z.coerce.boolean().default(true), // true = RESERVADO con adelanto, false = COMPLETADO venta directa
  monto_reserva: z.coerce.number().min(0).default(0),
  metodo_pago: z.string().default("EFECTIVO"),
  referencia_pago: z.string().optional().nullable(),
  lugar_entrega: z.string().optional().nullable(),
  lugar_envio: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1, "Debe agregar al menos un producto"),
});

export async function crearPedido(data: {
  cliente_id?: string | null;
  vendedor_id: string;
  sucursal_id?: string | null;
  canal_id?: string | null;
  tipo_entrega_id?: string | null;
  reservar_stock?: boolean;
  monto_reserva?: number;
  metodo_pago?: string;
  referencia_pago?: string | null;
  lugar_entrega?: string | null;
  lugar_envio?: string | null;
  notas?: string | null;
  items: { variante_id: string; cantidad: number; precio_unitario: number }[];
}) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const parsed = crearPedidoSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: pedidoId, error } = await supabase.rpc("crear_pedido" as any, {
    p_cliente_id: parsed.data.cliente_id ?? null,
    p_vendedor_id: parsed.data.vendedor_id,
    p_sucursal_id: parsed.data.sucursal_id ?? null,
    p_canal_id: parsed.data.canal_id ?? null,
    p_tipo_entrega_id: parsed.data.tipo_entrega_id ?? null,
    p_items: parsed.data.items,
    p_reservar_stock: parsed.data.reservar_stock,
    p_monto_reserva: parsed.data.monto_reserva,
    p_lugar_entrega: parsed.data.lugar_entrega ?? null,
    p_lugar_envio: parsed.data.lugar_envio ?? null,
    p_notas: parsed.data.notas ?? null,
    p_metodo_pago: parsed.data.metodo_pago,
    p_referencia_pago: parsed.data.referencia_pago ?? null,
  });
  if (error) return { error: error.message };

  // Crear entrega automática para envíos por flota o paquetería local (no en tienda)
  if (parsed.data.tipo_entrega_id && pedidoId) {
    try {
      const { data: tipoEntrega } = await supabase
        .from("tipos_entrega")
        .select("nombre")
        .eq("id", parsed.data.tipo_entrega_id)
        .single();

      const nombreTipo = (tipoEntrega?.nombre || "").toLowerCase();
      const esEnTienda = nombreTipo.includes("tienda");

      if (!esEnTienda) {
        const destino = parsed.data.lugar_envio || parsed.data.lugar_entrega || "";
        const detalleNotas = [
          tipoEntrega?.nombre ? `Modalidad: ${tipoEntrega.nombre}` : null,
          destino ? `Destino/Agencia: ${destino}` : null,
          parsed.data.notas ? `Nota: ${parsed.data.notas}` : null,
        ]
          .filter(Boolean)
          .join(" • ");

        await supabase.from("entregas").insert({
          pedido_id: pedidoId,
          fecha_programada: new Date().toISOString().split("T")[0],
          costo_delivery: 0,
          estado: "PENDIENTE",
          notas: detalleNotas || null,
        });
      }
    } catch (e) {
      console.error("Error al registrar entrega automática:", e);
    }
  }

  revalidatePath("/pedidos");
  revalidatePath("/entregas");
  revalidatePath("/dashboard");
  return { success: true, id: pedidoId as string };
}

// ─── Completar pedido ─────────────────────────────────────────
export async function completarPedido(pedidoId: string) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("completar_pedido", {
    p_pedido_id: pedidoId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Cancelar pedido ──────────────────────────────────────────
export async function cancelarPedido(pedidoId: string) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancelar_pedido", {
    p_pedido_id: pedidoId,
  });
  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  return { success: true };
}

// Alias para retrocompatibilidad
export const eliminarPedido = cancelarPedido;

// ─── Editar pedido ────────────────────────────────────────────
export async function editarPedido(
  pedidoId: string,
  data: {
    cliente_id?: string | null;
    vendedor_id: string;
    sucursal_id?: string | null;
    canal_id?: string | null;
    tipo_entrega_id?: string | null;
    lugar_entrega?: string | null;
    lugar_envio?: string | null;
    notas?: string | null;
    nuevo_estado?: "RESERVADO" | null;
    items: { variante_id: string; cantidad: number; precio_unitario: number }[];
  }
) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("editar_pedido" as any, {
    p_pedido_id: pedidoId,
    p_cliente_id: data.cliente_id ?? null,
    p_vendedor_id: data.vendedor_id,
    p_sucursal_id: data.sucursal_id ?? null,
    p_canal_id: data.canal_id ?? null,
    p_tipo_entrega_id: data.tipo_entrega_id ?? null,
    p_items: data.items,
    p_lugar_entrega: data.lugar_entrega ?? null,
    p_lugar_envio: data.lugar_envio ?? null,
    p_notas: data.notas ?? null,
    p_nuevo_estado: data.nuevo_estado ?? "RESERVADO",
  });
  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${pedidoId}`);
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  return { success: true };
}
