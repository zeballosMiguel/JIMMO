"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const loteSchema = z.object({
  proveedor: z.string().optional().nullable(),
  fecha_compra: z.string().optional().nullable(),
  fecha_recepcion: z.string().optional().nullable(),
  tipo_cambio: z.coerce.number().positive().optional().nullable(),
  notas: z.string().optional().nullable(),
  inversionista_id: z.string().uuid().optional().nullable(),
  gastos_extras_bs: z.coerce.number().min(0).optional().nullable(),
  tipo_compra: z.string().optional().nullable(),
  producto_id: z.string().uuid().optional().nullable(),
  cantidad_estimada: z.coerce.number().int().min(0).optional().nullable(),
  cantidad_bultos: z.coerce.number().int().min(0).optional().nullable(),
  costo_total_usd: z.coerce.number().min(0).optional().nullable(),
  estado: z.enum(["PENDIENTE", "EN_TRANSITO", "RECIBIDO", "CERRADO", "CANCELADO"]).optional().nullable(),
});

const detalleLoteSchema = z.object({
  variante_id: z.string().uuid(),
  cantidad: z.coerce.number().int().positive(),
  costo_unitario_bs: z.coerce.number().min(0).optional().nullable(),
  costo_unitario_usd: z.coerce.number().min(0).optional().nullable(),
  otros_costos_bs: z.coerce.number().min(0).default(0),
});

