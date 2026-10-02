"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const entregaSchema = z.object({
  pedido_id: z.string().uuid(),
  transporte_id: z.string().uuid().optional().nullable(),
  fecha_programada: z.string().optional().nullable(),
  costo_delivery: z.coerce.number().min(0).default(0),
  estado: z.enum(["PENDIENTE", "PREPARANDO", "ENVIADO", "ENTREGADO", "CANCELADO"]).default("PENDIENTE"),
  notas: z.string().optional().nullable(),
});

export async function crearEntrega(formData: FormData) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  
  const parsed = entregaSchema.safeParse({
    pedido_id: formData.get("pedido_id"),
    transporte_id: formData.get("transporte_id") || null,
    fecha_programada: formData.get("fecha_programada") || null,
    costo_delivery: formData.get("costo_delivery") || 0,
    estado: formData.get("estado") || "PENDIENTE",
    notas: formData.get("notas") || null,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("entregas").insert(parsed.data);

  if (error) return { error: error.message };
  
  revalidatePath(`/pedidos/${parsed.data.pedido_id}`);
  revalidatePath("/entregas");
  return { success: true };
}

export async function actualizarEstadoEntrega(id: string, estado: string) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("entregas")
    .update({ 
      estado,
      fecha_entrega: estado === "ENTREGADO" ? new Date().toISOString() : null
    })
    .eq("id", id)
    .select("pedido_id")
    .single();

  if (error) return { error: error.message };
  
  if (data?.pedido_id) {
    revalidatePath(`/pedidos/${data.pedido_id}`);
  }
  revalidatePath("/entregas");
  return { success: true };
}

// ─── Eliminar entrega ───────────────────────────────────────
export async function eliminarEntrega(entregaId: string) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const supabase = await createClient();
  const { data: entrega } = await supabase
    .from("entregas")
    .select("pedido_id")
    .eq("id", entregaId)
    .single();
  if (!entrega) return { error: "Entrega no encontrada" };
  const { error } = await supabase.from("entregas").delete().eq("id", entregaId);
  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${entrega.pedido_id}`);
  revalidatePath("/entregas");
  return { success: true };
}

