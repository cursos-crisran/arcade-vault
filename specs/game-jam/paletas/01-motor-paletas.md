# SPEC JAM-paletas-01 — Motor de PALETAS (duelo de paletas contra la CPU)

> **Status:** Borrador
> **Depends on:** SPEC 06 (contrato `GameEngine`, `GamePlayer`), SPEC 07 (leaderboard), SPEC 10 (juegos funcionales)
> **Date:** 2026-11-25
> **Objective:** Crear desde cero en `games/paletas/` el motor canvas de PALETAS, un duelo de paletas contra una CPU que acelera por nivel, con golpe de remate (smash), puntaje por puntos ganados más racha, vidas como puntos que el jugador puede conceder y una final a 50 puntos ganados.

---

## Por qué existe esta spec

El catálogo no tiene ningún juego de la categoría `VERSUS` (hoy: `asteroides` SHOOTER, `tetris` PUZZLE, `arkanoid` y `snake` ARCADE). Un duelo de paletas contra la CPU es el VERSUS más sencillo de hacer en canvas 2D y cumple el contrato existente sin tocar la infraestructura. No hay juego base en `references/started-games/` ni assets específicos en `references/demo-assets/`, así que el motor y el arte (formas vectoriales y neón) se diseñan desde cero.

Giro propio frente al género clásico: el partido se juega en una **pista de neón** con una **línea de remate**. Si el jugador pulsa `Space` justo antes del contacto (ventana de 150 ms) la pelota sale como **remate**: más rápida y con estela magenta. La CPU no remata nunca; el remate es la herramienta del jugador para ganar puntos a una CPU cada vez más rápida. Además, la velocidad vertical de la paleta en el impacto transmite **efecto** a la pelota.

Decisiones ya tomadas, no se reabren:

- Id `paletas`, título `PALETAS`, categoría `VERSUS`, color de acento `cyan` (la integración está en JAM-paletas-02).
- Jugador = paleta izquierda; CPU = paleta derecha. Un solo jugador humano.
- `onScore` = puntaje acumulado; `onLives` = puntos que el jugador aún puede conceder (inicia en 5); `onLevel` = nivel de la CPU (1 a 10).
- Se sube un nivel cada 5 puntos ganados por el jugador. Al ganar el punto 50 (fin del nivel 10) la partida termina en **victoria** con bonus por vidas restantes.
- Controles solo de teclado: `ArrowUp`/`KeyW` sube, `ArrowDown`/`KeyS` baja, `Space` remata. Sin ratón, sin táctil, sin sonido.

---

## Scope

**In:**

- Motor en `games/paletas/` (TypeScript puro, sin React, sin dependencias, sin assets de imagen): paletas, pelota, saque, físicas con sub-pasos, efecto, remate, IA de la CPU por nivel, puntaje con racha, vidas, niveles, victoria, HUD dibujado. Canvas lógico 800×600 (4:3).
- `input.ts` con listeners en `window`, `preventDefault`, `reset()` y `dispose()`.
- `createGame(canvas, events)` con `pause`, `resume`, `restart`, `destroy`.

**Out of scope (para futuras specs):**

- Registro, catálogo, portada, migración y verificación de rutas (JAM-paletas-02).
- Modo 2 jugadores local, online, power-ups, obstáculos, sonido, ratón o táctil.
- Selector de dificultad, sprites o imágenes.
- Cambios en `GamePlayer`, `submitScore` o leaderboard.
- Tests automatizados.

---

## Data model

Sin tablas (la fila de `games` va en JAM-paletas-02).

Estructura de archivos:

```
games/paletas/
  index.ts       // createGame: estado, update, draw, bucle rAF, eventos
  constants.ts   // dimensiones, velocidades, IA por nivel, puntaje, colores
  input.ts       // teclado en window: up/down retenidos, smash con timestamp; reset(), dispose()
  entities.ts    // tipos Paddle, Ball, Trail; física de rebote; dibujo con ctx por parámetro (pista, paletas, pelota, estela, HUD)
```

No hay `sprites.ts`: todo se dibuja con primitivas de canvas.

Constantes (`constants.ts`):