export async function crearLote(formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawTc = formData.get("tipo_cambio");
  const rawProv = formData.get("proveedor");
  const rawFecha = formData.get("fecha_compra");
  const rawFechaRecepcion = formData.get("fecha_recepcion");
  const rawNotas = formData.get("notas");
  const rawInvId = formData.get("inversionista_id");
  const rawGastos = formData.get("gastos_extras_bs");
  const rawTipoCompra = formData.get("tipo_compra");
  const rawProductoId = formData.get("producto_id");
  const rawCantEst = formData.get("cantidad_estimada");
  const rawCantBultos = formData.get("cantidad_bultos");
  const rawCostoUsd = formData.get("costo_total_usd");
  const rawEstado = formData.get("estado");

  const parsed = loteSchema.safeParse({
    proveedor: rawProv && String(rawProv).trim() !== "" ? String(rawProv) : null,
    fecha_compra: rawFecha && String(rawFecha).trim() !== "" ? String(rawFecha) : null,
    fecha_recepcion: rawFechaRecepcion && String(rawFechaRecepcion).trim() !== "" ? String(rawFechaRecepcion) : null,
    tipo_cambio: rawTc && String(rawTc).trim() !== "" ? Number(rawTc) : null,
    notas: rawNotas && String(rawNotas).trim() !== "" ? String(rawNotas) : null,
    inversionista_id: rawInvId && String(rawInvId).trim() !== "" ? String(rawInvId) : null,
    gastos_extras_bs: rawGastos && String(rawGastos).trim() !== "" ? Number(rawGastos) : 0,
    tipo_compra: rawTipoCompra && String(rawTipoCompra).trim() !== "" ? String(rawTipoCompra) : "ESTANDAR",
    producto_id: rawProductoId && String(rawProductoId).trim() !== "" ? String(rawProductoId) : null,
    cantidad_estimada: rawCantEst && String(rawCantEst).trim() !== "" ? Number(rawCantEst) : 0,
    cantidad_bultos: rawCantBultos && String(rawCantBultos).trim() !== "" ? Number(rawCantBultos) : 0,
    costo_total_usd: rawCostoUsd && String(rawCostoUsd).trim() !== "" ? Number(rawCostoUsd) : 0,
    estado: rawEstado ? String(rawEstado) : (rawTipoCompra === "BULTO" || rawTipoCompra === "CANTIDAD" ? "EN_TRANSITO" : "PENDIENTE"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();

  // Fetch highest numero_lote to guarantee next sequential number
  const { data: maxRow } = await supabase
    .from("lotes")
    .select("numero_lote")
    .order("numero_lote", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumero = ((maxRow?.numero_lote as number) || 0) + 1;

  const lotePayload: Record<string, any> = {
    numero_lote: nextNumero,
    proveedor: parsed.data.proveedor || null,
    fecha_compra: parsed.data.fecha_compra || null,
    fecha_recepcion: parsed.data.fecha_recepcion || null,
    tipo_cambio: parsed.data.tipo_cambio || null,
    notas: parsed.data.notas || null,
    estado: parsed.data.estado || "PENDIENTE",
  };
  if (parsed.data.inversionista_id) lotePayload.inversionista_id = parsed.data.inversionista_id;
  if (parsed.data.gastos_extras_bs != null) lotePayload.gastos_extras_bs = parsed.data.gastos_extras_bs;
  if (parsed.data.tipo_compra) lotePayload.tipo_compra = parsed.data.tipo_compra;
  if (parsed.data.producto_id) lotePayload.producto_id = parsed.data.producto_id;
  if (parsed.data.cantidad_estimada != null) lotePayload.cantidad_estimada = parsed.data.cantidad_estimada;
  if (parsed.data.cantidad_bultos != null) lotePayload.cantidad_bultos = parsed.data.cantidad_bultos;
  if (parsed.data.costo_total_usd != null) lotePayload.costo_total_usd = parsed.data.costo_total_usd;

  let { data, error } = await (supabase as any)
    .from("lotes")
    .insert(lotePayload)
    .select("id")
    .single();

  if (error) {
    // Si falló por alguna columna opcional inexistente en la BD, limpiamos las columnas opcionales y reintentamos
    const cleanPayload: Record<string, any> = {
      numero_lote: nextNumero,
      proveedor: parsed.data.proveedor || null,
      fecha_compra: parsed.data.fecha_compra || null,
      fecha_recepcion: parsed.data.fecha_recepcion || null,
      tipo_cambio: parsed.data.tipo_cambio || null,
      notas: parsed.data.notas || null,
      estado: parsed.data.estado || "PENDIENTE",
    };
    const retry = await (supabase as any)
      .from("lotes")
      .insert(cleanPayload)
      .select("id")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return { error: error.message };
  revalidatePath("/lotes");
  return { success: true, id: data.id };
}

// ─── Helper: recalcular y persistir totales en el header del lote ────────────
async function recalcularTotalesLote(supabase: any, loteId: string) {
  const { data: filas } = await supabase
    .from("detalle_lote")
    .select("cantidad, costo_unitario_usd, otros_costos_bs")
    .eq("lote_id", loteId);

  if (!filas || filas.length === 0) return;

  const totalUsd = filas.reduce(
    (acc: number, d: any) => acc + (Number(d.costo_unitario_usd) || 0) * (Number(d.cantidad) || 0),
    0
  );
  const totalExtras = filas.reduce(
    (acc: number, d: any) => acc + (Number(d.otros_costos_bs) || 0),
    0
  );

  await (supabase as any)
    .from("lotes")
    .update({ costo_total_usd: totalUsd, gastos_extras_bs: totalExtras })
    .eq("id", loteId);
}

// ─── Helper: recalcular costos unitarios en detalle_lote cuando cambia T/C o Extras ─────
async function recalcularDetallesLote(supabase: any, loteId: string) {
  const { data: lote } = await supabase
    .from("lotes")
    .select("costo_total_usd, tipo_cambio, gastos_extras_bs, notas, productos_compra")
    .eq("id", loteId)
    .single();

  if (!lote) return;

  const tc = Number(lote.tipo_cambio) || 6.96;
  const loteUsdTotal = Number(lote.costo_total_usd) || 0;
  const loteExtrasBs = Number(lote.gastos_extras_bs) || 0;

  // Build per-product cost map from productos_compra or notas
  const costMap = new Map<string, { usd: number; extrasBs: number }>();
  let productosArray: any[] = [];
  if (Array.isArray(lote.productos_compra) && lote.productos_compra.length > 0) {
    productosArray = lote.productos_compra;
  } else {
    try {
      const notas: string = lote.notas || "";
      const marker = "[ITEMS_COMPRA:";
      const markerIdx = notas.indexOf(marker);
      if (markerIdx !== -1) {
        const jsonStart = markerIdx + marker.length;
        let depth = 0;
        let jsonEnd = jsonStart;
        for (let i = jsonStart; i < notas.length; i++) {
          if (notas[i] === "[") depth++;
          else if (notas[i] === "]") {
            depth--;
            if (depth === 0) { jsonEnd = i + 1; break; }
          }
        }
        productosArray = JSON.parse(notas.slice(jsonStart, jsonEnd));
      }
    } catch {}
  }
  for (const p of productosArray) {
    if (p.producto_id) {
      costMap.set(p.producto_id, {
        usd: Number(p.costo_total_usd ?? p.costo_usd) || 0,
        extrasBs: Number(p.otros_costos_bs) || 0,
      });
    }
  }

  // Read detalles with their product relationship
  const { data: detalles } = await supabase
    .from("detalle_lote")
    .select("id, cantidad, variante_id, variantes_producto(producto_id)")
    .eq("lote_id", loteId);

  if (!detalles || detalles.length === 0) return;

  const totalUnidades = detalles.reduce((acc: number, d: any) => acc + (Number(d.cantidad) || 0), 0);
  if (totalUnidades <= 0) return;

  // Group detalles by product
  const byProduct = new Map<string, any[]>();
  for (const d of detalles) {
    const prodId = d.variantes_producto?.producto_id || "unknown";
    if (!byProduct.has(prodId)) byProduct.set(prodId, []);
    byProduct.get(prodId)!.push(d);
  }

  const numProducts = byProduct.size || 1;

  // Pre-compute sums to detect if lote-level values differ from per-product sums
  const sumPerProductExtras = Array.from(costMap.values()).reduce((a, c) => a + c.extrasBs, 0);
  const sumPerProductUsd = Array.from(costMap.values()).reduce((a, c) => a + c.usd, 0);
  const loteExtrasEdited = sumPerProductExtras > 0 && Math.abs(loteExtrasBs - sumPerProductExtras) > 0.01;
  const loteUsdEdited = sumPerProductUsd > 0 && Math.abs(loteUsdTotal - sumPerProductUsd) > 0.01;

  // Costos finales por producto (para re-sincronizar el metadato del pedido)
  const costosFinales = new Map<string, { usd: number; extrasBs: number }>();

  for (const [prodId, prodDetalles] of byProduct) {
    const prodUnidades = prodDetalles.reduce((acc: number, d: any) => acc + (Number(d.cantidad) || 0), 0);
    if (prodUnidades <= 0) continue;

    // Get per-product costs, or fall back to even split of lote totals
    let prodUsd: number;
    let prodExtrasBs: number;

    const productCosts = costMap.get(prodId);
    if (productCosts && productCosts.usd > 0) {
      prodUsd = productCosts.usd;
    } else {
      prodUsd = numProducts > 0 ? (loteUsdTotal / numProducts) : 0;
    }
    // Distribute current lote-level extras evenly across products
    prodExtrasBs = numProducts > 0 ? (loteExtrasBs / numProducts) : 0;

    const prodTotalBs = (prodUsd * tc) + prodExtrasBs;
    const costoUnitarioBs = prodTotalBs / prodUnidades;
    const costoUnitarioUsd = prodUsd / prodUnidades;

    costosFinales.set(prodId, { usd: prodUsd, extrasBs: 0 });

    for (const d of prodDetalles) {
      const cant = Number(d.cantidad) || 0;
      const propOtrosCostos = prodExtrasBs > 0 ? (prodExtrasBs / prodUnidades) * cant : 0;

      await (supabase as any)
        .from("detalle_lote")
        .update({
          costo_unitario_bs: Number(costoUnitarioBs.toFixed(2)),
          costo_unitario_usd: Number(costoUnitarioUsd.toFixed(4)),
          otros_costos_bs: Number(propOtrosCostos.toFixed(2)),
        })
        .eq("id", d.id);
    }
  }

  // Sincronizar los costos finales por producto con el metadato del pedido
  // (productos_compra / [ITEMS_COMPRA]), para que los totales del lote y las
  // próximas recalcaciones partan de valores consistentes.
  if (productosArray.length > 0) {
    const productosActualizados: any[] = [...productosArray];
    for (const [prodId, cf] of costosFinales) {
      const idx = productosActualizados.findIndex((p) => p.producto_id === prodId);
      if (idx >= 0) {
        productosActualizados[idx] = {
          ...productosActualizados[idx],
          costo_total_usd: cf.usd,
          costo_usd: cf.usd,
          otros_costos_bs: 0,
        };
      } else {
        productosActualizados.push({
          producto_id: prodId,
          costo_total_usd: cf.usd,
          costo_usd: cf.usd,
          otros_costos_bs: 0,
        });
      }
    }

    if (JSON.stringify(productosActualizados) !== JSON.stringify(productosArray)) {
      const productosJson = JSON.stringify(productosActualizados);
      const marker = "[ITEMS_COMPRA:";
      let nuevasNotas: string | null = lote.notas || null;
      if (nuevasNotas && nuevasNotas.includes(marker)) {
        const markerIdx = nuevasNotas.indexOf(marker);
        let depth = 0;
        let jsonEnd = markerIdx + marker.length;
        for (let i = markerIdx + marker.length; i < nuevasNotas.length; i++) {
          if (nuevasNotas[i] === "[") depth++;
          else if (nuevasNotas[i] === "]") {
            depth--;
            if (depth === 0) { jsonEnd = i + 1; break; }
          }
        }
        nuevasNotas = nuevasNotas.slice(0, markerIdx) + `[ITEMS_COMPRA:${productosJson}]` + nuevasNotas.slice(jsonEnd);
      } else {
        nuevasNotas = nuevasNotas
          ? `${nuevasNotas}\n\n[ITEMS_COMPRA:${productosJson}]`
          : `[ITEMS_COMPRA:${productosJson}]`;
      }

      const metaPayload: Record<string, any> = {
        productos_compra: productosActualizados,
        notas: nuevasNotas,
      };
      const { error: metaErr } = await (supabase as any)
        .from("lotes")
        .update(metaPayload)
        .eq("id", loteId);
      if (metaErr && metaErr.message.includes("productos_compra")) {
        delete metaPayload.productos_compra;
        await supabase.from("lotes").update(metaPayload).eq("id", loteId);
      }
    }
  }

  // Sync lote header totals from the updated detalles
  await recalcularTotalesLote(supabase, loteId);
}

export async function agregarDetalleLote(loteId: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawBs = formData.get("costo_unitario_bs");
  const rawUsd = formData.get("costo_unitario_usd");
  const rawOtros = formData.get("otros_costos_bs");

  const parsed = detalleLoteSchema.safeParse({
    variante_id: formData.get("variante_id"),
    cantidad: formData.get("cantidad"),
    costo_unitario_bs: rawBs && String(rawBs).trim() !== "" ? Number(rawBs) : null,
    costo_unitario_usd: rawUsd && String(rawUsd).trim() !== "" ? Number(rawUsd) : null,
    otros_costos_bs: rawOtros && String(rawOtros).trim() !== "" ? Number(rawOtros) : 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("detalle_lote")
    .insert({ lote_id: loteId, ...parsed.data });
  if (error) return { error: error.message };
  await recalcularTotalesLote(supabase, loteId);
  revalidatePath(`/lotes/${loteId}`);
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true };
}

export async function recibirLote(loteId: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();

  // Validar que el lote tenga prendas contadas y desglosadas
  const { data: detalles } = await supabase
    .from("detalle_lote")
    .select("id")
    .eq("lote_id", loteId);

  if (!detalles || detalles.length === 0) {
    return { error: "Falta contar prendas. Primero debes desglosar los colores y tallas antes de ingresar al inventario." };
  }

  const { error } = await supabase.rpc("recibir_lote", { p_lote_id: loteId });
  if (error) return { error: error.message };
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true };
}

export async function eliminarDetalleLote(id: string, loteId: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("detalle_lote").delete().eq("id", id);
  if (error) return { error: error.message };
  await recalcularTotalesLote(supabase, loteId);
  revalidatePath(`/lotes/${loteId}`);
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true };
}

export async function eliminarLote(id: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { data: lote } = await supabase.from("lotes").select("estado").eq("id", id).single();
  if (lote?.estado === "RECIBIDO" || lote?.estado === "CERRADO") {
    return { error: "No se puede eliminar un lote que ya ha sido recibido o cerrado" };
  }
  await supabase.from("detalle_lote").delete().eq("lote_id", id);
  const { error } = await supabase.from("lotes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/lotes");
  return { success: true };
}

export async function actualizarLote(id: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawTc = formData.get("tipo_cambio");
  const rawProv = formData.get("proveedor");
  const rawFecha = formData.get("fecha_compra");
  const rawFechaRecepcion = formData.get("fecha_recepcion");
  const rawNotas = formData.get("notas");

  const rawInvId = formData.get("inversionista_id");
  const rawGastos = formData.get("gastos_extras_bs");
  const rawCostoUsd = formData.get("costo_total_usd");
  const rawCantEst = formData.get("cantidad_estimada");

  const parsed = loteSchema.safeParse({
    proveedor: rawProv && String(rawProv).trim() !== "" ? String(rawProv) : null,
    fecha_compra: rawFecha && String(rawFecha).trim() !== "" ? String(rawFecha) : null,
    fecha_recepcion: rawFechaRecepcion && String(rawFechaRecepcion).trim() !== "" ? String(rawFechaRecepcion) : null,
    tipo_cambio: rawTc && String(rawTc).trim() !== "" ? Number(rawTc) : null,
    notas: rawNotas && String(rawNotas).trim() !== "" ? String(rawNotas) : null,
    inversionista_id: rawInvId && String(rawInvId).trim() !== "" ? String(rawInvId) : null,
    gastos_extras_bs: rawGastos && String(rawGastos).trim() !== "" ? Number(rawGastos) : 0,
    costo_total_usd: rawCostoUsd && String(rawCostoUsd).trim() !== "" ? Number(rawCostoUsd) : null,
    cantidad_estimada: rawCantEst && String(rawCantEst).trim() !== "" ? Number(rawCantEst) : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const updatePayload: Record<string, any> = { ...parsed.data };

  // costo_total_usd es un total derivado de los productos del pedido: el form de edición
  // no lo incluye, así que un campo vacío NO significa "sin costo". Nunca borrarlo,
  // porque perderlo haría que el "Costo Pedido" y la "Inversión" desaparezcan al recalcula.
  if (updatePayload.costo_total_usd == null) {
    delete updatePayload.costo_total_usd;
  }

  // Preservar el marcador de sistema [ITEMS_COMPRA:...] si existía en las notas actuales
  const { data: currentLote } = await supabase
    .from("lotes")
    .select("notas")
    .eq("id", id)
    .maybeSingle();

  if (currentLote?.notas) {
    const existingNotas = currentLote.notas;
    const marker = "[ITEMS_COMPRA:";
    const markerIdx = existingNotas.indexOf(marker);

    if (markerIdx !== -1) {
      let depth = 0;
      let jsonEnd = markerIdx + marker.length;
      for (let i = markerIdx + marker.length; i < existingNotas.length; i++) {
        if (existingNotas[i] === "[") depth++;
        else if (existingNotas[i] === "]") {
          depth--;
          if (depth === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
      const itemsBlock = existingNotas.slice(markerIdx, jsonEnd);
      const cleanUserNotes = (parsed.data.notas || "").trim();
      updatePayload.notas = cleanUserNotes
        ? `${cleanUserNotes}\n\n${itemsBlock}`
        : itemsBlock;
    }
  }

  let { error } = await (supabase as any)
    .from("lotes")
    .update(updatePayload)
    .eq("id", id);

  if (error && (error.message.includes("inversionista_id") || error.message.includes("gastos_extras_bs") || error.message.includes("costo_total_usd") || error.message.includes("cantidad_estimada"))) {
    if (error.message.includes("inversionista_id")) delete updatePayload.inversionista_id;
    if (error.message.includes("gastos_extras_bs")) delete updatePayload.gastos_extras_bs;
    if (error.message.includes("costo_total_usd")) delete updatePayload.costo_total_usd;
    if (error.message.includes("cantidad_estimada")) delete updatePayload.cantidad_estimada;
    const retry = await (supabase as any)
      .from("lotes")
      .update(updatePayload)
      .eq("id", id);
    error = retry.error;
  }

  if (error) return { error: error.message };

  await recalcularDetallesLote(supabase, id);

  revalidatePath(`/lotes/${id}`);
  revalidatePath("/lotes");
  return { success: true };
}

export async function actualizarDetalleLote(
  id: string,
  loteId: string,
  formData: FormData
) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawBs = formData.get("costo_unitario_bs");
  const rawUsd = formData.get("costo_unitario_usd");
  const rawOtros = formData.get("otros_costos_bs");
  const rawCantidad = formData.get("cantidad");

  const supabase = await createClient();
  const { data: lote } = await supabase.from("lotes").select("estado").eq("id", loteId).single();

  const updatePayload: Record<string, any> = {
    costo_unitario_bs: rawBs && String(rawBs).trim() !== "" ? Number(rawBs) : null,
    costo_unitario_usd: rawUsd && String(rawUsd).trim() !== "" ? Number(rawUsd) : null,
    otros_costos_bs: rawOtros && String(rawOtros).trim() !== "" ? Number(rawOtros) : 0,
  };

  // Solo si el lote NO ha sido recibido ni cerrado permitimos cambiar la cantidad
  if (lote?.estado !== "RECIBIDO" && lote?.estado !== "CERRADO" && rawCantidad) {
    const cantNum = parseInt(String(rawCantidad), 10);
    if (!isNaN(cantNum) && cantNum > 0) {
      updatePayload.cantidad = cantNum;
    }
  }

  const { error } = await supabase
    .from("detalle_lote")
    .update(updatePayload)
    .eq("id", id);
  if (error) return { error: error.message };

  await recalcularTotalesLote(supabase, loteId);
  revalidatePath(`/lotes/${loteId}`);
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true };
}


// ─── Crear Lote Completo (datos + productos en un solo paso) ──────────────────
export interface DetalleLoteInput {
  variante_id: string;
  cantidad: number;
  costo_unitario_usd: number | null;
  otros_costos_bs: number;
}

export async function crearLoteCompleto(data: {
  proveedor?: string | null;
  fecha_compra?: string | null;
  fecha_recepcion?: string | null;
  tipo_cambio?: number | null;
  inversionista_id?: string | null;
  notas?: string | null;
  items: DetalleLoteInput[];
}) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const supabase = await createClient();

  // 1. Obtener siguiente número de lote
  const { data: maxRow } = await supabase
    .from("lotes")
    .select("numero_lote")
    .order("numero_lote", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumero = ((maxRow?.numero_lote as number) || 0) + 1;
  const tc = data.tipo_cambio || null;

  // 2. Calcular totales para el header del lote
  const totalCostoUsd = data.items
    ? data.items.reduce((acc, i) => acc + ((i.costo_unitario_usd ?? 0) * i.cantidad), 0)
    : 0;
  const totalGastosExtras = data.items
    ? data.items.reduce((acc, i) => acc + (i.otros_costos_bs || 0), 0)
    : 0;

  // 3. Crear el lote con totales pre-calculados
  const lotePayload: Record<string, any> = {
    numero_lote: nextNumero,
    proveedor: data.proveedor || null,
    fecha_compra: data.fecha_compra || null,
    fecha_recepcion: data.fecha_recepcion || null,
    tipo_cambio: tc,
    notas: data.notas || null,
    costo_total_usd: totalCostoUsd,
    gastos_extras_bs: totalGastosExtras,
  };
  if (data.inversionista_id) {
    lotePayload.inversionista_id = data.inversionista_id;
  }

  let { data: lote, error: errLote } = await (supabase as any)
    .from("lotes")
    .insert(lotePayload)
    .select("id")
    .single();

  if (errLote && data.inversionista_id && errLote.message.includes("inversionista_id")) {
    delete lotePayload.inversionista_id;
    const retry = await (supabase as any)
      .from("lotes")
      .insert(lotePayload)
      .select("id")
      .single();
    lote = retry.data;
    errLote = retry.error;
  }

  if (errLote) {
    // fallback sin columnas opcionales
    const cleanPayload = {
      numero_lote: nextNumero,
      proveedor: data.proveedor || null,
      fecha_compra: data.fecha_compra || null,
      fecha_recepcion: data.fecha_recepcion || null,
      tipo_cambio: tc,
      notas: data.notas || null,
    };
    const retry2 = await (supabase as any)
      .from("lotes")
      .insert(cleanPayload)
      .select("id")
      .single();
    if (retry2.error) return { error: retry2.error.message };
    lote = retry2.data;
  }

  // 4. Si hay items, insertarlos con cálculo de costo unitario
  if (data.items && data.items.length > 0) {
    const detalleRows = data.items.map((item) => {
      const costoPedidoBs = tc && item.costo_unitario_usd
        ? item.costo_unitario_usd * tc
        : null;
      const costoTotalBs = costoPedidoBs != null
        ? costoPedidoBs + (item.otros_costos_bs || 0)
        : (item.otros_costos_bs || null);
      const costoUnitarioBs = costoTotalBs != null && item.cantidad > 0
        ? costoTotalBs / item.cantidad
        : null;

      return {
        lote_id: lote.id,
        variante_id: item.variante_id,
        cantidad: item.cantidad,
        costo_unitario_usd: item.costo_unitario_usd ?? null,
        otros_costos_bs: item.otros_costos_bs || 0,
        costo_unitario_bs: costoUnitarioBs,
      };
    });

    const { error: errDet } = await supabase.from("detalle_lote").insert(detalleRows);
    if (errDet) return { error: errDet.message };
  }

  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true, id: lote.id };
}

// ─── Desglosar y Recibir Lote por Bulto (Llegada física de mercadería) ─────────
export interface DesgloseVarianteItem {
  variante_id: string;
  cantidad: number;
}

export async function desglosarYRecibirLote(data: {
  loteId: string;
  items: DesgloseVarianteItem[];
  costoUnitarioBs: number;
  costoUnitarioUsd?: number | null;
  otrosCostosBs?: number;
}) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const supabase = await createClient();

  // 1. Validar lote
  const { data: lote, error: errLote } = await supabase
    .from("lotes")
    .select("id, estado, tipo_cambio")
    .eq("id", data.loteId)
    .single();

  if (errLote || !lote) return { error: "Lote no encontrado" };
  if (lote.estado === "RECIBIDO" || lote.estado === "CERRADO") {
    return { error: "El lote ya fue recibido o cerrado anteriormente" };
  }

  // 2. Filtrar items con cantidad > 0
  const validItems = (data.items || []).filter((i) => i.cantidad > 0);
  if (validItems.length === 0) {
    return { error: "Debes ingresar al menos 1 prenda en el desglose real del bulto" };
  }

  const totalUnidades = validItems.reduce((acc, curr) => acc + curr.cantidad, 0);

  // 3. Limpiar cualquier detalle previo en borrador
  await supabase.from("detalle_lote").delete().eq("lote_id", data.loteId);

  // 4. Preparar registros para detalle_lote
  const detalleRows = validItems.map((item) => {
    const propOtrosCostos = data.otrosCostosBs && totalUnidades > 0
      ? (data.otrosCostosBs / totalUnidades) * item.cantidad
      : 0;

    return {
      lote_id: data.loteId,
      variante_id: item.variante_id,
      cantidad: item.cantidad,
      costo_unitario_bs: Number(data.costoUnitarioBs.toFixed(2)),
      costo_unitario_usd: data.costoUnitarioUsd ? Number(data.costoUnitarioUsd.toFixed(4)) : null,
      otros_costos_bs: Number(propOtrosCostos.toFixed(2)),
    };
  });

  const { error: errDet } = await supabase.from("detalle_lote").insert(detalleRows);
  if (errDet) return { error: `Error al registrar desglose: ${errDet.message}` };

  // Recalcular los costos unitarios reales por producto especifico
  await recalcularDetallesLote(supabase, data.loteId);

  // 5. Ejecutar recepción oficial del lote para ingresar stock a Kardex
  const { error: errRecibir } = await supabase.rpc("recibir_lote", {
    p_lote_id: data.loteId,
  });

  if (errRecibir) {
    return { error: `Error al recibir lote e ingresar stock a Kardex: ${errRecibir.message}` };
  }

  revalidatePath(`/lotes/${data.loteId}`);
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true };
}

// ─── Crear Compra Multi-Producto (Sin variantes definidas inicialmente) ───────
export interface ItemCompraProductoInput {
  producto_id: string;
  nombre_producto: string;
  variante_id?: string;
  cantidad: number;
  costo_total_usd: number;
  otros_costos_bs: number;
}

export async function crearLoteConMultiplesProductos(data: {
  proveedor?: string | null;
  fecha_compra?: string | null;
  fecha_recepcion?: string | null;
  tipo_cambio?: number | null;
  inversionista_id?: string | null;
  notas?: string | null;
  estado?: "PENDIENTE" | "EN_TRANSITO";
  productos: ItemCompraProductoInput[];
}) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const supabase = await createClient();

  // 1. Siguiente número de lote
  const { data: maxRow } = await supabase
    .from("lotes")
    .select("numero_lote")
    .order("numero_lote", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextNumero = ((maxRow?.numero_lote as number) || 0) + 1;
  const tc = data.tipo_cambio || 6.96;

  // 2. Pre-calcular totales del lote (suma de todos los productos)
  const totalCostoUsdMulti = (data.productos || []).reduce(
    (acc, p) => acc + (Number(p.costo_total_usd) || 0),
    0
  );
  const totalGastosExtrasMulti = (data.productos || []).reduce(
    (acc, p) => acc + (Number(p.otros_costos_bs) || 0),
    0
  );
  const totalCantidadEstimada = (data.productos || []).reduce(
    (acc, p) => acc + (Number(p.cantidad) || 0),
    0
  );
  const primerProductoId = data.productos?.[0]?.producto_id || null;

  // Guardar lista de productos esperados como metadato en notas (fallback 100% compatible)
  const productosJson = JSON.stringify(data.productos || []);
  const notasConProductos = data.notas
    ? `${data.notas}\n\n[ITEMS_COMPRA:${productosJson}]`
    : `[ITEMS_COMPRA:${productosJson}]`;

  // 3. Insertar lote con totales
  const lotePayload: Record<string, any> = {
    numero_lote: nextNumero,
    proveedor: data.proveedor || null,
    fecha_compra: data.fecha_compra || null,
    fecha_recepcion: data.fecha_recepcion || null,
    tipo_cambio: tc,
    notas: notasConProductos,
    estado: data.estado || "EN_TRANSITO",
    costo_total_usd: totalCostoUsdMulti,
    gastos_extras_bs: totalGastosExtrasMulti,
    producto_id: primerProductoId,
    cantidad_estimada: totalCantidadEstimada,
    tipo_compra: "BULTO",
    productos_compra: data.productos || [],
  };
  if (data.inversionista_id) {
    lotePayload.inversionista_id = data.inversionista_id;
  }

  let { data: lote, error: errLote } = await (supabase as any)
    .from("lotes")
    .insert(lotePayload)
    .select("id")
    .single();

  if (errLote && (errLote.message.includes("productos_compra") || errLote.message.includes("inversionista_id") || errLote.message.includes("producto_id"))) {
    // Si alguna columna opcional no existe aún en Supabase, reintentar progresivamente
    if (errLote.message.includes("productos_compra")) delete lotePayload.productos_compra;
    if (errLote.message.includes("inversionista_id")) delete lotePayload.inversionista_id;
    if (errLote.message.includes("producto_id")) delete lotePayload.producto_id;
    if (errLote.message.includes("cantidad_estimada")) delete lotePayload.cantidad_estimada;
    if (errLote.message.includes("tipo_compra")) delete lotePayload.tipo_compra;

    const retry = await (supabase as any)
      .from("lotes")
      .insert(lotePayload)
      .select("id")
      .single();
    lote = retry.data;
    errLote = retry.error;
  }

  if (errLote) {
    // fallback ultra básico
    const cleanPayload = {
      numero_lote: nextNumero,
      proveedor: data.proveedor || null,
      fecha_compra: data.fecha_compra || null,
      fecha_recepcion: data.fecha_recepcion || null,
      tipo_cambio: tc,
      notas: notasConProductos,
      estado: data.estado || "EN_TRANSITO",
    };
    const retry2 = await (supabase as any)
      .from("lotes")
      .insert(cleanPayload)
      .select("id")
      .single();
    if (retry2.error) return { error: retry2.error.message };
    lote = retry2.data;
  }

  // 4. Si se especificó explícitamente variante_id en algún producto (caso poco común),
  // se inserta únicamente esa variante. Si NO se especificó variante_id (compra por bulto),
  // NO se inserta ninguna variante ficticia "Estándar". El desglose se hará al contar el bulto físico.
  const explicitVarianteItems = (data.productos || []).filter((p) => Boolean(p.variante_id));
  if (explicitVarianteItems.length > 0) {
    const detalleRows = explicitVarianteItems.map((prod) => {
      const costoUnitarioUsd = prod.costo_total_usd > 0 ? prod.costo_total_usd / prod.cantidad : null;
      const subtotalBs = prod.costo_total_usd > 0 ? prod.costo_total_usd * tc : 0;
      const costoTotalBs = subtotalBs + (prod.otros_costos_bs || 0);
      const costoUnitarioBs = costoTotalBs > 0 ? costoTotalBs / prod.cantidad : null;

      return {
        lote_id: lote.id,
        variante_id: prod.variante_id!,
        cantidad: prod.cantidad,
        costo_unitario_usd: costoUnitarioUsd ? Number(costoUnitarioUsd.toFixed(4)) : null,
        otros_costos_bs: Number((prod.otros_costos_bs || 0).toFixed(2)),
        costo_unitario_bs: costoUnitarioBs ? Number(costoUnitarioBs.toFixed(2)) : null,
      };
    });

    const { error: errDet } = await supabase.from("detalle_lote").insert(detalleRows);
    if (errDet) return { error: errDet.message };
    await recalcularTotalesLote(supabase, lote.id);
  }

  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true, id: lote.id };
}

// ─── Desglosar un Producto Individual dentro de un Lote ───────────────────────
export async function desglosarProductoIndividual(data: {
  loteId: string;
  productoId: string;
  detalleIdsAReemplazar: string[];
  items: Array<{ variante_id: string; cantidad: number }>;
  costoTotalUsd: number;
  otrosCostosBs: number;
}) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const supabase = await createClient();

  const { data: lote } = await supabase
    .from("lotes")
    .select("id, estado, tipo_cambio")
    .eq("id", data.loteId)
    .single();

  if (!lote) return { error: "Lote no encontrado" };
  if (lote.estado === "RECIBIDO" || lote.estado === "CERRADO") {
    return { error: "El lote ya fue recibido o cerrado" };
  }

  const tc = Number(lote.tipo_cambio) || 6.96;
  const validItems = (data.items || []).filter((i) => i.cantidad > 0);
  if (validItems.length === 0) {
    return { error: "Debes ingresar al menos 1 prenda contada para este producto" };
  }

  const totalUnidades = validItems.reduce((acc, curr) => acc + curr.cantidad, 0);

  // Calcular costo unitario real
  const subtotalBs = data.costoTotalUsd * tc;
  const totalInversionBs = subtotalBs + (data.otrosCostosBs || 0);
  const costoUnitarioBs = totalInversionBs > 0 ? totalInversionBs / totalUnidades : 0;
  const costoUnitarioUsd = data.costoTotalUsd > 0 ? data.costoTotalUsd / totalUnidades : null;

  // 1. Eliminar los items previos de este producto en este lote
  if (data.detalleIdsAReemplazar && data.detalleIdsAReemplazar.length > 0) {
    await supabase
      .from("detalle_lote")
      .delete()
      .in("id", data.detalleIdsAReemplazar);
  }

  // 2. Insertar las variantes reales contadas
  const detalleRows = validItems.map((item) => {
    const propOtros = totalUnidades > 0
      ? (data.otrosCostosBs / totalUnidades) * item.cantidad
      : 0;

    return {
      lote_id: data.loteId,
      variante_id: item.variante_id,
      cantidad: item.cantidad,
      costo_unitario_bs: Number(costoUnitarioBs.toFixed(2)),
      costo_unitario_usd: costoUnitarioUsd ? Number(costoUnitarioUsd.toFixed(4)) : null,
      otros_costos_bs: Number(propOtros.toFixed(2)),
    };
  });

  const { error: errInsert } = await supabase.from("detalle_lote").insert(detalleRows);
  if (errInsert) return { error: `Error al insertar desglose: ${errInsert.message}` };

  revalidatePath(`/lotes/${data.loteId}`);
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true };
}

// ─── Solo Desglose / Re-conteo de Lote (Sin re-ejecutar RPC de recepción) ─────
export async function soloDesgloseDetalleLote(data: {
  loteId: string;
  items: DesgloseVarianteItem[];
  costoUnitarioBs: number;
  costoUnitarioUsd?: number | null;
  otrosCostosBs?: number;
}) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const supabase = await createClient();

  // 1. Validar lote
  const { data: lote, error: errLote } = await supabase
    .from("lotes")
    .select("id, estado")
    .eq("id", data.loteId)
    .single();

  if (errLote || !lote) return { error: "Lote no encontrado" };
  if (lote.estado === "CANCELADO" || lote.estado === "CERRADO") {
    return { error: "No se puede ajustar un lote cancelado o cerrado" };
  }

  // 2. Filtrar items con cantidad > 0
  const validItems = (data.items || []).filter((i) => i.cantidad > 0);
  if (validItems.length === 0) {
    return { error: "Debes ingresar al menos 1 prenda en el desglose" };
  }

  const totalUnidades = validItems.reduce((acc, curr) => acc + curr.cantidad, 0);

  // 3. Limpiar cualquier detalle previo
  const { error: errDel } = await supabase
    .from("detalle_lote")
    .delete()
    .eq("lote_id", data.loteId);

  if (errDel) {
    return { error: `Error al limpiar desglose anterior: ${errDel.message}` };
  }

  // 4. Preparar registros para detalle_lote
  const detalleRows = validItems.map((item) => {
    const propOtrosCostos =
      data.otrosCostosBs && totalUnidades > 0
        ? (data.otrosCostosBs / totalUnidades) * item.cantidad
        : 0;

    return {
      lote_id: data.loteId,
      variante_id: item.variante_id,
      cantidad: item.cantidad,
      costo_unitario_bs: Number(data.costoUnitarioBs.toFixed(2)),
      costo_unitario_usd: data.costoUnitarioUsd ? Number(data.costoUnitarioUsd.toFixed(4)) : null,
      otros_costos_bs: Number(propOtrosCostos.toFixed(2)),
    };
  });

  const { error: errDet } = await supabase.from("detalle_lote").insert(detalleRows);
  if (errDet) return { error: `Error al registrar desglose: ${errDet.message}` };

  // Recalcular los costos unitarios reales por producto especifico
  await recalcularDetallesLote(supabase, data.loteId);
  await recalcularTotalesLote(supabase, data.loteId);

  revalidatePath(`/lotes/${data.loteId}`);
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true };
}

