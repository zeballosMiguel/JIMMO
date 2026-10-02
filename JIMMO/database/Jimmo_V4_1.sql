/* ============================================================
   JIMMO V4
   Sistema de Ventas, Inventario, Lotes, Reservas y Utilidades
   PostgreSQL / Supabase

   PRINCIPIOS:
   1. INVENTARIO GENERAL:
      El stock pertenece a la variante, no a una sucursal.

   2. SUCURSALES:
      Se utilizan para registrar dónde se realizó la venta,
      pero NO tienen inventario independiente.

   3. FIFO:
      El costo de venta se determina automáticamente usando
      los lotes más antiguos disponibles.

   4. RESERVAS:
      Una venta puede reservar stock y registrar un monto
      de reserva/pago inicial.

   5. UTILIDAD:
      La utilidad real se calcula usando el costo FIFO.
      No se acepta costo enviado por el frontend.

   ============================================================ */


-- ============================================================
-- 0. EXTENSIONES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE rol_usuario AS ENUM (
    'admin',
    'vendedor'
);

CREATE TYPE estado_pedido_venta AS ENUM (
    'BORRADOR',
    'RESERVADO',
    'COMPLETADO',
    'CANCELADO'
);

CREATE TYPE estado_pago AS ENUM (
    'PENDIENTE',
    'PAGADO',
    'ANULADO'
);

CREATE TYPE metodo_pago AS ENUM (
    'EFECTIVO',
    'TRANSFERENCIA',
    'QR',
    'TARJETA',
    'DEPOSITO',
    'OTRO'
);

CREATE TYPE tipo_movimiento_inventario AS ENUM (
    'ENTRADA_COMPRA',
    'SALIDA_VENTA',
    'DEVOLUCION_VENTA',
    'AJUSTE_ENTRADA',
    'AJUSTE_SALIDA',
    'OTRO'
);

CREATE TYPE tipo_entrega AS ENUM (
    'RETIRO_TIENDA',
    'FERIA',
    'ENVIO',
    'DELIVERY',
    'OTRO'
);

CREATE TYPE estado_entrega AS ENUM (
    'PENDIENTE',
    'PREPARANDO',
    'ENVIADO',
    'ENTREGADO',
    'CANCELADO'
);

CREATE TYPE estado_lote AS ENUM (
    'PENDIENTE',
    'EN_TRANSITO',
    'RECIBIDO',
    'CERRADO',
    'CANCELADO'
);

CREATE TYPE origen_retiro AS ENUM (
    'CAPITAL',
    'UTILIDAD'
);

CREATE TYPE tipo_reparto AS ENUM (
    'EMPRESA',
    'VENDEDOR',
    'INVERSIONISTA',
    'COMISION',
    'OTRO'
);


-- ============================================================
-- 2. SUCURSALES
-- ============================================================

CREATE TABLE sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL,
    direccion TEXT,
    ciudad TEXT,
    telefono TEXT,

    activa BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 3. CANALES DE VENTA
-- ============================================================

CREATE TABLE canales_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 4. TIPOS DE ENTREGA
-- ============================================================

CREATE TABLE tipos_entrega (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================================
-- 5. PERFILES
-- ============================================================

CREATE TABLE perfiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    email TEXT,
    nombre TEXT NOT NULL,

    rol rol_usuario NOT NULL DEFAULT 'vendedor',

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 6. USUARIO - SUCURSAL
-- ============================================================

CREATE TABLE usuario_sucursal (
    usuario_id UUID NOT NULL
        REFERENCES perfiles(id)
        ON DELETE CASCADE,

    sucursal_id UUID NOT NULL
        REFERENCES sucursales(id)
        ON DELETE CASCADE,

    PRIMARY KEY (usuario_id, sucursal_id)
);


-- ============================================================
-- 7. VENDEDORES
-- ============================================================

CREATE TABLE vendedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    perfil_id UUID UNIQUE
        REFERENCES perfiles(id)
        ON DELETE SET NULL,

    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,

    /*
       Porcentaje de utilidad que corresponde al vendedor.

       Ejemplo:
       10 = 10% de la utilidad.
    */
    comision_porcentaje NUMERIC(5,2)
        NOT NULL DEFAULT 0
        CHECK (
            comision_porcentaje >= 0
            AND comision_porcentaje <= 60
        ),

    sucursal_default_id UUID
        REFERENCES sucursales(id)
        ON DELETE SET NULL,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 8. VENDEDOR - SUCURSAL
-- ============================================================

CREATE TABLE vendedor_sucursal (
    vendedor_id UUID NOT NULL
        REFERENCES vendedores(id)
        ON DELETE CASCADE,

    sucursal_id UUID NOT NULL
        REFERENCES sucursales(id)
        ON DELETE CASCADE,

    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,

    PRIMARY KEY (
        vendedor_id,
        sucursal_id
    )
);


-- ============================================================
-- 9. INVERSIONISTAS
-- ============================================================

CREATE TABLE inversionistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 10. CLIENTES
-- ============================================================

CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL,
    telefono TEXT,
    email TEXT,

    direccion TEXT,
    ciudad TEXT,

    notas TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 11. CATEGORIAS
-- ============================================================

CREATE TABLE categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================================
-- 12. PRODUCTOS
-- ============================================================

CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    categoria_id UUID
        REFERENCES categorias(id)
        ON DELETE SET NULL,

    nombre TEXT NOT NULL,

    codigo_interno TEXT NOT NULL UNIQUE,

    descripcion TEXT,
    nomenclatura TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 13. VARIANTES
-- ============================================================

CREATE TABLE variantes_producto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    producto_id UUID NOT NULL
        REFERENCES productos(id)
        ON DELETE CASCADE,

    color TEXT NOT NULL,
    talla TEXT,

    sku TEXT UNIQUE,

    /*
       INVENTARIO GENERAL DE JIMMO
    */
    stock_actual INTEGER NOT NULL DEFAULT 0
        CHECK (stock_actual >= 0),

    stock_reservado INTEGER NOT NULL DEFAULT 0
        CHECK (stock_reservado >= 0),

    stock_minimo INTEGER NOT NULL DEFAULT 0
        CHECK (stock_minimo >= 0),

    activa BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        stock_reservado <= stock_actual
    )
);

CREATE UNIQUE INDEX uq_variante_producto_color_talla
ON variantes_producto (
    producto_id,
    color,
    COALESCE(talla, '')
);


-- ============================================================
-- 14. LOTES
-- ============================================================

CREATE TABLE lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    numero_lote INTEGER GENERATED ALWAYS AS IDENTITY UNIQUE,

    fecha_compra DATE,
    fecha_recepcion DATE,

    tipo_cambio NUMERIC(12,4),

    proveedor TEXT,

    estado estado_lote NOT NULL DEFAULT 'PENDIENTE',

    notas TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 15. DETALLE DE LOTE
-- ============================================================

CREATE TABLE detalle_lote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    lote_id UUID NOT NULL
        REFERENCES lotes(id)
        ON DELETE CASCADE,

    variante_id UUID NOT NULL
        REFERENCES variantes_producto(id)
        ON DELETE RESTRICT,

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    /*
       Cantidad que todavía existe físicamente y
       NO está reservada para un pedido.
    */
    cantidad_disponible INTEGER NOT NULL DEFAULT 0
        CHECK (cantidad_disponible >= 0),

    /*
       Cantidad de este lote que está reservada
       específicamente para pedidos.
    */
    cantidad_reservada INTEGER NOT NULL DEFAULT 0
        CHECK (cantidad_reservada >= 0),

    costo_unitario_usd NUMERIC(14,4),
    costo_unitario_bs NUMERIC(14,2),

    precio_lote NUMERIC(14,2),
    precio_detalle NUMERIC(14,2),

    otros_costos_bs NUMERIC(14,2)
        NOT NULL DEFAULT 0,

    costo_total_bs NUMERIC(14,2)
        GENERATED ALWAYS AS (
            cantidad * COALESCE(costo_unitario_bs, 0)
            + otros_costos_bs
        ) STORED,

    ingreso_minimo_bs NUMERIC(14,2),

    utilidad_minima_bs NUMERIC(14,2),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (
        lote_id,
        variante_id
    ),

    CHECK (
        cantidad_disponible + cantidad_reservada <= cantidad
    )
);


-- ============================================================
-- 16. COSTOS DEL LOTE
-- ============================================================

CREATE TABLE costos_lote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    lote_id UUID NOT NULL
        REFERENCES lotes(id)
        ON DELETE CASCADE,

    concepto TEXT NOT NULL,

    monto_bs NUMERIC(14,2) NOT NULL
        CHECK (monto_bs >= 0),

    fecha DATE NOT NULL DEFAULT CURRENT_DATE,

    notas TEXT
);


-- ============================================================
-- 17. INVERSIONES POR LOTE
-- ============================================================

