"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const clienteSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  direccion: z.string().optional().nullable(),
  ciudad: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

function parseCliente(formData: FormData) {
  return {
    nombre: formData.get("nombre"),
    telefono: formData.get("telefono") || null,
    email: formData.get("email") || null,
    direccion: formData.get("direccion") || null,
    ciudad: formData.get("ciudad") || null,
    notas: formData.get("notas") || null,
  };
}

export async function crearCliente(formData: FormData) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const parsed = clienteSchema.safeParse(parseCliente(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
    })
    .select("id, nombre")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { success: true, data };
}

export async function actualizarCliente(id: string, formData: FormData) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const parsed = clienteSchema.safeParse(parseCliente(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("clientes")
    .update({ ...parsed.data, email: parsed.data.email || null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { success: true };
}

export async function eliminarCliente(id: string) {
  try {
    await requireAuth();
  } catch (err: any) {
    return { error: err.message || "No autenticado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  return { success: true };
}
