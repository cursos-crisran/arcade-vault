# Checklist de integración de un juego nuevo

Verificado contra el repo tras SPEC 06 y SPEC 07. Si el repo cambió, revisa los archivos antes de afirmar.

## Se activa solo (NO modificar)
- `components/game-player.tsx`: usa `GAME_ENGINES[game.id]`; monta el canvas, conecta eventos, pausa/reanuda, modal de fin y `submitScore`.
- `app/games/actions.ts` (`submitScore`) y `lib/leaderboard.ts` (`getRealGameIds`, `getGameLeaderboard`, `getGlobalLeaderboard`).
- `app/games/[id]/jugar/page.tsx`: pasa `persistScores` si el id está en la tabla `games`.
- `app/games/[id]/page.tsx` (top 10) y `app/salon/page.tsx` + `components/hall-of-fame.tsx` (pestaña GLOBAL y pestaña por juego, top 20).
- Vistas, RLS y `submit_score` de la migración de SPEC 07.

## Hay que crear/tocar
1. **Motor** `games/<id>/` — TypeScript puro, sin React ni imports de `components/`, `app/`, `lib/` ni de otras carpetas de `games/`. Solo puede importar `../types` (type-only). Archivos típicos: `index.ts` (`export const createGame: CreateGame`), `constants.ts`, `utils.ts`, `input.ts`, `entities.ts`.
2. **Registro** `games/registry.ts`: añadir `<id>: () => import("./<id>")`.
3. **Catálogo** `lib/games.ts`: entrada `{ id, title, short, long, cat, cover: "cover-<id>", color, best: 0, plays: "0" }` (o, si reemplaza un mock, actualizar la existente y documentarlo).
4. **Portada** `app/globals.css`: clase `.cover-<id>` propia (usar `/frontend-design`; no reutilizar portadas de otros juegos).
5. **Base de datos**: nueva migración `supabase/migrations/<timestamp>_add_game_<id>.sql` con `insert into public.games (id, title) values ('<id>', '<TITLE>');`. No tocar tablas, vistas ni RLS. Aplicar con `bunx supabase db push` o MCP `apply_migration`; luego `bun run db:types`. Revisar `get_advisors` (security).
6. **Assets** (imágenes/sonidos de la referencia): copiar a `public/games/<id>/`, nunca referenciar `references/`.

## Contrato del motor (`games/types.ts`)
- `createGame(canvas, events) → { pause, resume, restart, destroy }`.
- Eventos: `onScore`, `onLives`, `onLevel` solo al cambiar (más emisión inicial y tras `restart`); `onGameOver({score, level})` una sola vez por partida.
- `pause()` congela update/draw y llama `input.reset()`; `destroy()` cancela rAF y quita listeners de `window`.
- `preventDefault` en teclas del juego (flechas, espacio) para evitar scroll.
- `draw(ctx)` recibe el contexto; sin globales ni `document.getElementById`.
- `dt` capado (0.05 s). Sin overlay "GAME OVER" ni reinicio por tecla: lo hace React vía `restart()`.
- Pausa y modal son de React; el canvas dibuja HUD propio como el original.

## Criterios de aceptación comunes
- `bun run lint` y `bun run build` sin errores ni warnings; `bunx tsc --noEmit` limpio.
- `GAME_ENGINES` incluye `<id>`; ningún archivo de `games/<id>/` importa fuera de su carpeta salvo `../types`.
- `/games/<id>/jugar` muestra canvas con juego y HUD dibujado; HUD de React sincronizado (puntaje, vidas, nivel).
- Pausa/reanuda sin teclas fantasma; modal una sola vez; `JUGAR DE NUEVO` sin duplicar bucle ni listeners.
- `destroy()` al salir; Strict Mode no duplica instancia.
- Guardar puntaje crea fila en `scores` con `game_id='<id>'` y `user_id` nulo.
- `/games/<id>` muestra top 10 real y `/salon` tiene la pestaña del juego (top 20) y lo incluye en GLOBAL.
- Los demás juegos (mock y reales) no cambian.
- Sin errores en consola ni terminal de `next dev`; `git status` sin cambios en `references/`.
- Limpiar filas de prueba de `scores` al cerrar la revisión manual.

## Riesgos recurrentes
- Strict Mode duplica efecto → `destroy()` en cleanup.
- `cacheComponents`: nada del motor se importa en render de servidor.
- Teclas retenidas al pausar → `input.reset()`.
- `onGameOver` doble → el estado `gameover` corta `update` antes de colisiones.
- Juego sin vidas/nivel → definir qué se emite y cómo se muestra.
- Canvas no 4:3 → deformación en `crt-screen`.
- Juego referencia con assets o CSS propio → portar a canvas/`public/games/<id>/`.
- Puntaje real mayor a 10 000 000 → subir tope en spec nueva (cambia `submit_score`).
