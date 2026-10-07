"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { editarPedido } from "@/features/pedidos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NuevoClienteInlineDialog } from "@/features/clientes/nuevo-cliente-inline-dialog";
import { ClienteCombobox } from "@/features/clientes/cliente-combobox";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, ShieldCheck, Layers, ScanLine, X, ShoppingCart } from "lucide-react";
import Link from "next/link";

export interface VariantOption {
  id: string;
  producto_id?: string;
  sku: string;
  nombre_producto: string;
  color?: string | null;
  talla?: string | null;
  precio_sugerido?: number | null;
  stock_disponible: number;
}

export interface ProductoOption {
  id: string;
  nombre: string;
  codigo_interno: string;
  descripcion?: string | null;
  categoria_id?: string | null;
  categorias?: { id: string; nombre: string } | null;
}

export interface CategoriaOption {
  id: string;
  nombre: string;
}

interface SelectOption {
  id: string;
  nombre: string;
  telefono?: string | null;
  ciudad?: string | null;
}

interface ItemRow {
  variante_id: string;
  cantidad: number;
  precio_unitario: number;
}

interface EditarPedidoFormProps {
  pedido: {
    id: string;
    numero: number;
    cliente_id?: string | null;
    vendedor_id: string;
    sucursal_id?: string | null;
    canal_id?: string | null;
    tipo_entrega_id?: string | null;
    lugar_entrega?: string | null;
    lugar_envio?: string | null;
    notas?: string | null;
    estado: string;
  };
  initialItems: ItemRow[];
  clientes: SelectOption[];
  vendedores: SelectOption[];
  sucursales: SelectOption[];
  canales: SelectOption[];
  tiposEntrega: SelectOption[];
  variantes: VariantOption[];
  productos?: ProductoOption[];
  categorias?: CategoriaOption[];
}

