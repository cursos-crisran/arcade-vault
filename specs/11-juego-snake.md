# SPEC 11 — Juego SNAKE en canvas con leaderboard

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02, SPEC 04, SPEC 06, SPEC 07, SPEC 10
> **Date:** 2026-11-23
> **Objective:** Crear desde cero el juego SNAKE como motor de canvas en `games/snake/`, con frutas tomadas de un atlas copiado a `public/games/snake/`, registrado en la plataforma con id `snake` y con leaderboard real en Supabase.

---

## Por qué existe esta spec

No existe un juego base de Snake: ni en `references/started-games/` ni en el repo. `references/demo-assets/snake-assets/` solo trae arte: `fruits.png` (hoja de 3790×442 px con tres filas de frutas: plana, pixel-art y realista) y `sprites.js` (un atlas global `window.SPRITE_ATLAS` con los recortes de la fila del medio, `y=136–295`, 22 frutas). Por eso el motor se diseña desde cero. El catálogo no tiene Snake: SPEC 10 quitó el mock `serpentina`, aunque la clase `.cover-snake` quedó huérfana en `app/globals.css`. La infraestructura genérica ya existe y no se modifica: SPEC 06 (contrato `GameEngine`, `GAME_ENGINES`, `GamePlayer`) y SPEC 07 (tablas `games` y `scores`, `submit_score`, leaderboards). SPEC 09 (ARKANOID) es el precedente directo de un juego con spritesheet en `public/games/<id>/`.

Decisiones ya tomadas por el usuario, no se reabren:

- Id oficial `snake`, título `SNAKE`. Es una **entrada nueva** en el catálogo. Categoría `ARCADE`, color de acento `green`.
- Juego creado desde cero. El motor **no referencia** `references/`: `fruits.png` se copia a `public/games/snake/` y las coordenadas del atlas se portan a un módulo TypeScript propio dentro de `games/snake/`.
- Movimiento por celda (paso discreto). Las paredes **atraviesan** (wrap): salir por un borde reaparece por el opuesto. Solo el propio cuerpo mata.
- Mapeo a eventos: `onScore` = puntaje, `onLives` = vida única (inicia en 1; al perderla termina la partida), `onLevel` = nivel que sube con las frutas comidas.
- Controles: **solo teclado**, flechas y WASD.
- Arte: frutas pixel-art de la fila del medio del atlas; la serpiente se dibuja en canvas con estética pixel-art. Sin sonido.

---

## Scope

**In:**

- Motor en `games/snake/` (TypeScript puro, sin React, sin dependencias): grilla, serpiente, frutas, cola de entradas, colisión con el propio cuerpo (muerte inmediata), vida única, puntaje, niveles con aceleración y HUD dibujado. Canvas lógico 800×600 (4:3).
- Carga de `fruits.png` desde `public/games/snake/` (copiado desde `references/`, que no se modifica) y atlas de 22 frutas portado a `games/snake/sprites.ts`.
- Registro en `games/registry.ts`: `snake: () => import("./snake")`.
- Entrada en `lib/games.ts` y portada propia: reescribir `.cover-snake` en `app/globals.css` (hoy huérfana) con `/frontend-design`.
- Migración `supabase/migrations/<timestamp>_add_game_snake.sql` que inserta `snake` en `public.games`; regenerar tipos con `bun run db:types`.
- Verificación manual completa (no hay tests automatizados).

**Out of scope (para futuras specs):**

- Controles táctiles o por ratón, sonido, obstáculos, frutas especiales, power-ups, modos de juego o mapas.
- Otras filas de `fruits.png` (plana y realista) y selector de estilo.
- Cambios en `GamePlayer`, `submitScore`, `lib/leaderboard.ts`, `/salon`, `/games/[id]` o `lib/home.ts`: se activan solos.
- Anti-trampas, auth, estadísticas reales de `best` y `plays`.
- Portar otros juegos de `references/`.
- Tests automatizados.

---

## Data model

Sin tablas nuevas. Solo una fila en `games`:

