"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export interface ItemDevolucionInput {
  detalle_pedido_id: string;
  variante_id: string;
  cantidad: number;
  precio_unitario: number;
}

export interface ItemCambioInput {
  variante_id: string;
  cantidad: number;
  precio_unitario: number;
}

export interface DevolucionCambioInput {
  pedido_id: string;
  tipo: "DEVOLUCION" | "CAMBIO" | "DEVOLUCION_PARCIAL";
  motivo: string;
  monto_reembolso_bs?: number;
  items_devueltos: ItemDevolucionInput[];
  items_cambio?: ItemCambioInput[];
}

/**
 * Obtiene variantes con stock para el selector de cambio de prendas
 */
export async function obtenerVariantesDisponiblesParaCambio() {
  try {
    await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_inventario")
    .select("variante_id, producto_id, producto, color, talla, sku, stock_actual, stock_disponible")
    .gt("stock_actual", 0)
    .order("producto", { ascending: true });

  if (error) return { error: error.message };
  return { success: true, variantes: data || [] };
}

/**
 * Procesa una devolución o cambio post-venta para un pedido COMPLETADO
 */
export async function procesarDevolucionOCambio(input: DevolucionCambioInput) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err: any) {
    return { error: err.message || "Acceso denegado. Solo administradores pueden registrar devoluciones o cambios." };
  }

  if (!input.pedido_id) return { error: "ID de pedido no proporcionado" };
  if (!input.items_devueltos || input.items_devueltos.length === 0) {
    return { error: "Debes seleccionar al menos una prenda a devolver" };
  }

  const supabase = await createClient();

  // 1. Validar pedido
  const { data: pedido, error: errPed } = await supabase
    .from("pedidos")
    .select("id, numero, estado, total, notas, cliente_id, vendedor_id")
    .eq("id", input.pedido_id)
    .single();

  if (errPed || !pedido) return { error: "Pedido no encontrado" };
  if (pedido.estado !== "COMPLETADO") {
    return { error: "Solo se pueden procesar devoluciones o cambios en pedidos en estado COMPLETADO." };
  }

  // 2. Obtener detalles activos del pedido
  const { data: detalles, error: errDet } = await supabase
    .from("detalle_pedido")
    .select("id, variante_id, cantidad, precio_unitario, costo_unitario, subtotal, costo_total, utilidad, activo")
    .eq("pedido_id", input.pedido_id)
    .eq("activo", true);

  if (errDet || !detalles || detalles.length === 0) {
    return { error: "No se encontraron prendas activas en este pedido." };
  }

  // Validar cantidades a devolver
  for (const it of input.items_devueltos) {
    const dp = detalles.find((d) => d.id === it.detalle_pedido_id);
    if (!dp) return { error: `La prenda no forma parte de este pedido.` };
    if (it.cantidad <= 0) return { error: "La cantidad a devolver debe ser mayor a 0." };
    if (it.cantidad > dp.cantidad) {
      return { error: `No puedes devolver más prendas (${it.cantidad}) de las que se compraron (${dp.cantidad}).` };
    }
  }

  // Si es cambio, validar disponibilidad de stock de las nuevas prendas
  if (input.tipo === "CAMBIO" && input.items_cambio && input.items_cambio.length > 0) {
    for (const cambio of input.items_cambio) {
      if (cambio.cantidad <= 0) return { error: "La cantidad de cambio debe ser mayor a 0." };
      const { data: varStock } = await supabase
        .from("variantes_producto")
        .select("id, stock_actual, color, talla, productos(nombre)")
        .eq("id", cambio.variante_id)
        .single();

      if (!varStock || (varStock.stock_actual || 0) < cambio.cantidad) {
        const prod = (varStock as any)?.productos?.nombre || "Prenda";
        return {
          error: `Stock insuficiente para el cambio: ${prod} (${varStock?.color || ""} / ${varStock?.talla || ""}) solo tiene ${varStock?.stock_actual || 0} disponibles.`,
        };
      }
    }
  }

  // 3. Registrar en la tabla `devoluciones`
  const { data: devolucionRow, error: errDev } = await supabase
    .from("devoluciones")
    .insert({
      pedido_id: input.pedido_id,
      tipo: input.tipo,
      motivo: input.motivo || "Devolución / cambio post-venta",
      monto_reembolso_bs: Number(input.monto_reembolso_bs || 0),
      usuario_id: admin.id,
    })
    .select("id")
    .single();

  if (errDev || !devolucionRow) {
    return { error: `Error al registrar devolución: ${errDev?.message || "Desconocido"}` };
  }

  const devolucionId = devolucionRow.id;

  // 4. Procesar devolución de stock de las prendas devueltas
  for (const it of input.items_devueltos) {
    // 4.1 Insertar en detalle_devolucion
    await supabase.from("detalle_devolucion").insert({
      devolucion_id: devolucionId,
      variante_id: it.variante_id,
      cantidad: it.cantidad,
    });

    // 4.2 Restablecer stock en variantes_producto
    const { data: varActual } = await supabase
      .from("variantes_producto")
      .select("stock_actual")
      .eq("id", it.variante_id)
      .single();

    const nuevoStock = Number(varActual?.stock_actual || 0) + it.cantidad;
    await supabase
      .from("variantes_producto")
      .update({ stock_actual: nuevoStock })
      .eq("id", it.variante_id);

    // 4.3 Restablecer en detalle_lote y desactivar asignacion_fifo
    const { data: asignaciones } = await supabase
      .from("asignaciones_lote_pedido")
      .select("id, detalle_lote_id, cantidad, activa")
      .eq("detalle_pedido_id", it.detalle_pedido_id)
      .eq("activa", true);

    let cantidadPorDevolver = it.cantidad;
    let loteIdRestaurado: string | null = null;

    if (asignaciones && asignaciones.length > 0) {
      for (const asig of asignaciones) {
        if (cantidadPorDevolver <= 0) break;
        const cantRevertir = Math.min(asig.cantidad, cantidadPorDevolver);

        // Actualizar detalle_lote
        const { data: dl } = await supabase
          .from("detalle_lote")
          .select("id, lote_id, cantidad_disponible")
          .eq("id", asig.detalle_lote_id)
          .single();

        if (dl) {
          loteIdRestaurado = dl.lote_id;
          await supabase
            .from("detalle_lote")
            .update({ cantidad_disponible: Number(dl.cantidad_disponible || 0) + cantRevertir })
            .eq("id", dl.id);
        }

        // Actualizar asignacion_fifo
        if (asig.cantidad === cantRevertir) {
          await supabase
            .from("asignaciones_lote_pedido")
            .update({ activa: false })
            .eq("id", asig.id);
        } else {
          await supabase
            .from("asignaciones_lote_pedido")
            .update({ cantidad: asig.cantidad - cantRevertir })
            .eq("id", asig.id);
        }

        cantidadPorDevolver -= cantRevertir;
      }
    }

    // 4.4 Registrar movimiento de inventario DEVOLUCION_VENTA
    await supabase.from("movimientos_inventario").insert({
      variante_id: it.variante_id,
      lote_id: loteIdRestaurado,
      pedido_id: input.pedido_id,
      tipo: "DEVOLUCION_VENTA",
      cantidad: it.cantidad,
      motivo: `Devolución venta (Pedido #${pedido.numero}): ${input.motivo || "Post-venta"}`,
      usuario_id: admin.id,
    });

    // 4.5 Actualizar detalle_pedido
    const dp = detalles.find((d) => d.id === it.detalle_pedido_id)!;
    if (it.cantidad >= dp.cantidad) {
      // Devolución total del item
      await supabase
        .from("detalle_pedido")
        .update({
          activo: false,
          cantidad: 0,
          subtotal: 0,
          costo_total: 0,
          utilidad: 0,
        })
        .eq("id", dp.id);
    } else {
      // Devolución parcial del item
      const nuevaCant = dp.cantidad - it.cantidad;
      const nuevoSubtotal = nuevaCant * Number(dp.precio_unitario || 0);
      const nuevoCostoTotal = nuevaCant * Number(dp.costo_unitario || 0);
      const nuevaUtilidad = nuevoSubtotal - nuevoCostoTotal;

      await supabase
        .from("detalle_pedido")
        .update({
          cantidad: nuevaCant,
          subtotal: nuevoSubtotal,
          costo_total: nuevoCostoTotal,
          utilidad: nuevaUtilidad,
        })
        .eq("id", dp.id);
    }
  }

  // 5. Procesar cambio de prendas (si aplica)
  if (input.tipo === "CAMBIO" && input.items_cambio && input.items_cambio.length > 0) {
    for (const cambio of input.items_cambio) {
      // 5.1 Insertar en detalle_cambio
      await supabase.from("detalle_cambio").insert({
        devolucion_id: devolucionId,
        variante_id: cambio.variante_id,
        cantidad: cambio.cantidad,
      });

      // 5.2 Descontar de variantes_producto
      const { data: varCambio } = await supabase
        .from("variantes_producto")
        .select("stock_actual")
        .eq("id", cambio.variante_id)
        .single();

      const nuevoStock = Math.max(0, Number(varCambio?.stock_actual || 0) - cambio.cantidad);
      await supabase
        .from("variantes_producto")
        .update({ stock_actual: nuevoStock })
        .eq("id", cambio.variante_id);

      // 5.3 Encontrar lote con disponibilidad para costo y descuento
      const { data: lotesDisp } = await supabase
        .from("detalle_lote")
        .select("id, lote_id, cantidad_disponible, costo_unitario_bs")
        .eq("variante_id", cambio.variante_id)
        .gt("cantidad_disponible", 0)
        .order("created_at", { ascending: true })
        .limit(1);

      let costoUnitarioBs = 0;
      let loteIdUsado: string | null = null;

      if (lotesDisp && lotesDisp.length > 0) {
        const dl = lotesDisp[0];
        loteIdUsado = dl.lote_id;
        costoUnitarioBs = Number(dl.costo_unitario_bs || 0);
        const nuevoDisp = Math.max(0, Number(dl.cantidad_disponible || 0) - cambio.cantidad);
        await supabase
          .from("detalle_lote")
          .update({ cantidad_disponible: nuevoDisp })
          .eq("id", dl.id);
      }

      // 5.4 Registrar movimiento SALIDA_VENTA
      await supabase.from("movimientos_inventario").insert({
        variante_id: cambio.variante_id,
        lote_id: loteIdUsado,
        pedido_id: input.pedido_id,
        tipo: "SALIDA_VENTA",
        cantidad: cambio.cantidad,
        motivo: `Entrega por cambio de prenda (Pedido #${pedido.numero})`,
        usuario_id: admin.id,
      });

      // 5.5 Agregar nuevo item a detalle_pedido
      const subtotalItem = cambio.cantidad * Number(cambio.precio_unitario || 0);
      const costoTotalItem = cambio.cantidad * costoUnitarioBs;
      const utilidadItem = subtotalItem - costoTotalItem;

      await supabase.from("detalle_pedido").insert({
        pedido_id: input.pedido_id,
        variante_id: cambio.variante_id,
        cantidad: cambio.cantidad,
        precio_unitario: Number(cambio.precio_unitario || 0),
        costo_unitario: costoUnitarioBs,
        subtotal: subtotalItem,
        costo_total: costoTotalItem,
        utilidad: utilidadItem,
        activo: true,
      });
    }
  }

  // 6. Recalcular total del pedido y verificar si quedó en 0 (devolución total)
  const { data: detallesFinales } = await supabase
    .from("detalle_pedido")
    .select("subtotal, cantidad")
    .eq("pedido_id", input.pedido_id)
    .eq("activo", true);

  const activeCount = (detallesFinales || []).reduce((acc, d) => acc + (d.cantidad || 0), 0);
  const nuevoTotal = (detallesFinales || []).reduce((acc, d) => acc + Number(d.subtotal || 0), 0);

  const notaAjuste = `[Ajuste: ${input.tipo} - Motivo: ${input.motivo || "Sin nota"}]`;
  const notasActualizadas = pedido.notas ? `${pedido.notas} | ${notaAjuste}` : notaAjuste;

  if (activeCount === 0) {
    // Devolución total: anular pedido y cancelar pagos
    await supabase
      .from("pedidos")
      .update({
        estado: "CANCELADO",
        total: 0,
        notas: `${notasActualizadas} | [VENTA ANULADA POR DEVOLUCIÓN TOTAL]`,
      })
      .eq("id", input.pedido_id);

    // Anular los pagos de este pedido
    await supabase
      .from("pagos")
      .update({
        estado: "ANULADO",
        notas: `Anulado por devolución total de la venta`,
      })
      .eq("pedido_id", input.pedido_id);
  } else {
    // Devolución parcial o cambio
    await supabase
      .from("pedidos")
      .update({
        total: nuevoTotal,
        notas: notasActualizadas,
      })
      .eq("id", input.pedido_id);

    // Si hubo reembolso en efectivo, ajustar el pago para que el efectivo cuadre
    const montoReembolso = Number(input.monto_reembolso_bs || 0);
    if (montoReembolso > 0) {
      const { data: pagos } = await supabase
        .from("pagos")
        .select("id, monto, metodo, notas")
        .eq("pedido_id", input.pedido_id)
        .eq("estado", "PAGADO")
        .order("created_at", { ascending: false });

      if (pagos && pagos.length > 0) {
        let porReembolsar = montoReembolso;
        for (const p of pagos) {
          if (porReembolsar <= 0) break;
          const montoActual = Number(p.monto || 0);
          if (montoActual <= porReembolsar) {
            await supabase
              .from("pagos")
              .update({
                estado: "ANULADO",
                notas: `${p.notas || ""} [Reembolsado Bs ${montoActual} por devolución]`.trim(),
              })
              .eq("id", p.id);
            porReembolsar -= montoActual;
          } else {
            await supabase
              .from("pagos")
              .update({
                monto: montoActual - porReembolsar,
                notas: `${p.notas || ""} [Reembolsado en efectivo Bs ${porReembolsar} por devolución]`.trim(),
              })
              .eq("id", p.id);
            porReembolsar = 0;
          }
        }
      }
    }
  }

  // 7. Revalidar todas las rutas afectadas en la aplicación
  revalidatePath(`/pedidos/${input.pedido_id}`);
  revalidatePath("/pedidos");
  revalidatePath("/dashboard");
  revalidatePath("/clientes");
  revalidatePath("/lotes");
  revalidatePath("/inventario");
  revalidatePath("/pagos");
  revalidatePath("/catalogos");
  revalidatePath("/catalogos/productos");
  revalidatePath("/catalogos/variantes");
  revalidatePath("/reportes");
  revalidatePath("/reportes/rentabilidad-lote");
  revalidatePath("/reportes/rentabilidad-producto");
  revalidatePath("/reportes/utilidad-vendedor");
  revalidatePath("/reportes/utilidad-inversionista");

  return {
    success: true,
    esAnulacionTotal: activeCount === 0,
    nuevoTotal,
  };
}