```ts
export const W = 800;
export const H = 600;
export const HUD_H = 40;                  // franja superior; pista de y=40 a y=600
export const FIELD_TOP = HUD_H;           // 40
export const FIELD_BOTTOM = H;            // 600
export const WALL = 6;                    // grosor de las bandas superior e inferior (rebote en y=46 y y=594)

export const PADDLE_W = 14;
export const PADDLE_H = 96;
export const PLAYER_X = 24;               // borde izquierdo de la paleta del jugador
export const CPU_X = W - 24 - PADDLE_W;   // 762
export const PLAYER_SPEED = 520;          // px/s
export const PLAYER_ACCEL_TIME = 0;       // movimiento directo, sin inercia

export const BALL_SIZE = 12;              // cuadrado de 12×12
export const BALL_BASE_SPEED = 360;       // px/s en nivel 1
export const BALL_SPEED_PER_LEVEL = 25;   // se suma por nivel
export const BALL_SPEED_PER_HIT = 14;     // se suma en cada golpe de paleta dentro del rally
export const BALL_MAX_SPEED = 820;        // tope sin remate
export const SMASH_MULT = 1.35;           // multiplicador de velocidad del remate
export const SMASH_MAX_SPEED = 980;       // tope con remate
export const SMASH_WINDOW_MS = 150;       // Space pulsado hasta 150 ms antes del contacto
export const MAX_BOUNCE_ANGLE = (55 * Math.PI) / 180;
export const SPIN_FACTOR = 0.25;          // fracción de la vy de la paleta que pasa a la pelota
export const SERVE_DELAY = 0.8;           // s de espera antes de cada saque
export const SERVE_MAX_ANGLE = (30 * Math.PI) / 180;
export const SUBSTEP_PX = 6;              // distancia máxima por sub-paso de la pelota

export const LIVES = 5;                   // puntos que el jugador puede conceder
export const POINTS_PER_LEVEL = 5;
export const MAX_LEVEL = 10;
export const WIN_POINTS = POINTS_PER_LEVEL * MAX_LEVEL; // 50
export const POINT_BASE = 100;            // × nivel
export const STREAK_BONUS = 50;           // × racha (tope 10)
export const STREAK_CAP = 10;
export const VICTORY_LIFE_BONUS = 1000;   // por vida restante al ganar el punto 50

export const MAX_DT = 0.05;               // s

// IA de la CPU por nivel L (1..10)
export const cpuSpeed = (L: number) => 260 + 40 * (L - 1);          // 260 … 620 px/s
export const cpuReaction = (L: number) => 0.18 - 0.012 * (L - 1);   // 0.180 … 0.072 s
export const cpuError = (L: number) => 40 - 3.5 * (L - 1);          // ±40 … ±8.5 px
export const ballSpeedForLevel = (L: number) =>
  BALL_BASE_SPEED + BALL_SPEED_PER_LEVEL * (L - 1);                  // 360 … 585 px/s

export const COLORS = {
  bg: "#05060f",
  grid: "rgba(0,255,255,0.06)",
  net: "rgba(255,255,255,0.25)",
  player: "#00f0ff",
  cpu: "#ff3df0",
  ball: "#ffffff",
  smash: "#ff3df0",
  hud: "#e6f7ff",
} as const;
```

Reglas del juego:

