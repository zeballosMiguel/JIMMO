# JIMMO — Reglas de negocio V4.1

## 1. Inventario
1. El stock pertenece a la variante.
2. Las sucursales registran contexto de operación/venta; no tienen inventario independiente en V4.1.
3. Una variante puede tener múltiples lotes.
4. Solo los lotes recibidos/cerrados participan en los cálculos de inventario definidos por el modelo.
5. Las cantidades disponibles y reservadas deben mantener coherencia con los totales de variante.
6. Las invariantes de inventario deben poder verificarse transaccionalmente.

## 2. Variantes
Color/talla no son simples atributos planos del producto cuando representan unidades de inventario diferentes.
Cada combinación vendible debe tener una variante identificable.

## 3. Precio
El precio de venta es histórico por `detalle_pedido`.
El mismo producto/variante puede venderse a precios distintos en operaciones diferentes.

## 4. FIFO
El costo de venta se determina por los lotes más antiguos disponibles.
El orden FIFO usa la fecha de recepción cuando existe, luego fecha de compra, además de número de lote/ID como desempate estable.

El costo unitario efectivo de lote considera:
- `costo_unitario_bs`;
- `otros_costos_bs` distribuidos sobre la cantidad del lote;
- `costos_lote.monto_bs` distribuidos sobre la cantidad total del lote.

El costo calculado se guarda en la asignación FIFO para preservar el histórico de la venta.

## 5. Reservas
Una reserva representa stock apartado para un pedido.
Reservar reduce disponible y aumenta reservado en lote/variante según el flujo transaccional.

Liberar una reserva hace la operación inversa.

Una asignación FIFO histórica no debe eliminarse simplemente para ocultar una modificación/cancelación. Se conserva y se marca inactiva cuando deja de representar una asignación vigente.

## 6. Pedidos y Ventas
Estados válidos:
`RESERVADO`, `COMPLETADO`, `CANCELADO` (No existe estado BORRADOR; toda venta descuenta/compromete stock de inmediato).

Modalidades de creación:
- **Venta Inmediata / Directa (`COMPLETADO`)**: Se cobra el total al momento, liquida el stock definitivamente (SALIDA_VENTA FIFO).
- **Reserva con Adelanto (`RESERVADO`)**: Cuando el cliente pasa por tienda física y deja un anticipo/adelanto. Aparta las prendas de inmediato (FIFO reservado) y genera saldo pendiente por cobrar.

Transiciones principales:
- RESERVADO → COMPLETADO (al liquidar el saldo y retirar el producto)
- RESERVADO → CANCELADO (libera las reservas y devuelve el stock al inventario disponible)

No modificar pedidos COMPLETADOS/CANCELADOS mediante `editar_pedido`.

## 7. Edición de pedidos
En RESERVADO, editar implica:
1. bloquear la operación en una transacción;
2. liberar la asignación/reserva anterior;
3. conservar las asignaciones antiguas como históricas/inactivas;
4. conservar detalles antiguos como históricos/inactivos;
5. crear detalles activos nuevos;
6. recalcular total;
7. reconstruir FIFO/reserva;
8. validar invariantes.

## 8. Cancelación
No cancelar COMPLETADO mediante el flujo normal de cancelación.

Al cancelar un RESERVADO:
- devolver disponibilidad al lote;
- disminuir reservado del lote/variante;
- desactivar asignaciones activas;
- desactivar reserva;
- conservar historial.

## 9. Pagos
Solo usuarios autorizados pueden registrar pagos.
No registrar pagos sobre pedidos CANCELADOS.
El pedido debe bloquearse al calcular el saldo para evitar carreras de concurrencia.

## 10. Autorización
Un vendedor no debe operar libremente pedidos de otro vendedor.
El administrador puede operar globalmente según las políticas de la aplicación.

El servidor debe ser la autoridad final sobre vendedor, cliente, total, stock, costo y estado.

## 11. Utilidad
La utilidad real usa precio histórico de venta menos costo FIFO efectivo y las reglas de reparto definidas por el modelo.

No aceptar un costo enviado por el frontend como fuente de verdad.

## 12. Historial
No destruir información histórica para simplificar la UI.
La aplicación puede ocultar registros históricos mediante filtros, pero la BD debe conservar la trazabilidad aprobada.

## 13. Regla general
Toda operación que modifique stock, reserva, asignación FIFO, estado comercial o dinero debe ser transaccional y validada en servidor.
