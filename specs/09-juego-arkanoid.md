# SPEC 09 — Juego ARKANOID en canvas con leaderboard

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02, SPEC 04, SPEC 06, SPEC 07
> **Date:** 2026-11-23
> **Objective:** Portar el juego de `references/started-games/04-arkanoid` como motor de canvas en `games/arkanoid/`, registrado en la plataforma con id `arkanoid`, con leaderboard real en Supabase.

---

## Por qué existe esta spec

`references/started-games/04-arkanoid` es una página suelta (`index.html` + `game.js` de 268 líneas + `levels.js` + `assets/spritesheet.js`) con globales, `document.getElementById`, listeners en `document` y en el canvas, `new Audio(...)` con rutas relativas, un spritesheet cargado con rutas relativas y overlays propios de PAUSA (con selector de nivel), GAME OVER y victoria. No se puede incrustar tal cual en Next.js. Hoy el catálogo tiene `bloque-buster` (BLOQUE BUSTER, ARCADE, `cover-bricks`), un mock que solo simula puntajes. La infraestructura genérica ya existe y no se modifica: SPEC 06 (contrato `GameEngine`, `GAME_ENGINES`, `GamePlayer`) y SPEC 07 (tablas `games` y `scores`, `submit_score`, leaderboards). SPEC 08 (TETRIS) es el precedente directo de un port con entrada nueva.

Decisiones ya tomadas por el usuario, no se reabren:

- Id oficial `arkanoid`, título `ARKANOID`. Es una **entrada nueva** en el catálogo; `bloque-buster` queda como mock sin cambios (igual que `caida` frente a `tetris`).
- Categoría `ARCADE`, color de acento `magenta`, portada propia `cover-arkanoid`.
- Canvas lógico **800×600** (4:3), igual que el original; el HUD se dibuja dentro del canvas como en el original.
- Mapeo a eventos: `onScore` = puntaje, `onLives` = vidas reales (inician en 3), `onLevel` = nivel real (1 a 5).
- Controles: **flechas ← → y ratón** (movimiento horizontal sobre el canvas). Se eliminan `P`/`Escape` y el selector de salto de nivel: la pausa es de React.
- **Sonido incluido**: los dos efectos del original (rebote y rotura) se copian a `public/games/arkanoid/`.
- Al limpiar el nivel 5 (estado `win` del original) se emite `onGameOver({ score, level: 5 })` y React muestra el modal; no hay overlay de victoria en el canvas.

---

## Scope

**In:**

- Motor en `games/arkanoid/` (TypeScript puro, sin React, sin dependencias): paleta, pelota, bloques, explosiones de 4 frames, 5 niveles, colisiones AABB, vidas, puntaje, HUD dibujado y sonido. Reglas, velocidades y puntos idénticos al original. Canvas lógico 800×600.
- Carga del spritesheet y de los dos mp3 desde `public/games/arkanoid/`, copiados desde `references/` (que no se modifica).
- Registro en `games/registry.ts`: `arkanoid: () => import("./arkanoid")`.
- Entrada en `lib/games.ts` y portada `.cover-arkanoid` en `app/globals.css` (propia, no reutiliza `.cover-bricks`).
- Migración `supabase/migrations/<timestamp>_add_game_arkanoid.sql` que inserta `arkanoid` en `public.games`; regenerar tipos con `bun run db:types`.
- Verificación manual completa (no hay tests automatizados).

**Out of scope (para futuras specs):**

- Controles táctiles, power-ups, nuevos niveles, rebalanceo de velocidad, ángulo de rebote según el punto de impacto en la paleta, lanzamiento manual de la pelota.
- Selector de salto de nivel, overlay de victoria y overlay de pausa del original.
- Silenciar o regular el volumen desde la UI.
- Cambios en `GamePlayer`, `submitScore`, `lib/leaderboard.ts`, `/salon` o `/games/[id]`: se activan solos.
- Reemplazar o modificar el mock `bloque-buster`.
- Anti-trampas, auth, estadísticas reales de `best` y `plays`.
- Portar otros juegos de `references/`.
- Tests automatizados.

