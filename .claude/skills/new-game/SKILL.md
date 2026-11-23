---
name: new-game
description: Genera la spec para agregar un juego nuevo (con motor canvas, leaderboard real y registro en la plataforma), portado desde references/started-games o diseñado desde cero. Úsalo antes de implementar cualquier juego nuevo.
disable-model-invocation: true
argument-hint: '<id del juego> [carpeta en references/started-games]'
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*)
---

# /new-game — Spec de un juego nuevo con leaderboard

Fecha de hoy (úsala en el encabezado de la spec):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null`

Registro actual de motores:
!`cat games/registry.ts`

Migraciones existentes:
!`ls supabase/migrations/ 2>/dev/null`

---

**Este skill NO escribe código.** Solo produce `specs/NN-juego-<id>.md`. La implementación se hace después con `/spec-impl`. Responde en el idioma del usuario (español por defecto).

La plataforma ya tiene la infraestructura genérica (SPEC 06 y SPEC 07). Una spec de juego nuevo solo describe lo específico del juego y cómo se enchufa. Lee `integration-checklist.md` (mismo directorio) para saber qué se activa solo y qué hay que tocar, y `spec-template.md` para la estructura.

## Flujo

### 0. Leer `/spec` (obligatorio, siempre antes de escribir la spec)
`/spec` es la referencia canónica del método. **Antes de crear el archivo de especificación (y antes de redactar), lee completos**:
- `.claude/skills/spec/SKILL.md`
- `.claude/skills/spec/template.md`

(Si no existen ahí, búscalos en `.agents/skills/spec/`.) Esto aplica en cada ejecución, aunque ya los hayas leído en la conversación. Qué se hereda de `/spec`:
- Las fases 1–4: contexto, preguntas, redacción y guardado.
- Cuándo parar de preguntar: puedes responder qué archivos cambian, cuál es el primer y último paso, y cómo se verifica.
- Si la información está completa, escribes la spec entera sin pedir confirmación por sección ni borrador previo. Solo si falta información se va sección por sección.
- Orden de contenido: encabezado (objetivo en una frase), Scope (con "no incluye" explícito), Data model, Implementation plan (pasos que dejan el sistema funcional), Acceptance criteria (booleanos), Decisions, Risks.
- Reglas de guardado: número secuencial con dos dígitos, fecha leída del contexto de sesión (nunca inventada), estado `Draft` (en este repo, el equivalente que usan las specs existentes: `Borrador`; nunca `Approved`/`Aprobado` automático), comprobar que las dependencias existan en `specs/`, crear `specs/.spec-config.yml` solo si no existe, y no pedir permiso para escribir el archivo.
- Reglas duras: nunca escribir código, nunca proponer implementar tras guardar, nunca asumir decisiones no confirmadas, no repreguntar lo ya respondido.

`/spec` define el **método**; este skill agrega el **contenido específico de juegos** (`spec-template.md` e `integration-checklist.md`). Si algo choca, manda `/spec` para el proceso y este skill para el contenido de integración del juego. Para la estructura base de la spec usa `template.md` de `/spec` y rellénala con las secciones de `spec-template.md` de este skill.

### 1. Contexto del proyecto
- Lee `CLAUDE.md` (o el primero que exista de `AGENTS.md`, `README.md`), `specs/06-juego-asteroides-canvas.md` y `specs/07-leaderboard-y-tabla-de-juegos.md` (estilo, secciones, vocabulario).
- Calcula el número `NN` siguiente según `specs/`.

### 2. Origen del juego
- Si el argumento incluye una carpeta de `references/started-games/`, léela completa (`game.js`, `index.html`, `README.md`, `CLAUDE.md`, assets, `levels.js`…). Inventaría: entidades, constantes (tamaños, velocidades, puntos), entrada (teclado/ratón/táctil), assets, HUD, overlays de pausa y game over a quitar, globales y listeners a limpiar, canvas lógico original.
- Si no hay referencia, recoge el diseño: reglas, controles, puntuación, progresión, condición de fin.
- Regla: solo juegos originales o portados de `references/`. No recrear un juego comercial concreto (nombre, personajes, arte, niveles).
- Nunca modificar `references/`.

### 3. Preguntas (AskUserQuestion; no asumas)
- `id` (slug, minúsculas) y `title` (MAYÚSCULAS). Verifica que el id no exista en `lib/games.ts`.
- `cat`, `color`, textos `short` y `long`.
- ¿Reemplaza un juego mock existente (mismo id del catálogo) o es una entrada nueva?
- Mapeo al contrato `GameEvents`: el contrato exige `onScore`, `onLives`, `onLevel`, `onGameOver`. Si el juego no tiene vidas o niveles, decidir qué se emite (p. ej. vidas fijas en 1, nivel = fase/oleada) y cómo se verá en el HUD de React.
- Controles (solo teclado salvo que se pida otra cosa) y tamaño de canvas lógico (debe ser 4:3 para el `crt-screen`, o decidir cómo se adapta).
- Confirmar que el tope de puntaje (10 000 000, definido en `submit_score`) es holgado para este juego.

### 4. Redactar
- Parte de `spec-template.md` y del orden de `/spec` (sección por sección solo si falta información). Sé concreto: constantes reales, nombres de archivos reales, criterios verificables.
- Las secciones fijas de integración (registro, catálogo, portada, migración de `games`, tipos) vienen del checklist; no las improvises.
- Status inicial: `Borrador`. `Depends on`: SPEC 01, 02, 04, 06, 07 (+ las que apliquen).

### 5. Guardar
- Aplica la Fase 4 de `/spec`: sin pedir aprobación previa ni confirmar el nombre del archivo.
- Guarda en `specs/NN-juego-<id>.md` (el slug es `juego-<id>`), estado `Borrador`.
- Confirma: ruta creada, recordatorio de que está en `Borrador` y debe revisarse, y siguiente paso `/spec-impl NN-juego-<id>`. Detente ahí.