```sql
-- supabase/migrations/<timestamp>_add_game_snake.sql
insert into public.games (id, title) values ('snake', 'SNAKE');
```

Entrada de catálogo (nuevo elemento de `GAMES` en `lib/games.ts`):

```ts
{
  id: "snake",
  title: "SNAKE",
  short: "Come frutas, crece y no te muerdas la cola.",
  long: "Guía a la serpiente por el tablero con las flechas o WASD. Cada fruta suma 10 puntos y la hace crecer; cada 5 frutas sube el nivel y la serpiente se acelera. Las paredes te devuelven por el lado opuesto, pero si te muerdes se acaba la partida: solo tienes una vida.",
  cat: "ARCADE",
  cover: "cover-snake",
  color: "green",
  best: 0,
  plays: "0",
}
```

Estructura de archivos:

```
games/snake/
  index.ts       // createGame: estado, update por pasos, draw, bucle, eventos
  constants.ts   // tamaños, grilla, velocidades, colores, ruta del asset
  sprites.ts     // carga de fruits.png, FRUIT_ATLAS (22 recortes), drawFruit
  input.ts       // teclado en window con cola de giros, dispose() y reset()
  entities.ts    // tipos Cell, Snake, Fruit y funciones de dibujo con ctx por parámetro
public/games/snake/
  fruits.png
```

Constantes (`constants.ts`):

```ts
export const W = 800;
export const H = 600;
export const CELL = 40;
export const HUD_H = 40;                 // franja superior del HUD
export const COLS = 20;                  // 800 / 40
export const ROWS = 14;                  // (600 - 40) / 40; tablero 800×560 con origen y = 40
export const START_LENGTH = 3;
export const START_CELL = { x: 10, y: 7 };   // cabeza; cuerpo hacia la izquierda; dirección inicial derecha
export const LIVES = 1;
export const FRUIT_POINTS = 10;
export const FRUITS_PER_LEVEL = 5;
export const BASE_STEP_MS = 150;         // intervalo entre pasos en nivel 1
export const STEP_DECREASE_MS = 12;      // se resta por nivel
export const MIN_STEP_MS = 60;           // piso de velocidad
export const MAX_DT = 0.05;              // s
export const INPUT_QUEUE_MAX = 2;
// Ruta: /games/snake/fruits.png
```

Atlas de frutas (`sprites.ts`): portar las 22 entradas `{ x, y, w, h }` de la fila `y=136` de `references/demo-assets/snake-assets/sprites.js` (banana, orange, grape, garlic, eggplant, strawberry, cherry, carrot, mushroom, broccoli, watermelon, pepper, kiwi, lemon, peach, peanut, apple, tomato, berries, grapes2, pineapple, melon) tal cual, como constante `FRUIT_ATLAS`. No se porta `window.SPRITE_ATLAS` ni su `sources`.

Reglas del juego:

- Tablero de 20×14 celdas de 40 px bajo una franja de HUD de 40 px. Origen del tablero en `(0, HUD_H)`. Total 800×600 (4:3), sin deformación en `crt-screen`.
- Inicio (y tras `restart()`): serpiente de 3 segmentos con la cabeza en `(10, 7)`, cuerpo en `(9, 7)` y `(8, 7)`, dirección derecha.
- Un paso mueve la cabeza una celda en la dirección actual y el resto del cuerpo la sigue. El intervalo es `max(MIN_STEP_MS, BASE_STEP_MS - (level - 1) * STEP_DECREASE_MS)`: 150, 138, 126, 114, 102, 90, 78, 66 y 60 ms desde el nivel 9. Se acumula `dt` y se ejecuta como máximo un paso por frame.
- Wrap: `x = (x + dx + COLS) % COLS`, `y = (y + dy + ROWS) % ROWS`.
- Giros: flechas y WASD (`ArrowUp/Down/Left/Right`, `KeyW/A/S/D`). Un giro se encola solo si no es igual ni opuesto (180°) a la dirección vigente del último giro encolado; la cola admite 2 giros y se consume uno por paso.
- Fruta: una sola a la vez, en una celda libre al azar, con un tipo al azar de `FRUIT_ATLAS`. Se dibuja escalada a 36 px de alto máximo conservando proporción y centrada en la celda.
- Comer: si la nueva cabeza cae en la celda de la fruta, `score += 10`, la serpiente crece 1 segmento (la cola no se retira ese paso), `fruitsEaten++` y aparece otra fruta. `level = 1 + floor(fruitsEaten / 5)`.
- Colisión: si la nueva cabeza cae en una celda del propio cuerpo (la punta de la cola cuenta como libre porque se retira en ese mismo paso), `lives--`, que deja `lives == 0` y termina la partida de inmediato con `onGameOver`. No hay reinicio de la serpiente dentro de la misma partida.
- Tablero lleno: si la serpiente ocupa las 280 celdas y no hay dónde colocar la fruta, la partida termina con `onGameOver`.
- Puntaje máximo práctico: 277 frutas × 10 = 2 770 puntos, muy por debajo del tope de 10 000 000 de `submit_score`.