export function EditarPedidoForm({
  pedido,
  initialItems,
  clientes,
  vendedores,
  sucursales,
  canales,
  tiposEntrega,
  variantes,
  productos = [],
  categorias = [],
}: EditarPedidoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [clientList, setClientList] = useState<SelectOption[]>(clientes);
  const [clienteId, setClienteId] = useState<string>(pedido.cliente_id || "");
  const [vendedorId, setVendedorId] = useState<string>(pedido.vendedor_id || vendedores[0]?.id || "");
  const [sucursalId, setSucursalId] = useState<string>(pedido.sucursal_id || "");
  const [canalId, setCanalId] = useState<string>(pedido.canal_id || "");
  const [tipoEntregaId, setTipoEntregaId] = useState<string>(pedido.tipo_entrega_id || "");
  const [lugarEntrega, setLugarEntrega] = useState<string>(pedido.lugar_entrega || "");
  const [lugarEnvio, setLugarEnvio] = useState<string>(pedido.lugar_envio || "");
  const [notas, setNotas] = useState<string>(pedido.notas || "");

  const [items, setItems] = useState<ItemRow[]>(
    initialItems.length > 0
      ? initialItems
      : [{ variante_id: "", cantidad: 1, precio_unitario: 0 }]
  );

  // Filtros de Catálogo
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [productSearch, setProductSearch] = useState<string>("");

  // Agrupar variantes por producto para el catálogo visual
  const catalogProducts = useMemo(() => {
    const map = new Map<string, {
      id: string;
      nombre: string;
      codigo_interno: string;
      descripcion: string;
      categoria_nombre: string;
      total_stock: number;
      variantes: VariantOption[];
    }>();

    productos.forEach((p) => {
      map.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        codigo_interno: p.codigo_interno || "SKU",
        descripcion: p.descripcion || "",
        categoria_nombre: (p as any).categorias?.nombre || "General",
        total_stock: 0,
        variantes: [],
      });
    });

    variantes.forEach((v) => {
      const pId = v.producto_id;
      if (pId && map.has(pId)) {
        const prod = map.get(pId)!;
        prod.variantes.push(v);
        prod.total_stock += v.stock_disponible || 0;
      } else {
        const key = v.nombre_producto || "Producto";
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            nombre: v.nombre_producto,
            codigo_interno: v.sku?.split("-")[0] || "SKU",
            descripcion: "Prenda JIMMO",
            categoria_nombre: "General",
            total_stock: 0,
            variantes: [],
          });
        }
        const prod = map.get(key)!;
        prod.variantes.push(v);
        prod.total_stock += v.stock_disponible || 0;
      }
    });

    return Array.from(map.values()).filter((p) => p.variantes.length > 0);
  }, [productos, variantes]);

  // Tabs de categorías
  const categoryTabs = useMemo(() => {
    const set = new Set<string>();
    set.add("Todos");
    categorias.forEach((c) => {
      if (c.nombre) set.add(c.nombre);
    });
    catalogProducts.forEach((p) => {
      if (p.categoria_nombre && p.categoria_nombre !== "General") {
        set.add(p.categoria_nombre);
      }
    });
    return Array.from(set);
  }, [categorias, catalogProducts]);

  // Productos filtrados por búsqueda y categoría
  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const matchCategory =
        activeCategory === "Todos" ||
        p.categoria_nombre.toLowerCase() === activeCategory.toLowerCase();

      const q = productSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        p.codigo_interno.toLowerCase().includes(q) ||
        p.variantes.some(
          (v) =>
            v.sku.toLowerCase().includes(q) ||
            v.color?.toLowerCase().includes(q) ||
            v.talla?.toLowerCase().includes(q)
        );

      return matchCategory && matchSearch;
    });
  }, [catalogProducts, activeCategory, productSearch]);

  function handleAddVariant(v: VariantOption) {
    const existingIndex = items.findIndex((it) => it.variante_id === v.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].cantidad += 1;
      setItems(updated);
      toast.success(`+1 ${v.nombre_producto} (${v.color}/${v.talla})`);
    } else {
      setItems([
        ...items.filter((it) => it.variante_id !== ""),
        {
          variante_id: v.id,
          cantidad: 1,
          precio_unitario: Number(v.precio_sugerido || 0),
        },
      ]);
      toast.success(`Agregado: ${v.nombre_producto} (${v.color}/${v.talla})`);
    }
  }

  function addItem() {
    setItems([...items, { variante_id: "", cantidad: 1, precio_unitario: 0 }]);
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof ItemRow, value: any) {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };

    if (field === "variante_id") {
      const selectedVar = variantes.find((v) => v.id === value);
      if (selectedVar && selectedVar.precio_sugerido) {
        updated[index].precio_unitario = Number(selectedVar.precio_sugerido);
      }
    }
    setItems(updated);
  }

  const totalCalculado = items.reduce(
    (acc, it) => acc + (it.cantidad || 0) * (it.precio_unitario || 0),
    0
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!vendedorId) {
      toast.error("Debe seleccionar un vendedor");
      return;
    }

    const validItems = items.filter((it) => it.variante_id && it.cantidad > 0);
    if (validItems.length === 0) {
      toast.error("Debe seleccionar al menos un producto válido");
      return;
    }

    startTransition(async () => {
      const res = await editarPedido(pedido.id, {
        cliente_id: clienteId || null,
        vendedor_id: vendedorId,
        sucursal_id: sucursalId || null,
        canal_id: canalId || null,
        tipo_entrega_id: tipoEntregaId || null,
        lugar_entrega: lugarEntrega || null,
        lugar_envio: lugarEnvio || null,
        notas: notas || null,
        nuevo_estado: "RESERVADO",
        items: validItems,
      });

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`Pedido #${pedido.numero} actualizado exitosamente (Stock reajustado)`);
        router.push(`/pedidos/${pedido.id}`);
        router.refresh();
      }
    });
  }

  const selectedTipoEntrega = tiposEntrega.find((t) => t.id === tipoEntregaId);
  const tipoNombre = selectedTipoEntrega?.nombre?.toLowerCase() || "";
  const esEnTienda = tipoNombre.includes("tienda");
  const esEnvio = !esEnTienda && (tipoNombre.includes("envio") || tipoNombre.includes("envío") || tipoNombre.includes("flota") || tipoNombre.includes("ciudad"));
  const esPaqueteria = !esEnTienda && !esEnvio;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/pedidos/${pedido.id}`} className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Pedido #{pedido.numero}</h1>
            <p className="text-sm text-muted-foreground">
              Estado: <span className="font-semibold text-primary">{pedido.estado}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-muted-foreground uppercase font-semibold">Total Calculado</span>
          <p className="text-2xl font-extrabold text-primary">
            Bs {totalCalculado.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 p-3.5 rounded-xl flex items-center gap-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
        <p>
          Al guardar cambios en este pedido reservado, el sistema liberará las reservas anteriores y apartará nuevamente las unidades ajustadas de forma transaccional mediante FIFO.
        </p>
      </div>

      {/* Datos Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        {/* Cliente */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-foreground font-semibold">Cliente (Buscador / Selector)</Label>
            <NuevoClienteInlineDialog
              onClienteCreado={(nuevo) => {
                setClientList((prev) => [...prev, nuevo]);
                setClienteId(nuevo.id);
              }}
            />
          </div>
          <ClienteCombobox
            clientes={clientList}
            value={clienteId}
            onChange={(id) => setClienteId(id)}
            onClienteCreado={(nuevo) => {
              setClientList((prev) => [...prev, nuevo]);
              setClienteId(nuevo.id);
            }}
            placeholder="Buscar cliente por nombre, teléfono o ciudad..."
          />
        </div>

        {/* Vendedor */}
        <div className="space-y-1.5">
          <Label>Vendedor *</Label>
          <Select value={vendedorId} onValueChange={(val) => setVendedorId(val ?? "")} required>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar vendedor..." />
            </SelectTrigger>
            <SelectContent>
              {vendedores.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sucursal */}
        <div className="space-y-1.5">
          <Label>Sucursal de Despacho</Label>
          <Select value={sucursalId} onValueChange={(val) => setSucursalId(val ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar sucursal..." />
            </SelectTrigger>
            <SelectContent>
              {sucursales.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Canal de Venta */}
        <div className="space-y-1.5">
          <Label>Canal de Venta</Label>
          <Select value={canalId} onValueChange={(val) => setCanalId(val ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar canal..." />
            </SelectTrigger>
            <SelectContent>
              {canales.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Entrega */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-foreground border-b border-border pb-2">Información de Entrega</h3>

        <div className="space-y-3">
          <div className="space-y-1.5 max-w-sm">
            <Label>Tipo de Entrega</Label>
            <Select value={tipoEntregaId} onValueChange={(val) => setTipoEntregaId(val ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar entrega..." />
              </SelectTrigger>
              <SelectContent>
                {tiposEntrega.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipoEntregaId && (
            <div>
              {esEnTienda ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-lg text-xs flex items-center gap-2">
                  <span className="font-semibold">📍 En Tienda:</span> No se requieren datos adicionales de despacho.
                </div>
              ) : esEnvio ? (
                <div className="space-y-1.5 bg-muted/40 p-3 rounded-lg border border-border/60">
                  <Label className="text-foreground font-semibold flex items-center gap-1.5 text-xs">
                    🚌 Flota o Ciudad de destino *
                  </Label>
                  <Input
                    placeholder="Ej. Flota Copacabana / Cochabamba, Terminal Central"
                    value={lugarEnvio}
                    onChange={(e) => {
                      setLugarEnvio(e.target.value);
                      setLugarEntrega(e.target.value);
                    }}
                    className="bg-background"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Indica la empresa de transporte/flota y la ciudad de destino del cliente.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 bg-muted/40 p-3 rounded-lg border border-border/60">
                  <Label className="text-foreground font-semibold flex items-center gap-1.5 text-xs">
                    📦 Lugar / Nombre de la Paquetería *
                  </Label>
                  <Input
                    placeholder="Ej. Paquetería El Ceibo, Correos, etc."
                    value={lugarEntrega}
                    onChange={(e) => {
                      setLugarEntrega(e.target.value);
                      setLugarEnvio(e.target.value);
                    }}
                    className="bg-background"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Se dejará en esta paquetería local de la ciudad para que el comprador lo recoja.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN DE SELECCIÓN DE PRODUCTOS INTERACTIVA */}
      <div className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
              <Layers className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm sm:text-base">Catálogo &amp; Selección Rápida</h2>
              <p className="text-xs text-muted-foreground">Haz clic en cualquier variante para agregarla o sumarla al pedido.</p>
            </div>
          </div>

          {/* Pills de categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-zinc-950 text-white shadow-sm"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Buscador de productos */}
        <div className="relative">
          <ScanLine className="w-5 h-5 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Buscar producto por nombre, SKU o color..."
            className="pl-11 pr-4 h-11 bg-background rounded-xl border-border text-sm"
          />
          {productSearch && (
            <button
              type="button"
              onClick={() => setProductSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tarjetas del catálogo */}
        {filteredProducts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
            No se encontraron productos con el filtro aplicado.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1 scrollbar-thin">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-background border border-border/80 rounded-xl p-3 flex flex-col justify-between hover:border-zinc-400 hover:shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="bg-zinc-950 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {prod.codigo_interno}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] px-2 py-0.5 rounded-full">
                      {prod.total_stock} disp.
                    </span>
                  </div>

                  <h3 className="font-bold text-xs text-foreground mt-2 line-clamp-1">
                    {prod.nombre}
                  </h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {prod.categoria_nombre}
                  </p>

                  <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                    {prod.variantes.map((v) => {
                      const cartItem = items.find((it) => it.variante_id === v.id);
                      const isOutOfStock = v.stock_disponible <= 0;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddVariant(v)}
                          className={`text-left text-xs p-1.5 rounded-lg border transition-all flex items-center justify-between gap-1 ${
                            isOutOfStock
                              ? "opacity-40 cursor-not-allowed border-border/40 bg-muted/20 text-muted-foreground"
                              : cartItem
                              ? "border-zinc-950 bg-zinc-950 text-white shadow-xs font-semibold"
                              : "border-border hover:border-zinc-400 bg-card text-foreground hover:bg-muted/40"
                          }`}
                        >
                          <span className="truncate text-[10px]">
                            {v.color || "Color"} / {v.talla || "U"}
                          </span>
                          <span className={`text-[10px] font-mono shrink-0 ${cartItem ? "text-zinc-300 font-bold" : "text-muted-foreground"}`}>
                            {cartItem ? `x${cartItem.cantidad}` : `(${v.stock_disponible})`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Productos / Items del Pedido */}
      <div className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Productos en el Pedido</h2>
              <p className="text-xs text-muted-foreground">Ajusta cantidades o precios unitarios acordados.</p>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
            <Plus className="w-4 h-4" /> Agregar Fila Manual
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((row, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 items-end p-3 rounded-lg border border-border/60 bg-accent/20">
              <div className="col-span-12 sm:col-span-6 space-y-1.5">
                <Label className="text-xs">Producto / Variante *</Label>
                <Select
                  value={row.variante_id}
                  onValueChange={(val) => updateItem(idx, "variante_id", val ?? "")}
                  required
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Seleccionar prenda/SKU..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {variantes.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.nombre_producto} ({v.color}{v.talla ? ` - Talla ${v.talla}` : ""}) • Disp: {v.stock_disponible}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-5 sm:col-span-2 space-y-1.5">
                <Label className="text-xs">Cantidad *</Label>
                <Input
                  type="number"
                  min="1"
                  value={row.cantidad}
                  onChange={(e) => updateItem(idx, "cantidad", parseInt(e.target.value) || 1)}
                  className="bg-background"
                  required
                />
              </div>

              <div className="col-span-6 sm:col-span-3 space-y-1.5">
                <Label className="text-xs">Precio Unitario (Bs) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.precio_unitario}
                  onChange={(e) => updateItem(idx, "precio_unitario", Number(e.target.value))}
                  className="bg-background"
                  required
                />
              </div>

              <div className="col-span-1 flex justify-center pb-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Notas del pedido</Label>
        <Textarea
          placeholder="Instrucciones especiales de entrega o pago..."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="px-8 font-semibold">
          {isPending ? "Guardando cambios..." : "Guardar Cambios del Pedido"}
        </Button>
      </div>
    </form>
  );
}