- **Pista.** Fondo `bg` con rejilla tenue cada 40 px, red central discontinua (segmentos de 12 px cada 24 px en `x = 400`), bandas de 6 px arriba (`y=40..46`) y abajo (`y=594..600`). La pelota rebota en `y=46` y `y=594 - BALL_SIZE`.
- **Paleta del jugador.** `y` del borde superior, inicia centrada (`y = 40 + (560 - 96)/2 = 272`). Con arriba/abajo retenidos se mueve a `PLAYER_SPEED`; si se pulsan ambas, no se mueve. Se limita a `[46, 594 - 96]`. Se guarda `vy` del frame (−520, 0 o +520) para el efecto.
- **Saque.** Al inicio, tras `restart()` y tras cada punto: pelota en el centro (`x = 394, y = 314`), quieta durante `SERVE_DELAY`. Luego sale hacia **quien concedió el último punto** (el primer saque, hacia el jugador) con ángulo aleatorio uniforme en `[−30°, +30°]` y rapidez `ballSpeedForLevel(level)`. El contador de golpes del rally se reinicia a 0.
- **Movimiento de la pelota.** Cada frame se divide en `ceil(rapidez·dt / SUBSTEP_PX)` sub-pasos para que no atraviese paletas. Rebote en bandas: invierte `vy`.
- **Golpe con paleta.** Si la pelota (AABB) se solapa con una paleta y se mueve hacia ella:
  - `offset = clamp((ballCenterY − paddleCenterY) / (PADDLE_H/2), −1, 1)`; `angle = offset · MAX_BOUNCE_ANGLE`.
  - `hits++`; rapidez `s = min(BALL_MAX_SPEED, ballSpeedForLevel(level) + BALL_SPEED_PER_HIT · hits)`.
  - Solo jugador: si `now − smashPressedAt ≤ SMASH_WINDOW_MS`, el golpe es **remate**: `s = min(SMASH_MAX_SPEED, s · SMASH_MULT)`, la pelota queda marcada `smash = true` (estela magenta) hasta el siguiente golpe; se consume `smashPressedAt` (se pone a `−Infinity`). Pulsar Space sin contacto no hace nada más.
  - `vx = ±s·cos(angle)` (alejándose de la paleta), `vy = s·sin(angle) + SPIN_FACTOR · paddleVy`; luego se re-normaliza a rapidez `s` y se limita el ángulo resultante a ±60° para que nunca quede casi vertical.
  - La pelota se recoloca fuera de la paleta (sin solaparse) para evitar dobles golpes.
- **CPU.**
  - Objetivo cuando la pelota va hacia la CPU (`vx > 0`): predicción de la `y` de llegada a `x = CPU_X` simulando rebotes en bandas, más un error aleatorio en `[−cpuError(L), +cpuError(L)]` recalculado en cada golpe del jugador. El objetivo solo se actualiza tras `cpuReaction(L)` segundos desde el golpe del jugador o desde el saque.
  - Cuando la pelota se aleja (`vx < 0`) o está en espera de saque: objetivo = centro de la pista, a mitad de velocidad.
  - Mueve su centro hacia el objetivo a como máximo `cpuSpeed(L)` px/s, con zona muerta de 4 px. Mismos límites verticales que el jugador. No remata nunca.
- **Punto.**
  - Pelota sale por la derecha (`x > W`): **punto del jugador**. `pointsWon++`, `streak++`, `score += POINT_BASE · level + STREAK_BONUS · min(streak, STREAK_CAP)`. Luego `level = min(MAX_LEVEL, 1 + floor(pointsWon / 5))`. Si `pointsWon == 50`: `score += VICTORY_LIFE_BONUS · lives` y fin de partida (victoria).
  - Pelota sale por la izquierda (`x + BALL_SIZE < 0`): **punto concedido**. `lives--`, `streak = 0`. Si `lives == 0`, fin de partida.
  - Tras un punto sin fin de partida: nuevo saque.
- **Puntaje máximo práctico** (50 puntos seguidos sin conceder ninguno): base `100·5·(1+…+10) = 27 500`; racha `50·(1+…+10) + 50·10·40 = 2 750 + 20 000 = 22 750`; bonus de victoria `1 000 · 5 = 5 000`. **Total 55 250**, muy por debajo de 10 000 000. La partida está acotada: termina al ganar 50 puntos o al conceder 5.

HUD dibujado en la franja `y = 0..40` (fuente monoespaciada 18 px, color `hud`):

- Izquierda: `Score: N`. Centro: `Nivel: N` y debajo, en 12 px, `Racha xN` si `streak ≥ 2`. Derecha: `N` corazones (o barras cian) por vida restante, más el marcador del nivel en curso `Tú P – CPU C` (puntos ganados y concedidos en el nivel actual, solo informativo).
- Durante la espera de saque, en el centro de la pista se dibuja una cuenta corta (`●` parpadeante); **no** se dibuja "PAUSA", "GAME OVER" ni "VICTORIA".

Reglas de emisión de eventos (contrato `games/types.ts`):

