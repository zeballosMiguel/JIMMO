"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Categorías ──────────────────────────────────────────────
const categoriaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
});

export async function crearCategoria(formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const parsed = categoriaSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/catalogos/categorias");
  return { success: true };
}

export async function actualizarCategoria(id: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const parsed = categoriaSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("categorias")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogos/categorias");
  return { success: true };
}

// ─── Productos ───────────────────────────────────────────────
const productoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  codigo_interno: z.string().min(1, "El código interno es obligatorio"),
  categoria_id: z.string().uuid().nullable().optional(),
  descripcion: z.string().optional(),
  nomenclatura: z.string().optional(),
});

export async function crearProducto(formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawCat = formData.get("categoria_id");
  const raw = {
    nombre: formData.get("nombre"),
    codigo_interno: formData.get("codigo_interno"),
    categoria_id: rawCat && String(rawCat).trim() !== "" ? String(rawCat) : null,
    descripcion: formData.get("descripcion") || undefined,
    nomenclatura: formData.get("nomenclatura") || undefined,
  };
  const parsed = productoSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("productos").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/catalogos");
  revalidatePath("/catalogos/productos");
  return { success: true };
}

export async function actualizarProducto(id: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawCat = formData.get("categoria_id");
  const raw = {
    nombre: formData.get("nombre"),
    codigo_interno: formData.get("codigo_interno"),
    categoria_id: rawCat && String(rawCat).trim() !== "" ? String(rawCat) : null,
    descripcion: formData.get("descripcion") || undefined,
    nomenclatura: formData.get("nomenclatura") || undefined,
  };
  const parsed = productoSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("productos")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogos");
  revalidatePath("/catalogos/productos");
  return { success: true };
}

// ─── Producto Completo (Todo en Uno) ──────────────────────────
export interface VarianteCompletaInput {
  color: string;
  talla?: string | null;
  sku?: string | null;
  stock_minimo?: number;
  stock_inicial?: number;
  costo_unitario_bs?: number | null;
}

export interface CrearProductoCompletoData {
  nombre: string;
  codigo_interno: string;
  categoria_id?: string | null;
  nueva_categoria?: string | null;
  descripcion?: string | null;
  nomenclatura?: string | null;
  variantes: VarianteCompletaInput[];
}

const varianteCompletaSchema = z.object({
  color: z.string().min(1, "El color es obligatorio"),
  talla: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  stock_minimo: z.coerce.number().int().min(0).default(0),
  stock_inicial: z.coerce.number().int().min(0).default(0),
  costo_unitario_bs: z.coerce.number().min(0).optional().nullable(),
});

const productoCompletoSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  codigo_interno: z.string().min(1, "El código interno es obligatorio"),
  categoria_id: z.string().uuid().nullable().optional(),
  nueva_categoria: z.string().optional().nullable(),
  descripcion: z.string().optional().nullable(),
  nomenclatura: z.string().optional().nullable(),
  variantes: z.array(varianteCompletaSchema).default([]),
});

