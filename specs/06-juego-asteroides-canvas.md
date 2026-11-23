# SPEC 06 — Juego ASTEROIDES en canvas con ruta genérica por juego

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-11-23
> **Objective:** Portar el juego de `references/started-games/02-asteroids` a un motor de canvas en TypeScript, montado por un `GamePlayer` genérico que se comunica con React mediante eventos (puntaje, vidas, nivel, fin de juego) y que deja cada juego aislado en su propia carpeta.

---

## Por qué existe esta spec

Hoy `components/game-player.tsx` es un simulador: suma puntos aleatorios con `setInterval` y las vidas están fijas en 3. Ningún juego es real. El juego de asteroides de `references/started-games/02-asteroids` ya funciona como página suelta (`index.html` + `game.js` de 510 líneas, con globales, `document.getElementById` y listeners en `window`). No se puede incrustar tal cual en Next.js.

Decisiones ya tomadas por el usuario, no se reabren:

- El canvas **notifica** a React (puntaje, vidas, nivel, fin de juego). React no lee el estado interno del juego.
- La **pausa la controla el contenedor** (React). El motor expone `pause()` y `resume()`.
- Al acabar el juego, el canvas notifica y **React muestra el modal**.
- El juego vive **dentro del canvas**, físicamente igual que el original (nave, asteroides, balas, partículas, power-up 3x y HUD dibujado).
- El juego nuevo se llama **ASTEROIDES** y su id es **`asteroides`**. No es `rocas`. `rocas` sigue en los datos hardcodeados como un juego distinto (con simulador mock).
- La ruta es **genérica** (`/games/[id]/jugar`) y cada juego queda aislado: un registro `id → motor`, sin imports cruzados entre juegos.

Esta spec no cambia la ruta ni el aspecto de ningún otro juego: los 8 juegos actuales siguen usando el simulador mock.

---

## Scope

**In:**

- Motor del juego en `games/asteroides/` (TypeScript, sin dependencias, sin acceso a React): clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, utilidades, constantes, entrada de teclado y bucle principal, portados del original sin cambiar reglas, velocidades, puntos ni tamaños (canvas lógico 800×600).
- Contrato común de juegos en `games/types.ts` (`GameEngine`, `GameEvents`, `CreateGame`).
- Registro en `games/registry.ts`: mapa `id → () => import("./<id>")`. Solo `asteroides` está registrado.
- `GamePlayer` genérico: si el id está en el registro, monta un `<canvas>` y conecta el motor; si no, mantiene el simulador mock actual. HUD (Puntuación, Vidas, Nivel) y modal comparten ambos modos.
- Vidas y nivel dinámicos en el HUD de React (hoy vidas fijas en 3 y nivel `score/2500`) solo para juegos con motor real.
- Pausa y reanudación controladas por los botones de React; el overlay "EN PAUSA" sigue siendo de React.
- Modal de fin de juego de React al recibir `onGameOver`, con `JUGAR DE NUEVO` (llama `restart()`) y guardado en `av_scores` como hoy.
- Nuevo juego en `lib/games.ts`: `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `cover: "cover-asteroides"`, `best: 0`, `plays: "0"`; clase CSS `cover-asteroides` en `app/globals.css`.
- Verificación manual completa (no hay tests automatizados en el proyecto).

**Out of scope (para futuras specs):**

- Controles táctiles. El motor solo usa teclado (flechas rotan y propulsan, ESPACIO dispara) aunque el detalle diga "TECLADO / TÁCTIL".
- Portar los otros juegos de `references/started-games/` (`03-tetris`, `04-arkanoid`) o reemplazar el simulador de los 8 juegos existentes.
- Modificar o eliminar `rocas`.
- Persistir puntajes en Supabase, ranking real, estadísticas reales de `best` y `plays`.
- Sonido, OVNIs (la descripción de ROCAS los menciona, el original no los tiene), nuevos power-ups o cambios de balance.
- Pausa automática al perder foco la pestaña (el `dt` capado a 50 ms del original ya evita saltos).
- Escalado responsive del tamaño lógico del canvas: el canvas mantiene 800×600 lógicos y CSS lo ajusta al `crt-screen` (4:3).
- Tests automatizados.

---

## Data model

Esta spec no introduce tablas ni claves nuevas de `localStorage`. `av_scores` conserva su formato. Estructuras de código nuevas:

```ts
// games/types.ts
export type GameEvents = {
  onScore: (score: number) => void;          // cada vez que cambia el puntaje
  onLives: (lives: number) => void;          // al iniciar y cada vez que cambia
  onLevel: (level: number) => void;          // al iniciar y cada vez que cambia
  onGameOver: (result: { score: number; level: number }) => void; // una vez por partida
};