- Emisión inicial al crear y tras `restart()`: `onScore(0)`, `onLives(5)`, `onLevel(1)`.
- `onScore` solo cuando el puntaje cambia (al ganar un punto y al sumar el bonus de victoria; ambos en el mismo frame se emiten una sola vez con el total).
- `onLives` solo al conceder un punto. `onLevel` solo cuando el nivel cambia.
- `onGameOver({ score, level })` **una sola vez** por partida, al llegar `lives` a 0 o al ganar el punto 50 (en victoria `level = 10`). El estado pasa a `gameover` y corta `update`, colisiones y lectura de teclas; se sigue dibujando el último frame.
- Teclas con `preventDefault`: `ArrowUp`, `ArrowDown`, `KeyW`, `KeyS`, `Space`. Las demás teclas no se interceptan.
- `pause()`: congela update/draw y llama `input.reset()` (suelta arriba/abajo y pone `smashPressedAt = −Infinity`). `resume()` reanúa sin salto: se reinicia la marca de tiempo del último frame.
- `restart()`: estado inicial completo (puntaje 0, vidas 5, nivel 1, racha 0, `pointsWon` 0, paletas centradas, saque hacia el jugador) sin crear otro bucle ni otros listeners.
- `destroy()`: cancela rAF, `input.dispose()` y marca `destroyed` para que ningún callback posterior reanude el bucle.
- `dt = min(MAX_DT, (now − last) / 1000)`.

---

## Implementation plan

Antes de empezar, leer `node_modules/next/dist/docs/01-app/` (Client Components, `cacheComponents`) y `games/snake/` como referencia de estructura.

1. **Constantes.** Crear `games/paletas/constants.ts` con todo lo de arriba. Verificación: `bunx tsc --noEmit`.
2. **Input.** Crear `input.ts`: `keydown`/`keyup` en `window`, estado `up`, `down`, `smashPressedAt` (con `performance.now()` en el `keydown` de `Space`, ignorando `e.repeat`), `preventDefault` en las 5 teclas, `reset()` y `dispose()`. Verificación: `tsc` y `bun run lint`.
3. **Entidades y física.** Crear `entities.ts`: tipos `Paddle { x, y, vy }`, `Ball { x, y, vx, vy, smash }`, función `predictY(ball, targetX)` con rebotes, función `bounceOffPaddle(...)` con offset, efecto, remate y clamp de ±60°, y funciones de dibujo (`drawField`, `drawPaddle`, `drawBall` con estela de 6 posiciones, `drawHud`) que reciben `ctx`. Verificación: `tsc` y lint.
4. **Motor.** Crear `index.ts` con `export const createGame: CreateGame`: estado (`player`, `cpu`, `ball`, `serveTimer`, `serveDir`, `hits`, `score`, `lives`, `level`, `streak`, `pointsWon`, `levelWon`, `levelLost`, `cpuTarget`, `cpuReactTimer`, `cpuErr`, `state: "serve" | "play" | "gameover"`), `update(dt)` con sub-pasos, `draw()`, bucle rAF con `dt` capado y los métodos del contrato. Verificación: `tsc` y lint; ningún import fuera de `./` salvo `import type { CreateGame } from "../types"`.
5. **Prueba en aislamiento.** Tras JAM-paletas-02 paso 1 (registro), jugar `/games/paletas/jugar` y comprobar cada criterio de abajo. Verificación: checklist de aceptación.

---

## Acceptance criteria

