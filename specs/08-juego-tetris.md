# SPEC 08 — Juego TETRIS en canvas con leaderboard

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02, SPEC 04, SPEC 06, SPEC 07
> **Date:** 2026-11-23
> **Objective:** Portar el juego de `references/started-games/03-tetris` como motor de canvas en `games/tetris/`, registrado en la plataforma con id `tetris`, con leaderboard real en Supabase.

---

## Por qué existe esta spec

`references/started-games/03-tetris` es una página suelta (`index.html` + `style.css` + `game.js` de 332 líneas) con globales, `document.getElementById`, un listener de `keydown` en `document`, overlay propio de PAUSA/GAME OVER y selector de tema claro/oscuro. No se puede incrustar tal cual en Next.js. Hoy el catálogo tiene `caida` (CAÍDA, PUZZLE), un mock que solo simula puntajes. La infraestructura genérica ya existe y no se modifica: SPEC 06 (contrato `GameEngine`, `GAME_ENGINES`, `GamePlayer`) y SPEC 07 (tablas `games` y `scores`, `submit_score`, leaderboards).

Decisiones ya tomadas por el usuario, no se reabren:

- Id oficial `tetris`, título `TETRIS`. Es una **entrada nueva** en el catálogo; `caida` queda como mock sin cambios (igual que `rocas` frente a `asteroides`).
- Canvas lógico **800×600** (4:3): el tablero 10×20 con `BLOCK` 30 (300×600) a la izquierda y el panel lateral (SCORE, LINES, LEVEL, NEXT y controles) **dibujado dentro del mismo canvas**.
- Se conservan las **8 piezas** del `game.js` (I, O, T, S, Z, J, L y la pieza N "tuerca" 3×3 con hueco, gris), elegidas con probabilidad uniforme.
- Mapeo a eventos: `onLives` emite **1** fijo (solo al inicio y tras `restart()`); `onLevel` emite el nivel real de Tetris; `LINES` solo se dibuja en el canvas.
- Controles solo de teclado. La tecla `P` y el overlay de pausa del original se eliminan: la pausa es de React.

---

## Scope

**In:**

- Motor en `games/tetris/` (TypeScript puro, sin React, sin dependencias): tablero 10×20, 8 piezas, rotación horaria con wall kicks `[0, -1, 1, -2, 2]`, caída por intervalo, soft drop, hard drop, pieza fantasma (`globalAlpha` 0.2), vista previa de la siguiente pieza, limpieza de líneas, puntaje y nivel. Reglas, velocidades y puntos idénticos al original.
- Canvas lógico 800×600 con el HUD dibujado (SCORE, LINES, LEVEL, NEXT, CONTROLES).
- Registro en `games/registry.ts`: `tetris: () => import("./tetris")`.
- Entrada en `lib/games.ts` y portada `.cover-tetris` en `app/globals.css` (propia, no reutiliza `.cover-tetro`).
- Migración `supabase/migrations/<timestamp>_add_game_tetris.sql` que inserta `tetris` en `public.games`; regenerar tipos con `bun run db:types`.
- Verificación manual completa (no hay tests automatizados).

**Out of scope (para futuras specs):**

- Controles táctiles, sonido, selector de tema claro/oscuro, hold piece, rotación antihoraria, sistema de rotación SRS, bolsa de 7 piezas, rebalanceo de puntaje o velocidad.
- Cambios en `GamePlayer`, `submitScore`, `lib/leaderboard.ts`, `/salon` o `/games/[id]`: se activan solos.
- Reemplazar o modificar el mock `caida`.
- Anti-trampas, auth, estadísticas reales de `best` y `plays`.
- Portar `04-arkanoid` u otros juegos de `references/`.
- Tests automatizados.

---

## Data model

Sin tablas nuevas. Solo una fila en `games`:

```sql
-- supabase/migrations/<timestamp>_add_game_tetris.sql
insert into public.games (id, title) values ('tetris', 'TETRIS');
```

Entrada de catálogo (nuevo elemento de `GAMES` en `lib/games.ts`):

```ts
{
  id: "tetris",
  title: "TETRIS",
  short: "Encaja las piezas y limpia líneas sin llegar al techo.",
  long: "Ocho piezas descienden sobre un tablero de 10×20. Muévelas, rótalas y déjalas caer para completar líneas. Cada 10 líneas sube el nivel y la caída se acelera. Incluye una pieza extra: la tuerca.",
  cat: "PUZZLE",
  cover: "cover-tetris",
  color: "magenta",
  best: 0,
  plays: "0",
}
```

Estructura de archivos:

```
games/tetris/
  index.ts       // createGame: estado, update, draw, bucle, eventos
  constants.ts   // COLS, ROWS, BLOCK, COLORS, PIECES, LINE_SCORES, layout del canvas
  utils.ts       // createBoard, rotateCW, randomPiece
  input.ts       // listeners de keydown en window con dispose() y reset()
  entities.ts    // tipo Piece y funciones de dibujo de bloque/panel
```

Constantes portadas sin cambios (`constants.ts`):