export type GameEngine = {
  pause: () => void;     // congela update/draw y suelta las teclas retenidas
  resume: () => void;
  restart: () => void;   // nueva partida; vuelve a emitir score 0, lives 3, level 1
  destroy: () => void;   // cancela el rAF y quita los listeners de window
};

export type CreateGame = (
  canvas: HTMLCanvasElement,
  events: GameEvents,
) => GameEngine;
```

```ts
// games/asteroides/index.ts
export const createGame: CreateGame;

// games/registry.ts
export const GAME_ENGINES: Record<string, () => Promise<{ createGame: CreateGame }>> = {
  asteroides: () => import("./asteroides"),
};
```

Estructura de archivos nueva:

```
games/
  types.ts
  registry.ts
  asteroides/
    index.ts        // createGame: estado, update, draw, bucle, eventos
    constants.ts    // W, H, RADII, SPEEDS, POINTS, POWERUP_*, TRIPLE_SPREAD
    utils.ts        // wrap, dist, rand, randInt
    input.ts        // keys / justPressed y listeners (con cleanup)
    entities.ts     // Bullet, Asteroid, PowerUp, Ship, Particle
```

Cambio en `lib/games.ts` (nuevo elemento de `GAMES`):

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Destruye el campo de asteroides y sobrevive.",
  long: "Pilota tu nave en un campo de asteroides. Rota, propulsa y dispara para partir las rocas en fragmentos cada vez más pequeños. Recoge el power-up 3x para disparar en abanico.",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

Reglas de emisión de eventos:

- El motor emite `onScore`, `onLives` y `onLevel` solo cuando el valor cambia (más una emisión inicial al crear y al reiniciar).
- `onGameOver` se emite una sola vez, cuando `lives` llega a 0. A partir de ahí el motor deja de procesar disparo y movimiento de la nave; puede seguir animando partículas.
- Con el juego terminado el canvas **no** dibuja el overlay "GAME OVER" ni reinicia con ESPACIO (el original sí). El reinicio solo ocurre por `restart()` desde React.

---

## Implementation plan

Antes de empezar, leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components y la de `cacheComponents` / `use client`, y la referencia de `next/dynamic` o `import()` dinámico en componentes cliente. El proyecto usa Next 16.4.6 con `cacheComponents: true`.

1. **Contrato y registro.** Crear `games/types.ts` y `games/registry.ts` con `GAME_ENGINES` vacío. Verificación: `bunx tsc --noEmit` y `bun run lint` sin errores.
2. **Núcleo del motor.** Crear `games/asteroides/constants.ts`, `utils.ts` e `input.ts`. `input.ts` registra `keydown`/`keyup` en `window`, llama `preventDefault()` para flechas y ESPACIO (evita que la página haga scroll) y expone `dispose()` y `reset()` (suelta teclas). Verificación: `tsc` y lint sin errores.
3. **Entidades.** Crear `games/asteroides/entities.ts` con `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle`. Cada clase recibe el `CanvasRenderingContext2D` por parámetro en `draw(ctx)` en lugar de usar un global. Lógica, constantes y números idénticos al original. Verificación: `tsc` y lint sin errores.
4. **Motor.** Crear `games/asteroides/index.ts` con `createGame(canvas, events)`: estado (`ship`, `bullets`, `asteroids`, `particles`, `powerUps`, `score`, `lives`, `level`, `state`, `deadTimer`), `update`, `draw` con HUD dibujado (SCORE, NIVEL, iconos de vida, contador 3x) y bucle con `requestAnimationFrame` y `dt` capado a 0.05 s. Implementar `pause`, `resume`, `restart`, `destroy` y los cuatro eventos según las reglas del Data model. Quitar el overlay "GAME OVER" y el reinicio con ESPACIO. Registrar `asteroides` en `GAME_ENGINES`. Verificación: `tsc` y lint sin errores.
5. **Datos del catálogo y portada.** Agregar el juego `asteroides` a `GAMES` en `lib/games.ts` y la clase `.cover-asteroides` en `app/globals.css` (fondo negro, polígonos de asteroide en trazo blanco y nave triangular, sin reutilizar `.cover-rocas`). Verificación: `/games` lista 9 juegos y ASTEROIDES y ROCAS aparecen como tarjetas distintas; `/games/asteroides` y `/games/rocas` responden 200.
6. **GamePlayer genérico.** Refactorizar `components/game-player.tsx`: leer `GAME_ENGINES[game.id]`; si existe, renderizar un `<canvas width={800} height={600}>` dentro de `.crt-screen` (CSS: ancho y alto 100%), cargar el motor con `import()` en un `useEffect`, crear el juego con los eventos conectados a `useState` (`score`, `lives`, `level`, `over`) y llamar `destroy()` en el cleanup. Los botones `PAUSA`/`REANUDAR` llaman `pause()`/`resume()`; `FIN` marca `over` y pausa el motor; `JUGAR DE NUEVO` llama `restart()` y limpia `over`/`saved`. Si el id no está en el registro, conservar el simulador actual sin cambios de comportamiento. El HUD de vidas muestra `"♥ ".repeat(lives)` con el valor del motor. Verificación: `bun run build` sin errores.
7. **Revisión manual.** Con `bun run dev`: jugar `/games/asteroides/jugar` completo (disparar, partir asteroides, power-up 3x, pasar de nivel, perder las 3 vidas, ver el modal, guardar puntaje, jugar de nuevo, pausar y reanudar, salir y volver). Jugar `/games/rocas/jugar` y confirmar que sigue el simulador. Revisar consola y terminal. Verificación: criterios de aceptación.
8. **Cierre.** `bun run lint` y `bun run build` sin errores ni warnings. Verificación: criterios de aceptación.

---

## Acceptance criteria

- [ ] `bun run lint` y `bun run build` terminan con código 0 y sin warnings.
- [ ] `GAMES` contiene `{ id: "asteroides", title: "ASTEROIDES" }` y sigue conteniendo `{ id: "rocas", title: "ROCAS" }`. El catálogo muestra 9 juegos.
- [ ] `GAME_ENGINES` contiene únicamente la clave `asteroides`. Ningún archivo de `games/asteroides/` importa desde otra carpeta de `games/` ni desde `components/`, `app/` o React.
- [ ] `/games/asteroides/jugar` muestra un `<canvas>` de 800×600 lógicos dentro del `crt-screen`, con la nave, asteroides y el HUD dibujado (SCORE, NIVEL, iconos de vida).
- [ ] Al destruir un asteroide el puntaje del HUD de React coincide con el del canvas: tamaño 3 = 20, tamaño 2 = 50, tamaño 1 = 100.
- [ ] Las vidas del HUD de React empiezan en 3 y bajan en 1 cada vez que la nave choca; el número de corazones coincide con los iconos de vida del canvas.
- [ ] El nivel del HUD de React sube cuando se destruye el último asteroide y coincide con "NIVEL N" del canvas.
- [ ] `PAUSA` detiene por completo el movimiento y el cronómetro del power-up y muestra "EN PAUSA" de React; `REANUDAR` continúa sin saltos y sin disparos ni giros fantasma por teclas que estaban retenidas.
- [ ] Al llegar a 0 vidas aparece el modal de React "FIN DEL JUEGO" con la puntuación final correcta. El canvas no dibuja "GAME OVER" y ESPACIO no reinicia la partida.
- [ ] `onGameOver` se emite una sola vez por partida (el modal no se reabre ni se duplica).
- [ ] `JUGAR DE NUEVO` inicia una partida con puntaje 0, 3 vidas y nivel 1, sin duplicar el bucle ni los listeners de teclado (una sola nave responde y dispara una bala por pulsación).
- [ ] Guardar puntaje escribe en `av_scores` una entrada con `game: "asteroides"`, igual que el resto de juegos.
- [ ] Las flechas y ESPACIO no hacen scroll de la página mientras se juega.
- [ ] Al salir de la ruta (`SALIR` o navegación del navegador) `destroy()` se ejecuta: no queda el `requestAnimationFrame` ni los listeners de `window`; volver a entrar crea una sola instancia.
- [ ] `/games/rocas/jugar` y los otros 6 juegos siguen con el simulador mock y se ven y comportan igual que antes.
- [ ] La consola del navegador y el terminal de `next dev` no muestran errores ni warnings en `/games`, `/games/asteroides` y `/games/asteroides/jugar`.
- [ ] `git status` no muestra cambios dentro de `references/`.

---

## Decisions

- **Sí:** el canvas es el dueño del estado del juego y notifica a React con eventos. **No:** que React lea variables internas ni consulte al motor en cada frame. Evita re-renders a 60 fps y acopla menos.
- **Sí:** motor en TypeScript puro sin React (`createGame(canvas, events)`). Se puede probar y reutilizar. **No:** meter el bucle dentro de un componente o de `useEffect`.
- **Sí:** la pausa vive en el contenedor y el motor solo expone `pause()` y `resume()`. **No:** tecla de pausa dentro del canvas.
- **Sí:** el modal de fin de juego es de React y el canvas no dibuja "GAME OVER" ni reinicia con ESPACIO. **No:** overlay duplicado ni dos formas de reiniciar, para no desincronizar el estado.
- **Sí:** HUD en ambos lados (canvas como el original, React como el resto de la plataforma). Se pidió que el juego quede físicamente como el original y que React reciba puntaje y vidas.
- **Sí:** carpeta `games/<id>/` en la raíz con `registry.ts` que mapea `id → import()` dinámico. Cada juego queda aislado y el código de un juego no entra al bundle de los demás. **No:** `lib/games/<id>/` (mezcla catálogo con motores) ni una carpeta `app/games/asteroides/jugar/` por juego (rompe la ruta genérica pedida).
- **Sí:** ruta `/games/[id]/jugar` sin cambios, genérica. El registro decide qué se monta.
- **Sí:** contrato de eventos único para `GamePlayer`: juegos con motor real y simulador mock comparten HUD y modal. **No:** dos componentes duplicados (`GamePlayer` y `CanvasGamePlayer`).
- **Sí:** agregar `asteroides` y dejar `rocas`. Son dos juegos distintos aunque se parezcan. `id: "asteroides"` es el id oficial; no se usa `astoroides`. **No:** reemplazar ni renombrar `rocas`.
- **Sí:** portada propia `cover-asteroides`, `best: 0` y `plays: "0"`. **No:** inventar estadísticas ni reutilizar la portada de ROCAS, que confundiría visualmente los dos juegos.
- **Sí:** solo teclado, como el original. Los controles táctiles quedan para otra spec.
- **Sí:** reglas, velocidades y puntos idénticos al original. Esta spec adapta, no rebalancea.
- **Sí:** `bun` como gestor de paquetes, igual que las specs anteriores. No se agregan dependencias.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| React Strict Mode monta el efecto dos veces en desarrollo y se duplican el bucle y los listeners | `destroy()` en el cleanup del `useEffect` cancela el `requestAnimationFrame` y quita los listeners. Criterio de aceptación sobre una sola nave y una bala por pulsación. |
| `cacheComponents: true` y `window`/`canvas` en render | El motor solo se carga y ejecuta dentro de `useEffect` en un Client Component. Nada del motor se importa en el render del servidor. |
| Teclas retenidas durante la pausa provocan comportamiento raro al reanudar | `pause()` llama a `input.reset()` para soltar `keys` y `justPressed`. |
| El motor emite eventos en cada frame y causa renders innecesarios | Solo emite cuando el valor cambia. Criterio de aceptación sobre el comportamiento visible. |
| La carga dinámica del motor tarda y el canvas aparece vacío | Mostrar el contenido actual de `crt-content` ("CARGANDO") hasta que el motor esté listo. |
| `onGameOver` se dispara dos veces si el motor sigue ejecutando colisiones tras 0 vidas | El estado `gameover` corta `update` antes de las colisiones y el evento se emite solo al transicionar. Criterio de aceptación específico. |
| El canvas queda distorsionado por el CSS | `crt-screen` ya es 4:3 y el canvas es 800×600 (también 4:3): ocupa 100% de ancho y alto sin deformar. |
| Se mezclan los juegos `asteroides` y `rocas` en datos o rutas | Ids distintos, portadas distintas y el criterio de aceptación comprueba que `/games/rocas/jugar` sigue con el simulador. |

---

## What is **not** in this spec

- Controles táctiles.
- Portar `03-tetris` o `04-arkanoid`, o reemplazar el simulador de los demás juegos.
- Cambios o eliminación de `rocas`.
- Persistencia en Supabase, ranking real o estadísticas reales.
- Sonido, OVNIs, nuevos power-ups o rebalanceo.
- Pausa automática por pérdida de foco.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
