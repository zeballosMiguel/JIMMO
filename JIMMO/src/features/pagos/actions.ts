"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const pagoSchema = z.object({
  pedido_id: z.string().uuid(),
  monto: z.coerce.number().positive(),
  metodo: z.enum(["EFECTIVO", "TRANSFERENCIA", "QR", "TARJETA", "DEPOSITO", "OTRO"]),
  referencia: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

export async function registrarPago(formData: FormData) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  
  const parsed = pagoSchema.safeParse({
    pedido_id: formData.get("pedido_id"),
    monto: formData.get("monto"),
    metodo: formData.get("metodo"),
    referencia: formData.get("referencia") || null,
    notas: formData.get("notas") || null,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("registrar_pago", {
    p_pedido_id: parsed.data.pedido_id,
    p_monto: parsed.data.monto,
    p_metodo: parsed.data.metodo,
    p_referencia: parsed.data.referencia,
    p_notas: parsed.data.notas,
  });

  if (error) return { error: error.message };
  
  revalidatePath(`/pedidos/${parsed.data.pedido_id}`);
  revalidatePath("/pagos");
  revalidatePath("/pedidos");
  return { success: true };
}

// ─── Eliminar pago ──────────────────────────────────────────
export async function eliminarPago(pagoId: string) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const supabase = await createClient();
  const { data: pago } = await supabase
    .from("pagos")
    .select("pedido_id")
    .eq("id", pagoId)
    .single();
  if (!pago) return { error: "Pago no encontrado" };
  const { error } = await supabase.from("pagos").delete().eq("id", pagoId);
  if (error) return { error: error.message };
  revalidatePath(`/pedidos/${pago.pedido_id}`);
  revalidatePath("/pedidos");
  return { success: true };
}