CREATE TABLE inversiones_lote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    lote_id UUID NOT NULL
        REFERENCES lotes(id)
        ON DELETE CASCADE,

    inversionista_id UUID NOT NULL
        REFERENCES inversionistas(id)
        ON DELETE RESTRICT,

    monto_invertido_bs NUMERIC(14,2) NOT NULL
        CHECK (monto_invertido_bs > 0),

    fecha_inversion DATE NOT NULL DEFAULT CURRENT_DATE,

    notas TEXT
);


-- ============================================================
-- 18. PEDIDOS
-- ============================================================

CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    numero BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,

    cliente_id UUID
        REFERENCES clientes(id)
        ON DELETE SET NULL,

    vendedor_id UUID NOT NULL
        REFERENCES vendedores(id)
        ON DELETE RESTRICT,

    sucursal_id UUID
        REFERENCES sucursales(id)
        ON DELETE SET NULL,

    canal_id UUID
        REFERENCES canales_venta(id)
        ON DELETE SET NULL,

    tipo_entrega_id UUID
        REFERENCES tipos_entrega(id)
        ON DELETE SET NULL,

    estado estado_pedido_venta NOT NULL
        DEFAULT 'BORRADOR',

    total NUMERIC(14,2)
        NOT NULL DEFAULT 0,

    lugar_entrega TEXT,
    lugar_envio TEXT,

    notas TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 19. DETALLE DEL PEDIDO
-- ============================================================

CREATE TABLE detalle_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pedido_id UUID NOT NULL
        REFERENCES pedidos(id)
        ON DELETE CASCADE,

    variante_id UUID NOT NULL
        REFERENCES variantes_producto(id)
        ON DELETE RESTRICT,

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    precio_unitario NUMERIC(14,2) NOT NULL
        CHECK (precio_unitario >= 0),

    /*
       IMPORTANTE:
       Este costo NO lo introduce el vendedor.
       El sistema lo calcula mediante FIFO al reservar/completar.
    */
    costo_unitario NUMERIC(14,2)
        NOT NULL DEFAULT 0
        CHECK (costo_unitario >= 0),

    subtotal NUMERIC(14,2)
        GENERATED ALWAYS AS (
            cantidad * precio_unitario
        ) STORED,

    costo_total NUMERIC(14,2)
        GENERATED ALWAYS AS (
            cantidad * costo_unitario
        ) STORED,

    utilidad NUMERIC(14,2)
        GENERATED ALWAYS AS (
            (cantidad * precio_unitario) - (cantidad * costo_unitario)
        ) STORED,

    -- Los detalles editados se conservan para auditoría histórica.
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_detalle_pedido_activo
ON detalle_pedido(pedido_id, activo);


-- ============================================================
-- 20. ASIGNACIONES FIFO
-- ============================================================

CREATE TABLE asignaciones_lote_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    detalle_pedido_id UUID NOT NULL
        REFERENCES detalle_pedido(id)
        ON DELETE CASCADE,

    detalle_lote_id UUID NOT NULL
        REFERENCES detalle_lote(id)
        ON DELETE RESTRICT,

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    costo_unitario_bs NUMERIC(14,2) NOT NULL
        CHECK (costo_unitario_bs >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- TRUE mientras la asignación forma parte del inventario reservado/consumido.
    -- FALSE conserva el historial cuando una reserva/pedido es cancelado o editado.
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX uq_asignacion_fifo_activa
ON asignaciones_lote_pedido (detalle_pedido_id, detalle_lote_id)
WHERE activa = TRUE;


-- ============================================================
-- 21. PAGOS
-- ============================================================

CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pedido_id UUID NOT NULL
        REFERENCES pedidos(id)
        ON DELETE CASCADE,

    monto NUMERIC(14,2) NOT NULL
        CHECK (monto > 0),

    fecha_pago TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    metodo metodo_pago NOT NULL,

    estado estado_pago NOT NULL DEFAULT 'PAGADO',

    referencia TEXT,
    notas TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 22. RESERVAS
-- ============================================================

CREATE TABLE reservas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pedido_id UUID NOT NULL UNIQUE
        REFERENCES pedidos(id)
        ON DELETE CASCADE,

    /*
       Monto de dinero entregado como reserva.
       Se sincroniza con los pagos del pedido.
    */
    monto_reserva NUMERIC(14,2)
        NOT NULL DEFAULT 0
        CHECK (monto_reserva >= 0),

    monto_pendiente NUMERIC(14,2)
        NOT NULL DEFAULT 0
        CHECK (monto_pendiente >= 0),

    fecha_reserva TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    fecha_limite DATE,

    activa BOOLEAN NOT NULL DEFAULT TRUE,

    notas TEXT
);


-- ============================================================
-- 23. TRANSPORTES
-- ============================================================

CREATE TABLE transportes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    nombre TEXT NOT NULL,
    telefono TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE
);


-- ============================================================
-- 24. ENTREGAS
-- ============================================================

CREATE TABLE entregas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pedido_id UUID NOT NULL UNIQUE
        REFERENCES pedidos(id)
        ON DELETE CASCADE,

    transporte_id UUID
        REFERENCES transportes(id)
        ON DELETE SET NULL,

    fecha_programada DATE,
    fecha_entrega TIMESTAMPTZ,

    costo_delivery NUMERIC(14,2)
        NOT NULL DEFAULT 0,

    estado estado_entrega NOT NULL
        DEFAULT 'PENDIENTE',

    notas TEXT
);


-- ============================================================
-- 25. MOVIMIENTOS DE INVENTARIO
-- ============================================================

CREATE TABLE movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    variante_id UUID NOT NULL
        REFERENCES variantes_producto(id)
        ON DELETE RESTRICT,

    lote_id UUID
        REFERENCES lotes(id)
        ON DELETE SET NULL,

    pedido_id UUID
        REFERENCES pedidos(id)
        ON DELETE SET NULL,

    tipo tipo_movimiento_inventario NOT NULL,

    cantidad INTEGER NOT NULL
        CHECK (cantidad > 0),

    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    motivo TEXT,

    usuario_id UUID
        REFERENCES perfiles(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 26. RETIROS
-- ============================================================

CREATE TABLE retiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    monto NUMERIC(14,2) NOT NULL
        CHECK (monto > 0),

    origen origen_retiro NOT NULL,

    inversionista_id UUID
        REFERENCES inversionistas(id)
        ON DELETE SET NULL,

    vendedor_id UUID
        REFERENCES vendedores(id)
        ON DELETE SET NULL,

    lote_id UUID
        REFERENCES lotes(id)
        ON DELETE SET NULL,

    pedido_id UUID
        REFERENCES pedidos(id)
        ON DELETE SET NULL,

    descripcion TEXT,

    CHECK (
        inversionista_id IS NOT NULL
        OR vendedor_id IS NOT NULL
    )
);


-- ============================================================
-- 27. REPARTOS DE UTILIDAD
-- ============================================================

CREATE TABLE repartos_utilidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    pedido_id UUID
        REFERENCES pedidos(id)
        ON DELETE SET NULL,

    lote_id UUID
        REFERENCES lotes(id)
        ON DELETE SET NULL,

    inversionista_id UUID
        REFERENCES inversionistas(id)
        ON DELETE SET NULL,

    vendedor_id UUID
        REFERENCES vendedores(id)
        ON DELETE SET NULL,

    tipo tipo_reparto NOT NULL,

    porcentaje NUMERIC(7,4)
        NOT NULL
        CHECK (
            porcentaje >= 0
            AND porcentaje <= 100
        ),

    monto NUMERIC(14,2)
        NOT NULL
        CHECK (monto >= 0),

    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    notas TEXT
);


-- ============================================================
-- 28. INDICES
-- ============================================================

CREATE INDEX idx_variantes_producto
ON variantes_producto(producto_id);

CREATE INDEX idx_detalle_lote_variante
ON detalle_lote(variante_id);

CREATE INDEX idx_detalle_lote_fifo
ON detalle_lote(variante_id, created_at);

CREATE INDEX idx_pedidos_cliente
ON pedidos(cliente_id);

CREATE INDEX idx_pedidos_vendedor
ON pedidos(vendedor_id);

CREATE INDEX idx_pedidos_sucursal
ON pedidos(sucursal_id);

CREATE INDEX idx_pedidos_estado
ON pedidos(estado);

CREATE INDEX idx_detalle_pedido_pedido
ON detalle_pedido(pedido_id);

CREATE INDEX idx_movimientos_variante
ON movimientos_inventario(variante_id);

CREATE INDEX idx_movimientos_lote
ON movimientos_inventario(lote_id);

CREATE INDEX idx_pagos_pedido
ON pagos(pedido_id);

CREATE INDEX idx_repartos_pedido
ON repartos_utilidad(pedido_id);


-- ============================================================
-- 29. UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_productos_updated
BEFORE UPDATE ON productos
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_variantes_updated
BEFORE UPDATE ON variantes_producto
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_pedidos_updated
BEFORE UPDATE ON pedidos
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_clientes_updated
BEFORE UPDATE ON clientes
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_perfiles_updated
BEFORE UPDATE ON perfiles
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_sucursales_updated
BEFORE UPDATE ON sucursales
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trg_vendedores_updated
BEFORE UPDATE ON vendedores
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();