---

## Data model

Sin tablas nuevas. Solo una fila en `games`:

```sql
-- supabase/migrations/<timestamp>_add_game_arkanoid.sql
insert into public.games (id, title) values ('arkanoid', 'ARKANOID');
```

Entrada de catálogo (nuevo elemento de `GAMES` en `lib/games.ts`):

```ts
{
  id: "arkanoid",
  title: "ARKANOID",
  short: "Rompe 5 muros de bloques con una pelota que no deja de acelerar.",
  long: "Mueve la paleta con las flechas o el ratón y rebota la pelota para derribar cinco muros de bloques de colores. Cada nivel cambia el patrón y acelera la pelota. Tienes 3 vidas: si la pelota cae, pierdes una.",
  cat: "ARCADE",
  cover: "cover-arkanoid",
  color: "magenta",
  best: 0,
  plays: "0",
}
```

Estructura de archivos:

```
games/arkanoid/
  index.ts       // createGame: estado, update, draw, bucle, eventos
  constants.ts   // tamaños, velocidades, colores, layout, rutas de assets
  levels.ts      // LEVELS: 5 niveles { speed, blocks[] } portados de levels.js
  sprites.ts     // carga del spritesheet, SPRITES, EXPLOSION_FRAMES, drawSprite/drawFrame
  input.ts       // teclado en window + mousemove en canvas, con dispose() y reset()
  entities.ts    // tipos Paddle, Ball, Block, Explosion y funciones de dibujo con ctx por parámetro
public/games/arkanoid/
  spritesheet-breakout.png
  sounds/ball-bounce.mp3
  sounds/break-sound.mp3
```

Constantes portadas sin cambios (`constants.ts`):

```ts
export const W = 800;
export const H = 600;
export const PADDLE_SPEED = 400;           // px/s
export const PADDLE = { y: 560, w: 81, h: 14 };  // sprite de 162×14 escalado a 81×14
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;          // multiplicados por LEVELS[n].speed
export const BLOCK_COLS = 10;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = 80;         // (800 - 10 * 64) / 2
export const BLOCKS_ORIGIN_Y = 80;
export const BLOCK_POINTS = 10;
export const LIVES = 3;
export const MAX_LEVEL = 5;
export const EXPLOSION_DURATION = 150;     // ms, 4 frames
// Velocidad por nivel: 1.00, 1.10, 1.21, 1.33, 1.46
// Rutas: /games/arkanoid/spritesheet-breakout.png, /games/arkanoid/sounds/*.mp3
```

Detalles de reglas portadas:

- Paleta: `x` centrada al iniciar; ← → mueven `PADDLE_SPEED * dt`; el ratón fija `x = mouseX - w/2` con `mouseX` convertido al canvas lógico (`(clientX - rect.left) * canvas.width / rect.width`); `x` limitada a `[0, W - w]`.
- Pelota: rebota en paredes izquierda, derecha y techo; el piso la pierde. Rebote en la paleta solo si `vy > 0` y el borde inferior de la pelota está entre `paddle.y` y `paddle.y + paddle.h + 8`; el rebote fija `vy = -|vy|` y no cambia `vx`.
- Bloques: colisión AABB; un bloque por frame (`break`); invierte `vy`; +10 puntos; añade explosión con el color del bloque; suena `break-sound`.
- Fin de nivel: sin bloques vivos; si `level < 5` carga el siguiente (nueva grilla, explosiones vaciadas, pelota sobre la paleta con la velocidad del nivel); si `level === 5` termina la partida.
- Pelota perdida: `lives--`; si `lives <= 0` termina la partida; si no, la pelota vuelve sobre la paleta con la velocidad del nivel actual.
- Sonidos: `ball-bounce` en paredes y paleta, `break-sound` al romper un bloque. Se reproduce un clon del `Audio` (`cloneNode().play()`) con `.catch(() => {})` para ignorar el rechazo por autoplay.
- Puntaje máximo posible: 208 bloques × 10 = 2 080 puntos (60 + 40 + 30 + 39 + 39), muy por debajo del tope de 10 000 000.

