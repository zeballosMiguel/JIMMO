# JIMMO — Arquitectura tecnológica aprobada

## 1. Objetivo arquitectónico
Construir una aplicación web full-stack, mantenible y preparada para crecimiento, evitando microservicios y complejidad innecesaria.

## 2. Stack
### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend
- Next.js full-stack / Route Handlers / Server Actions solo cuando sean apropiados
- TypeScript
- Zod para validación
- Prisma Client para acceso tipado donde corresponda

### Base de datos
- PostgreSQL
- Supabase como plataforma preferida para PostgreSQL/Auth/Storage
- SQL versionado para migraciones del dominio

### Autenticación
- Supabase Auth como opción aprobada de partida.
- Los datos de negocio del usuario viven en las tablas de JIMMO (`perfiles`, `vendedores`, etc.).

### Hosting
- Vercel para la aplicación Next.js.
- Supabase para PostgreSQL/Auth/Storage.
- GitHub para repositorio.

### Testing
- Vitest para lógica/unit tests.
- Playwright para flujos E2E.

## 3. Arquitectura lógica
```text
Browser
  ↓
Next.js UI
  ↓
Server/API layer
  ↓
Validation + Authorization
  ↓
Business operations / RPC
  ↓
PostgreSQL
```

Supabase Auth proporciona identidad/sesión; PostgreSQL mantiene la lógica e integridad del dominio.

## 4. Regla de responsabilidad
### Frontend
Presentación, interacción, validaciones de UX y estado de interfaz.

### Backend
Orquestación, autorización, validación, composición de respuestas y operaciones no adecuadas para el cliente.

### PostgreSQL
Integridad, transacciones, stock, FIFO, reservas, totales y reglas que ya están encapsuladas en V4.1.

## 5. No microservicios
No separar productos, inventario, ventas, clientes, etc. en servicios independientes en V4.x.

Un monolito modular es suficiente.

## 6. Módulos de aplicación
```text
src/
  app/
  components/
  features/
    auth/
    dashboard/
    products/
    inventory/
    customers/
    orders/
    payments/
    deliveries/
    sellers/
    reports/
  lib/
    auth/
    db/
    validation/
    permissions/
```

La estructura exacta puede adaptarse a convenciones de Next.js sin romper esta separación conceptual.

## 7. Seguridad
- Cookies/sesiones seguras.
- Secretos únicamente en variables de entorno del servidor.
- Validación Zod en límites de entrada.
- Autorización server-side.
- RLS cuando se accede directamente a Supabase.
- No exponer service-role keys al navegador.

## 8. Manejo de errores
Los errores de negocio deben traducirse a mensajes comprensibles para el usuario sin ocultar el error técnico en logs.

No mostrar stack traces al usuario.

## 9. Datos
No duplicar la lógica de cálculo de stock/utilidad en frontend.
El frontend consume la fuente calculada por backend/BD.

## 10. Evolución
La arquitectura debe permitir agregar módulos sin reescribir el núcleo.
Toda evolución del esquema pasa por migraciones.
Toda decisión arquitectónica importante se registra.