Reglas de emisión de eventos (contrato `games/types.ts`):

- `onScore`, `onLives`, `onLevel` solo al cambiar (más emisión inicial al crear y tras `restart()`: score 0, lives 1, level 1).
- `onGameOver({ score, level })` una sola vez por partida, al perder la única vida o al llenar el tablero. A partir de ahí el estado `gameover` corta `update`, colisiones y teclas.
- El canvas no dibuja "GAME OVER" ni "PAUSA" ni reinicia por teclado; lo hace React con `restart()`.
- HUD dibujado en la franja superior: `Score: N` a la izquierda, `Nivel: N` al centro y un corazón por vida restante a la derecha (un solo corazón mientras la partida está en curso).
- Teclas del juego con `preventDefault`: flechas y `KeyW/A/S/D`. `pause()` llama `input.reset()` (vacía la cola de giros).
- `dt` capado a `MAX_DT` = 0.05 s.

---

## Implementation plan

Antes de empezar, leer `node_modules/next/dist/docs/01-app/` (Client Components, `cacheComponents`) y usar `/frontend-design` para la portada.

1. **Assets.** Copiar `references/demo-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` (sin tocar `references/`; `sprites.js` no se copia). Verificación: el archivo existe y `/games/snake/fruits.png` responde 200 con `bun run dev`.
2. **Núcleo del motor.** Crear `games/snake/constants.ts` e `input.ts` (`keydown` en `window`, cola de giros de máximo 2 sin 180°, `preventDefault`, `dispose()`, `reset()`). Verificación: `bunx tsc --noEmit` y `bun run lint`.
3. **Sprites y entidades.** Crear `sprites.ts` (carga asíncrona de `fruits.png`, `FRUIT_ATLAS` con las 22 frutas, `drawFruit` que no dibuja si la imagen no cargó) y `entities.ts` (tipos y dibujo con `ctx` por parámetro: fondo del tablero, cabeza con ojos, cuerpo, HUD). Verificación: `tsc` y lint.
4. **Motor.** Crear `games/snake/index.ts` con `createGame(canvas, events)`: estado (`snake`, `dir`, `fruit`, `lives`, `score`, `level`, `fruitsEaten`, `acc`, `state`), `update` por pasos, `draw` con HUD dibujado, rAF con `dt` capado que arranca tras cargar la imagen, y `pause`/`resume`/`restart`/`destroy` con los cuatro eventos. `destroy()` antes de que cargue la imagen no debe arrancar el bucle. Verificación: `tsc` y lint.
5. **Registro.** Añadir `snake` a `GAME_ENGINES`. Verificación: `tsc`.
6. **Catálogo y portada.** Entrada en `lib/games.ts` y reescritura de `.cover-snake` en `app/globals.css`. Verificación: `/games` lista el juego y `/games/snake` responde 200.
7. **Base de datos.** Crear y aplicar la migración (`bunx supabase db push` o MCP `apply_migration`), luego `bun run db:types`. Verificación: `select * from games` incluye `snake`; `get_advisors` (security) sin errores nuevos.
8. **Revisión manual.** Con `bun run dev`: jugar `/games/snake/jugar` completo (girar con flechas y WASD, intentar un giro de 180°, atravesar paredes, comer frutas, subir de nivel, morderse y terminar la partida), pausar/reanudar, ver el modal, guardar puntaje, jugar de nuevo, salir y volver. Ver la fila en `scores` (`execute_sql`), `/games/snake` y `/salon` (GLOBAL y pestaña SNAKE). Confirmar que los demás juegos no cambian. Borrar filas de prueba de `scores`.
9. **Cierre.** `bun run lint` y `bun run build` sin errores ni warnings.

