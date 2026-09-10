# JIMMO — AGENTS.md

## 1. Misión
Construir JIMMO como un sistema real de gestión de ventas e inventario para el negocio existente, reemplazando progresivamente el uso operativo de Google Sheets sin perder la lógica real del negocio.

El agente debe IMPLEMENTAR la especificación aprobada. No debe rediseñar el negocio por iniciativa propia.

## 2. Fuente de verdad
Orden de autoridad:
1. `docs/business-rules.md` — reglas del negocio.
2. `docs/database.md` — modelo de datos JIMMO V4.1.
3. `docs/architecture.md` — arquitectura técnica aprobada.
4. `docs/requirements.md` — requisitos funcionales.
5. `docs/decisions.md` — decisiones y restricciones técnicas.
6. `database/migrations/` — evolución real del esquema.
7. Código existente — solo después de comprobar que coincide con lo anterior.

Si dos fuentes entran en conflicto, NO elijas silenciosamente. Detén el cambio afectado, identifica el conflicto y propón una resolución.

## 3. Regla crítica: no inventar
No inventar:
- reglas comerciales;
- estados nuevos;
- permisos nuevos;
- fórmulas de utilidad;
- comportamiento de stock;
- relaciones entre entidades;
- campos de negocio;
- precios o costos por defecto;
- flujos de devolución/cambio;
- integración externa.

Si falta información, usa el comportamiento mínimo seguro y deja una decisión pendiente en `docs/decisions.md`; no conviertas una suposición en regla permanente.

## 4. Base de datos
- PostgreSQL es la base de datos de producción.
- `JIMMO_V4_1.sql` representa el esquema aprobado de partida.
- Toda modificación del esquema debe ser una migración versionada.
- Nunca modificar producción manualmente para "arreglar" el esquema.
- No borrar datos históricos para simplificar una funcionalidad.
- Las órdenes completadas/canceladas son históricas y no deben editarse destructivamente.
- Las variantes son unidades reales de inventario: talla/color/SKU/stock pertenecen a la variante.
- El precio de venta es histórico por detalle de pedido.
- El costo de venta debe provenir del FIFO de lotes; el frontend nunca decide el costo real.
- Mantener integridad transaccional e invariantes de inventario.

## 5. Seguridad
- La autenticación y autorización son requisitos, no una mejora posterior.
- No exponer secretos en frontend ni repositorio.
- No confiar en IDs, precios, costos, totales, vendedor o permisos enviados por el navegador.
- Validar en servidor.
- Respetar RLS/permisos cuando corresponda.
- Las funciones sensibles deben comprobar autorización.
- No convertir funciones internas de inventario en endpoints públicos solo para facilitar el frontend.

## 6. Código
- TypeScript estricto.
- Validación de entradas con Zod o equivalente aprobado.
- Componentes reutilizables.
- Evitar duplicación.
- No hacer refactors no relacionados con la tarea.
- No instalar dependencias innecesarias.
- Mantener nombres de dominio claros y consistentes con la BD.

## 7. UX
JIMMO será usado por personas que actualmente trabajan con una hoja de cálculo. La interfaz debe ser más sencilla que la hoja, no más compleja.
- Formularios rápidos.
- Búsqueda clara.
- Tablas legibles.
- Estados visibles.
- Acciones peligrosas con confirmación.
- Errores explicados en lenguaje operativo.
- Diseño responsive, especialmente usable en móvil.

## 8. Trabajo por etapas
No construir todo JIMMO de golpe.
Cada objetivo debe ser acotado y terminar con:
1. implementación;
2. validación;
3. tests relevantes;
4. revisión de cambios;
5. commit descriptivo;
6. reporte breve de lo hecho y pendientes.

## 9. Git
- Trabajar siempre con Git.
- Un objetivo lógico = un commit o conjunto pequeño de commits relacionados.
- No mezclar funcionalidades no relacionadas.
- Antes de cambios importantes, comprobar estado del repositorio.

## 10. Antes de programar
Para cada objetivo:
- inspeccionar el estado actual del proyecto;
- leer los documentos relevantes;
- comprobar dependencias y estructura existentes;
- describir brevemente el plan;
- implementar solo lo necesario.

## 11. Antes de declarar terminado
Ejecutar, cuando aplique:
- typecheck;
- lint;
- tests unitarios;
- tests de integración;
- build;
- tests E2E relevantes.

No afirmar "funciona" sin haber ejecutado las comprobaciones disponibles.

## 12. Cambios de arquitectura
El agente puede sugerir mejoras, pero no debe cambiar por su cuenta:
- stack principal;
- modelo de datos;
- estrategia de autenticación;
- estrategia de inventario/FIFO;
- reglas de negocio;
- arquitectura de despliegue.

Para eso debe crear una propuesta y esperar aprobación explícita.
