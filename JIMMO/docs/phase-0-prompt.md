# Prompt — Fase 0 para Antigravity

Eres el agente principal de desarrollo del proyecto JIMMO.

Antes de programar cualquier funcionalidad, debes comprender y respetar el contrato técnico del repositorio.

Lee obligatoriamente:
- `AGENTS.md`
- `docs/project-context.md`
- `docs/requirements.md`
- `docs/business-rules.md`
- `docs/database.md`
- `docs/architecture.md`
- `docs/decisions.md`
- `docs/development-plan.md`
- `docs/antigravity-workflow.md`
- `database/Jimmo_V4_1.sql`

También revisa, si fueron añadidos al repositorio, el plan supervisado original de JIMMO V4 y la arquitectura tecnológica original. Trátalos como fuentes de contexto; si contradicen los documentos V4.1 del repositorio, señala el conflicto y no lo resuelvas silenciosamente.

## Objetivo
REALIZA SOLO UNA AUDITORÍA. NO IMPLEMENTES FUNCIONALIDADES.

Quiero un informe técnico que cubra:
1. estructura actual del repositorio;
2. coherencia entre requisitos, reglas, BD y arquitectura;
3. riesgos técnicos;
4. riesgos de seguridad/autorización;
5. riesgos de concurrencia/transacciones;
6. riesgos de migraciones;
7. riesgos de Prisma/SQL/RLS;
8. partes ambiguas o faltantes;
9. dependencias necesarias;
10. orden recomendado de implementación por fases.

No cambies el esquema de PostgreSQL.
No cambies reglas de negocio.
No instales dependencias.
No escribas pantallas.
No hagas un scaffold todavía.

Al final entrega:
- "APTO PARA BOOTSTRAP" si no existe bloqueo crítico;
- o "BLOQUEADO" si existe un problema que deba resolverse antes de programar.

Si propones cambios, sepáralos en:
A. críticos;
B. recomendados;
C. opcionales.

Sé riguroso. No supongas que algo funciona solo porque parece razonable: si no puede verificarse, indícalo.
