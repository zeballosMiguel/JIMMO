# JIMMO — Requisitos funcionales V4.1

## 1. Objetivo
JIMMO es un sistema de gestión de ventas, inventario, pedidos, clientes, vendedores, entregas y rentabilidad para reemplazar progresivamente el manejo operativo actual en hojas de cálculo.

El sistema debe reflejar el negocio real, no una tienda online genérica.

## 2. Usuarios
### Administrador
Puede gestionar y consultar información global del negocio según las políticas definidas en la base de datos.

### Vendedor
Puede operar sus ventas/pedidos y consultar la información que le corresponda según autorización.

## 3. Módulos principales
1. Autenticación y sesión.
2. Dashboard.
3. Productos.
4. Variantes/SKU.
5. Inventario y lotes.
6. Clientes.
7. Pedidos/ventas.
8. Pagos.
9. Entregas y envíos.
10. Vendedores.
11. Canales de venta.
12. Reportes de rentabilidad.
13. Inversionistas/reparto de utilidad, cuando corresponda.

## 4. Productos y variantes
Un producto representa el artículo comercial.
Una variante representa la unidad real que se controla en inventario.

Una variante puede diferenciarse por talla, color y SKU u otros atributos definidos por el modelo aprobado.

El stock no debe modelarse como un único atributo informal del producto.

## 5. Inventario
El inventario es general y pertenece a la variante, no a una sucursal.

El inventario debe contemplar lotes y cantidades disponibles/reservadas.

El sistema debe:
- recibir lotes;
- controlar cantidades;
- reservar stock;
- liberar reservas;
- consumir stock en una venta completada;
- asignar costo FIFO;
- mantener trazabilidad de las asignaciones.

## 6. Pedidos
Estados aprobados:
- BORRADOR
- RESERVADO
- COMPLETADO
- CANCELADO

Un pedido tiene cliente, vendedor, sucursal/canal/tipo de entrega según modelo, detalles, pagos y datos de entrega.

Los detalles contienen como mínimo variante, cantidad y precio histórico.

El total debe calcularse en servidor.

## 7. Flujo de pedido
### BORRADOR
Puede modificarse antes de completar/reservar.

### RESERVADO
El stock está reservado y el pedido puede tener un pago/reserva inicial.

### COMPLETADO
La venta se consolida, se consume el stock y se registra la salida correspondiente. La utilidad usa el costo FIFO.

### CANCELADO
No puede continuar el flujo comercial. Si existía una reserva activa, debe liberarse el stock correctamente y conservarse el historial.

## 8. Edición
`BORRADOR` puede editarse.
`RESERVADO` puede editarse mediante flujo transaccional que libera la asignación anterior y reconstruye la nueva.

`COMPLETADO` y `CANCELADO` son históricos e inmutables por el flujo normal.

Las ediciones de pedidos reservados no deben destruir el historial de detalles/asignaciones.

## 9. Pagos
El sistema debe registrar pagos con monto y método.

Métodos aprobados por la BD:
- EFECTIVO
- TRANSFERENCIA
- QR
- TARJETA
- DEPOSITO
- OTRO

No registrar pagos de pedidos cancelados.

El servidor debe impedir que los pagos superen las reglas financieras establecidas por el modelo.

## 10. Entregas
Tipos aprobados:
- RETIRO_TIENDA
- FERIA
- ENVIO
- DELIVERY
- OTRO

Estados aprobados:
- PENDIENTE
- PREPARANDO
- ENVIADO
- ENTREGADO
- CANCELADO

La UI debe permitir registrar información de entrega/envío sin convertirla en una regla de negocio distinta.

## 11. Canales de venta
El sistema debe soportar canales existentes como TikTok, Facebook, Facebook ADS, Marketplace, Tienda, Puesto y otros definidos en catálogo.

## 12. Rentabilidad
La utilidad no debe calcularse con un costo arbitrario enviado por el frontend.
Debe utilizar el costo FIFO efectivo del lote.

Los costos adicionales del lote forman parte del costo unitario efectivo según el modelo de BD.

## 13. Reportes
La aplicación debe poder exponer información de:
- inventario;
- pedidos;
- rentabilidad por producto;
- utilidad por vendedor;
- rentabilidad por lote;
- resumen de clientes;
- capital/utilidad de inversionistas cuando corresponda.

## 14. Fuera de alcance inicial
No implementar sin aprobación:
- devoluciones/cambios completos;
- marketplace público para clientes;
- facturación electrónica;
- contabilidad formal;
- microservicios;
- aplicación móvil nativa;
- automatizaciones externas no especificadas.