- [ ] `bunx tsc --noEmit` y `bun run lint` sin errores ni warnings.
- [ ] Ningún archivo de `games/paletas/` importa React, `components/`, `app/`, `lib/`, otras carpetas de `games/` ni `references/`; solo `import type` de `../types`.
- [ ] El canvas es 800×600 lógicos con HUD en la franja superior de 40 px (Score, Nivel, vidas).
- [ ] Al iniciar se emiten `onScore(0)`, `onLives(5)`, `onLevel(1)`; la pelota espera 0,8 s y sale hacia el jugador con ángulo dentro de ±30°.
- [ ] `ArrowUp`/`KeyW` y `ArrowDown`/`KeyS` mueven la paleta a 520 px/s sin salir de la pista; las teclas no hacen scroll.
- [ ] Golpear con el borde de la paleta da un ángulo mayor que golpear con el centro; el ángulo de salida nunca supera ±60°.
- [ ] Cada golpe del rally sube la rapidez en 14 px/s hasta 820; un remate (Space ≤150 ms antes del contacto) la multiplica por 1,35 hasta 980 y dibuja estela magenta.
- [ ] La pelota nunca atraviesa una paleta a velocidad máxima (sub-pasos de 6 px).
- [ ] Ganar el primer punto en nivel 1 suma 150 (100 + 50·1); el segundo seguido, 200; conceder un punto reinicia la racha y resta una vida.
- [ ] Cada 5 puntos ganados el nivel sube 1 y la CPU se mueve más rápido (260 → 620 px/s) con menos error y reacción.
- [ ] Al conceder el 5.º punto, `onGameOver` se emite una vez con el puntaje y nivel actuales; el canvas no dibuja "GAME OVER".
- [ ] Al ganar el punto 50 se suma 1 000 por vida restante y `onGameOver({ score, level: 10 })` se emite una vez.
- [ ] `pause()` congela la pelota y ambas paletas; al reanudar no hay movimiento fantasma ni remate guardado.
- [ ] `restart()` reinicia todo sin duplicar bucle ni listeners (una pulsación mueve la paleta a la misma velocidad que antes).
- [ ] `destroy()` cancela el rAF y quita los listeners de `window`.

---

## Decisions

- **Sí:** VS CPU con un solo humano. **No:** modo 2 jugadores local (dos jugadores en un teclado rompe el leaderboard individual).
- **Sí:** vidas = 5 puntos concedibles. **No:** marcador clásico a 11 puntos sin vidas.
- **Sí:** final acotada a 50 puntos con bonus por vidas, para que la partida sea corta y el puntaje máximo calculable (55 250). **No:** partida infinita.
- **Sí:** racha con tope 10 y base por nivel. **No:** multiplicadores exponenciales.
- **Sí:** remate con ventana de 150 ms y efecto por velocidad de paleta, como giro propio. **No:** power-ups ni objetos en la pista.
- **Sí:** CPU con predicción + error + retardo por nivel, nunca perfecta (error mínimo ±8,5 px y velocidad máxima 620 < rapidez de la pelota en remate). **No:** CPU que sigue la pelota perfectamente.
- **Sí:** sub-pasos de 6 px. **No:** colisión de un solo paso (tunneling a 980 px/s).
- **Sí:** arte con primitivas de canvas y estética neón. **No:** imágenes ni `sprites.ts` (no hay assets de referencia para este juego).
- **Sí:** solo teclado, sin sonido. **No:** ratón, táctil ni audio.
- **Sí:** pausa y modal en React. **No:** overlays ni reinicio por tecla en el canvas.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Tunneling de la pelota a alta velocidad | Sub-pasos de máximo 6 px por iteración |
| Doble golpe en la misma paleta | Solo se golpea si la pelota se mueve hacia la paleta y se recoloca fuera tras el rebote |
| Pelota casi vertical que no avanza (rally eterno) | Clamp del ángulo final a ±60° tras sumar el efecto |
| CPU imbatible en nivel 10 | Velocidad máx. 620 px/s, error ±8,5 px y reacción 72 ms; el remate (hasta 980 px/s) y los ángulos de borde siguen ganando puntos; se valida en revisión manual |
| CPU tiembla al llegar al objetivo | Zona muerta de 4 px |
| `onGameOver` doble (último punto y victoria en el mismo frame) | El estado `gameover` corta el resto del `update`; emisión solo al transicionar |
| Teclas retenidas o remate guardado al pausar | `pause()` llama `input.reset()` |
| Strict Mode duplica bucle y listeners | `destroy()` en cleanup y bandera `destroyed` |
| Salto de tiempo al reanudar | `resume()` reinicia `last` y `dt` capado a 0,05 s |
| Puntaje mayor a 10 000 000 | Imposible: máximo 55 250 |

---

## What is **not** in this spec

- Registro en `GAME_ENGINES`, catálogo, portada, migración y verificación de rutas (JAM-paletas-02).
- Modo 2 jugadores, online, power-ups, obstáculos, sonido, ratón o táctil.
- Selector de dificultad o de estilo visual.
- Cambios en `GamePlayer`, `submitScore`, leaderboard o `/salon`.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
