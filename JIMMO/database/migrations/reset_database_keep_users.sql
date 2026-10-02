-- ============================================================
-- SCRIPT PARA LIMPIAR DATOS DE PRUEBA (REINICIO OPERATIVO)
-- Conserva ÚNICAMENTE:
--   ✅ Usuarios (auth.users)
--   ✅ Perfiles (roles admin y vendedor)
--   ✅ Vendedores (con sus comisiones asignadas)
--   ✅ Configuración básica (tipos_entrega, canales_venta, sucursales)
--
-- Borra TODO lo operativo:
--   ❌ Pedidos y detalles de venta
--   ❌ Lotes, costos e inversiones
--   ❌ Retiros y repartos de utilidad
--   ❌ Movimientos de kardex / inventario
--   ❌ Catálogo (productos, variantes, categorías)
--   ❌ Clientes e inversionistas
--
-- Reinicia los contadores de pedidos (#1) y lotes (#1).
-- ============================================================

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'asignaciones_lote_pedido',
        'movimientos_inventario',
        'entregas',
        'reservas',
        'pagos',
        'detalle_pedido',
        'pedidos',
        'costos_lote',
        'inversiones_lote',
        'detalle_lote',
        'lotes',
        'retiros',
        'repartos_utilidad',
        'variantes_producto',
        'productos',
        'categorias',
        'clientes',
        'transportes',
        'inversionistas'
    ];
    existing_tables text := '';
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            IF existing_tables <> '' THEN
                existing_tables := existing_tables || ', ';
            END IF;
            existing_tables := existing_tables || quote_ident(t);
        END IF;
    END LOOP;

    IF existing_tables <> '' THEN
        EXECUTE 'TRUNCATE TABLE ' || existing_tables || ' RESTART IDENTITY CASCADE;';
    END IF;
END $$;

-- 2. Reiniciar explícitamente secuencias / contadores IDENTITY a 1
DO $$
BEGIN
    -- Pedidos
    BEGIN
        ALTER TABLE pedidos ALTER COLUMN numero RESTART WITH 1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Lotes
    BEGIN
        ALTER TABLE lotes ALTER COLUMN numero_lote RESTART WITH 1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'pedidos_numero_seq') THEN
        ALTER SEQUENCE pedidos_numero_seq RESTART WITH 1;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'lotes_numero_lote_seq') THEN
        ALTER SEQUENCE lotes_numero_lote_seq RESTART WITH 1;
    END IF;
END $$;

-- 3. Garantizar los tipos de entrega base
INSERT INTO tipos_entrega (nombre, descripcion)
VALUES
    ('En Tienda', 'Retiro en tienda física'),
    ('Envío', 'Envío por flota / ciudad de destino'),
    ('Paquetería', 'Entrega en paquetería local')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

UPDATE tipos_entrega
SET activo = TRUE
WHERE nombre IN ('En Tienda', 'Envío', 'Paquetería');

-- 4. Garantizar canales de venta base
INSERT INTO canales_venta (nombre, descripcion)
VALUES
    ('Tienda Física', 'Ventas en mostrador'),
    ('WhatsApp', 'Ventas por mensajería'),
    ('TikTok', 'Ventas por lives o mensajes'),
    ('Facebook', 'Ventas por Marketplace / Fanpage')
ON CONFLICT (nombre) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

-- 5. Garantizar sucursal principal
INSERT INTO sucursales (nombre, direccion)
SELECT 'Sucursal Central', 'Tienda Principal'
WHERE NOT EXISTS (SELECT 1 FROM sucursales WHERE nombre = 'Sucursal Central');
