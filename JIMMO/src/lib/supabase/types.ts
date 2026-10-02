// Tipos generados manualmente a partir del esquema Jimmo_V4_1.sql
// Cuando Supabase esté conectado, reemplazar con `npx supabase gen types typescript`

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RolUsuario = "admin" | "vendedor";
export type EstadoPedido = "RESERVADO" | "COMPLETADO" | "CANCELADO";
export type MetodoPago = "EFECTIVO" | "TRANSFERENCIA" | "QR" | "TARJETA" | "DEPOSITO" | "OTRO";
export type EstadoPago = "PENDIENTE" | "PAGADO" | "ANULADO";
export type TipoEntregaEnum = "RETIRO_TIENDA" | "FERIA" | "ENVIO" | "DELIVERY" | "OTRO";
export type EstadoEntrega = "PENDIENTE" | "PREPARANDO" | "ENVIADO" | "ENTREGADO" | "CANCELADO";
export type EstadoLote = "PENDIENTE" | "EN_TRANSITO" | "RECIBIDO" | "CERRADO" | "CANCELADO";
export type TipoMovimientoInventario =
  | "ENTRADA_COMPRA"
  | "SALIDA_VENTA"
  | "DEVOLUCION_VENTA"
  | "AJUSTE_ENTRADA"
  | "AJUSTE_SALIDA"
  | "OTRO";
export type OrigenRetiro = "CAPITAL" | "UTILIDAD";

