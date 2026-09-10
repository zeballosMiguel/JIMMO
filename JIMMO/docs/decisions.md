# JIMMO — Decisiones técnicas y de dominio

## ADR-001 — PostgreSQL
**Estado:** Aprobado

PostgreSQL es la base de datos de JIMMO por la naturaleza relacional, transaccional y de integridad del sistema.

## ADR-002 — Inventario por variante
**Estado:** Aprobado

El stock pertenece a `variantes_producto`, con trazabilidad por lotes.

## ADR-003 — FIFO real
**Estado:** Aprobado

El costo de venta se determina con FIFO y no con un costo promedio inventado por frontend.

## ADR-004 — Precio histórico por detalle
**Estado:** Aprobado

El mismo producto/variante puede venderse a precios diferentes. El precio histórico vive en `detalle_pedido`.

## ADR-005 — Sucursales sin inventario independiente
**Estado:** Aprobado para V4.1

Las sucursales registran contexto de venta/operación, pero el stock es general.

## ADR-006 — Historial no destructivo
**Estado:** Aprobado

Las ediciones/cancelaciones no deben destruir detalles ni asignaciones históricas.

## ADR-007 — Edición transaccional de pedidos reservados
**Estado:** Aprobado

Un pedido RESERVADO se edita liberando la asignación previa y reconstruyendo la nueva dentro de una transacción.

## ADR-008 — No microservicios
**Estado:** Aprobado

JIMMO V4.x se implementa como monolito modular.

## ADR-009 — Antigravity no decide el dominio
**Estado:** Aprobado

El agente puede proponer mejoras, pero no cambiar reglas, esquema o arquitectura sin aprobación.

## ADR-010 — Devoluciones futuras
**Estado:** Pendiente / fuera de V4.1

Las devoluciones/cambios deberán implementarse como un flujo explícito de ajuste/devolución. No usar edición destructiva de ventas completadas como sustituto.

## ADR-011 — ORM
**Estado:** Aprobado con cautela

Prisma Client puede utilizarse para acceso tipado, pero SQL/migraciones y funciones de PostgreSQL continúan siendo fuente de verdad del dominio. No generar una migración Prisma que reemplace o elimine funciones/RLS/triggers existentes.