-- ============================================================
-- 30. SEGURIDAD
-- ============================================================

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM perfiles
        WHERE id = auth.uid()
          AND rol = 'admin'
          AND activo = TRUE
    );
$$;


CREATE OR REPLACE FUNCTION public.vendedor_actual()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id
    FROM vendedores
    WHERE perfil_id = auth.uid()
      AND activo = TRUE
    LIMIT 1;
$$;


-- ============================================================
-- 31. TOTAL PEDIDO
-- ============================================================

CREATE OR REPLACE FUNCTION total_pedido(
    p_pedido_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        SUM(subtotal),
        0
    )
    FROM detalle_pedido
    WHERE pedido_id = p_pedido_id
      AND activo = TRUE;
$$;


CREATE OR REPLACE FUNCTION actualizar_total_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    UPDATE pedidos
    SET total = total_pedido(
        COALESCE(NEW.pedido_id, OLD.pedido_id)
    )
    WHERE id = COALESCE(
        NEW.pedido_id,
        OLD.pedido_id
    );

    RETURN COALESCE(NEW, OLD);

END;
$$;


CREATE TRIGGER trg_actualizar_total_pedido
AFTER INSERT OR UPDATE OR DELETE
ON detalle_pedido
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_pedido();


-- ============================================================
-- 32. TOTAL PAGADO
-- ============================================================

CREATE OR REPLACE FUNCTION total_pagado_pedido(
    p_pedido_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        SUM(monto)
        FILTER (
            WHERE estado = 'PAGADO'
        ),
        0
    )
    FROM pagos
    WHERE pedido_id = p_pedido_id;
$$;