export async function crearProductoCompleto(data: CrearProductoCompletoData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const parsed = productoCompletoSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // 1. Manejo de categoría (existente o nueva en caliente)
  let finalCategoriaId = parsed.data.categoria_id || null;
  if (parsed.data.nueva_categoria && parsed.data.nueva_categoria.trim() !== "") {
    const catNombre = parsed.data.nueva_categoria.trim();
    const { data: existingCat } = await supabase
      .from("categorias")
      .select("id")
      .ilike("nombre", catNombre)
      .maybeSingle();

    if (existingCat) {
      finalCategoriaId = existingCat.id;
    } else {
      const { data: newCat, error: errCat } = await supabase
        .from("categorias")
        .insert({ nombre: catNombre })
        .select("id")
        .single();
      if (errCat) {
        return { error: `Error al crear la categoría: ${errCat.message}` };
      }
      finalCategoriaId = newCat.id;
    }
  }

  // 2. Verificar código interno duplicado
  const { data: existingCode } = await supabase
    .from("productos")
    .select("id")
    .eq("codigo_interno", parsed.data.codigo_interno.trim())
    .maybeSingle();

  if (existingCode) {
    return { error: `Ya existe un producto con el código interno "${parsed.data.codigo_interno.trim()}"` };
  }

  // 3. Crear el producto base
  const { data: producto, error: errProd } = await supabase
    .from("productos")
    .insert({
      nombre: parsed.data.nombre.trim(),
      codigo_interno: parsed.data.codigo_interno.trim(),
      categoria_id: finalCategoriaId,
      descripcion: parsed.data.descripcion?.trim() || null,
      nomenclatura: parsed.data.nomenclatura?.trim() || null,
      activo: true,
    })
    .select("id")
    .single();

  if (errProd) {
    return { error: `Error al crear el producto: ${errProd.message}` };
  }

  // 4. Si hay variantes, crearlas
  const variantesInput = parsed.data.variantes;
  let variantesInsertadas: Array<{
    id: string;
    color: string;
    talla: string | null;
    sku: string | null;
    stock_inicial: number;
    costo_unitario_bs?: number | null;
  }> = [];

  if (variantesInput && variantesInput.length > 0) {
    // Validar duplicados de color + talla en la lista provista
    const keysSeen = new Set<string>();
    for (const v of variantesInput) {
      const key = `${v.color.trim().toLowerCase()}__${(v.talla || "").trim().toLowerCase()}`;
      if (keysSeen.has(key)) {
        return { error: `Hay variantes repetidas con el mismo color (${v.color}) y talla (${v.talla || "Única"}).` };
      }
      keysSeen.add(key);
    }

    const rowsToInsert = variantesInput.map((v) => ({
      producto_id: producto.id,
      color: v.color.trim(),
      talla: v.talla && v.talla.trim() !== "" ? v.talla.trim() : null,
      sku: v.sku && v.sku.trim() !== "" ? v.sku.trim() : null,
      stock_minimo: v.stock_minimo ?? 0,
      stock_actual: 0,
      stock_reservado: 0,
      activa: true,
      activo: true,
    }));

    const { data: insertedVars, error: errVars } = await supabase
      .from("variantes_producto")
      .insert(rowsToInsert)
      .select("id, color, talla, sku");

    if (errVars) {
      return { error: `El producto se creó, pero ocurrió un error al guardar las variantes: ${errVars.message}` };
    }

    // Unir IDs creados con sus datos de stock inicial
    variantesInsertadas = (insertedVars || []).map((ins) => {
      const match = variantesInput.find(
        (v) =>
          v.color.trim().toLowerCase() === ins.color.trim().toLowerCase() &&
          (v.talla?.trim().toLowerCase() || "") === (ins.talla?.trim().toLowerCase() || "")
      );
      return {
        id: ins.id,
        color: ins.color,
        talla: ins.talla,
        sku: ins.sku,
        stock_inicial: match?.stock_inicial ?? 0,
        costo_unitario_bs: match?.costo_unitario_bs ?? null,
      };
    });

    // 5. Cargar stock inicial mediante Lote si se ingresaron cantidades > 0
    const itemsConStock = variantesInsertadas.filter((v) => v.stock_inicial > 0);

    if (itemsConStock.length > 0) {
      const { data: maxRow } = await supabase
        .from("lotes")
        .select("numero_lote")
        .order("numero_lote", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumero = ((maxRow?.numero_lote as number) || 0) + 1;
      const today = new Date().toISOString().split("T")[0];

      const { data: lote, error: errLote } = await supabase
        .from("lotes")
        .insert({
          numero_lote: nextNumero,
          proveedor: "Inventario Inicial / Apertura",
          fecha_compra: today,
          fecha_recepcion: today,
          estado: "PENDIENTE",
          notas: `Lote automático generado por alta de producto "${parsed.data.nombre.trim()}" (${parsed.data.codigo_interno.trim()})`,
        })
        .select("id")
        .single();

      if (errLote) {
        return { error: `Producto y variantes creadas, pero falló al crear el lote de stock: ${errLote.message}` };
      }

      const detalleRows = itemsConStock.map((item) => ({
        lote_id: lote.id,
        variante_id: item.id,
        cantidad: item.stock_inicial,
        costo_unitario_bs: item.costo_unitario_bs != null ? item.costo_unitario_bs : null,
        otros_costos_bs: 0,
        cantidad_disponible: 0,
        cantidad_reservada: 0,
      }));

      const { error: errDetalle } = await supabase
        .from("detalle_lote")
        .insert(detalleRows);

      if (errDetalle) {
        return { error: `Error al registrar las unidades en el lote: ${errDetalle.message}` };
      }

      // Recibir lote para ingresar a inventario y kardex
      const { error: errRecibir } = await supabase.rpc("recibir_lote", {
        p_lote_id: lote.id,
      });

      if (errRecibir) {
        return { error: `Error al recibir lote e ingresar stock a Kardex: ${errRecibir.message}` };
      }
    }
  }

  // 6. Revalidar todas las rutas afectadas
  revalidatePath("/catalogos");
  revalidatePath("/catalogos/productos");
  revalidatePath("/catalogos/variantes");
  revalidatePath("/catalogos/categorias");
  revalidatePath("/inventario");
  revalidatePath("/lotes");
  revalidatePath("/pedidos/nuevo");

  const totalUnidades = variantesInsertadas.reduce((acc, curr) => acc + (curr.stock_inicial || 0), 0);

  return {
    success: true,
    productoId: producto.id,
    variantesCount: variantesInsertadas.length,
    unidadesStock: totalUnidades,
    variantes: variantesInsertadas,
  };
}

// ─── Variantes ───────────────────────────────────────────────
const varianteSchema = z.object({
  producto_id: z.string().uuid("Producto inválido"),
  color: z.string().min(1, "El color es obligatorio"),
  talla: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  stock_minimo: z.coerce.number().int().min(0).default(0),
});

export async function crearVariante(formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawSku = formData.get("sku");
  const rawTalla = formData.get("talla");
  const raw = {
    producto_id: formData.get("producto_id"),
    color: formData.get("color"),
    talla: rawTalla && String(rawTalla).trim() !== "" ? String(rawTalla) : null,
    sku: rawSku && String(rawSku).trim() !== "" ? String(rawSku) : null,
    stock_minimo: formData.get("stock_minimo") || 0,
  };
  const parsed = varianteSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("variantes_producto")
    .insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/catalogos");
  revalidatePath("/catalogos/variantes");
  return { success: true };
}

export interface CrearVarianteDirectaInput {
  producto_id: string;
  color: string;
  talla?: string | null;
  sku?: string | null;
  stock_minimo?: number;
}

export async function crearVarianteDirecta(input: CrearVarianteDirectaInput) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const parsed = varianteSchema.safeParse({
    producto_id: input.producto_id,
    color: input.color,
    talla: input.talla && input.talla.trim() !== "" ? input.talla.trim() : null,
    sku: input.sku && input.sku.trim() !== "" ? input.sku.trim() : null,
    stock_minimo: input.stock_minimo ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("variantes_producto")
    .insert(parsed.data)
    .select("id, producto_id, color, talla, sku, stock_actual, stock_minimo")
    .single();
  if (error) {
    // Si la variante ya existe (error de constraint unique en SKU o color/talla)
    if (error.code === "23505" || error.message?.includes("unique") || error.message?.includes("duplicate")) {
      // Buscar por producto_id y color
      const { data: existing } = await supabase
        .from("variantes_producto")
        .select("id, producto_id, color, talla, sku, stock_actual, stock_minimo")
        .eq("producto_id", input.producto_id)
        .ilike("color", input.color.trim())
        .maybeSingle();

      if (existing) {
        return { success: true, variante: existing };
      }

      // O buscar por SKU
      if (input.sku) {
        const { data: existingSku } = await supabase
          .from("variantes_producto")
          .select("id, producto_id, color, talla, sku, stock_actual, stock_minimo")
          .eq("sku", input.sku.trim())
          .maybeSingle();
        if (existingSku) {
          return { success: true, variante: existingSku };
        }
      }
    }
    return { error: error.message };
  }
  revalidatePath("/catalogos");
  revalidatePath("/catalogos/variantes");
  revalidatePath("/lotes");
  return { success: true, variante: data };
}

// ─── Catálogos simples (canales, sucursales, tipos_entrega, vendedores) ──────
const simpleSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  descripcion: z.string().optional(),
});