---

## Acceptance criteria

- [ ] `bun run lint`, `bunx tsc --noEmit` y `bun run build` terminan con código 0 y sin warnings.
- [ ] `GAME_ENGINES` contiene `snake`; ningún archivo de `games/snake/` importa fuera de su carpeta (salvo tipos de `../types`) ni usa React.
- [ ] `lib/games.ts` contiene `{ id: "snake", title: "SNAKE" }` y la portada `cover-snake` es propia (reescrita).
- [ ] `public/games/snake/fruits.png` existe y ningún archivo del motor ni del catálogo referencia `references/`.
- [ ] `public.games` contiene la fila `snake` y la migración está aplicada al proyecto remoto.
- [ ] `/games/snake/jugar` muestra un `<canvas>` de 800×600 lógicos en `crt-screen` con tablero de 20×14, serpiente de 3 segmentos, una fruta del atlas y HUD (Score, Nivel y vidas) dibujados.
- [ ] Comer una fruta suma exactamente 10 puntos, alarga la serpiente 1 segmento y genera otra fruta en una celda libre.
- [ ] Cada 5 frutas comidas el nivel sube en 1 y el intervalo entre pasos baja 12 ms (150, 138, 126… hasta un mínimo de 60 ms).
- [ ] Al cruzar un borde la serpiente reaparece por el borde opuesto sin morir.
- [ ] Un giro de 180° se ignora; dos giros pulsados dentro de un mismo paso se aplican en pasos consecutivos.
- [ ] Morderse el cuerpo termina la partida de inmediato (la única vida llega a 0) y aparece el modal con el puntaje y nivel alcanzados.
- [ ] Puntaje, vidas y nivel del HUD de React coinciden con los del canvas.
- [ ] `PAUSA` detiene el avance de la serpiente y `REANUDAR` continúa sin giros fantasma por teclas retenidas.
- [ ] Al terminar aparece el modal de React una sola vez con el puntaje correcto; el canvas no dibuja "GAME OVER".
- [ ] `JUGAR DE NUEVO` reinicia (puntaje 0, 1 vida, nivel 1, serpiente inicial) sin duplicar bucle ni listeners (una pulsación de flecha gira una sola vez).
- [ ] Guardar puntaje crea fila en `scores` con `game_id = 'snake'` y `user_id` nulo.
- [ ] `/games/snake` muestra top 10 real (una fila por `player_name`) y `/salon` muestra la pestaña SNAKE (top 20) y el juego aparece en GLOBAL.
- [ ] Las flechas no hacen scroll; `destroy()` se ejecuta al salir y volver crea una sola instancia.
- [ ] Los demás juegos (`asteroides`, `tetris`, `arkanoid`) siguen igual.
- [ ] Sin errores ni warnings en consola ni en `next dev`.
- [ ] `git status` sin cambios en `references/` ni secretos.

---

## Decisions

