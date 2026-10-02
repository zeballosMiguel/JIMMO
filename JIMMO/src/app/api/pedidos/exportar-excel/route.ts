import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/session";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "No autenticado" },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const estado = searchParams.get("estado");

  const supabase = await createClient();

  let query = supabase
    .from("pedidos")
    .select(`
      id,
      numero,
      created_at,
      estado,
      vendedores ( nombre ),
      clientes ( nombre ),
      detalle_pedido (
        id,
        cantidad,
        precio_unitario,
        subtotal,
        activo,
        variantes_producto (
          sku,
          color,
          talla,
          productos (
            nombre
          )
        )
      )
    `)
    .order("created_at", { ascending: false });

  if (estado && estado !== "TODOS") {
    query = query.eq("estado", estado);
  } else if (!estado) {
    // Por defecto exportar ventas completadas y pendientes (reservados)
    query = query.in("estado", ["COMPLETADO", "RESERVADO"]);
  }

  const { data: pedidos, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: any[] = [];

  for (const p of pedidos || []) {
    const fecha = p.created_at
      ? new Date(p.created_at).toLocaleDateString("es-BO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

    const vendedor = (p.vendedores as any)?.nombre ?? "—";
    const cliente = (p.clientes as any)?.nombre ?? "Cliente Ocasional";
    const items = (p.detalle_pedido || []).filter((d: any) => d.activo !== false);

    if (items.length === 0) {
      rows.push({
        "N° Pedido": `#${p.numero}`,
        "Fecha": fecha,
        "Vendedor": vendedor,
        "Cliente": cliente,
        "Producto": "Sin productos",
        "Color": "—",
        "Talla": "—",
        "SKU": "—",
        "Cantidad": 0,
        "Precio Unitario (Bs.)": 0,
        "Subtotal (Bs.)": 0,
        "Estado": p.estado,
      });
    } else {
      for (const it of items) {
        const vp = it.variantes_producto as any;
        const prodNombre = vp?.productos?.nombre ?? "—";
        const color = vp?.color ?? "—";
        const talla = vp?.talla ?? "—";
        const sku = vp?.sku ?? "—";
        const cant = Number(it.cantidad || 0);
        const pu = Number(it.precio_unitario || 0);
        const subtotal = Number(it.subtotal ?? cant * pu);

        rows.push({
          "N° Pedido": `#${p.numero}`,
          "Fecha": fecha,
          "Vendedor": vendedor,
          "Cliente": cliente,
          "Producto": prodNombre,
          "Color": color,
          "Talla": talla,
          "SKU": sku,
          "Cantidad": cant,
          "Precio Unitario (Bs.)": Number(pu.toFixed(2)),
          "Subtotal (Bs.)": Number(subtotal.toFixed(2)),
          "Estado": p.estado,
        });
      }
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 12 }, // N° Pedido
    { wch: 14 }, // Fecha
    { wch: 22 }, // Vendedor
    { wch: 24 }, // Cliente
    { wch: 30 }, // Producto
    { wch: 14 }, // Color
    { wch: 10 }, // Talla
    { wch: 16 }, // SKU
    { wch: 10 }, // Cantidad
    { wch: 20 }, // Precio Unitario (Bs.)
    { wch: 18 }, // Subtotal (Bs.)
    { wch: 16 }, // Estado
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas y Pedidos");

  const excelBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const fechaHoy = new Date().toISOString().split("T")[0];
  const filename = `reporte_pedidos_${fechaHoy}.xlsx`;

  return new NextResponse(excelBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