export async function crearCanal(formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const parsed = simpleSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("canales_venta").insert(parsed.data);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { success: true };
}

export async function actualizarCanal(id: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const parsed = simpleSchema.safeParse({
    nombre: formData.get("nombre"),
    descripcion: formData.get("descripcion") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("canales_venta").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { success: true };
}

export async function crearSucursal(formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("sucursales").insert({
    nombre: String(formData.get("nombre")),
    direccion: (formData.get("direccion") as string) || null,
    ciudad: (formData.get("ciudad") as string) || null,
    telefono: (formData.get("telefono") as string) || null,
  });
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { success: true };
}

export async function actualizarSucursal(id: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("sucursales").update({
    nombre: String(formData.get("nombre")),
    direccion: (formData.get("direccion") as string) || null,
    ciudad: (formData.get("ciudad") as string) || null,
    telefono: (formData.get("telefono") as string) || null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { success: true };
}

const vendedorSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  comision_porcentaje: z.coerce.number().min(0).max(60).default(0),
  perfil_id: z.string().uuid().optional().nullable(),
});

export async function crearVendedor(formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawPerfil = formData.get("perfil_id");
  const rawEmail = formData.get("email");
  const rawTel = formData.get("telefono");
  const raw = {
    nombre: formData.get("nombre"),
    telefono: rawTel && String(rawTel).trim() !== "" ? String(rawTel) : null,
    email: rawEmail && String(rawEmail).trim() !== "" ? String(rawEmail) : null,
    comision_porcentaje: formData.get("comision_porcentaje") || 0,
    perfil_id: rawPerfil && String(rawPerfil).trim() !== "" ? String(rawPerfil) : null,
  };
  const parsed = vendedorSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.from("vendedores").insert(parsed.data);
  if (error) return { error: error.message };

  if (parsed.data.perfil_id && parsed.data.nombre) {
    await supabase
      .from("perfiles")
      .update({ nombre: parsed.data.nombre })
      .eq("id", parsed.data.perfil_id);
  }

  revalidatePath("/configuracion");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function actualizarVendedor(id: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawPerfil = formData.get("perfil_id");
  const rawEmail = formData.get("email");
  const rawTel = formData.get("telefono");
  const raw = {
    nombre: formData.get("nombre"),
    telefono: rawTel && String(rawTel).trim() !== "" ? String(rawTel) : null,
    email: rawEmail && String(rawEmail).trim() !== "" ? String(rawEmail) : null,
    comision_porcentaje: formData.get("comision_porcentaje") || 0,
    perfil_id: rawPerfil && String(rawPerfil).trim() !== "" ? String(rawPerfil) : null,
  };
  const parsed = vendedorSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("vendedores")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };

  // Si tiene un perfil_id vinculado, actualizamos también el nombre en la tabla perfiles
  if (parsed.data.perfil_id && parsed.data.nombre) {
    await supabase
      .from("perfiles")
      .update({ nombre: parsed.data.nombre })
      .eq("id", parsed.data.perfil_id);
  }

  revalidatePath("/configuracion");
  revalidatePath("/", "layout");
  return { success: true };
}

// ─── Eliminar Categoría ─────────────────────────────────────
export async function eliminarCategoria(id: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("categorias").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogos/categorias");
  return { success: true };
}

// ─── Eliminar Producto ──────────────────────────────────────
export async function eliminarProducto(id: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("productos").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogos");
  revalidatePath("/catalogos/productos");
  return { success: true };
}

// ─── Actualizar Variante ────────────────────────────────────
export async function actualizarVariante(id: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawSku = formData.get("sku");
  const rawTalla = formData.get("talla");
  const raw = {
    producto_id: formData.get("producto_id"),
    color: formData.get("color"),
    talla: rawTalla && String(rawTalla).trim() !== "" ? String(rawTalla) : null,
    sku: rawSku && String(rawSku).trim() !== "" ? String(rawSku) : null,
    stock_minimo: formData.get("stock_minimo") || 0,
  };
  const parsed = varianteSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("variantes_producto")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogos");
  revalidatePath("/catalogos/variantes");
  return { success: true };
}

// ─── Eliminar Variante ──────────────────────────────────────
export async function eliminarVariante(id: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("variantes_producto").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catalogos");
  revalidatePath("/catalogos/variantes");
  return { success: true };
}

// ─── Eliminar Canal ─────────────────────────────────────────
export async function eliminarCanal(id: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("canales_venta").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { success: true };
}

// ─── Eliminar Sucursal ──────────────────────────────────────
export async function eliminarSucursal(id: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("sucursales").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  return { success: true };
}

// ─── Eliminar / Desactivar Vendedor ───────────────────────────
export async function eliminarVendedor(id: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();

  // Verificar si el vendedor tiene pedidos asociados
  const { count } = await supabase
    .from("pedidos")
    .select("id", { count: "exact", head: true })
    .eq("vendedor_id", id);

  if (count && count > 0) {
    // Si tiene pedidos, la BD impide borrarlo. Lo desactivamos e inhabilitamos.
    const { error: updateError } = await supabase
      .from("vendedores")
      .update({ activo: false, perfil_id: null })
      .eq("id", id);

    if (updateError) return { error: updateError.message };

    revalidatePath("/configuracion");
    return { success: true };
  }

  // Si no tiene pedidos, lo eliminamos físicamente
  const { error: deleteError } = await supabase.from("vendedores").delete().eq("id", id);
  if (deleteError) return { error: deleteError.message };

  revalidatePath("/configuracion");
  return { success: true };
}

// ─── Inversionistas ──────────────────────────────────────────
const inversionistaSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  activo: z.boolean().optional(),
});

