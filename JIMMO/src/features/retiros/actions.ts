"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const retiroSchema = z.object({
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  origen: z.enum(["CAPITAL", "UTILIDAD"]),
  inversionista_id: z.string().uuid().optional().nullable(),
  vendedor_id: z.string().uuid().optional().nullable(),
  lote_id: z.string().uuid().optional().nullable(),
  pedido_id: z.string().uuid().optional().nullable(),
  descripcion: z.string().optional().nullable(),
}).refine(
  (data) => data.inversionista_id || data.vendedor_id,
  { message: "Debe seleccionar un inversionista o un vendedor como destinatario" }
);

export async function crearRetiro(formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const parsed = retiroSchema.safeParse({
    monto: formData.get("monto"),
    origen: formData.get("origen"),
    inversionista_id: formData.get("inversionista_id") || null,
    vendedor_id: formData.get("vendedor_id") || null,
    lote_id: formData.get("lote_id") || null,
    pedido_id: formData.get("pedido_id") || null,
    descripcion: formData.get("descripcion") || null,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("retiros").insert({
    monto: parsed.data.monto,
    origen: parsed.data.origen,
    inversionista_id: parsed.data.inversionista_id ?? null,
    vendedor_id: parsed.data.vendedor_id ?? null,
    lote_id: parsed.data.lote_id ?? null,
    pedido_id: parsed.data.pedido_id ?? null,
    descripcion: parsed.data.descripcion ?? null,
    fecha: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  revalidatePath("/retiros");
  return { success: true };
}

export async function eliminarRetiro(retiroId: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("retiros").delete().eq("id", retiroId);

  if (error) return { error: error.message };

  revalidatePath("/retiros");
  return { success: true };
}