Reglas de emisión de eventos (contrato `games/types.ts`):

- `onScore`, `onLives`, `onLevel` solo al cambiar (más emisión inicial al crear y tras `restart()`: score 0, lives 3, level 1).
- `onGameOver({ score, level })` una sola vez por partida, cuando se acaban las vidas (`level` = nivel actual) o cuando se limpia el nivel 5 (`level: 5`). A partir de ahí el estado `gameover` corta `update`, colisiones y teclas.
- El canvas no dibuja "GAME OVER", "¡Completaste el juego!" ni "PAUSA" ni reinicia por teclado; lo hace React con `restart()`.
- HUD dibujado: `Score: N` a la izquierda, `Nivel: N` al centro y una pelota por vida a la derecha, como el original.
- Teclas del juego: `ArrowLeft`, `ArrowRight`, con `preventDefault`. `P` y `Escape` ya no existen. `pause()` llama `input.reset()` y el movimiento por ratón se ignora mientras el motor está pausado o terminado.
- `dt` capado a 0.05 s.

---

## Implementation plan

Antes de empezar, leer `node_modules/next/dist/docs/01-app/` (Client Components, `cacheComponents`) y usar `/frontend-design` para la portada.

1. **Assets.** Copiar `spritesheet-breakout.png` y los dos mp3 de `references/started-games/04-arkanoid/assets/` a `public/games/arkanoid/` (sin tocar `references/`). Verificación: los tres archivos existen y `/games/arkanoid/spritesheet-breakout.png` responde 200 con `bun run dev`.
2. **Núcleo del motor.** Crear `games/arkanoid/constants.ts`, `levels.ts` e `input.ts` (`keydown`/`keyup` en `window`, `mousemove` en el canvas, `preventDefault`, `dispose()`, `reset()`). Verificación: `bunx tsc --noEmit` y `bun run lint`.
3. **Sprites y entidades.** Crear `sprites.ts` (carga asíncrona con canvas offscreen como el original, `SPRITES`, `EXPLOSION_FRAMES`, `drawSprite`, `drawFrame` que no dibujan si el spritesheet no cargó) y `entities.ts` (tipos y dibujo con `ctx` por parámetro). Verificación: `tsc` y lint.
4. **Motor.** Crear `games/arkanoid/index.ts` con `createGame(canvas, events)`: estado (`paddle`, `ball`, `blocks`, `explosions`, `lives`, `score`, `level`, `state`), `update`, `draw` con HUD dibujado, sonidos, rAF con `dt` capado que arranca tras cargar el spritesheet, y `pause`/`resume`/`restart`/`destroy` con los cuatro eventos. Quitar overlays, `P`/`Escape`, selector de nivel y estado `win` del canvas. `destroy()` antes de que cargue el spritesheet no debe arrancar el bucle. Verificación: `tsc` y lint.
5. **Registro.** Añadir `arkanoid` a `GAME_ENGINES`. Verificación: `tsc`.
6. **Catálogo y portada.** Entrada en `lib/games.ts` y `.cover-arkanoid` en `app/globals.css`. Verificación: `/games` lista el juego, `/games/arkanoid` responde 200 y `bloque-buster` sigue igual.
7. **Base de datos.** Crear y aplicar la migración (`bunx supabase db push` o MCP `apply_migration`), luego `bun run db:types`. Verificación: `select * from games` incluye `arkanoid`; `get_advisors` (security) sin errores nuevos.
8. **Revisión manual.** Con `bun run dev`: jugar `/games/arkanoid/jugar` completo (mover con flechas y ratón, rebotes, romper bloques, sonidos, pasar de nivel, perder una vida, perder las 3, limpiar el nivel 5 si es posible), pausar/reanudar, ver el modal, guardar puntaje, jugar de nuevo, salir y volver. Ver la fila en `scores` (`execute_sql`), `/games/arkanoid` y `/salon` (GLOBAL y pestaña ARKANOID). Confirmar que los demás juegos no cambian. Borrar filas de prueba de `scores`.
9. **Cierre.** `bun run lint` y `bun run build` sin errores ni warnings.

