# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos. Juegos con motor de canvas propio, catálogo, biblioteca, Salón de la Fama (leaderboards) y persistencia de puntajes en Supabase.

Juegos funcionales hoy: `asteroides`, `tetris`, `arkanoid`, `snake` (specs 06, 08, 09, 11). Los demás juegos mock fueron eliminados (SPEC 10): solo se muestran juegos funcionales.

## Comandos

Gestor de paquetes: **bun** (`bun.lock`).

- `bun dev` — servidor de desarrollo
- `bun run build` — build de producción
- `bun run lint` — ESLint (flat config, `references/` excluido)
- `bunx tsc --noEmit` — chequeo de tipos
- `bun run db:types` — regenera `lib/supabase/database.types.ts` desde el proyecto enlazado
- `bun run smoke:supabase` — smoke test de Supabase (`scripts/supabase-smoke.ts`)

No hay framework de tests configurado.

## Next.js: versión con cambios incompatibles

Next 16.4.6 + React 19.3 (versiones posteriores a tu conocimiento previo). `AGENTS.md` exige **leer la guía relevante en `node_modules/next/dist/docs/`** (`01-app`, `02-pages`, `03-architecture`, `04-community`) antes de escribir código de Next, y respetar los avisos de deprecación. Ejemplo: `RootLayout` usa el tipo global `LayoutProps<"/">` en lugar de tipar `children` manualmente. `AGENTS.md` también contiene un bloque de feedback de Next (`experimental.agentFeedback`) que `next dev` regenera: no lo borres.

- `next.config.ts`: `cacheComponents: true`, `partialPrefetching: true`, `experimental.agentFeedback`. Con `cacheComponents`, leer `cookies()` (y por tanto crear el cliente Supabase de servidor) solo es válido en contexto dinámico: **dentro de un `<Suspense>`** o ruta dinámica, nunca en el cuerpo prerenderizado de páginas/layouts.
- Tailwind CSS 4 vía regla de Turbopack (`@tailwindcss/turbopack`); tokens de tema y fuentes Geist en `app/globals.css` (`@theme inline`, modo oscuro por `prefers-color-scheme`). Las portadas de juegos son clases `.cover-<id>` en ese archivo.
- `proxy.ts` (reemplaza a middleware) llama `updateSession` para refrescar la sesión de Supabase.
- Alias `@/*` → raíz. TypeScript `strict`.

## Arquitectura

- **Rutas** (`app/`): `/` home, `/games` biblioteca, `/games/[id]` detalle (top 10), `/games/[id]/jugar` reproductor, `/salon` Salón de la Fama (GLOBAL + pestaña por juego, top 20), `/about` (contacto vía Server Action + Resend en `app/about/actions.ts`), `/auth` (login/registro, `components/auth-form.tsx`, `auth-provider.tsx`).
- **Componentes** (`components/`): `game-player.tsx` es el reproductor genérico (monta canvas, conecta eventos, pausa/reanuda, modal de fin, guarda puntaje); también `hall-of-fame`, `leaderboard-list`, `library`, `home`, `nav`, etc.
- **Catálogo** (`lib/games.ts`): array `GAMES` con metadatos de cada juego. `lib/functional-games.ts` define "juego funcional" = entrada en `GAMES` ∩ fila en tabla `games` ∩ motor en `GAME_ENGINES`; home, biblioteca, detalle, jugar y salón filtran con eso (y devuelven 404 si no es funcional).
- **Motores** (`games/`): un directorio por juego (`asteroides`, `tetris`, `arkanoid`, `snake`), TypeScript puro sin React. Contrato en `games/types.ts`: `createGame(canvas, events) → { pause, resume, restart, destroy }` con eventos `onScore`, `onLives`, `onLevel`, `onGameOver`. Registro en `games/registry.ts` (`GAME_ENGINES`, imports dinámicos). Un motor solo puede importar `../types`. Assets en `public/games/<id>/`; nunca referenciar `references/`.
- **Supabase**: clientes en `lib/supabase/` (`client.ts`, `server.ts`, `proxy.ts`, `env.ts`, `database.types.ts`). Tablas `games` y `scores` (`user_id` opcional), vistas de leaderboard y función `submit_score` en `supabase/migrations/`. `lib/leaderboard.ts` lee; `lib/scores.ts` y `app/games/actions.ts` (`submitScore`, valida nombre 1–10 chars y puntaje entero) escriben. Cada juego nuevo añade una migración `<timestamp>_add_game_<id>.sql` con un `insert into public.games`. Proyecto Supabase conectado por MCP en `.mcp.json`.
- **Variables de entorno**: ver `.env.example` (Resend y Supabase; `.env.local` no se commitea).
- `references/` (juegos de arranque, templates, assets demo) es solo lectura: **nunca modificar**. Única excepción: `references/game-suggestions-todo.md` (memoria del agente `game-planner`).

## Flujo de desarrollo: Spec Driven Design

Todo cambio sigue spec → implementación. Las specs viven en `specs/NN-slug.md` (numeración secuencial, estado `Borrador` / `Aprobado` / `Implementado`, `specs/.spec-config.yml` con `AutoCreateBranch: true`).

Historial: 01 MVP pantallas, 02 home y rutas, 03 about/contacto Resend, 04 integración Supabase, 05 lint, 06 asteroides, 07 leaderboard y tablas, 08 tetris, 09 arkanoid, 10 solo juegos funcionales, 11 snake.

Convención: una rama `spec-NN-slug` por spec, PR a `main`, commits en español con prefijos `add:`, `fix:`, `remove:`, `refactor:`, `update:`.

## Skills

Instaladas en `.claude/skills/` (lock en `skills-lock.json`; origen [Fernando Skills](https://github.com/Klerith/fernando-skills): `npx skills@latest add Klerith/fernando-skills`):

- `/spec` — redacta una spec en `specs/`. Nunca escribe código.
- `/spec-impl` — implementa una spec paso a paso.
- `/new-game <id> [carpeta en references/started-games]` — genera la spec de un juego nuevo (motor canvas + leaderboard + registro). Usa `integration-checklist.md` y `spec-template.md` de su carpeta; implementar después con `/spec-impl`.
- `/frontend-design` — diseño de UI.
- `/caveman` — voz terse.
- `/supabase` y `/supabase-postgres-best-practices` — úsalas antes de tocar BD, migraciones, RLS o auth.

Reglas fijas:

- Usa siempre /frontend-desing para hacer interfaces de usuarios
- En cada sesion siempre inicializa la skill de /caveman

## Agentes

- `game-planner` (`.claude/agents/game-planner.md`): decide el próximo juego según diversidad de categorías, factibilidad en canvas 2D y reconocimiento clásico. Guarda sus sugerencias en `references/game-suggestions-todo.md`, única excepción editable dentro de `references/`. Flujo: invocar `game-planner` → elegir candidato → `/new-game <id>` → `/spec-impl`. Nunca escribe código ni specs.
- `game-jam` (`.claude/agents/game-jam.md`): independiente de `game-planner`. Recibe un tema, diseña 1 juego original y escribe 2+ specs complejas (motor + integración) en `specs/game-jam/<game-id>/` con el formato de SPEC 08/09/11, en estado `Borrador`. Solo escribe specs, nunca código. Flujo: invocar `game-jam` con un tema → revisar → mover a `specs/NN-...` → `/spec-impl`.
