"use server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function realizarTraspaso(params: {
  origenSucursalId: string;
  destinoSucursalId: string;
  varianteId: string;
  cantidad: number;
  motivo?: string;
}) {
  try {
    await requireAdmin();
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await (supabase as any).rpc("realizar_traspaso_stock", {
    p_origen_sucursal_id: params.origenSucursalId,
    p_destino_sucursal_id: params.destinoSucursalId,
    p_variante_id: params.varianteId,
    p_cantidad: params.cantidad,
    p_motivo: params.motivo || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/inventario");
  revalidatePath("/traspasos");
  return { success: true };
}