CREATE OR REPLACE FUNCTION saldo_pedido(
    p_pedido_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
    SELECT GREATEST(
        total_pedido(p_pedido_id)
        -
        total_pagado_pedido(p_pedido_id),
        0
    );
$$;


-- ============================================================
-- 33. SINCRONIZAR RESERVA CON PAGOS
-- ============================================================

CREATE OR REPLACE FUNCTION sincronizar_reserva(
    p_pedido_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_total NUMERIC;
    v_pagado NUMERIC;
BEGIN

    SELECT total
    INTO v_total
    FROM pedidos
    WHERE id = p_pedido_id;

    v_pagado := total_pagado_pedido(p_pedido_id);

    UPDATE reservas
    SET
        monto_reserva = LEAST(v_pagado, v_total),
        monto_pendiente = GREATEST(
            v_total - v_pagado,
            0
        )
    WHERE pedido_id = p_pedido_id;

END;
$$;


CREATE OR REPLACE FUNCTION trg_sincronizar_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN

    PERFORM sincronizar_reserva(
        COALESCE(NEW.pedido_id, OLD.pedido_id)
    );

    RETURN COALESCE(NEW, OLD);

END;
$$;


CREATE TRIGGER trg_pago_reserva
AFTER INSERT OR UPDATE OR DELETE
ON pagos
FOR EACH ROW
EXECUTE FUNCTION trg_sincronizar_reserva();


-- ============================================================
-- 34. RESERVAR STOCK GENERAL
-- ============================================================

CREATE OR REPLACE FUNCTION reservar_stock(
    p_variante_id UUID,
    p_cantidad INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_disponible INTEGER;
BEGIN

    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION
            'La cantidad a reservar debe ser mayor a cero';
    END IF;

    SELECT
        stock_actual - stock_reservado
    INTO v_disponible
    FROM variantes_producto
    WHERE id = p_variante_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Variante no encontrada';
    END IF;

    IF v_disponible < p_cantidad THEN
        RAISE EXCEPTION
            'Stock insuficiente. Disponible: %, solicitado: %',
            v_disponible,
            p_cantidad;
    END IF;

    UPDATE variantes_producto
    SET stock_reservado =
        stock_reservado + p_cantidad
    WHERE id = p_variante_id;

    PERFORM verificar_invariantes_inventario(p_variante_id);
END;
$$;


-- ============================================================
-- 35. LIBERAR STOCK GENERAL
-- ============================================================

CREATE OR REPLACE FUNCTION liberar_stock_reservado(
    p_variante_id UUID,
    p_cantidad INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION
            'La cantidad a liberar debe ser mayor a cero';
    END IF;

    UPDATE variantes_producto
    SET stock_reservado =
        stock_reservado - p_cantidad
    WHERE id = p_variante_id
      AND stock_reservado >= p_cantidad;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'No existe suficiente stock reservado para liberar';
    END IF;

    PERFORM verificar_invariantes_inventario(p_variante_id);
END;
$$;


-- ============================================================
-- 36. RECIBIR LOTE
-- ============================================================

CREATE OR REPLACE FUNCTION recibir_lote(
    p_lote_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
BEGIN

    IF NOT es_admin() THEN
        RAISE EXCEPTION
            'Solo un administrador puede recibir lotes';
    END IF;

    PERFORM 1
    FROM lotes
    WHERE id = p_lote_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Lote no encontrado';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM lotes
        WHERE id = p_lote_id
          AND estado IN ('RECIBIDO', 'CERRADO')
    ) THEN
        RAISE EXCEPTION
            'El lote ya fue recibido o cerrado';
    END IF;


    FOR r IN
        SELECT *
        FROM detalle_lote
        WHERE lote_id = p_lote_id
        FOR UPDATE
    LOOP

        UPDATE detalle_lote
        SET cantidad_disponible =
            cantidad_disponible + cantidad
        WHERE id = r.id;


        UPDATE variantes_producto
        SET stock_actual =
            stock_actual + r.cantidad
        WHERE id = r.variante_id;


        INSERT INTO movimientos_inventario (
            variante_id,
            lote_id,
            tipo,
            cantidad,
            motivo,
            usuario_id
        )
        VALUES (
            r.variante_id,
            p_lote_id,
            'ENTRADA_COMPRA',
            r.cantidad,
            'Recepción de lote',
            auth.uid()
        );

    END LOOP;


    UPDATE lotes
    SET
        estado = 'RECIBIDO',
        fecha_recepcion = COALESCE(
            fecha_recepcion,
            CURRENT_DATE
        )
    WHERE id = p_lote_id;

    FOR r IN SELECT DISTINCT variante_id FROM detalle_lote WHERE lote_id = p_lote_id LOOP
        PERFORM verificar_invariantes_inventario(r.variante_id);
    END LOOP;
END;
$$;


-- ============================================================
-- 36.5 INVARIANTES DE INVENTARIO
--
-- Las invariantes no se pueden expresar todas con CHECK porque
-- involucran varias filas/tablas. Se validan al terminar cada
-- operación transaccional que modifica stock.
-- ============================================================

CREATE OR REPLACE FUNCTION verificar_invariantes_inventario(
    p_variante_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stock INTEGER;
    v_reservado INTEGER;
    v_lote_stock INTEGER;
    v_lote_reservado INTEGER;
BEGIN
    SELECT stock_actual, stock_reservado
    INTO v_stock, v_reservado
    FROM variantes_producto
    WHERE id = p_variante_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Variante no encontrada'; END IF;

    SELECT COALESCE(SUM(cantidad_disponible + cantidad_reservada), 0),
           COALESCE(SUM(cantidad_reservada), 0)
    INTO v_lote_stock, v_lote_reservado
    FROM detalle_lote dl
    JOIN lotes l ON l.id = dl.lote_id
    WHERE dl.variante_id = p_variante_id
      AND l.estado IN ('RECIBIDO','CERRADO');

    IF v_reservado > v_stock THEN
        RAISE EXCEPTION 'Invariante rota: stock reservado (%) supera stock actual (%)', v_reservado, v_stock;
    END IF;

    IF v_stock <> v_lote_stock THEN
        RAISE EXCEPTION 'Invariante rota en variante %: stock actual=% pero lotes activos=%', p_variante_id, v_stock, v_lote_stock;
    END IF;

    IF v_reservado <> v_lote_reservado THEN
        RAISE EXCEPTION 'Invariante rota en variante %: stock reservado=% pero reservas por lote=%', p_variante_id, v_reservado, v_lote_reservado;
    END IF;
END;
$$;

-- ============================================================
-- 37. FIFO
--
-- COSTO FIFO V4.1:
-- El costo efectivo por unidad incluye:
--   1) costo base del detalle de lote;
--   2) costos adicionales específicos del detalle, prorrateados;
--   3) costos generales del lote, prorrateados por unidad.
--
-- El costo se captura en la asignación FIFO para que una venta
-- completada conserve su costo histórico aunque posteriormente
-- cambien los costos del lote.
-- ============================================================

CREATE OR REPLACE FUNCTION costo_unitario_lote_fifo(
    p_detalle_lote_id UUID
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT ROUND(
        COALESCE(dl.costo_unitario_bs, 0)
        + COALESCE((
            SELECT SUM(cl.monto_bs)
            FROM costos_lote cl
            WHERE cl.lote_id = dl.lote_id
        ), 0) / NULLIF((
            SELECT SUM(dl2.cantidad)
            FROM detalle_lote dl2
            WHERE dl2.lote_id = dl.lote_id
        ), 0),
        2
    )
    FROM detalle_lote dl
    WHERE dl.id = p_detalle_lote_id;
$$;

CREATE OR REPLACE FUNCTION asignar_fifo_detalle(
    p_detalle_pedido_id UUID,
    p_reservar BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_variante UUID;
    v_cantidad_necesaria INTEGER;
    v_restante INTEGER;
    r RECORD;
    v_asignar INTEGER;
    v_costo NUMERIC;
BEGIN
    SELECT variante_id, cantidad
    INTO v_variante, v_cantidad_necesaria
    FROM detalle_pedido
    WHERE id = p_detalle_pedido_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Detalle de pedido no encontrado';
    END IF;

    v_restante := v_cantidad_necesaria;

    FOR r IN
        SELECT
            dl.id,
            dl.cantidad_disponible,
            l.fecha_recepcion,
            l.fecha_compra
        FROM detalle_lote dl
        JOIN lotes l ON l.id = dl.lote_id
        WHERE dl.variante_id = v_variante
          AND l.estado IN ('RECIBIDO', 'CERRADO')
          AND dl.cantidad_disponible > 0
        ORDER BY
            COALESCE(l.fecha_recepcion, l.fecha_compra, CURRENT_DATE),
            l.numero_lote,
            dl.id
        FOR UPDATE OF dl
    LOOP
        EXIT WHEN v_restante <= 0;

        v_asignar := LEAST(r.cantidad_disponible, v_restante);
        v_costo := costo_unitario_lote_fifo(r.id);

        INSERT INTO asignaciones_lote_pedido (
            detalle_pedido_id, detalle_lote_id, cantidad, costo_unitario_bs, activa
        )
        VALUES (
            p_detalle_pedido_id, r.id, v_asignar, v_costo, TRUE
        );

        IF p_reservar THEN
            UPDATE detalle_lote
            SET cantidad_disponible = cantidad_disponible - v_asignar,
                cantidad_reservada = cantidad_reservada + v_asignar
            WHERE id = r.id;
        ELSE
            UPDATE detalle_lote
            SET cantidad_disponible = cantidad_disponible - v_asignar
            WHERE id = r.id;
        END IF;

        v_restante := v_restante - v_asignar;
    END LOOP;

    IF v_restante > 0 THEN
        RAISE EXCEPTION 'No existe suficiente stock por lotes para la variante %', v_variante;
    END IF;

    UPDATE detalle_pedido dp
    SET costo_unitario = x.costo_promedio
    FROM (
        SELECT
            detalle_pedido_id,
            ROUND(SUM(cantidad * costo_unitario_bs) / NULLIF(SUM(cantidad), 0), 2) AS costo_promedio
        FROM asignaciones_lote_pedido
        WHERE detalle_pedido_id = p_detalle_pedido_id
          AND activa = TRUE
        GROUP BY detalle_pedido_id
    ) x
    WHERE dp.id = x.detalle_pedido_id;
END;
$$;

-- ============================================================
-- 38. CREAR PEDIDO
-- ============================================================

CREATE OR REPLACE FUNCTION crear_pedido(
    p_cliente_id UUID,
    p_vendedor_id UUID,
    p_sucursal_id UUID,
    p_canal_id UUID,
    p_tipo_entrega_id UUID,
    p_items JSONB,
    p_reservar_stock BOOLEAN DEFAULT TRUE,
    p_monto_reserva NUMERIC DEFAULT 0,
    p_lugar_entrega TEXT DEFAULT NULL,
    p_lugar_envio TEXT DEFAULT NULL,
    p_notas TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pedido_id UUID;
    v_vendedor UUID;
    item JSONB;
    v_detalle_id UUID;
    v_variante UUID;
    v_cantidad INTEGER;
    v_precio NUMERIC;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND activo = TRUE) THEN
        RAISE EXCEPTION 'El usuario está inactivo';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe contener al menos un producto';
    END IF;

    IF p_monto_reserva < 0 THEN
        RAISE EXCEPTION 'El monto de reserva no puede ser negativo';
    END IF;

    IF es_admin() THEN
        v_vendedor := p_vendedor_id;
    ELSE
        v_vendedor := vendedor_actual();
        IF v_vendedor IS NULL THEN
            RAISE EXCEPTION 'El usuario actual no es un vendedor activo';
        END IF;
        IF v_vendedor <> p_vendedor_id THEN
            RAISE EXCEPTION 'No puede crear pedidos para otro vendedor';
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM vendedores WHERE id = v_vendedor AND activo = TRUE) THEN
        RAISE EXCEPTION 'El vendedor no existe o está inactivo';
    END IF;

    INSERT INTO pedidos (cliente_id, vendedor_id, sucursal_id, canal_id, tipo_entrega_id, estado, lugar_entrega, lugar_envio, notas)
    VALUES (
        p_cliente_id, v_vendedor, p_sucursal_id, p_canal_id, p_tipo_entrega_id,
        CASE WHEN p_reservar_stock THEN 'RESERVADO'::estado_pedido_venta ELSE 'BORRADOR'::estado_pedido_venta END,
        p_lugar_entrega, p_lugar_envio, p_notas
    )
    RETURNING id INTO v_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        BEGIN
            v_variante := (item->>'variante_id')::UUID;
            v_cantidad := (item->>'cantidad')::INTEGER;
            v_precio := (item->>'precio_unitario')::NUMERIC;
        EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
            RAISE EXCEPTION 'Cada item debe contener variante_id, cantidad y precio_unitario válidos';
        END;

        IF v_cantidad IS NULL OR v_cantidad <= 0 THEN
            RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
        END IF;
        IF v_precio IS NULL OR v_precio < 0 THEN
            RAISE EXCEPTION 'El precio no puede ser negativo';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM variantes_producto WHERE id = v_variante AND activa = TRUE) THEN
            RAISE EXCEPTION 'La variante % no existe o está inactiva', v_variante;
        END IF;

        INSERT INTO detalle_pedido (pedido_id, variante_id, cantidad, precio_unitario)
        VALUES (v_pedido_id, v_variante, v_cantidad, v_precio)
        RETURNING id INTO v_detalle_id;

        IF p_reservar_stock THEN
            PERFORM reservar_stock(v_variante, v_cantidad);
            PERFORM asignar_fifo_detalle(v_detalle_id, TRUE);
        END IF;
    END LOOP;

    IF p_reservar_stock THEN
        INSERT INTO reservas (pedido_id, monto_reserva, monto_pendiente, fecha_reserva, activa)
        VALUES (v_pedido_id, 0, 0, NOW(), TRUE);
    END IF;

    IF p_monto_reserva > 0 THEN
        IF NOT p_reservar_stock THEN
            RAISE EXCEPTION 'No se puede registrar una reserva monetaria en un pedido BORRADOR sin stock reservado';
        END IF;
        IF p_monto_reserva > total_pedido(v_pedido_id) THEN
            RAISE EXCEPTION 'El monto de reserva no puede superar el total';
        END IF;
        INSERT INTO pagos (pedido_id, monto, metodo, estado, notas)
        VALUES (v_pedido_id, p_monto_reserva, 'EFECTIVO', 'PAGADO', 'Pago inicial de reserva');
    END IF;

    UPDATE pedidos SET total = total_pedido(v_pedido_id) WHERE id = v_pedido_id;
    PERFORM sincronizar_reserva(v_pedido_id);
    RETURN v_pedido_id;
END;
$$;

-- ============================================================
-- 39. COMPLETAR PEDIDO
-- ============================================================

CREATE OR REPLACE FUNCTION completar_pedido(p_pedido_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado estado_pedido_venta;
    v_vendedor UUID;
    r RECORD;
BEGIN
    SELECT estado, vendedor_id INTO v_estado, v_vendedor
    FROM pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

    IF NOT es_admin() AND v_vendedor <> vendedor_actual() THEN
        RAISE EXCEPTION 'No tiene permiso para completar este pedido';
    END IF;

    IF v_estado NOT IN ('BORRADOR','RESERVADO') THEN
        RAISE EXCEPTION 'El pedido no puede completarse desde el estado %', v_estado;
    END IF;

    IF v_estado = 'BORRADOR' THEN
        FOR r IN SELECT id, variante_id, cantidad FROM detalle_pedido WHERE pedido_id = p_pedido_id ORDER BY id LOOP
            PERFORM reservar_stock(r.variante_id, r.cantidad);
            PERFORM asignar_fifo_detalle(r.id, TRUE);
        END LOOP;
        INSERT INTO reservas (pedido_id, monto_reserva, monto_pendiente, activa)
        VALUES (p_pedido_id, 0, 0, TRUE)
        ON CONFLICT (pedido_id) DO UPDATE SET activa = TRUE;
    END IF;

    FOR r IN
        SELECT ap.detalle_pedido_id, ap.detalle_lote_id, ap.cantidad, dp.variante_id
        FROM asignaciones_lote_pedido ap
        JOIN detalle_pedido dp ON dp.id = ap.detalle_pedido_id
        WHERE dp.pedido_id = p_pedido_id AND dp.activo = TRUE AND ap.activa = TRUE
        ORDER BY ap.id
        FOR UPDATE OF ap
    LOOP
        UPDATE detalle_lote
        SET cantidad_reservada = cantidad_reservada - r.cantidad
        WHERE id = r.detalle_lote_id AND cantidad_reservada >= r.cantidad;
        IF NOT FOUND THEN RAISE EXCEPTION 'Error al consumir reserva del lote'; END IF;

        UPDATE variantes_producto
        SET stock_actual = stock_actual - r.cantidad,
            stock_reservado = stock_reservado - r.cantidad
        WHERE id = r.variante_id AND stock_actual >= r.cantidad AND stock_reservado >= r.cantidad;
        IF NOT FOUND THEN RAISE EXCEPTION 'Error al consumir stock de la variante'; END IF;

        INSERT INTO movimientos_inventario (variante_id, lote_id, pedido_id, tipo, cantidad, motivo, usuario_id)
        SELECT r.variante_id, dl.lote_id, p_pedido_id, 'SALIDA_VENTA', r.cantidad, 'Venta FIFO', auth.uid()
        FROM detalle_lote dl WHERE dl.id = r.detalle_lote_id;
    END LOOP;

    UPDATE pedidos SET estado = 'COMPLETADO' WHERE id = p_pedido_id;
    UPDATE reservas SET activa = FALSE WHERE pedido_id = p_pedido_id;

    FOR r IN SELECT DISTINCT variante_id FROM detalle_pedido WHERE pedido_id = p_pedido_id AND activo = TRUE LOOP
        PERFORM verificar_invariantes_inventario(r.variante_id);
    END LOOP;

    PERFORM generar_reparto_utilidad(p_pedido_id);
END;
$$;

-- ============================================================
-- 40. CANCELAR PEDIDO
-- ============================================================

CREATE OR REPLACE FUNCTION cancelar_pedido(p_pedido_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado estado_pedido_venta;
    v_vendedor UUID;
    r RECORD;
BEGIN
    SELECT estado, vendedor_id INTO v_estado, v_vendedor
    FROM pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

    IF NOT es_admin() AND v_vendedor <> vendedor_actual() THEN
        RAISE EXCEPTION 'No tiene permiso para cancelar este pedido';
    END IF;

    IF v_estado IN ('COMPLETADO','CANCELADO') THEN
        RAISE EXCEPTION 'El pedido no puede cancelarse desde el estado %', v_estado;
    END IF;

    IF v_estado = 'RESERVADO' THEN
        FOR r IN
            SELECT ap.detalle_lote_id, ap.cantidad, dp.variante_id
            FROM asignaciones_lote_pedido ap
            JOIN detalle_pedido dp ON dp.id = ap.detalle_pedido_id
            WHERE dp.pedido_id = p_pedido_id AND dp.activo = TRUE AND ap.activa = TRUE
            ORDER BY ap.id
            FOR UPDATE OF ap
        LOOP
            UPDATE detalle_lote
            SET cantidad_disponible = cantidad_disponible + r.cantidad,
                cantidad_reservada = cantidad_reservada - r.cantidad
            WHERE id = r.detalle_lote_id AND cantidad_reservada >= r.cantidad;
            IF NOT FOUND THEN RAISE EXCEPTION 'Error al liberar reserva del lote'; END IF;

            UPDATE variantes_producto
            SET stock_reservado = stock_reservado - r.cantidad
            WHERE id = r.variante_id AND stock_reservado >= r.cantidad;
            IF NOT FOUND THEN RAISE EXCEPTION 'Error al liberar reserva de la variante'; END IF;
        END LOOP;

        UPDATE asignaciones_lote_pedido ap
        SET activa = FALSE
        WHERE ap.detalle_pedido_id IN (SELECT id FROM detalle_pedido WHERE pedido_id = p_pedido_id AND activo = TRUE)
          AND ap.activa = TRUE;
    END IF;

    UPDATE pedidos SET estado = 'CANCELADO' WHERE id = p_pedido_id;
    UPDATE reservas SET activa = FALSE WHERE pedido_id = p_pedido_id;

    FOR r IN SELECT DISTINCT variante_id FROM detalle_pedido WHERE pedido_id = p_pedido_id AND activo = TRUE LOOP
        PERFORM verificar_invariantes_inventario(r.variante_id);
    END LOOP;
END;
$$;

-- ============================================================
-- 41. REGISTRAR PAGO
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_pago(
    p_pedido_id UUID,
    p_monto NUMERIC,
    p_metodo metodo_pago,
    p_referencia TEXT DEFAULT NULL,
    p_notas TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

    v_pago_id UUID;

    v_saldo NUMERIC;

BEGIN

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pedidos WHERE id = p_pedido_id) THEN
        RAISE EXCEPTION 'Pedido no encontrado';
    END IF;

    IF NOT es_admin() AND NOT EXISTS (
        SELECT 1 FROM pedidos WHERE id = p_pedido_id AND vendedor_id = vendedor_actual()
    ) THEN
        RAISE EXCEPTION 'No tiene permiso para registrar pagos de este pedido';
    END IF;

    IF (SELECT estado FROM pedidos WHERE id = p_pedido_id) = 'CANCELADO' THEN
        RAISE EXCEPTION 'No se puede registrar un pago en un pedido cancelado';
    END IF;

    IF p_monto <= 0 THEN
        RAISE EXCEPTION
            'El monto debe ser mayor a cero';
    END IF;


    -- Bloqueamos el pedido para evitar sobrepagos concurrentes.
    PERFORM 1
    FROM pedidos
    WHERE id = p_pedido_id
    FOR UPDATE;

    v_saldo := saldo_pedido(
        p_pedido_id
    );


    IF p_monto > v_saldo THEN
        RAISE EXCEPTION
            'El pago supera el saldo pendiente';
    END IF;


    INSERT INTO pagos (
        pedido_id,
        monto,
        metodo,
        estado,
        referencia,
        notas
    )
    VALUES (
        p_pedido_id,
        p_monto,
        p_metodo,
        'PAGADO',
        p_referencia,
        p_notas
    )
    RETURNING id
    INTO v_pago_id;


    RETURN v_pago_id;

END;
$$;


-- ============================================================
-- 42. GENERAR REPARTO DE UTILIDAD
--
-- REGLA V4:
--
-- 40% -> EMPRESA
--
-- Del restante:
--
-- vendedor -> porcentaje definido en vendedores
--
-- inversionista -> lo que queda
--
-- Ejemplo:
--
-- Utilidad = Bs 1.000
--
-- Empresa = 40% = Bs 400
-- Vendedor = 10% = Bs 100
-- Inversionista = 50% = Bs 500
--
-- ============================================================

CREATE OR REPLACE FUNCTION generar_reparto_utilidad(
    p_pedido_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

    v_utilidad NUMERIC;
    v_empresa NUMERIC;
    v_vendedor NUMERIC;
    v_inversionista NUMERIC;

    v_porcentaje_vendedor NUMERIC;
    v_porcentaje_inversionista NUMERIC;

    v_vendedor_id UUID;

    r RECORD;

BEGIN

    /*
       Evitar duplicar repartos.
    */

    IF EXISTS (
        SELECT 1
        FROM repartos_utilidad
        WHERE pedido_id = p_pedido_id
    ) THEN
        RETURN;
    END IF;


    SELECT
        COALESCE(SUM(utilidad), 0),
        vendedor_id
    INTO
        v_utilidad,
        v_vendedor_id
    FROM pedidos p
    JOIN detalle_pedido dp
      ON dp.pedido_id = p.id
    WHERE p.id = p_pedido_id
      AND p.estado = 'COMPLETADO'
    GROUP BY vendedor_id;


    IF v_utilidad <= 0 THEN
        RETURN;
    END IF;


    SELECT
        COALESCE(comision_porcentaje, 0)
    INTO v_porcentaje_vendedor
    FROM vendedores
    WHERE id = v_vendedor_id;


    /*
       40% empresa.
    */

    v_empresa :=
        ROUND(
            v_utilidad * 0.40,
            2
        );


    /*
       Vendedor:
       su porcentaje se aplica sobre la utilidad total.
    */

    v_vendedor :=
        ROUND(
            v_utilidad
            * v_porcentaje_vendedor
            / 100,
            2
        );


    /*
       Inversionista:
       todo lo restante.
    */

    v_inversionista :=
        ROUND(
            v_utilidad
            - v_empresa
            - v_vendedor,
            2
        );


    /*
       Empresa.
    */

    INSERT INTO repartos_utilidad (
        pedido_id,
        tipo,
        porcentaje,
        monto,
        notas
    )
    VALUES (
        p_pedido_id,
        'EMPRESA',
        40,
        v_empresa,
        'Participación fija de la empresa'
    );


    /*
       Vendedor.
    */

    IF v_vendedor > 0 THEN

        INSERT INTO repartos_utilidad (
            pedido_id,
            vendedor_id,
            tipo,
            porcentaje,
            monto,
            notas
        )
        VALUES (
            p_pedido_id,
            v_vendedor_id,
            'VENDEDOR',
            v_porcentaje_vendedor,
            v_vendedor,
            'Comisión sobre utilidad'
        );

    END IF;


    /*
       Inversionista.

       Si existen varios inversionistas en los lotes
       involucrados, el monto se distribuye según
       participación de capital.
    */

    IF v_inversionista > 0 THEN

        FOR r IN
            SELECT
                il.inversionista_id,
                SUM(il.monto_invertido_bs)
                    AS capital
            FROM inversiones_lote il
            JOIN asignaciones_lote_pedido ap
              ON TRUE
            JOIN detalle_lote dl
              ON dl.id = ap.detalle_lote_id
            WHERE ap.detalle_pedido_id IN (
                SELECT id
                FROM detalle_pedido
                WHERE pedido_id = p_pedido_id
            )
            AND il.lote_id = dl.lote_id
            GROUP BY il.inversionista_id
        LOOP

            INSERT INTO repartos_utilidad (
                pedido_id,
                inversionista_id,
                tipo,
                porcentaje,
                monto,
                notas
            )
            VALUES (
                p_pedido_id,
                r.inversionista_id,
                'INVERSIONISTA',
                ROUND(
                    r.capital * 100
                    /
                    NULLIF(
                        (
                            SELECT SUM(
                                il2.monto_invertido_bs
                            )
                            FROM inversiones_lote il2
                            WHERE il2.inversionista_id IS NOT NULL
                              AND il2.lote_id IN (
                                  SELECT dl2.lote_id
                                  FROM asignaciones_lote_pedido ap2
                                  JOIN detalle_lote dl2
                                    ON dl2.id =
                                       ap2.detalle_lote_id
                                  JOIN detalle_pedido dp2
                                    ON dp2.id =
                                       ap2.detalle_pedido_id
                                  WHERE dp2.pedido_id =
                                      p_pedido_id
                              )
                        ),
                        0
                    ),
                    4
                ),

                ROUND(
                    v_inversionista
                    *
                    r.capital
                    /
                    NULLIF(
                        (
                            SELECT SUM(
                                il2.monto_invertido_bs
                            )
                            FROM inversiones_lote il2
                            WHERE il2.lote_id IN (
                                SELECT dl2.lote_id
                                FROM asignaciones_lote_pedido ap2
                                JOIN detalle_lote dl2
                                  ON dl2.id =
                                     ap2.detalle_lote_id
                                JOIN detalle_pedido dp2
                                  ON dp2.id =
                                     ap2.detalle_pedido_id
                                WHERE dp2.pedido_id =
                                    p_pedido_id
                            )
                        ),
                        0
                    ),
                    2
                ),

                'Distribución proporcional al capital invertido'
            );

        END LOOP;

    END IF;

END;
$$;


-- ============================================================
-- 42. MODIFICAR PEDIDO
--
-- BORRADOR: edición libre.
-- RESERVADO: se libera el FIFO anterior y se reconstruye la reserva.
-- COMPLETADO/CANCELADO: inmutables; las correcciones futuras deberán
-- utilizar un flujo de devolución/ajuste.
-- ============================================================

CREATE OR REPLACE FUNCTION editar_pedido(
    p_pedido_id UUID,
    p_cliente_id UUID,
    p_vendedor_id UUID,
    p_sucursal_id UUID,
    p_canal_id UUID,
    p_tipo_entrega_id UUID,
    p_items JSONB,
    p_lugar_entrega TEXT DEFAULT NULL,
    p_lugar_envio TEXT DEFAULT NULL,
    p_notas TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estado estado_pedido_venta;
    v_vendedor UUID;
    v_pagado NUMERIC;
    item JSONB;
    v_variante UUID;
    v_cantidad INTEGER;
    v_precio NUMERIC;
    v_detalle_id UUID;
    r RECORD;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;

    SELECT estado, vendedor_id INTO v_estado, v_vendedor
    FROM pedidos WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

    IF NOT es_admin() AND v_vendedor <> vendedor_actual() THEN
        RAISE EXCEPTION 'No tiene permiso para modificar este pedido';
    END IF;

    IF v_estado NOT IN ('BORRADOR','RESERVADO') THEN
        RAISE EXCEPTION 'Solo se pueden modificar pedidos BORRADOR o RESERVADO';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe contener al menos un producto';
    END IF;

    IF es_admin() THEN
        v_vendedor := p_vendedor_id;
    ELSE
        IF p_vendedor_id <> vendedor_actual() THEN RAISE EXCEPTION 'No puede reasignar el pedido a otro vendedor'; END IF;
        v_vendedor := vendedor_actual();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM vendedores WHERE id = v_vendedor AND activo = TRUE) THEN
        RAISE EXCEPTION 'El vendedor no existe o está inactivo';
    END IF;

    -- Si estaba reservado, primero devolvemos TODO el stock reservado por FIFO.
    IF v_estado = 'RESERVADO' THEN
        FOR item IN
            SELECT jsonb_build_object('detalle_lote_id', ap.detalle_lote_id, 'cantidad', ap.cantidad, 'variante_id', dp.variante_id)
            FROM asignaciones_lote_pedido ap
            JOIN detalle_pedido dp ON dp.id = ap.detalle_pedido_id
            WHERE dp.pedido_id = p_pedido_id AND dp.activo = TRUE AND ap.activa = TRUE
        LOOP
            UPDATE detalle_lote
            SET cantidad_disponible = cantidad_disponible + (item->>'cantidad')::INTEGER,
                cantidad_reservada = cantidad_reservada - (item->>'cantidad')::INTEGER
            WHERE id = (item->>'detalle_lote_id')::UUID
              AND cantidad_reservada >= (item->>'cantidad')::INTEGER;
            IF NOT FOUND THEN RAISE EXCEPTION 'Error al liberar FIFO durante la edición'; END IF;

            UPDATE variantes_producto
            SET stock_reservado = stock_reservado - (item->>'cantidad')::INTEGER
            WHERE id = (item->>'variante_id')::UUID
              AND stock_reservado >= (item->>'cantidad')::INTEGER;
            IF NOT FOUND THEN RAISE EXCEPTION 'Error al liberar stock durante la edición'; END IF;
        END LOOP;
    END IF;

    UPDATE asignaciones_lote_pedido
    SET activa = FALSE
    WHERE detalle_pedido_id IN (SELECT id FROM detalle_pedido WHERE pedido_id = p_pedido_id)
      AND activa = TRUE;

    UPDATE detalle_pedido
    SET activo = FALSE
    WHERE pedido_id = p_pedido_id AND activo = TRUE;

    UPDATE pedidos
    SET cliente_id = p_cliente_id,
        vendedor_id = v_vendedor,
        sucursal_id = p_sucursal_id,
        canal_id = p_canal_id,
        tipo_entrega_id = p_tipo_entrega_id,
        lugar_entrega = p_lugar_entrega,
        lugar_envio = p_lugar_envio,
        notas = p_notas,
        estado = v_estado
    WHERE id = p_pedido_id;

    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_variante := (item->>'variante_id')::UUID;
        v_cantidad := (item->>'cantidad')::INTEGER;
        v_precio := (item->>'precio_unitario')::NUMERIC;
        IF v_cantidad IS NULL OR v_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero'; END IF;
        IF v_precio IS NULL OR v_precio < 0 THEN RAISE EXCEPTION 'El precio no puede ser negativo'; END IF;
        IF NOT EXISTS (SELECT 1 FROM variantes_producto WHERE id = v_variante AND activa = TRUE) THEN
            RAISE EXCEPTION 'La variante no existe o está inactiva';
        END IF;

        INSERT INTO detalle_pedido (pedido_id, variante_id, cantidad, precio_unitario)
        VALUES (p_pedido_id, v_variante, v_cantidad, v_precio)
        RETURNING id INTO v_detalle_id;

        IF v_estado = 'RESERVADO' THEN
            PERFORM reservar_stock(v_variante, v_cantidad);
            PERFORM asignar_fifo_detalle(v_detalle_id, TRUE);
        END IF;
    END LOOP;

    IF v_estado = 'RESERVADO' THEN
        UPDATE reservas SET activa = TRUE WHERE pedido_id = p_pedido_id;
    END IF;

    v_pagado := total_pagado_pedido(p_pedido_id);
    IF v_pagado > total_pedido(p_pedido_id) THEN
        RAISE EXCEPTION 'La modificación no puede dejar pagos por encima del total del pedido';
    END IF;

    UPDATE pedidos SET total = total_pedido(p_pedido_id) WHERE id = p_pedido_id;
    PERFORM sincronizar_reserva(p_pedido_id);

    FOR r IN SELECT DISTINCT variante_id FROM detalle_pedido WHERE pedido_id = p_pedido_id LOOP
        PERFORM verificar_invariantes_inventario(r.variante_id);
    END LOOP;
END;
$$;

-- ============================================================
-- 43. VISTA DE INVENTARIO GENERAL
-- ============================================================

CREATE OR REPLACE VIEW vw_inventario AS
SELECT

    v.id AS variante_id,

    p.id AS producto_id,
    p.nombre AS producto,

    v.color,
    v.talla,
    v.sku,

    v.stock_actual,
    v.stock_reservado,

    (
        v.stock_actual
        - v.stock_reservado
    ) AS stock_disponible,

    v.stock_minimo,

    CASE
        WHEN (
            v.stock_actual
            - v.stock_reservado
        ) <= v.stock_minimo
        THEN TRUE
        ELSE FALSE
    END AS stock_bajo

FROM variantes_producto v
JOIN productos p
  ON p.id = v.producto_id;


-- ============================================================
-- 44. VISTA DE PEDIDOS
-- ============================================================

CREATE OR REPLACE VIEW vw_pedidos AS
SELECT

    p.id,
    p.numero,

    p.estado,

    p.total,

    COALESCE(
        (
            SELECT SUM(pg.monto)
            FROM pagos pg
            WHERE pg.pedido_id = p.id
              AND pg.estado = 'PAGADO'
        ),
        0
    ) AS total_pagado,

    GREATEST(
        p.total
        -
        COALESCE(
            (
                SELECT SUM(pg.monto)
                FROM pagos pg
                WHERE pg.pedido_id = p.id
                  AND pg.estado = 'PAGADO'
            ),
            0
        ),
        0
    ) AS saldo,

    c.nombre AS cliente,

    v.nombre AS vendedor,

    s.nombre AS sucursal,

    cv.nombre AS canal,

    te.nombre AS tipo_entrega,

    p.created_at

FROM pedidos p

LEFT JOIN clientes c
    ON c.id = p.cliente_id

LEFT JOIN vendedores v
    ON v.id = p.vendedor_id

LEFT JOIN sucursales s
    ON s.id = p.sucursal_id

LEFT JOIN canales_venta cv
    ON cv.id = p.canal_id

LEFT JOIN tipos_entrega te
    ON te.id = p.tipo_entrega_id;


-- ============================================================
-- 45. VISTA DE RENTABILIDAD DE PRODUCTOS
-- ============================================================

CREATE OR REPLACE VIEW vw_rentabilidad_producto AS
SELECT

    p.id AS producto_id,
    p.nombre AS producto,

    SUM(dp.cantidad) AS unidades_vendidas,

    SUM(dp.subtotal) AS ventas,

    SUM(dp.costo_total) AS costo,

    SUM(dp.utilidad) AS utilidad

FROM productos p

JOIN variantes_producto v
    ON v.producto_id = p.id

JOIN detalle_pedido dp
    ON dp.variante_id = v.id
   AND dp.activo = TRUE

JOIN pedidos pe
    ON pe.id = dp.pedido_id

WHERE pe.estado = 'COMPLETADO'

GROUP BY
    p.id,
    p.nombre;


-- ============================================================
-- 46. VISTA DE UTILIDAD POR VENDEDOR
-- ============================================================

CREATE OR REPLACE VIEW vw_utilidad_vendedor AS
SELECT

    v.id AS vendedor_id,

    v.nombre AS vendedor,

    COUNT(DISTINCT p.id)
        AS pedidos_completados,

    COALESCE(
        SUM(dp.subtotal),
        0
    ) AS ventas,

    COALESCE(
        SUM(dp.costo_total),
        0
    ) AS costo,

    COALESCE(
        SUM(dp.utilidad),
        0
    ) AS utilidad,

    v.comision_porcentaje,

    ROUND(
        COALESCE(
            SUM(dp.utilidad),
            0
        )
        *
        v.comision_porcentaje
        / 100,
        2
    ) AS comision_vendedor

FROM vendedores v

LEFT JOIN pedidos p
    ON p.vendedor_id = v.id
    AND p.estado = 'COMPLETADO'

LEFT JOIN detalle_pedido dp
    ON dp.pedido_id = p.id
   AND dp.activo = TRUE

GROUP BY
    v.id,
    v.nombre,
    v.comision_porcentaje;


-- ============================================================
-- 47. VISTA DE RENTABILIDAD POR LOTE
-- ============================================================

DROP VIEW IF EXISTS vw_rentabilidad_lote CASCADE;

CREATE OR REPLACE VIEW vw_rentabilidad_lote AS
WITH lotes_base AS (
    SELECT
        l.id AS lote_id,
        l.numero_lote,
        l.estado,
        l.fecha_compra,
        l.fecha_recepcion,
        l.costo_total_usd,
        l.tipo_cambio,
        l.gastos_extras_bs,
        COALESCE(SUM(dl.cantidad), 0) AS unidades_compradas,
        COALESCE(SUM(dl.cantidad_disponible), 0) AS unidades_disponibles,
        COALESCE(SUM(dl.cantidad * dl.costo_unitario_bs), 0) AS costo_mercaderia_bs,
        COALESCE((
            SELECT SUM(cl.monto_bs)
            FROM costos_lote cl
            WHERE cl.lote_id = l.id
        ), 0) AS costos_adicionales_bs
    FROM lotes l
    LEFT JOIN detalle_lote dl ON dl.lote_id = l.id
    GROUP BY l.id, l.numero_lote, l.estado, l.fecha_compra, l.fecha_recepcion, l.costo_total_usd, l.tipo_cambio, l.gastos_extras_bs
),
ventas_lote AS (
    SELECT
        dl.lote_id,
        COALESCE(SUM(alp.cantidad), 0) AS unidades_vendidas,
        COALESCE(SUM(alp.cantidad * dp.precio_unitario), 0) AS ventas_totales_bs,
        COALESCE(SUM(alp.cantidad * alp.costo_unitario_bs), 0) AS costo_ventas_bs
    FROM asignaciones_lote_pedido alp
    JOIN detalle_lote dl ON dl.id = alp.detalle_lote_id
    JOIN detalle_pedido dp ON dp.id = alp.detalle_pedido_id
    JOIN pedidos p ON p.id = dp.pedido_id
    WHERE alp.activa = TRUE
      AND p.estado = 'COMPLETADO'
    GROUP BY dl.lote_id
)
SELECT
    lb.lote_id,
    lb.numero_lote,
    lb.estado,
    lb.fecha_compra,
    lb.fecha_recepcion,
    lb.unidades_compradas,
    lb.unidades_disponibles,
    COALESCE(vl.unidades_vendidas, 0) AS unidades_vendidas,
    (lb.costo_mercaderia_bs + lb.costos_adicionales_bs) AS costo_total_inversion,
    COALESCE(vl.ventas_totales_bs, 0) AS ventas_totales,
    COALESCE(vl.costo_ventas_bs, 0) AS costo_ventas,
    (COALESCE(vl.ventas_totales_bs, 0) - COALESCE(vl.costo_ventas_bs, 0)) AS utilidad_real,
    CASE 
        WHEN lb.unidades_compradas > 0 
        THEN ROUND((COALESCE(vl.unidades_vendidas, 0)::numeric / lb.unidades_compradas::numeric) * 100, 2)
        ELSE 0 
    END AS porcentaje_vendido,
    CASE 
        WHEN (lb.costo_mercaderia_bs + lb.costos_adicionales_bs) > 0 
        THEN ROUND(((COALESCE(vl.ventas_totales_bs, 0) - COALESCE(vl.costo_ventas_bs, 0)) / (lb.costo_mercaderia_bs + lb.costos_adicionales_bs)) * 100, 2)
        ELSE 0 
    END AS roi_porcentaje
FROM lotes_base lb
LEFT JOIN ventas_lote vl ON vl.lote_id = lb.lote_id;


-- ============================================================
-- 48. VISTA DE CLIENTES
-- ============================================================

CREATE OR REPLACE VIEW vw_clientes_resumen AS
SELECT

    c.id,
    c.nombre,
    c.telefono,

    COUNT(
        DISTINCT p.id
    ) FILTER (
        WHERE p.estado = 'COMPLETADO'
    ) AS cantidad_compras,

    COALESCE(
        SUM(p.total)
        FILTER (
            WHERE p.estado = 'COMPLETADO'
        ),
        0
    ) AS total_comprado,

    MAX(p.created_at)
        FILTER (
            WHERE p.estado = 'COMPLETADO'
        ) AS ultima_compra

FROM clientes c

LEFT JOIN pedidos p
    ON p.cliente_id = c.id

GROUP BY
    c.id,
    c.nombre,
    c.telefono;


-- ============================================================
-- 49. VISTA DE CAPITAL DE INVERSIONISTAS
-- ============================================================

CREATE OR REPLACE VIEW vw_capital_inversionista AS
SELECT

    i.id AS inversionista_id,

    i.nombre,

    COALESCE(
        SUM(il.monto_invertido_bs),
        0
    ) AS capital_invertido

FROM inversionistas i

LEFT JOIN inversiones_lote il
    ON il.inversionista_id = i.id

GROUP BY
    i.id,
    i.nombre;


-- ============================================================
-- 50. VISTA DE UTILIDAD DISTRIBUIDA
-- ============================================================

CREATE OR REPLACE VIEW vw_utilidad_inversionista AS
SELECT

    i.id AS inversionista_id,

    i.nombre,

    COALESCE(
        SUM(ru.monto),
        0
    ) AS utilidad_recibida

FROM inversionistas i

LEFT JOIN repartos_utilidad ru
    ON ru.inversionista_id = i.id
   AND ru.tipo = 'INVERSIONISTA'

GROUP BY
    i.id,
    i.nombre;


-- ============================================================
-- 51. POLÍTICAS BÁSICAS RLS
-- ============================================================

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones_lote_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportes ENABLE ROW LEVEL SECURITY;

ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE canales_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_entrega ENABLE ROW LEVEL SECURITY;

ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_lote ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos_lote ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversiones_lote ENABLE ROW LEVEL SECURITY;
ALTER TABLE inversionistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE retiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE repartos_utilidad ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 52. LECTURA CATÁLOGOS
-- ============================================================

CREATE POLICY "authenticated_read_sucursales"
ON sucursales
FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "authenticated_read_categorias"
ON categorias
FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "authenticated_read_canales"
ON canales_venta
FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "authenticated_read_tipos_entrega"
ON tipos_entrega
FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "authenticated_read_productos"
ON productos
FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "authenticated_read_variantes"
ON variantes_producto
FOR SELECT
TO authenticated
USING (TRUE);

CREATE POLICY "authenticated_read_vendedores"
ON vendedores
FOR SELECT
TO authenticated
USING (TRUE);


-- ============================================================
-- 53. ADMINISTRACIÓN
-- ============================================================

CREATE POLICY "admin_all_productos"
ON productos
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_variantes"
ON variantes_producto
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_categorias"
ON categorias
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_sucursales"
ON sucursales
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_clientes"
ON clientes
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_lotes"
ON lotes
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_detalle_lote"
ON detalle_lote
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_costos_lote"
ON costos_lote
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_inversionistas"
ON inversionistas
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_inversiones"
ON inversiones_lote
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_retiros"
ON retiros
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_repartos"
ON repartos_utilidad
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_vendedores"
ON vendedores
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_canales"
ON canales_venta
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "admin_all_tipos_entrega"
ON tipos_entrega
FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());


-- ============================================================
-- 54. PERMISOS RPC
-- ============================================================

GRANT EXECUTE ON FUNCTION crear_pedido(
    UUID,
    UUID,
    UUID,
    UUID,
    UUID,
    JSONB,
    BOOLEAN,
    NUMERIC,
    TEXT,
    TEXT,
    TEXT
) TO authenticated;

GRANT EXECUTE ON FUNCTION completar_pedido(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION cancelar_pedido(UUID)
TO authenticated;

GRANT EXECUTE ON FUNCTION registrar_pago(
    UUID,
    NUMERIC,
    metodo_pago,
    TEXT,
    TEXT
) TO authenticated;

GRANT EXECUTE ON FUNCTION recibir_lote(UUID)
TO authenticated;

-- ============================================================
-- JIMMO V4.1 - SEGURIDAD Y CONSISTENCIA
-- ============================================================

-- Los RPC SECURITY DEFINER internos NO deben quedar invocables por el cliente.
REVOKE EXECUTE ON FUNCTION reservar_stock(UUID, INTEGER) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION liberar_stock_reservado(UUID, INTEGER) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION asignar_fifo_detalle(UUID, BOOLEAN) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION sincronizar_reserva(UUID) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION generar_reparto_utilidad(UUID) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION costo_unitario_lote_fifo(UUID) FROM PUBLIC, authenticated;

-- Los RPC de negocio son la única puerta de escritura para vendedores.
REVOKE EXECUTE ON FUNCTION crear_pedido(UUID, UUID, UUID, UUID, UUID, JSONB, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION completar_pedido(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION cancelar_pedido(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION registrar_pago(UUID, NUMERIC, metodo_pago, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION editar_pedido(UUID, UUID, UUID, UUID, UUID, UUID, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION crear_pedido(UUID, UUID, UUID, UUID, UUID, JSONB, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION completar_pedido(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancelar_pedido(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_pago(UUID, NUMERIC, metodo_pago, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION editar_pedido(UUID, UUID, UUID, UUID, UUID, UUID, JSONB, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION recibir_lote(UUID) TO authenticated;

-- RLS de lectura: administrador ve todo; vendedor solo sus operaciones.
CREATE POLICY "authenticated_read_perfil_propio"
ON perfiles FOR SELECT TO authenticated
USING (id = auth.uid() OR es_admin());

CREATE POLICY "authenticated_read_pedidos_permitidos"
ON pedidos FOR SELECT TO authenticated
USING (es_admin() OR vendedor_id = vendedor_actual());

CREATE POLICY "authenticated_read_detalles_permitidos"
ON detalle_pedido FOR SELECT TO authenticated
USING (es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id = detalle_pedido.pedido_id AND p.vendedor_id = vendedor_actual()
));

CREATE POLICY "authenticated_read_pagos_permitidos"
ON pagos FOR SELECT TO authenticated
USING (es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id = pagos.pedido_id AND p.vendedor_id = vendedor_actual()
));

CREATE POLICY "authenticated_read_asignaciones_permitidas"
ON asignaciones_lote_pedido FOR SELECT TO authenticated
USING (es_admin() OR EXISTS (
    SELECT 1
    FROM detalle_pedido dp
    JOIN pedidos p ON p.id = dp.pedido_id
    WHERE dp.id = asignaciones_lote_pedido.detalle_pedido_id
      AND p.vendedor_id = vendedor_actual()
));

CREATE POLICY "authenticated_read_transportes"
ON transportes FOR SELECT TO authenticated
USING (activo = TRUE OR es_admin());

CREATE POLICY "authenticated_read_reservas_permitidas"
ON reservas FOR SELECT TO authenticated
USING (es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id = reservas.pedido_id AND p.vendedor_id = vendedor_actual()
));

CREATE POLICY "authenticated_read_entregas_permitidas"
ON entregas FOR SELECT TO authenticated
USING (es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id = entregas.pedido_id AND p.vendedor_id = vendedor_actual()
));

CREATE POLICY "authenticated_insert_entregas"
ON entregas FOR INSERT TO authenticated
WITH CHECK (
  es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id = entregas.pedido_id AND p.vendedor_id = vendedor_actual()
  )
);

CREATE POLICY "authenticated_update_entregas"
ON entregas FOR UPDATE TO authenticated
USING (
  es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id = entregas.pedido_id AND p.vendedor_id = vendedor_actual()
  )
)
WITH CHECK (
  es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id = entregas.pedido_id AND p.vendedor_id = vendedor_actual()
  )
);

CREATE POLICY "authenticated_delete_entregas"
ON entregas FOR DELETE TO authenticated
USING (
  es_admin() OR EXISTS (
    SELECT 1 FROM pedidos p WHERE p.id = entregas.pedido_id AND p.vendedor_id = vendedor_actual()
  )
);

CREATE POLICY "authenticated_read_clientes"
ON clientes FOR SELECT TO authenticated
USING (activo = TRUE OR es_admin());

-- El vendedor puede crear clientes; la modificación estructural de catálogos sigue siendo administrativa.
CREATE POLICY "authenticated_insert_clientes"
ON clientes FOR INSERT TO authenticated
WITH CHECK (activo = TRUE);

-- Los vendedores no pueden modificar directamente pedidos, detalles, pagos, inventario, lotes ni utilidades.
-- Esas operaciones pasan por RPC autorizadas.

-- Restricciones adicionales de datos monetarios.
ALTER TABLE detalle_lote
    ADD CONSTRAINT chk_otros_costos_no_negativos
    CHECK (otros_costos_bs >= 0);

ALTER TABLE detalle_pedido
    ADD CONSTRAINT chk_precio_no_negativo_v41
    CHECK (precio_unitario >= 0);

-- ============================================================
-- NOTA V4.1
-- La tabla asignaciones_lote_pedido conserva historial mediante activa=FALSE.
-- Nunca se reutiliza una asignación histórica como una reserva nueva.
-- Los costos FIFO quedan capturados en la asignación al momento de reservar.
-- Las correcciones de pedidos COMPLETADOS/CANCELADOS requieren un flujo
-- posterior de devolución/ajuste y no edición destructiva.
-- ============================================================

REVOKE EXECUTE ON FUNCTION verificar_invariantes_inventario(UUID) FROM PUBLIC, authenticated;