// ─── Actualizar costo de compra de un producto específico en un lote ─────────
export async function actualizarCostoProductoEnLote(data: {
  loteId: string;
  productoId: string;
  costoUsd: number;
  gastosExtrasBs?: number;
}) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const supabase = await createClient();

  const { data: lote, error: errLote } = await supabase
    .from("lotes")
    .select("id, notas, productos_compra, costo_total_usd, gastos_extras_bs, estado")
    .eq("id", data.loteId)
    .single();

  if (errLote || !lote) return { error: "Lote no encontrado" };

  let productosArray: any[] = [];
  if (Array.isArray(lote.productos_compra)) {
    productosArray = [...lote.productos_compra];
  } else {
    try {
      const notas: string = lote.notas || "";
      const marker = "[ITEMS_COMPRA:";
      const markerIdx = notas.indexOf(marker);
      if (markerIdx !== -1) {
        const jsonStart = markerIdx + marker.length;
        let depth = 0;
        let jsonEnd = jsonStart;
        for (let i = jsonStart; i < notas.length; i++) {
          if (notas[i] === "[") depth++;
          else if (notas[i] === "]") {
            depth--;
            if (depth === 0) { jsonEnd = i + 1; break; }
          }
        }
        productosArray = JSON.parse(notas.slice(jsonStart, jsonEnd));
      }
    } catch {}
  }

  let itemFound = false;
  if (Array.isArray(productosArray)) {
    productosArray = productosArray.map((p) => {
      if (p.producto_id === data.productoId) {
        itemFound = true;
        return {
          ...p,
          costo_total_usd: data.costoUsd,
          costo_usd: data.costoUsd,
          otros_costos_bs: 0,
        };
      }
      return {
        ...p,
        otros_costos_bs: 0,
      };
    });
  }

  if (!itemFound) {
    productosArray.push({
      producto_id: data.productoId,
      costo_total_usd: data.costoUsd,
      costo_usd: data.costoUsd,
      otros_costos_bs: 0,
    });
  }

  const nuevoCostoTotalUsd = productosArray.reduce(
    (acc, p) => acc + (Number(p.costo_total_usd ?? p.costo_usd) || 0),
    0
  );

  let nuevasNotas = lote.notas || "";
  const productosJson = JSON.stringify(productosArray);
  const marker = "[ITEMS_COMPRA:";
  if (nuevasNotas.includes(marker)) {
    const markerIdx = nuevasNotas.indexOf(marker);
    let depth = 0;
    let jsonEnd = markerIdx + marker.length;
    for (let i = markerIdx + marker.length; i < nuevasNotas.length; i++) {
      if (nuevasNotas[i] === "[") depth++;
      else if (nuevasNotas[i] === "]") {
        depth--;
        if (depth === 0) { jsonEnd = i + 1; break; }
      }
    }
    nuevasNotas = nuevasNotas.slice(0, markerIdx) + `[ITEMS_COMPRA:${productosJson}]` + nuevasNotas.slice(jsonEnd);
  } else {
    nuevasNotas = nuevasNotas ? `${nuevasNotas}\n\n[ITEMS_COMPRA:${productosJson}]` : `[ITEMS_COMPRA:${productosJson}]`;
  }

  const updatePayload: Record<string, any> = {
    costo_total_usd: nuevoCostoTotalUsd,
    notas: nuevasNotas,
    productos_compra: productosArray,
  };

  const { error: errUpdate } = await (supabase as any)
    .from("lotes")
    .update(updatePayload)
    .eq("id", data.loteId);

  if (errUpdate && errUpdate.message.includes("productos_compra")) {
    delete updatePayload.productos_compra;
    await supabase.from("lotes").update(updatePayload).eq("id", data.loteId);
  }

  await recalcularDetallesLote(supabase, data.loteId);

  revalidatePath(`/lotes/${data.loteId}`);
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  return { success: true };
}



