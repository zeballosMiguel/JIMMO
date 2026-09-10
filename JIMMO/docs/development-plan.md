# JIMMO — Plan de desarrollo paso a paso

## Regla general
No construir todo de golpe. Cada fase produce un estado ejecutable y comprobable.

## Fase 0 — Preparación
Objetivo: repositorio y contrato técnico.

Tareas:
- crear repo Git;
- colocar documentos;
- colocar SQL V4.1;
- configurar `.gitignore`;
- crear README;
- crear estructura base;
- verificar Node/Next/TypeScript;
- primer commit.

**Salida:** proyecto base versionado, sin funcionalidad de negocio todavía.

## Fase 1 — Auditoría de Antigravity
Pedir al agente que:
- lea todos los docs;
- inspeccione SQL V4.1;
- revise coherencia arquitectura ↔ BD ↔ requisitos;
- detecte contradicciones;
- NO programe.

**Salida:** informe de auditoría y lista de riesgos.

## Fase 2 — Bootstrap técnico
Implementar:
- Next.js;
- TypeScript estricto;
- Tailwind/shadcn;
- configuración de entorno;
- conexión a Supabase/PostgreSQL;
- Prisma Client si se confirma su uso;
- lint/typecheck/test/build.

**Salida:** aplicación vacía que inicia y pasa checks.

## Fase 3 — Autenticación y autorización
Implementar:
- login/logout;
- sesión;
- perfiles;
- roles admin/vendedor;
- protección de rutas;
- autorización server-side.

**Salida:** usuarios pueden entrar y ver únicamente lo permitido.

## Fase 4 — Catálogos
Implementar:
- categorías;
- productos;
- colores/tallas según esquema;
- variantes/SKU;
- canales;
- tipos de entrega;
- sucursales;
- vendedores.

**Salida:** catálogo operativo.

## Fase 5 — Inventario y lotes
Implementar UI para:
- consultar inventario;
- consultar variantes;
- consultar lotes;
- recibir lote;
- visualizar disponible/reservado;
- visualizar costo efectivo/FIFO donde corresponda.

No duplicar la lógica de stock en frontend.

**Salida:** inventario usable.

## Fase 6 — Clientes
Implementar:
- listado;
- búsqueda;
- creación;
- edición permitida;
- resumen básico.

**Salida:** clientes operativos.

## Fase 7 — Pedidos y ventas
Implementar progresivamente:
1. crear BORRADOR;
2. agregar detalles;
3. calcular/mostrar total del servidor;
4. reservar;
5. completar;
6. cancelar;
7. editar BORRADOR;
8. editar RESERVADO;
9. historial.

**Salida:** flujo comercial completo V4.1.

## Fase 8 — Pagos y entregas
Implementar:
- registrar pago;
- saldo;
- métodos;
- entrega;
- transporte;
- estados de entrega.

**Salida:** operación posterior a la venta.

## Fase 9 — Reportes
Implementar primero vistas existentes:
- inventario;
- pedidos;
- rentabilidad producto;
- utilidad vendedor;
- rentabilidad lote;
- clientes;
- inversionistas.

Después añadir filtros/exportación solo si están definidos.

## Fase 10 — Pruebas E2E
Crear casos reales:
- venta normal;
- venta a distinto precio;
- reserva;
- cancelación;
- edición reservada;
- FIFO de varios lotes;
- costos adicionales;
- stock insuficiente;
- vendedor intentando operar pedido ajeno;
- administrador;
- pagos;
- entrega.

## Fase 11 — UX y endurecimiento
- responsive;
- mensajes de error;
- confirmaciones;
- loading states;
- estados vacíos;
- accesibilidad básica;
- logs;
- manejo de errores;
- revisión de seguridad.

## Fase 12 — Migración operativa
Solo después de validar el sistema:
- cargar catálogos reales;
- limpiar/normalizar datos históricos;
- definir importación de ventas;
- comparar resultados contra hoja de cálculo;
- piloto con pocos usuarios;
- corregir;
- migración progresiva.

## Regla de avance
No pasar de fase por entusiasmo. Pasar cuando la fase actual tiene:
- implementación terminada;
- checks ejecutados;
- tests relevantes;
- commit;
- riesgos conocidos documentados.