```ts
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const LINE_SCORES = [0, 100, 300, 500, 800];
// COLORS e índices de PIECES: I cyan, O amarillo, T morado, S verde, Z rojo, J azul pálido, L naranja, N gris
// dropInterval = max(100, 1000 - (level - 1) * 90) ms; level = floor(lines / 10) + 1
// soft drop +1 por fila; hard drop +2 por celda; líneas: LINE_SCORES[n] * level
```

Layout del canvas lógico 800×600: `W = 800`, `H = 600`, tablero en `BOARD_X = 110`, `BOARD_Y = 0` (300×600), panel lateral desde `PANEL_X = 470`. La vista previa NEXT usa una cuadrícula de 4×4 bloques de 30 px (120×120) dentro del panel. El color de la rejilla (`--grid-line` del CSS original) pasa a una constante de `constants.ts`; el fondo del canvas se pinta con una constante.

Reglas de emisión de eventos (contrato `games/types.ts`):

- `onScore`, `onLives`, `onLevel` solo al cambiar (más emisión inicial al crear y tras `restart()`: score 0, lives 1, level 1). `onLives` nunca cambia después.
- `onGameOver({ score, level })` una sola vez, cuando la pieza recién generada colisiona al aparecer (`spawn()`). A partir de ahí el motor deja de procesar caída y teclas.
- El canvas no dibuja "GAME OVER" ni "PAUSA" ni reinicia por teclado; lo hace React con `restart()`.
- Teclas del juego: `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp`, `KeyX` (rotar), `Space` (hard drop); todas con `preventDefault`. `KeyP` ya no existe.
- `dt` capado a 0.05 s; el acumulador de caída se mantiene en milisegundos (`dt * 1000`).

---

## Implementation plan

Antes de empezar, leer `node_modules/next/dist/docs/01-app/` (Client Components, `cacheComponents`) y usar `/frontend-design` para la portada.

1. **Núcleo del motor.** Crear `games/tetris/constants.ts`, `utils.ts` e `input.ts` (`keydown` en `window`, `preventDefault`, `dispose()`, `reset()`). Verificación: `bunx tsc --noEmit` y `bun run lint`.
2. **Entidades y dibujo.** Crear `games/tetris/entities.ts` con el tipo `Piece` y funciones de dibujo de bloque, rejilla y panel que reciben `ctx` por parámetro. Verificación: `tsc` y lint.
3. **Motor.** Crear `games/tetris/index.ts` con `createGame(canvas, events)`: estado (`board`, `current`, `next`, `score`, `lines`, `level`, `dropAccum`, `dropInterval`, `state`), `update`, `draw` con el HUD dibujado, rAF con `dt` capado, y `pause`/`resume`/`restart`/`destroy` con los cuatro eventos. Quitar overlay, tecla `P`, botón de reinicio y selector de tema del original. Verificación: `tsc` y lint.
4. **Registro.** Añadir `tetris` a `GAME_ENGINES`. Verificación: `tsc`.
5. **Catálogo y portada.** Entrada en `lib/games.ts` y `.cover-tetris` en `app/globals.css`. Verificación: `/games` lista el juego, `/games/tetris` responde 200 y `caida` sigue igual.
6. **Base de datos.** Crear y aplicar la migración (`bunx supabase db push` o MCP `apply_migration`), luego `bun run db:types`. Verificación: `select * from games` incluye `tetris`; `get_advisors` (security) sin errores nuevos.
7. **Revisión manual.** Con `bun run dev`: jugar `/games/tetris/jugar` completo (mover, rotar con kicks, soft/hard drop, fantasma, NEXT, limpiar 1–4 líneas, subir de nivel, pieza N, perder), pausar/reanudar, ver el modal, guardar puntaje, jugar de nuevo, salir y volver. Ver la fila en `scores` (`execute_sql`), `/games/tetris` y `/salon` (GLOBAL y pestaña TETRIS). Confirmar que los demás juegos no cambian. Borrar filas de prueba de `scores`.
8. **Cierre.** `bun run lint` y `bun run build` sin errores ni warnings.

---

## Acceptance criteria