---

## Acceptance criteria

- [ ] `bun run lint`, `bunx tsc --noEmit` y `bun run build` terminan con código 0 y sin warnings.
- [ ] `GAME_ENGINES` contiene `arkanoid`; ningún archivo de `games/arkanoid/` importa fuera de su carpeta (salvo tipos de `../types`) ni usa React.
- [ ] `lib/games.ts` contiene `{ id: "arkanoid", title: "ARKANOID" }`, sigue conteniendo `{ id: "bloque-buster", title: "BLOQUE BUSTER" }` y la portada `cover-arkanoid` es propia.
- [ ] `public/games/arkanoid/` contiene el spritesheet y los dos mp3, y ningún archivo del motor referencia `references/`.
- [ ] `public.games` contiene la fila `arkanoid` y la migración está aplicada al proyecto remoto.
- [ ] `/games/arkanoid/jugar` muestra un `<canvas>` de 800×600 lógicos en `crt-screen` con bloques, paleta, pelota y HUD (Score, Nivel y pelotas de vida) dibujados.
- [ ] Romper un bloque suma exactamente 10 puntos y reproduce el sonido de rotura con una explosión de 4 frames.
- [ ] La pelota rebota en paredes y techo con sonido de rebote; rebota en la paleta solo al bajar.
- [ ] Los 5 niveles cargan en orden con velocidades ×1.00, ×1.10, ×1.21, ×1.33 y ×1.46 y los patrones del original (60, 40, 30, 39 y 39 bloques).
- [ ] La paleta se mueve con ← → a 400 px/s y con el ratón sobre el canvas, sin salirse de `[0, 719]`.
- [ ] Perder la pelota resta una vida y reposiciona la pelota sobre la paleta; con 0 vidas aparece el modal.
- [ ] Limpiar el nivel 5 emite `onGameOver` con `level: 5` y aparece el modal; el canvas no dibuja overlay de victoria.
- [ ] Puntaje, vidas y nivel del HUD de React coinciden con los del canvas.
- [ ] `PAUSA` detiene pelota, explosiones y movimiento por ratón y teclado, y `REANUDAR` continúa sin movimientos fantasma por teclas retenidas; `P` y `Escape` no hacen nada en el juego.
- [ ] Al terminar aparece el modal de React una sola vez con el puntaje correcto; el canvas no dibuja "GAME OVER".
- [ ] `JUGAR DE NUEVO` reinicia (puntaje 0, 3 vidas, nivel 1, grilla completa) sin duplicar bucle ni listeners (una pulsación de flecha mueve la paleta lo mismo que antes del reinicio).
- [ ] Guardar puntaje crea fila en `scores` con `game_id = 'arkanoid'` y `user_id` nulo.
- [ ] `/games/arkanoid` muestra top 10 real (una fila por `player_name`) y `/salon` muestra la pestaña ARKANOID (top 20) y el juego aparece en GLOBAL.
- [ ] Las flechas no hacen scroll; `destroy()` se ejecuta al salir y volver crea una sola instancia.
- [ ] Los demás juegos (mock y reales, incluido `bloque-buster`) siguen igual.
- [ ] Sin errores ni warnings en consola ni en `next dev` (incluido el rechazo de `Audio.play()` por autoplay).
- [ ] `git status` sin cambios en `references/` ni secretos.

---

## Decisions