export async function crearInversionista(formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawEmail = formData.get("email");
  const rawTel = formData.get("telefono");
  const parsed = inversionistaSchema.safeParse({
    nombre: formData.get("nombre"),
    telefono: rawTel && String(rawTel).trim() !== "" ? String(rawTel).trim() : null,
    email: rawEmail && String(rawEmail).trim() !== "" ? String(rawEmail).trim() : null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inversionistas")
    .insert({
      nombre: parsed.data.nombre,
      telefono: parsed.data.telefono,
      email: parsed.data.email,
    })
    .select("id, nombre")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  revalidatePath("/retiros");
  return { success: true, data };
}

export async function actualizarInversionista(id: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const rawEmail = formData.get("email");
  const rawTel = formData.get("telefono");
  const rawActivo = formData.get("activo");
  const parsed = inversionistaSchema.safeParse({
    nombre: formData.get("nombre"),
    telefono: rawTel && String(rawTel).trim() !== "" ? String(rawTel).trim() : null,
    email: rawEmail && String(rawEmail).trim() !== "" ? String(rawEmail).trim() : null,
    activo: rawActivo !== null ? rawActivo === "true" || rawActivo === "1" : true,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("inversionistas")
    .update(parsed.data)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/configuracion");
  revalidatePath("/retiros");
  return { success: true };
}

export async function eliminarInversionista(id: string) {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("inversionistas").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      const { error: updateError } = await supabase
        .from("inversionistas")
        .update({ activo: false })
        .eq("id", id);
      if (updateError) return { error: updateError.message };
      revalidatePath("/configuracion");
      revalidatePath("/retiros");
      return { success: true, desactivado: true };
    }
    return { error: error.message };
  }
  revalidatePath("/configuracion");
  revalidatePath("/retiros");
  return { success: true };
}