export interface Database {
  public: {
    Tables: {
      perfiles: {
        Row: {
          id: string;
          email: string | null;
          nombre: string;
          rol: RolUsuario;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["perfiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["perfiles"]["Insert"]>;
      };
      clientes: {
        Row: {
          id: string;
          nombre: string;
          telefono: string | null;
          email: string | null;
          direccion: string | null;
          ciudad: string | null;
          notas: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["clientes"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["clientes"]["Insert"]>;
      };
      categorias: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          activo: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["categorias"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["categorias"]["Insert"]>;
      };
      productos: {
        Row: {
          id: string;
          categoria_id: string | null;
          nombre: string;
          codigo_interno: string;
          descripcion: string | null;
          nomenclatura: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["productos"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["productos"]["Insert"]>;
      };
      variantes_producto: {
        Row: {
          id: string;
          producto_id: string;
          color: string;
          talla: string | null;
          sku: string | null;
          stock_actual: number;
          stock_reservado: number;
          stock_minimo: number;
          activa: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["variantes_producto"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["variantes_producto"]["Insert"]>;
      };
      lotes: {
        Row: {
          id: string;
          numero_lote: number;
          fecha_compra: string | null;
          fecha_recepcion: string | null;
          tipo_cambio: number | null;
          proveedor: string | null;
          estado: EstadoLote;
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["lotes"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["lotes"]["Insert"]>;
      };
      detalle_lote: {
        Row: {
          id: string;
          lote_id: string;
          variante_id: string;
          cantidad: number;
          cantidad_disponible: number;
          cantidad_reservada: number;
          costo_unitario_usd: number | null;
          costo_unitario_bs: number | null;
          precio_lote: number | null;
          precio_detalle: number | null;
          otros_costos_bs: number;
          costo_total_bs: number | null;
          ingreso_minimo_bs: number | null;
          utilidad_minima_bs: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["detalle_lote"]["Row"], "id" | "created_at" | "costo_total_bs">;
        Update: Partial<Database["public"]["Tables"]["detalle_lote"]["Insert"]>;
      };
      costos_lote: {
        Row: {
          id: string;
          lote_id: string;
          concepto: string;
          monto_bs: number;
          fecha: string;
          notas: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["costos_lote"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["costos_lote"]["Insert"]>;
      };
      pedidos: {
        Row: {
          id: string;
          numero: number;
          cliente_id: string | null;
          vendedor_id: string;
          sucursal_id: string | null;
          canal_id: string | null;
          tipo_entrega_id: string | null;
          estado: EstadoPedido;
          total: number;
          lugar_entrega: string | null;
          lugar_envio: string | null;
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pedidos"]["Row"], "id" | "numero" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["pedidos"]["Insert"]>;
      };
      detalle_pedido: {
        Row: {
          id: string;
          pedido_id: string;
          variante_id: string;
          cantidad: number;
          precio_unitario: number;
          costo_unitario: number;
          subtotal: number | null;
          costo_total: number | null;
          utilidad: number | null;
          activo: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["detalle_pedido"]["Row"], "id" | "subtotal" | "costo_total" | "utilidad">;
        Update: Partial<Database["public"]["Tables"]["detalle_pedido"]["Insert"]>;
      };
      pagos: {
        Row: {
          id: string;
          pedido_id: string;
          monto: number;
          fecha_pago: string;
          metodo: MetodoPago;
          estado: EstadoPago;
          referencia: string | null;
          notas: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["pagos"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["pagos"]["Insert"]>;
      };
      reservas: {
        Row: {
          id: string;
          pedido_id: string;
          monto_reserva: number;
          monto_pendiente: number;
          fecha_reserva: string;
          fecha_limite: string | null;
          activa: boolean;
          notas: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["reservas"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["reservas"]["Insert"]>;
      };
      entregas: {
        Row: {
          id: string;
          pedido_id: string;
          transporte_id: string | null;
          fecha_programada: string | null;
          fecha_entrega: string | null;
          costo_delivery: number;
          estado: EstadoEntrega;
          notas: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["entregas"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["entregas"]["Insert"]>;
      };
      transportes: {
        Row: {
          id: string;
          nombre: string;
          telefono: string | null;
          activo: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["transportes"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["transportes"]["Insert"]>;
      };
      sucursales: {
        Row: {
          id: string;
          nombre: string;
          direccion: string | null;
          ciudad: string | null;
          telefono: string | null;
          activa: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sucursales"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["sucursales"]["Insert"]>;
      };
      canales_venta: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["canales_venta"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["canales_venta"]["Insert"]>;
      };
      tipos_entrega: {
        Row: {
          id: string;
          nombre: string;
          descripcion: string | null;
          activo: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["tipos_entrega"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["tipos_entrega"]["Insert"]>;
      };
      vendedores: {
        Row: {
          id: string;
          perfil_id: string | null;
          nombre: string;
          telefono: string | null;
          email: string | null;
          comision_porcentaje: number;
          sucursal_default_id: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vendedores"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["vendedores"]["Insert"]>;
      };
      inversionistas: {
        Row: {
          id: string;
          nombre: string;
          telefono: string | null;
          email: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["inversionistas"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["inversionistas"]["Insert"]>;
      };
      repartos_utilidad: {
        Row: {
          id: string;
          pedido_id: string | null;
          lote_id: string | null;
          inversionista_id: string | null;
          vendedor_id: string | null;
          tipo: string;
          porcentaje: number;
          monto: number;
          fecha: string;
          notas: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["repartos_utilidad"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["repartos_utilidad"]["Insert"]>;
      };
      movimientos_inventario: {
        Row: {
          id: string;
          variante_id: string;
          lote_id: string | null;
          pedido_id: string | null;
          tipo: TipoMovimientoInventario;
          cantidad: number;
          fecha: string;
          motivo: string | null;
          usuario_id: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["movimientos_inventario"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["movimientos_inventario"]["Insert"]>;
      };
      retiros: {
        Row: {
          id: string;
          fecha: string;
          monto: number;
          origen: OrigenRetiro;
          inversionista_id: string | null;
          vendedor_id: string | null;
          lote_id: string | null;
          pedido_id: string | null;
          descripcion: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["retiros"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["retiros"]["Insert"]>;
      };
    };
    Views: {
      vw_inventario: {
        Row: {
          variante_id: string;
          producto_id: string;
          producto: string;
          color: string;
          talla: string | null;
          sku: string | null;
          stock_actual: number;
          stock_reservado: number;
          stock_disponible: number;
          stock_minimo: number;
          stock_bajo: boolean;
        };
      };
      vw_pedidos: {
        Row: {
          id: string;
          numero: number;
          estado: EstadoPedido;
          total: number;
          total_pagado: number;
          saldo: number;
          cliente: string | null;
          vendedor: string | null;
          sucursal: string | null;
          canal: string | null;
          tipo_entrega: string | null;
          created_at: string;
        };
      };
      vw_rentabilidad_producto: {
        Row: {
          producto_id: string;
          producto: string;
          unidades_vendidas: number;
          ventas: number;
          costo: number;
          utilidad: number;
        };
      };
      vw_utilidad_vendedor: {
        Row: {
          vendedor_id: string;
          vendedor: string;
          pedidos_completados: number;
          ventas: number;
          costo: number;
          utilidad: number;
          comision_porcentaje: number;
          comision_vendedor: number;
        };
      };
      vw_rentabilidad_lote: {
        Row: {
          lote_id: string;
          numero_lote: number;
          ventas: number | null;
          costo_total: number | null;
          utilidad: number | null;
        };
      };
    };
    Functions: {
      crear_pedido: {
        Args: {
          p_cliente_id: string | null;
          p_vendedor_id: string;
          p_sucursal_id: string | null;
          p_canal_id: string | null;
          p_tipo_entrega_id: string | null;
          p_items: Json;
          p_reservar_stock?: boolean;
          p_monto_reserva?: number;
          p_lugar_entrega?: string | null;
          p_lugar_envio?: string | null;
          p_notas?: string | null;
        };
        Returns: string;
      };
      completar_pedido: { Args: { p_pedido_id: string }; Returns: void };
      cancelar_pedido: { Args: { p_pedido_id: string }; Returns: void };
      editar_pedido: {
        Args: {
          p_pedido_id: string;
          p_cliente_id: string | null;
          p_vendedor_id: string;
          p_sucursal_id: string | null;
          p_canal_id: string | null;
          p_tipo_entrega_id: string | null;
          p_items: Json;
          p_lugar_entrega?: string | null;
          p_lugar_envio?: string | null;
          p_notas?: string | null;
        };
        Returns: void;
      };
      registrar_pago: {
        Args: {
          p_pedido_id: string;
          p_monto: number;
          p_metodo: MetodoPago;
          p_referencia?: string | null;
          p_notas?: string | null;
        };
        Returns: string;
      };
      recibir_lote: { Args: { p_lote_id: string }; Returns: void };
      auto_recibir_lotes_vencidos: { Args: Record<string, never>; Returns: number };
    };
  };
}