- [ ] `bun run lint`, `bunx tsc --noEmit` y `bun run build` terminan con código 0 y sin warnings.
- [ ] `GAME_ENGINES` contiene `tetris`; ningún archivo de `games/tetris/` importa fuera de su carpeta (salvo tipos de `../types`) ni usa React.
- [ ] `lib/games.ts` contiene `{ id: "tetris", title: "TETRIS" }`, sigue conteniendo `{ id: "caida", title: "CAÍDA" }` y la portada `cover-tetris` es propia.
- [ ] `public.games` contiene la fila `tetris` y la migración está aplicada al proyecto remoto.
- [ ] `/games/tetris/jugar` muestra un `<canvas>` de 800×600 lógicos en `crt-screen` con tablero 10×20, panel con SCORE, LINES, LEVEL, NEXT y controles dibujados.
- [ ] Limpiar 1, 2, 3 y 4 líneas suma 100, 300, 500 y 800 multiplicado por el nivel actual.
- [ ] Soft drop suma 1 punto por fila y hard drop suma 2 puntos por celda recorrida.
- [ ] El nivel sube cada 10 líneas y la caída usa `max(100, 1000 - (nivel - 1) * 90)` ms.
- [ ] La rotación aplica wall kicks `[0, -1, 1, -2, 2]` y la pieza fantasma se dibuja con alpha 0.2.
- [ ] Aparece la pieza N (tuerca gris) con probabilidad uniforme entre las 8 piezas.
- [ ] Puntaje y nivel del HUD de React coinciden con los del canvas; el HUD de React muestra 1 vida y no cambia.
- [ ] `PAUSA` detiene la caída (incluido el acumulador) y `REANUDAR` continúa sin movimientos fantasma por teclas retenidas; la tecla `P` no hace nada.
- [ ] Al terminar aparece el modal de React una sola vez con el puntaje correcto; el canvas no dibuja "GAME OVER".
- [ ] `JUGAR DE NUEVO` reinicia (puntaje 0, tablero vacío, nivel 1) sin duplicar bucle ni listeners (una pulsación mueve una sola celda).
- [ ] Guardar puntaje crea fila en `scores` con `game_id = 'tetris'` y `user_id` nulo.
- [ ] `/games/tetris` muestra top 10 real (una fila por `player_name`) y `/salon` muestra la pestaña TETRIS (top 20) y el juego aparece en GLOBAL.
- [ ] Flechas y `Space` no hacen scroll; `destroy()` se ejecuta al salir y volver crea una sola instancia.
- [ ] Los demás juegos (mock y reales, incluido `caida`) siguen igual.
- [ ] Sin errores ni warnings en consola ni en `next dev`.
- [ ] `git status` sin cambios en `references/` ni secretos.

---

## Decisions

- **Sí:** motor TS puro con `createGame(canvas, events)`; el canvas notifica y React no lee el estado. **No:** bucle dentro de React.
- **Sí:** pausa y modal de fin en React. **No:** overlay, tecla `P` ni botón de reinicio en el canvas.
- **Sí:** reutilizar `GamePlayer`, `submitScore` y leaderboard sin cambios. **No:** componentes duplicados.
- **Sí:** entrada nueva `tetris` y mock `caida` intacto. **No:** reemplazar `caida`; mantiene un patrón único con ROCAS/ASTEROIDES y no toca datos existentes.
- **Sí:** canvas 800×600 con panel dibujado. **No:** 300×600, porque se deformaría en `crt-screen` (4:3) y NEXT quedaría fuera del canvas.
- **Sí:** conservar las 8 piezas (incluida N) porque el port es del código real. **No:** quitarla para igualar el README.
- **Sí:** `onLives` fijo en 1 y `onLevel` real. **No:** inventar vidas; LINES queda solo en el canvas.
- **Sí:** quitar el selector de tema y el `localStorage` `tetris-theme`; la plataforma ya define su tema. **No:** portar CSS propio del juego.
- **Sí:** teclas con `keydown` como el original (el auto-repeat del navegador mueve la pieza). **No:** añadir DAS/ARR propios.
- **Sí:** tope de puntaje 10 000 000 de `submit_score` es holgado para Tetris (una partida muy larga queda muy por debajo); se confirma en la revisión manual.
- **Sí:** portada propia `cover-tetris`, `best: 0` y `plays: "0"`. **No:** reutilizar `cover-tetro`.
- **Sí:** migración mínima (solo insertar en `games`). **No:** tocar vistas ni RLS.
- **Sí:** `bun`, sin dependencias nuevas.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Strict Mode duplica bucle y listeners | `destroy()` en cleanup; criterio de una sola instancia |
| `cacheComponents` y `window`/`canvas` en render | El motor solo corre dentro de `useEffect` |
| Teclas retenidas al pausar | `pause()` llama `input.reset()` |
| `onGameOver` duplicado | El estado `gameover` corta `update`; emisión solo al transicionar en `spawn()` |
| Original usa `performance.now()` en ms y el contrato usa `dt` capado en s | Acumular `dt * 1000`; con `dt` capado a 0.05 s una pestaña en segundo plano no suelta varias caídas de golpe |
| Hard drop o limpieza de líneas con `gameover` en el mismo frame | `lockPiece()` → `spawn()` emite `onGameOver` una vez y el estado corta el resto del frame |
| Panel dibujado en canvas pierde nitidez al escalar por CSS | Mantener 800×600 lógicos (4:3) y fuentes monoespaciadas de tamaño fijo |
| Puntaje real mayor a 10 000 000 | Improbable; si ocurre, subir el tope en una spec nueva |

---

## What is **not** in this spec

- Controles táctiles, sonido, selector de tema, hold piece, SRS, bolsa de 7 piezas o rebalanceo.
- Cambios o eliminación del mock `caida`.
- Cambios en `GamePlayer`, `submitScore`, leaderboard, `/salon` o `/games/[id]`.
- Auth, anti-trampas, estadísticas reales de `best` y `plays`.
- Portar `04-arkanoid` u otros juegos.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
