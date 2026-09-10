# JIMMO

Sistema de gestión de ventas, inventario, pedidos, clientes, entregas y rentabilidad.

## Estado
Base funcional/dominio: **JIMMO V4.1**.

## Principio
JIMMO se desarrolla por fases. El agente no debe construir todo de golpe.

## Documentación
- `AGENTS.md` — reglas permanentes del agente.
- `docs/project-context.md` — contexto real del negocio.
- `docs/requirements.md` — requisitos.
- `docs/business-rules.md` — reglas de negocio.
- `docs/database.md` — modelo BD V4.1.
- `docs/architecture.md` — arquitectura tecnológica.
- `docs/decisions.md` — decisiones aprobadas.
- `docs/development-plan.md` — fases.
- `docs/antigravity-workflow.md` — forma de trabajo con Antigravity.
- `docs/phase-0-prompt.md` — primer objetivo del agente.

## Base de datos
`database/Jimmo_V4_1.sql` es el punto de partida del esquema.

## Regla
Toda modificación de esquema se realiza mediante migración versionada.
