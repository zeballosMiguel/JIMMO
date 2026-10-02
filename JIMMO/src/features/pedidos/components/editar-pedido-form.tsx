"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editarPedido } from "@/features/pedidos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { NuevoClienteInlineDialog } from "@/features/clientes/nuevo-cliente-inline-dialog";
import { ClienteCombobox, ClienteOption } from "@/features/clientes/cliente-combobox";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface VariantOption {
  id: string;
  sku: string;
  nombre_producto: string;
  color?: string | null;
  talla?: string | null;
  precio_sugerido?: number | null;
  stock_disponible: number;
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

      {/* Productos / Items del Pedido */}
      <div className="space-y-4 bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Productos del Pedido</h2>
            <p className="text-xs text-muted-foreground">Agrega o ajusta las variantes de producto, cantidades y precios acordados.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-2">
            <Plus className="w-4 h-4" /> Agregar Producto
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