- **Sí:** motor TS puro con `createGame(canvas, events)`; el canvas notifica y React no lee el estado. **No:** bucle dentro de React.
- **Sí:** pausa y modal de fin en React. **No:** overlays ni reinicio por tecla en el canvas.
- **Sí:** reutilizar `GamePlayer`, `submitScore` y leaderboard sin cambios. **No:** componentes duplicados.
- **Sí:** juego desde cero porque no hay base. **No:** inventar una referencia en `references/started-games/`.
- **Sí:** `fruits.png` copiado a `public/games/snake/` y atlas portado a `games/snake/sprites.ts`, para que el juego sea autocontenido. **No:** cargar `references/` ni `sprites.js` con su global `window.SPRITE_ATLAS`.
- **Sí:** solo la fila pixel-art del atlas (la única con coordenadas en `sprites.js`) y coherente con el HUD retro. **No:** las otras dos filas.
- **Sí:** serpiente dibujada en canvas con formas, sin sprites. **No:** inventar un spritesheet de serpiente que el material de referencia no incluye.
- **Sí:** movimiento discreto por celda, con wrap y muerte solo por el cuerpo. **No:** muerte por pared ni movimiento suave por píxeles.
- **Sí:** vida única; morderse termina la partida de inmediato. **No:** 3 vidas ni reinicio de la serpiente dentro de una partida.
- **Sí:** nivel por frutas (cada 5) con piso de velocidad en 60 ms. **No:** aceleración sin tope, que volvería injugable el nivel alto.
- **Sí:** tablero 20×14 con HUD de 40 px arriba, para llegar a 800×600 exactos (4:3). **No:** tablero de 20×15, que dejaría el HUD fuera del canvas o forzaría otra relación de aspecto.
- **Sí:** cola de giros de 2 entradas sin 180°, para que dos pulsaciones rápidas no hagan morir a la serpiente contra sí misma. **No:** aplicar el giro inmediatamente sin cola.
- **Sí:** solo teclado (flechas y WASD) sin sonido. **No:** ratón, táctil ni audio (no hay mp3 en la referencia).
- **Sí:** el tablero lleno termina la partida con `onGameOver`. **No:** colgar el bucle sin celda libre.
- **Sí:** el tope de 10 000 000 de `submit_score` es holgadísimo: el máximo práctico es 2 770.
- **Sí:** entrada nueva `snake` con `best: 0` y `plays: "0"`. **No:** resucitar el mock `serpentina` eliminado en SPEC 10.
- **Sí:** reescribir la clase huérfana `.cover-snake` como portada propia. **No:** dejarla tal cual, que fue pensada para el mock.
- **Sí:** migración mínima (solo insertar en `games`). **No:** tocar vistas ni RLS.
- **Sí:** `bun`, sin dependencias nuevas.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Strict Mode duplica bucle y listeners | `destroy()` en cleanup; criterio de una sola instancia |
| `cacheComponents` y `window`/`canvas`/`Image` en render | El motor solo corre dentro de `useEffect`; nada del motor se importa en render de servidor |
| `fruits.png` carga después de `destroy()` y arranca un bucle huérfano | Bandera `destroyed` revisada en el callback de carga antes de iniciar rAF |
| `fruits.png` no carga (404) | `drawFruit` no dibuja si no cargó y el motor no inicia; se verifica la ruta en el plan (paso 1) |
| Coordenadas del atlas mal portadas recortan mal la fruta | Copiar las 22 entradas sin cambios y comprobar a ojo en la revisión manual que cada fruta se ve completa |
| Teclas retenidas al pausar | `pause()` llama `input.reset()` |
| Dos giros rápidos provocan un 180° efectivo y muerte injusta | Cola de giros que compara contra el último giro encolado, no contra la dirección actual |
| `onGameOver` duplicado (colisión y tablero lleno en el mismo paso) | El estado `gameover` corta el resto del paso; emisión solo al transicionar |
| Fruta generada sobre la serpiente o sin celda libre | Elegir solo entre celdas libres; si no hay ninguna, terminar la partida |
| Canvas deformado por CSS | 800×600 ya es 4:3 |
| Puntaje real mayor a 10 000 000 | Imposible: máximo práctico 2 770 |

---

## What is **not** in this spec

- Controles táctiles o por ratón, sonido, obstáculos, frutas especiales, power-ups, modos o mapas.
- Otras filas de `fruits.png` y selector de estilo visual.
- Cambios en `GamePlayer`, `submitScore`, leaderboard, `/salon`, `/games/[id]` o `lib/home.ts`.
- Auth, anti-trampas, estadísticas reales de `best` y `plays`.
- Portar otros juegos de `references/`.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
