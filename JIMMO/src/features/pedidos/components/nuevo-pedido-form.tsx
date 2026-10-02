"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { crearPedido } from "@/features/pedidos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NuevoClienteInlineDialog } from "@/features/clientes/nuevo-cliente-inline-dialog";
import { type ClienteOption } from "@/features/clientes/cliente-combobox";
import {
  ArrowLeft,
  User,
  Lock,
  Package,
  Truck,
  Store,
  Wallet,
  QrCode,
  CreditCard,
  Phone,
  MapPin,
  Search,
  X,
  Check,
  ShoppingCart,
  ScanLine,
  Pencil,
  Layers,
  Receipt,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export interface VariantOption {
  id: string;
  producto_id?: string;
  sku: string;
  nombre_producto: string;
  color?: string | null;
  talla?: string | null;
  precio_sugerido?: number | null;
  costo_unitario?: number | null;
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

export interface SelectOption {
  id: string;
  nombre: string;
  telefono?: string | null;
  ciudad?: string | null;
}

export interface NuevoPedidoFormProps {
  clientes: ClienteOption[];
  vendedores: SelectOption[];
  sucursales: SelectOption[];
  canales: SelectOption[];
  tiposEntrega: SelectOption[];
  variantes: VariantOption[];
  productos?: ProductoOption[];
  categorias?: CategoriaOption[];
  currentVendedorId?: string;
  isAdmin?: boolean;
}

interface CartItem {
  variante_id: string;
  nombre_producto: string;
  sku: string;
  color: string;
  talla: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
}

export function NuevoPedidoForm({
  clientes,
  vendedores,
  sucursales,
  canales,
  tiposEntrega,
  variantes,
  productos = [],
  categorias = [],
  currentVendedorId,
  isAdmin = false,
}: NuevoPedidoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Clientes
  const [clientList, setClientList] = useState<ClienteOption[]>(clientes);
  const [clienteId, setClienteId] = useState<string>("");
  const [clientSearchQuery, setClientSearchQuery] = useState<string>("");
  const [isClientSearchOpen, setIsClientSearchOpen] = useState<boolean>(false);
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // Vendedor, Canal, Sucursal
  const [vendedorId, setVendedorId] = useState<string>(
    currentVendedorId || vendedores[0]?.id || ""
  );
  const [sucursalId, setSucursalId] = useState<string>(sucursales[0]?.id || "");
  const [canalId, setCanalId] = useState<string>(canales[0]?.id || "");

  // Modalidad de cobro y despacho
  const [modalidadVenta, setModalidadVenta] = useState<"RESERVADO" | "COMPLETADO">("COMPLETADO");
  const [montoAdelanto, setMontoAdelanto] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<string>("EFECTIVO");
  const [tipoEntregaKey, setTipoEntregaKey] = useState<"tienda" | "flota" | "paqueteria">("tienda");
  const [lugarEntrega, setLugarEntrega] = useState<string>("");
  const [lugarEnvio, setLugarEnvio] = useState<string>("");
  const [notas, setNotas] = useState<string>("");

  // Productos / Variantes Filtros
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [productSearch, setProductSearch] = useState<string>("");

  // Items en la orden
  const [items, setItems] = useState<CartItem[]>([]);

  // Modal de revisión express tipo ticket
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [ticketDate, setTicketDate] = useState<string>("");

  // Cerrar dropdown de cliente al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientSearchRef.current && !clientSearchRef.current.contains(event.target as Node)) {
        setIsClientSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCliente = clientList.find((c) => c.id === clienteId);

  // Filtrar lista de clientes para el buscador
  const filteredClients = useMemo(() => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return clientList.slice(0, 8);
    return clientList
      .filter(
        (c) =>
          c.nombre?.toLowerCase().includes(q) ||
          c.telefono?.toLowerCase().includes(q) ||
          c.ciudad?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [clientList, clientSearchQuery]);

  // Agrupar variantes por producto para las tarjetas de catálogo
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

    // Indexar productos de catálogo si existen
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

    // Asignar variantes a sus productos correspondientes
    variantes.forEach((v) => {
      const pId = v.producto_id;
      if (pId && map.has(pId)) {
        const prod = map.get(pId)!;
        prod.variantes.push(v);
        prod.total_stock += v.stock_disponible || 0;
      } else {
        // Agrupar por nombre de producto si no tiene match directo de producto_id
        const key = v.nombre_producto || "Producto";
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            nombre: v.nombre_producto,
            codigo_interno: v.sku?.split("-")[0] || "SKU",
            descripcion: "Prenda de alta calidad JIMMO",
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

  // Categorías disponibles para los tabs
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

  // Filtrar productos por tab y por texto de búsqueda
  const filteredProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      // Filtro de categoría
      if (activeCategory !== "Todos") {
        const matchCat =
          p.categoria_nombre.toLowerCase() === activeCategory.toLowerCase() ||
          p.nombre.toLowerCase().includes(activeCategory.toLowerCase());
        if (!matchCat) return false;
      }

      // Filtro de búsqueda
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase().trim();
        const matchName = p.nombre.toLowerCase().includes(q);
        const matchSku = p.codigo_interno.toLowerCase().includes(q);
        const matchVariant = p.variantes.some(
          (v) =>
            v.sku.toLowerCase().includes(q) ||
            v.color?.toLowerCase().includes(q) ||
            v.talla?.toLowerCase().includes(q)
        );
        return matchName || matchSku || matchVariant;
      }

      return true;
    });
  }, [catalogProducts, activeCategory, productSearch]);

  // Agregar variante al carrito
  function handleAddVariant(v: VariantOption) {
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.variante_id === v.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          cantidad: updated[idx].cantidad + 1,
        };
        return updated;
      } else {
        const precio = v.precio_sugerido && v.precio_sugerido > 0 ? Number(v.precio_sugerido) : 0;
        const costo = v.costo_unitario && v.costo_unitario > 0 ? Number(v.costo_unitario) : precio * 0.75;
        return [
          ...prev,
          {
            variante_id: v.id,
            nombre_producto: v.nombre_producto,
            sku: v.sku,
            color: v.color || "Único",
            talla: v.talla || "U",
            cantidad: 1,
            precio_unitario: precio,
            costo_unitario: costo,
          },
        ];
      }
    });
  }

  // Modificar cantidad
  function updateQuantity(index: number, delta: number) {
    setItems((prev) => {
      const updated = [...prev];
      const newCant = updated[index].cantidad + delta;
      if (newCant <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = { ...updated[index], cantidad: newCant };
      return updated;
    });
  }

  // Modificar precio unitario
  function updatePrice(index: number, newPrice: number) {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        precio_unitario: isNaN(newPrice) ? 0 : Math.max(0, newPrice),
      };
      return updated;
    });
  }

  // Eliminar item
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Cálculos totales
  const totalCalculado = items.reduce(
    (acc, it) => acc + (it.cantidad || 0) * (it.precio_unitario || 0),
    0
  );

  const saldoPendiente =
    modalidadVenta === "RESERVADO"
      ? Math.max(0, totalCalculado - (montoAdelanto || 0))
      : 0;

  const currentVendedor = vendedores.find((v) => v.id === vendedorId);

  // Determinar ID real de tipo de entrega
  const resolvedTipoEntregaId = useMemo(() => {
    if (tipoEntregaKey === "tienda") {
      return tiposEntrega.find((t) => t.nombre.toLowerCase().includes("tienda"))?.id || tiposEntrega[0]?.id || "";
    }
    if (tipoEntregaKey === "flota") {
      return (
        tiposEntrega.find((t) => t.nombre.toLowerCase().includes("flota") || t.nombre.toLowerCase().includes("envio") || t.nombre.toLowerCase().includes("envío"))?.id ||
        tiposEntrega[1]?.id ||
        ""
      );
    }
    return (
      tiposEntrega.find((t) => t.nombre.toLowerCase().includes("paqueteria") || t.nombre.toLowerCase().includes("paquetería"))?.id ||
      tiposEntrega[2]?.id ||
      ""
    );
  }, [tipoEntregaKey, tiposEntrega]);

  // Abrir modal de revisión express previa validación
  function handleOpenReview(e: React.FormEvent) {
    e.preventDefault();
    if (!vendedorId) {
      toast.error("Debes seleccionar un vendedor");
      return;
    }
    if (items.length === 0) {
      toast.error("Selecciona al menos una variante de producto a la izquierda");
      return;
    }
    if (modalidadVenta === "RESERVADO") {
      if (montoAdelanto <= 0) {
        toast.error("Ingresa un monto de anticipo válido para reservar");
        return;
      }
      if (montoAdelanto > totalCalculado) {
        toast.error("El monto de anticipo no puede ser mayor al total");
        return;
      }
    }
    if (tipoEntregaKey === "flota" && !lugarEnvio.trim()) {
      toast.error("Debes especificar la Flota o Ciudad de destino");
      return;
    }
    if (tipoEntregaKey === "paqueteria" && !lugarEntrega.trim()) {
      toast.error("Debes indicar el nombre de la paquetería");
      return;
    }

    // Fecha actual formateada
    setTicketDate(
      new Date().toLocaleDateString("es-BO", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    setIsReviewModalOpen(true);
  }

  // Confirmar y registrar venta (Siguiente Venta)
  function handleConfirmarVenta() {
    startTransition(async () => {
      const res = await crearPedido({
        cliente_id: clienteId || null,
        vendedor_id: vendedorId,
        sucursal_id: sucursalId || null,
        canal_id: canalId || null,
        tipo_entrega_id: resolvedTipoEntregaId || null,
        reservar_stock: modalidadVenta === "RESERVADO",
        monto_reserva: modalidadVenta === "RESERVADO" ? montoAdelanto : totalCalculado,
        metodo_pago: metodoPago,
        referencia_pago: null,
        lugar_entrega: tipoEntregaKey === "paqueteria" ? lugarEntrega : lugarEnvio || null,
        lugar_envio: lugarEnvio || null,
        notas: notas || null,
        items: items.map((it) => ({
          variante_id: it.variante_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        })),
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        setIsReviewModalOpen(false);
        // Limpiar el formulario para la siguiente venta inmediata
        setItems([]);
        setClienteId("");
        setClientSearchQuery("");
        setMontoAdelanto(0);
        setModalidadVenta("COMPLETADO");
        setTipoEntregaKey("tienda");
        setLugarEntrega("");
        setLugarEnvio("");
        setNotas("");

        toast.success(
          modalidadVenta === "COMPLETADO"
            ? "¡Venta registrada exitosamente!"
            : "¡Reserva registrada con anticipo!",
          {
            description: "Formulario limpio y listo para el siguiente cliente.",
            action: res.id
              ? {
                label: "Ver Pedido",
                onClick: () => router.push(`/pedidos/${res.id}`),
              }
              : undefined,
            duration: 6000,
          }
        );
      }
    });
  }

  // Iniciales del cliente
  const clientInitials = useMemo(() => {
    if (!selectedCliente?.nombre) return "CL";
    const parts = selectedCliente.nombre.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }, [selectedCliente]);

  return (
    <form onSubmit={handleOpenReview} className="space-y-6">
      {/* HEADER DE PÁGINA */}
      <div className="flex items-center gap-3">
        <Link
          href="/pedidos"
          className="p-2 hover:bg-accent rounded-xl transition-colors shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nuevo Pedido</h1>
          <p className="text-xs text-muted-foreground">
            Selecciona el cliente, añade variantes al resumen y completa la venta.
          </p>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] xl:grid-cols-[1fr_420px] gap-6 items-start">

        {/* COLUMNA IZQUIERDA: CLIENTE + PRODUCTOS */}
        <div className="space-y-6">

          {/* SECCIÓN 1: DATOS DEL CLIENTE */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
                  <User className="w-4 h-4 text-rose-500" />
                </div>
                <h2 className="font-bold text-foreground text-sm sm:text-base">1. Datos del Cliente</h2>
              </div>
              <NuevoClienteInlineDialog
                onClienteCreado={(nuevo) => {
                  setClientList((prev) => [nuevo, ...prev]);
                  setClienteId(nuevo.id);
                  setClientSearchQuery("");
                  setIsClientSearchOpen(false);
                }}
              />
            </div>

            {/* Buscador de Cliente */}
            <div ref={clientSearchRef} className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={clientSearchQuery}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value);
                    setIsClientSearchOpen(true);
                  }}
                  onFocus={() => setIsClientSearchOpen(true)}
                  placeholder={selectedCliente ? selectedCliente.nombre : "Buscar cliente por nombre, teléfono o ciudad..."}
                  className="pl-10 pr-20 h-11 bg-background rounded-xl border-border text-sm"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ⌘K
                  </kbd>
                  {(clientSearchQuery || clienteId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setClienteId("");
                        setClientSearchQuery("");
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Dropdown de Clientes */}
              {isClientSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-border/60 max-h-64 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No se encontraron clientes con "{clientSearchQuery}". Usa "+ Nuevo Cliente Express" para registrarlo.
                    </div>
                  ) : (
                    filteredClients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setClienteId(c.id);
                          setClientSearchQuery("");
                          setIsClientSearchOpen(false);
                        }}
                        className="p-3 hover:bg-accent/60 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-foreground text-sm">{c.nombre}</p>
                          <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                            {c.telefono && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {c.telefono}
                              </span>
                            )}
                            {c.telefono && c.ciudad && <span>•</span>}
                            {c.ciudad && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {c.ciudad}
                              </span>
                            )}
                          </div>
                        </div>
                        {clienteId === c.id && (
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Tarjeta de Cliente Seleccionado */}
            {selectedCliente && (
              <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-2xl transition-all">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-zinc-950 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {clientInitials}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-foreground truncate">
                      {selectedCliente.nombre}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {selectedCliente.telefono && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" /> {selectedCliente.telefono}
                        </span>
                      )}
                      {selectedCliente.telefono && selectedCliente.ciudad && <span>•</span>}
                      {selectedCliente.ciudad && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" /> {selectedCliente.ciudad}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClienteId("")}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition-colors shrink-0"
                >
                  Cambiar
                </button>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: SELECCIÓN DE PRODUCTOS & VARIANTES */}
          <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
            {/* Header con icono y Tabs de Categorías */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
                  <Layers className="w-4 h-4 text-rose-500" />
                </div>
                <h2 className="font-bold text-foreground text-sm sm:text-base">
                  2. Selección de Productos &amp; Variantes
                </h2>
              </div>

              {/* Categorías Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {categoryTabs.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap transition-all ${activeCategory === cat
                      ? "bg-zinc-950 text-white shadow-sm"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Barra de Código de Barras / Búsqueda */}
            <div className="relative">
              <ScanLine className="w-5 h-5 text-rose-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="buscar producto por nombre, SKU o color..."
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

            {/* Grid de Tarjetas de Productos */}
            {filteredProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                No se encontraron productos con el filtro aplicado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-card border border-border/80 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-400 hover:shadow-sm transition-all group"
                  >
                    <div>
                      {/* SKU & Stock Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="bg-zinc-950 text-white font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          {prod.codigo_interno}
                        </span>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                          {prod.total_stock} disp.
                        </span>
                      </div>

                      {/* Nombre y descripción */}
                      <h3 className="font-bold text-sm text-foreground mt-2.5 line-clamp-1 group-hover:text-primary transition-colors">
                        {prod.nombre}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 min-h-[32px]">
                        {prod.categoria_nombre}
                      </p>

                      {/* Etiqueta de selección rápida */}
                      <p className="text-[11px] font-semibold text-muted-foreground mt-3 mb-2">
                        Selección Rápida de Variante:
                      </p>

                      {/* Chips de variantes */}
                      <div className="grid grid-cols-2 gap-1.5">
                        {prod.variantes.map((v) => {
                          const cartItem = items.find((it) => it.variante_id === v.id);
                          const isOutOfStock = v.stock_disponible <= 0;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => handleAddVariant(v)}
                              className={`text-left text-xs p-1.5 rounded-lg border transition-all flex items-center justify-between gap-1 ${isOutOfStock
                                ? "opacity-40 cursor-not-allowed border-border/40 bg-muted/20 text-muted-foreground"
                                : cartItem
                                  ? "border-zinc-950 bg-zinc-950 text-white shadow-xs font-semibold"
                                  : "border-border hover:border-zinc-400 bg-background text-foreground hover:bg-muted/40"
                                }`}
                            >
                              <span className="truncate text-[11px]">
                                {v.color || "Color"} / {v.talla || "U"}
                              </span>
                              <span
                                className={`text-[10px] font-mono shrink-0 ${cartItem ? "text-zinc-300 font-bold" : "text-muted-foreground"
                                  }`}
                              >
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
        </div>

        {/* COLUMNA DERECHA: PANEL STICKY DE VENTA / CHECKOUT */}
        <div className="lg:sticky lg:top-4 bg-card border border-border/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">

          {/* VENDEDOR */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              VENDEDOR
            </label>
            {isAdmin ? (
              <Select value={vendedorId} onValueChange={(val) => setVendedorId(val ?? "")} required>
                <SelectTrigger className="bg-background h-10 rounded-xl text-xs font-semibold">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <SelectValue placeholder="Seleccionar vendedor..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs font-medium">
                      {v.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-xl border border-border">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-foreground truncate">
                    {currentVendedor?.nombre || "Vendedor"}
                  </span>
                </div>
                <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </div>
            )}
          </div>

          {/* CANAL & SUCURSAL */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                CANAL
              </label>
              <Select value={canalId} onValueChange={(val) => setCanalId(val ?? "")}>
                <SelectTrigger className="bg-background h-9 rounded-xl text-xs font-medium">
                  <SelectValue placeholder="Canal..." />
                </SelectTrigger>
                <SelectContent>
                  {canales.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                SUCURSAL
              </label>
              <Select value={sucursalId} onValueChange={(val) => setSucursalId(val ?? "")}>
                <SelectTrigger className="bg-background h-9 rounded-xl text-xs font-medium">
                  <SelectValue placeholder="Sucursal..." />
                </SelectTrigger>
                <SelectContent>
                  {sucursales.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* BANNER: RESUMEN DE VENTA */}
          <div className="bg-zinc-950 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 tracking-wider text-xs uppercase shadow-sm">
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            RESUMEN DE VENTA
          </div>

          {/* LISTA DE ITEMS AGREGADOS */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5 scrollbar-thin">
            {items.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                No hay productos agregados.
                <br />
                <span className="text-[11px] text-muted-foreground/80">
                  Haz clic en las variantes de la izquierda
                </span>
              </div>
            ) : (
              items.map((item, idx) => {
                const subtotal = item.cantidad * item.precio_unitario;
                const fifoGain = (item.precio_unitario - item.costo_unitario) * item.cantidad;
                return (
                  <div
                    key={item.variante_id}
                    className="bg-muted/40 border border-border/80 rounded-xl p-3 space-y-1.5 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-xs text-foreground leading-tight truncate">
                        {item.nombre_producto}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-zinc-800 bg-zinc-200/80 px-1.5 py-0.5 rounded text-[11px]">
                          {item.color} / {item.talla}
                        </span>
                        <div
                          className="flex items-center border border-border rounded-lg bg-background px-1.5 py-0.5 shadow-xs focus-within:ring-1 focus-within:ring-primary"
                          title="Precio de venta unitario (editable por el vendedor)"
                        >
                          <span className="text-[10px] font-bold text-muted-foreground mr-1">Bs</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={item.precio_unitario === 0 ? "" : item.precio_unitario}
                            onChange={(e) => updatePrice(idx, Number(e.target.value))}
                            className="w-16 bg-transparent text-xs font-bold text-foreground text-right focus:outline-none tabular-nums"
                            placeholder="0.00"
                          />
                          <span className="text-[10px] text-muted-foreground ml-1">c/u</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Stepper */}
                        <div className="flex items-center border border-border rounded-lg bg-background overflow-hidden h-7">
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, -1)}
                            className="w-6 h-full flex items-center justify-center text-xs hover:bg-muted text-muted-foreground"
                          >
                            -
                          </button>
                          <span className="w-7 text-center font-bold text-xs tabular-nums">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, 1)}
                            className="w-6 h-full flex items-center justify-center text-xs hover:bg-muted text-muted-foreground"
                          >
                            +
                          </button>
                        </div>

                        {/* Subtotal */}
                        <span className="font-bold text-xs tabular-nums text-foreground min-w-[60px] text-right">
                          Bs {subtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* TOTAL A PAGAR BOX */}
          <div className="bg-zinc-950 text-white rounded-2xl p-4 shadow-md">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-medium mb-1">
              <span>Total a Pagar:</span>
              <span className="text-base font-bold text-white">Bs</span>
            </div>
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
                {totalCalculado.toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* MÉTODO DE COBRO */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Método de Cobro:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago("EFECTIVO")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${metodoPago === "EFECTIVO"
                  ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
              >
                <Wallet className="w-4 h-4" />
                Efectivo
              </button>

              <button
                type="button"
                onClick={() => setMetodoPago("QR")}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${metodoPago === "QR"
                  ? "bg-zinc-950 text-white border-zinc-950 shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
              >
                <QrCode className="w-4 h-4" />
                QR Simple
              </button>
            </div>
          </div>

          {/* CONDICIÓN DE PAGO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                CONDICIÓN DE PAGO
              </label>
              {modalidadVenta === "RESERVADO" && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Estado: RESERVADO
                </span>
              )}
            </div>
            <div className="bg-muted/70 p-1 rounded-xl grid grid-cols-2 gap-1 text-center text-xs">
              <button
                type="button"
                onClick={() => setModalidadVenta("COMPLETADO")}
                className={`py-1.5 rounded-lg transition-all ${modalidadVenta === "COMPLETADO"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-medium"
                  }`}
              >
                Total
              </button>
              <button
                type="button"
                onClick={() => setModalidadVenta("RESERVADO")}
                className={`py-1.5 rounded-lg transition-all ${modalidadVenta === "RESERVADO"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground font-medium"
                  }`}
              >
                Reservado
              </button>
            </div>

            {modalidadVenta === "RESERVADO" && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Anticipo Recibido:
                  </span>
                  <div className="flex items-center border border-border rounded-xl bg-background px-2.5 py-1 w-36">
                    <span className="text-xs font-bold text-muted-foreground mr-1.5">Bs</span>
                    <input
                      type="number"
                      min="0"
                      max={totalCalculado}
                      step="0.01"
                      value={montoAdelanto || ""}
                      onChange={(e) => setMontoAdelanto(Number(e.target.value))}
                      className="w-full bg-transparent text-right font-bold text-sm focus:outline-none"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
                    <CreditCard className="w-4 h-4 text-rose-500" />
                    Saldo por Cobrar:
                  </div>
                  <span className="font-extrabold text-sm sm:text-base text-rose-700 tabular-nums">
                    Bs {saldoPendiente.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* MODALIDAD DE DESPACHO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                MODALIDAD DE DESPACHO
              </label>
              <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" /> Obligatorio
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipoEntregaKey("tienda")}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all ${tipoEntregaKey === "tienda"
                  ? "border-zinc-950 bg-zinc-950 text-white shadow-xs"
                  : "border-border bg-background hover:bg-muted text-foreground"
                  }`}
              >
                <Store className="w-4 h-4" />
                <span className="text-[10px] font-semibold leading-tight">Retiro en Tienda</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoEntregaKey("flota")}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all ${tipoEntregaKey === "flota"
                  ? "border-zinc-950 bg-zinc-950 text-white shadow-xs"
                  : "border-border bg-background hover:bg-muted text-foreground"
                  }`}
              >
                <Truck className="w-4 h-4" />
                <span className="text-[10px] font-semibold leading-tight">Envío Flota / Ciudad</span>
              </button>

              <button
                type="button"
                onClick={() => setTipoEntregaKey("paqueteria")}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all ${tipoEntregaKey === "paqueteria"
                  ? "border-zinc-950 bg-zinc-950 text-white shadow-xs"
                  : "border-border bg-background hover:bg-muted text-foreground"
                  }`}
              >
                <Package className="w-4 h-4" />
                <span className="text-[10px] font-semibold leading-tight">Paquetería Local</span>
              </button>
            </div>

            {/* Inputs dinámicos para Despacho */}
            {tipoEntregaKey === "flota" && (
              <div className="space-y-1 pt-1">
                <Label className="text-xs text-muted-foreground">Flota / Ciudad de destino *</Label>
                <Input
                  placeholder="Ej. Flota Copacabana / Cochabamba"
                  value={lugarEnvio}
                  onChange={(e) => {
                    setLugarEnvio(e.target.value);
                    setLugarEntrega(e.target.value);
                  }}
                  className="h-9 text-xs bg-background rounded-lg"
                  required
                />
              </div>
            )}

            {tipoEntregaKey === "paqueteria" && (
              <div className="space-y-1 pt-1">
                <Label className="text-xs text-muted-foreground">Nombre de paquetería *</Label>
                <Input
                  placeholder="Ej. Shalom, TransCopacabana, etc."
                  value={lugarEntrega}
                  onChange={(e) => {
                    setLugarEntrega(e.target.value);
                    setLugarEnvio(e.target.value);
                  }}
                  className="h-9 text-xs bg-background rounded-lg"
                  required
                />
              </div>
            )}
          </div>

          {/* NOTA */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Nota
            </label>
            <Input
              placeholder="Instrucciones especiales..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="h-9 text-xs bg-background rounded-lg"
            />
          </div>

          {/* BOTÓN REVISAR TICKET / REGISTRAR PEDIDO */}
          <Button
            type="submit"
            disabled={items.length === 0}
            className="w-full h-12 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs tracking-wider flex items-center justify-center gap-2 border-2 border-zinc-950 shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            {modalidadVenta === "RESERVADO" ? "REVISAR Y REGISTRAR RESERVA" : "REVISAR Y REGISTRAR VENTA"}
          </Button>
        </div>
      </div>

      {/* MODAL TICKET EXPRESS DE REVISIÓN PREVIA */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-card border border-border/90 text-foreground rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Ticket - Estilo Recibo JIMMO */}
            <div className="bg-zinc-950 text-white p-5 text-center relative shrink-0">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="absolute right-4 top-4 text-zinc-400 hover:text-white p-1 rounded-full transition-colors"
                title="Cerrar revisión"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 text-[10px] font-bold tracking-widest uppercase text-emerald-400 mb-2">
                <Receipt className="w-3.5 h-3.5" />
                JIMMO APPAREL • POS
              </div>
              <h3 className="text-lg font-black tracking-tight text-white uppercase">
                Ticket Express de Venta
              </h3>
              <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" /> {ticketDate || "Hoy"}
                </span>
                <span>•</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] uppercase ${modalidadVenta === "RESERVADO"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                >
                  {modalidadVenta === "RESERVADO" ? "Reserva con Anticipo" : "Venta Directa"}
                </span>
              </div>
            </div>

            {/* Contenido del Recibo */}
            <div className="p-5 overflow-y-auto space-y-4 scrollbar-thin text-xs">
              {/* Metadatos en grid simplificado */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-3 rounded-xl border border-border/50">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground truncate" title={currentVendedor?.nombre}>
                    {currentVendedor?.nombre || "Vendedor"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-bold text-foreground truncate" title={selectedCliente?.nombre}>
                    {selectedCliente?.nombre || "Cliente Ocasional"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {metodoPago === "EFECTIVO" ? (
                    <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <QrCode className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                  <span className="font-medium text-foreground">
                    {metodoPago === "EFECTIVO" ? "Efectivo" : "QR Simple"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium text-foreground truncate">
                    {tipoEntregaKey === "tienda" && "Tienda"}
                    {tipoEntregaKey === "flota" && (lugarEnvio ? `Flota: ${lugarEnvio}` : "Flota")}
                    {tipoEntregaKey === "paqueteria" && (lugarEntrega ? `Paquetería: ${lugarEntrega}` : "Paquetería")}
                  </span>
                </div>
                {notas && (
                  <div className="col-span-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground italic truncate">
                    Nota: {notas}
                  </div>
                )}
              </div>

              {/* Línea perforada estilo ticket */}
              <div className="relative py-0.5">
                <div className="border-t-2 border-dashed border-border" />
              </div>

              {/* Detalle de prendas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                  <span>Cant • Prenda / Variante</span>
                  <span>Subtotal</span>
                </div>
                <div className="space-y-1.5 divide-y divide-border/40">
                  {items.map((it) => (
                    <div
                      key={it.variante_id}
                      className="pt-1.5 first:pt-0 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold text-foreground truncate">
                          <span className="text-primary font-black mr-1">{it.cantidad}x</span>
                          {it.nombre_producto}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-medium">
                          {it.color} / {it.talla} •{" "}
                          <span className="tabular-nums">Bs {it.precio_unitario.toFixed(2)} c/u</span>
                        </div>
                      </div>
                      <div className="font-bold tabular-nums text-foreground shrink-0 text-right">
                        Bs {(it.cantidad * it.precio_unitario).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Línea perforada estilo ticket */}
              <div className="relative py-0.5">
                <div className="border-t-2 border-dashed border-border" />
              </div>

              {/* Bloque Financiero / Totales */}
              <div className="space-y-2 bg-muted/40 p-3.5 rounded-2xl border border-border/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-muted-foreground uppercase tracking-wider text-[11px]">
                    Total de Venta
                  </span>
                  <span className="font-black text-base text-foreground tabular-nums">
                    Bs {totalCalculado.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {modalidadVenta === "RESERVADO" ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
                      <span className="font-semibold">Anticipo Recibido:</span>
                      <span className="font-bold tabular-nums">
                        Bs {montoAdelanto.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 pt-1 border-t border-border/50">
                      <span className="font-bold">Saldo Pendiente al Retirar:</span>
                      <span className="font-extrabold text-sm tabular-nums">
                        Bs {saldoPendiente.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 pt-1 border-t border-border/50">
                    <span className="font-bold">Monto Cobrado (100%):</span>
                    <span className="font-bold tabular-nums">
                      Bs {totalCalculado.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Mensaje de advertencia simplificado */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Verifica los datos antes de confirmar. La venta se registrará inmediatamente.</span>
              </div>
            </div>

            {/* Footer con los dos botones */}
            <div className="p-4 bg-muted/30 border-t border-border/80 grid grid-cols-2 gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReviewModalOpen(false)}
                className="h-11 rounded-xl text-xs font-bold border-border bg-background hover:bg-muted text-foreground flex items-center justify-center gap-1.5 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar Pedido
              </Button>

              <Button
                type="button"
                disabled={isPending}
                onClick={handleConfirmarVenta}
                className="h-11 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>REGISTRANDO...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3] text-emerald-400" />
                    <span>CONFIRMAR Y SIGUIENTE</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