- **Sí:** motor TS puro con `createGame(canvas, events)`; el canvas notifica y React no lee el estado. **No:** bucle dentro de React.
- **Sí:** pausa y modal de fin en React. **No:** overlay de pausa, selector de nivel, `P`/`Escape` ni overlays de GAME OVER/victoria en el canvas.
- **Sí:** reutilizar `GamePlayer`, `submitScore` y leaderboard sin cambios. **No:** componentes duplicados.
- **Sí:** entrada nueva `arkanoid` y mock `bloque-buster` intacto. **No:** reemplazar `bloque-buster`; mantiene el patrón de ROCAS/ASTEROIDES y CAÍDA/TETRIS y no toca datos existentes.
- **Sí:** canvas 800×600 con HUD dibujado. Ya es 4:3; no se deforma en `crt-screen`.
- **Sí:** vidas y nivel reales (3 vidas, niveles 1–5). **No:** inventar valores fijos.
- **Sí:** victoria = `onGameOver` con `level: 5`, para poder guardar puntaje al completar el juego. **No:** juego infinito ni overlay de victoria propio.
- **Sí:** flechas y ratón, porque el original usa ambos. **No:** solo teclado, que habría quitado una forma natural de jugar.
- **Sí:** sonido portado, con assets en `public/games/arkanoid/` y `Audio` creado dentro de `createGame` (solo corre en cliente). **No:** referenciar `references/` ni silenciar los efectos.
- **Sí:** `Audio.play().catch(() => {})` para tolerar autoplay bloqueado. **No:** mostrar error.
- **Sí:** mantener la física del original (invertir `vy` al romper, sin ángulo según impacto). **No:** rebalancear; va en otra spec.
- **Sí:** tope de puntaje 10 000 000 de `submit_score` es holgadísimo: el máximo posible es 2 080.
- **Sí:** portada propia `cover-arkanoid`, `best: 0` y `plays: "0"`. **No:** reutilizar `cover-bricks`.
- **Sí:** migración mínima (solo insertar en `games`). **No:** tocar vistas ni RLS.
- **Sí:** `bun`, sin dependencias nuevas.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Strict Mode duplica bucle y listeners | `destroy()` en cleanup; criterio de una sola instancia |
| `cacheComponents` y `window`/`canvas`/`Audio`/`Image` en render | El motor solo corre dentro de `useEffect`; nada del motor se importa en render de servidor |
| El spritesheet carga después de `destroy()` y arranca un bucle huérfano | Bandera `destroyed` revisada en el callback de carga antes de iniciar rAF |
| El spritesheet no carga (404) | `drawSprite` no dibuja si no cargó y el motor no inicia; se verifica la ruta en el plan (paso 1) |
| Teclas retenidas al pausar | `pause()` llama `input.reset()` |
| `mousemove` mueve la paleta durante la pausa o tras el fin | El manejador comprueba el estado del motor antes de aplicar |
| Posición del ratón incorrecta por escalado CSS del canvas | Convertir con `canvas.width / rect.width` como el original |
| `onGameOver` duplicado (vidas 0 y nivel 5 en el mismo frame) | El estado `gameover` corta el resto del frame; emisión solo al transicionar |
| `Audio.play()` rechazado antes de la primera interacción | `.catch(() => {})`; el jugador ya interactuó al pulsar para jugar |
| Pelota atraviesa bloques o paleta con `dt` grande | `dt` capado a 0.05 s y un bloque por frame, como el original |
| Muchos clones de `Audio` acumulados | Cada clon es corto y se libera al terminar; sin pool propio |
| Puntaje real mayor a 10 000 000 | Imposible: máximo 2 080 |

---

## What is **not** in this spec

- Controles táctiles, power-ups, niveles nuevos, ángulo de rebote por impacto, lanzamiento manual o rebalanceo.
- Selector de salto de nivel, overlays propios de pausa, game over o victoria.
- Volumen o silencio configurable.
- Cambios o eliminación del mock `bloque-buster`.
- Cambios en `GamePlayer`, `submitScore`, leaderboard, `/salon` o `/games/[id]`.
- Auth, anti-trampas, estadísticas reales de `best` y `plays`.
- Portar otros juegos de `references/`.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
