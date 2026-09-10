# JIMMO — Cómo trabajar con Antigravity

## Principio
Antigravity trabaja como agente de implementación, no como autoridad del negocio.

Flujo:

```text
Nosotros definimos
      ↓
Antigravity analiza
      ↓
Antigravity propone
      ↓
Nosotros aprobamos cuando haya decisión real
      ↓
Antigravity implementa
      ↓
Antigravity prueba
      ↓
Revisión
      ↓
Commit
```

## Tareas pequeñas
Usar objetivos delimitados. Ejemplos:
- "Implementa autenticación y no toques pedidos".
- "Implementa CRUD de clientes y sus tests".
- "Implementa la pantalla de variantes usando el esquema existente".
- "Implementa el flujo BORRADOR → RESERVADO".

Evitar:
> "Construye JIMMO completo."

## Cuando pedir análisis
Usar un objetivo de análisis antes de cambios delicados:
> "Audita esta fase contra docs y SQL. No modifiques archivos. Devuelve riesgos, contradicciones y plan." 

## Cuando pedir implementación
Después de aprobar:
> "Implementa únicamente lo aprobado. Respeta AGENTS.md. Ejecuta checks y tests. No cambies arquitectura ni esquema sin aprobación." 

## Cuando pedir revisión
> "Revisa el trabajo de esta fase como auditor senior. Busca errores de seguridad, autorización, datos, estados, concurrencia, UX y tests. No cambies código todavía." 

## Uso de navegador
Cuando exista una interfaz funcional, utilizar pruebas en navegador para validar flujos reales, no solo unit tests.

## Uso de worktrees
Para cambios grandes o experimentales, preferir aislamiento mediante worktree si la configuración del proyecto lo permite.

## Cambios de BD
Un cambio de esquema requiere:
1. explicación del problema;
2. propuesta de migración;
3. impacto;
4. compatibilidad;
5. tests;
6. aprobación;
7. implementación.

## Reporte final de cada tarea
Antigravity debe responder:
- Qué cambió.
- Archivos principales.
- Tests ejecutados y resultado.
- Decisiones tomadas.
- Riesgos/pendientes.
- Commit/hash si corresponde.
