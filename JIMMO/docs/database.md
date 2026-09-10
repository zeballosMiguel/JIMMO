# JIMMO — Base de datos V4.1

## 1. Fuente
La fuente de partida es `database/Jimmo_V4_1.sql`.

La BD es PostgreSQL y contiene lógica de negocio crítica mediante funciones, restricciones, RLS, triggers y vistas.

## 2. Entidades principales
- `sucursales`
- `canales_venta`
- `tipos_entrega`
- `perfiles`
- `usuario_sucursal`
- `vendedores`
- `vendedor_sucursal`
- `inversionistas`
- `clientes`
- `categorias`
- `productos`
- `variantes_producto`
- `lotes`
- `detalle_lote`
- `costos_lote`
- `inversiones_lote`
- `pedidos`
- `detalle_pedido`
- `asignaciones_lote_pedido`
- `pagos`
- `reservas`
- `transportes`
- `entregas`
- `movimientos_inventario`
- `retiros`
- `repartos_utilidad`

## 3. Funciones de negocio críticas
El esquema V4.1 contiene funciones para:
- autenticación contextual/autorización;
- cálculo de totales;
- pagos y saldos;
- reservas;
- recepción de lotes;
- invariantes de inventario;
- costo FIFO;
- asignación FIFO;
- creación de pedidos;
- completado;
- cancelación;
- registro de pagos;
- reparto de utilidad;
- edición de pedidos.

Funciones clave:
- `crear_pedido`
- `completar_pedido`
- `cancelar_pedido`
- `registrar_pago`
- `editar_pedido`
- `reservar_stock`
- `liberar_stock_reservado`
- `asignar_fifo_detalle`
- `sincronizar_reserva`
- `recibir_lote`
- `verificar_invariantes_inventario`
- `costo_unitario_lote_fifo`
- `generar_reparto_utilidad`

## 4. Histórico de detalles
`detalle_pedido.activo` permite conservar detalles antiguos después de una edición de pedido.

Las consultas operativas deben usar detalles activos cuando calculen el estado actual del pedido.

## 5. Histórico FIFO
`asignaciones_lote_pedido.activa` permite conservar asignaciones antiguas después de cancelaciones/ediciones.

Existe un índice único parcial para impedir dos asignaciones activas duplicadas del mismo detalle/lote sin impedir el histórico.

## 6. Inventario e invariantes
La BD debe garantizar, mediante sus reglas y funciones, que:
- stock reservado no supere stock actual;
- stock actual coincida con el total derivado de lotes relevantes;
- stock reservado coincida con reservas a nivel lote.

## 7. RLS y permisos
La aplicación no debe saltarse la seguridad de la BD.
Las operaciones de negocio deben usar las funciones RPC autorizadas cuando así está definido por el esquema.

No conceder al frontend acceso directo de escritura a tablas sensibles si el diseño existente lo evita mediante RPC.

## 8. Vistas
V4.1 incluye vistas para:
- inventario;
- pedidos;
- rentabilidad por producto;
- utilidad por vendedor;
- rentabilidad por lote;
- resumen de clientes;
- capital de inversionistas;
- utilidad de inversionistas.

## 9. Regla para Prisma
Si se usa Prisma como cliente ORM, no convertir automáticamente todo el esquema SQL en una nueva fuente de verdad que destruya funciones/RLS/triggers.

La estrategia recomendada es:
- PostgreSQL/SQL como fuente de verdad del dominio;
- migraciones SQL versionadas para cambios de BD;
- Prisma Client para acceso tipado donde resulte conveniente;
- procedimientos/RPC para operaciones de negocio críticas que ya están encapsuladas en la BD.
