# SPEC 12 — Controles táctiles y layout móvil para los juegos

> **Status:** Aprobado
> **Depends on:** SPEC 06, SPEC 08, SPEC 09, SPEC 10, SPEC 11
> **Date:** 2026-11-25
> **Objective:** Permitir jugar `asteroides`, `tetris`, `arkanoid` y `snake` en un móvil de pantalla táctil, con un overlay de botones virtuales en React que emite teclas sintéticas y un reproductor que escala al ancho del dispositivo, sin modificar los motores.

---

## Por qué existe esta spec

Hoy los cuatro motores leen solo teclado en `window` (cada `games/<id>/input.ts`) y `GamePlayer` no ofrece ninguna forma de controlar el juego sin teclado físico. En un móvil el jugador ve el canvas pero no puede moverse, girar, disparar ni soltar piezas. SPEC 06, 08, 09 y 11 dejaron los controles táctiles explícitamente fuera de alcance; esta spec los cubre.

Teclas que leen los motores hoy (verificado en el código):

| Juego | Teclas | Semántica de lectura |
| ----- | ------ | -------------------- |
| `asteroides` | `ArrowLeft`, `ArrowRight` (girar), `ArrowUp` (empuje), `Space` (disparo) | Estado retenido (`keys[code]`); `Space` usa `pressed()` (una vez por pulsación nueva, exige `keyup` previo) |
| `tetris` | `ArrowLeft`, `ArrowRight`, `ArrowDown` (caída suave), `ArrowUp` o `KeyX` (rotar), `Space` (caída dura) | Cola de `keydown`; depende del auto-repeat del teclado para mover de forma continua |
| `arkanoid` | `ArrowLeft`, `ArrowRight` | Estado retenido (`keydown`/`keyup`); además `mousemove` sobre el canvas |
| `snake` | `ArrowUp/Down/Left/Right` (o WASD) | Un `keydown` encola un giro; `keyup` no se usa |

Decisiones ya tomadas por el usuario, no se reabren:

- Controles **virtuales en pantalla** (botones), no gestos.
- La lógica táctil vive en un **overlay de React que emite `KeyboardEvent` sintéticos** en `window`. Los motores no cambian ni conocen el táctil.
- Garantías de layout: canvas que escala al ancho disponible, ajuste para orientación vertical, bloqueo de scroll/zoom/gestos del navegador sobre el juego y pausa automática al perder visibilidad.
- Verificación: emulación táctil de DevTools **y** prueba en un dispositivo real.

---

## Scope

**In:**

- Config pura `lib/touch-controls.ts` con los botones de cada juego (etiqueta, tecla, modo `hold` / `tap` / `repeat`, grupo izquierdo o derecho).
- Componente cliente `components/touch-controls.tsx`: renderiza los botones del juego, emite `keydown`/`keyup` sintéticos con `window.dispatchEvent`, soporta multitouch, repite en `repeat` y libera todo al soltar, cancelar, pausar, terminar o desmontar.
- Visibilidad solo en dispositivos con puntero grueso (`(pointer: coarse)`), leída con `useSyncExternalStore` para no romper la hidratación.
- Integración en `components/game-player.tsx`: montar el overlay, desactivarlo en pausa y fin de partida, pausar automáticamente con `visibilitychange`, y bloquear gestos del navegador mientras el reproductor está montado.
- CSS en `app/globals.css` (con `/frontend-design`): reproductor responsive para 360–430 px, botones de mínimo 44×44 px, controles bajo el canvas en vertical y a los lados en horizontal bajo.
- Verificación manual (no hay tests automatizados).

**Out of scope (para futuras specs):**

- Gestos (swipe, arrastre de paleta analógico en Arkanoid, tap para acción).
- Cambios en `games/*` (motores, `input.ts`, `games/types.ts`, `games/registry.ts`).
- Vibración háptica, sonido, giroscopio, pantalla completa o bloqueo de orientación por API.
- PWA, instalación, modo offline.
- Soporte de gamepad.
- Cambios en `submitScore`, leaderboard, `/salon`, `/games/[id]`, base de datos o migraciones.
- Rediseño de la biblioteca, home o navegación para móvil (solo se garantiza el reproductor `/games/[id]/jugar` y su modal de fin).
- Tests automatizados.

---

## Data model

Sin tablas ni columnas nuevas. Sin migración.

Config de controles (`lib/touch-controls.ts`, módulo puro sin React ni DOM):

```ts
export type TouchMode =
  | "hold"    // keydown al presionar, keyup al soltar
  | "tap"     // keydown + keyup inmediatos al presionar
  | "repeat"; // keydown al presionar y cada REPEAT_MS tras REPEAT_DELAY_MS; keyup al soltar

export type TouchButton = {
  id: string;            // estable, usado como key de React y aria
  label: string;         // texto o símbolo visible
  ariaLabel: string;     // etiqueta accesible en español
  code: string;          // KeyboardEvent.code que leen los motores
  mode: TouchMode;
  side: "left" | "right";
};

export const REPEAT_DELAY_MS = 180;
export const REPEAT_MS = 80;

export const TOUCH_CONTROLS: Record<string, TouchButton[]>;
```

Mapa por juego (`TOUCH_CONTROLS`):

| Juego | Grupo izquierdo | Grupo derecho |
| ----- | --------------- | ------------- |
| `asteroides` | `◀` `ArrowLeft` hold, `▶` `ArrowRight` hold | `▲` `ArrowUp` hold (empuje), `FUEGO` `Space` tap |
| `tetris` | `◀` `ArrowLeft` repeat, `▶` `ArrowRight` repeat, `▼` `ArrowDown` repeat | `ROTAR` `ArrowUp` tap, `CAER` `Space` tap |
| `arkanoid` | `◀` `ArrowLeft` hold | `▶` `ArrowRight` hold |
| `snake` | `◀` `ArrowLeft` tap, `▶` `ArrowRight` tap | `▲` `ArrowUp` tap, `▼` `ArrowDown` tap |

Reglas:

- Cada evento sintético es `new KeyboardEvent(type, { code, key, bubbles: true, cancelable: true })` despachado en `window`; los motores solo leen `e.code`.
- `Space` en `asteroides` es `tap`: `keydown` seguido de `keyup` inmediato para que la siguiente pulsación vuelva a contar como nueva (`pressed()` exige `keys[code]` en falso).
- Cada botón rastrea su propio `pointerId` con `setPointerCapture`; `pointerup`, `pointercancel` y `lostpointercapture` sueltan la tecla. Varios botones se pueden mantener a la vez (por ejemplo girar y empujar).
- Un juego sin entrada en `TOUCH_CONTROLS` no muestra overlay.
- El overlay solo se renderiza con `(pointer: coarse)`. En escritorio con ratón no aparece.

Archivos que aparecen o cambian:

```
lib/touch-controls.ts           // nuevo: config pura
components/touch-controls.tsx   // nuevo: overlay cliente
components/game-player.tsx      // monta el overlay, visibilitychange, clase anti-gestos
app/globals.css                 // estilos del overlay y reproductor responsive
app/layout.tsx                  // solo si hace falta exportar `viewport` (ver paso 1)
```

---

## Implementation plan

Antes de empezar, leer en `node_modules/next/dist/docs/01-app/` la guía de Client Components y la de `cacheComponents` (nada del DOM ni de `matchMedia` en el render prerenderizado) y la referencia de `viewport`. Usar `/frontend-design` para los botones y el layout responsive.

1. **Diagnóstico de viewport.** Revisar `app/layout.tsx`: confirmar que existe `viewport` con `width=device-width, initial-scale=1`. Si falta, exportarlo. No fijar `maximumScale` ni `userScalable: false` (perjudican la accesibilidad); el bloqueo de zoom sobre el juego se logra con `touch-action` en el paso 5. Verificación: `bunx tsc --noEmit` y `bun run lint`.
2. **Config.** Crear `lib/touch-controls.ts` con los tipos, constantes y `TOUCH_CONTROLS` de los cuatro juegos. Verificación: `tsc` y lint.
3. **Overlay.** Crear `components/touch-controls.tsx` (`"use client"`): props `gameId` y `disabled`; `useSyncExternalStore` sobre `matchMedia("(pointer: coarse)")` con snapshot de servidor `false`; botones con `onPointerDown/Up/Cancel`, `onLostPointerCapture`, `onContextMenu` con `preventDefault`; temporizadores de `repeat` limpiados al soltar; `releaseAll()` que envía `keyup` de todo lo retenido, llamado al pasar `disabled` a `true` y al desmontar. Verificación: `tsc` y lint.
4. **Integración en `GamePlayer`.** Montar `<TouchControls gameId={game.id} disabled={paused || over || !ready} />` bajo `.crt`. Añadir un efecto con `visibilitychange`: si `document.hidden` y la partida está en curso y no pausada, hacer `setPaused(true)` y `engineRef.current?.pause()` (el jugador reanuda con el botón). Verificación: `tsc` y lint; en escritorio nada cambia visualmente.
5. **Bloqueo de gestos.** En `GamePlayer`, efecto que añade una clase (por ejemplo `playing`) a `document.documentElement` al montar y la quita al desmontar. CSS: `html.playing { overscroll-behavior: none; }`; `.crt-screen canvas` y los botones del overlay con `touch-action: none`, `user-select: none` y `-webkit-touch-callout: none`; el resto del reproductor con `touch-action: manipulation` (evita el zoom por doble toque). Verificación: en emulación táctil no hay scroll ni zoom al arrastrar sobre el canvas ni sobre los botones.
6. **Layout responsive.** En `app/globals.css`, con `/frontend-design`:
   - `max-width: 720px`: `.crt` con padding de 10–12 px y radio menor; `.crt-screen` sigue en `aspect-ratio: 4/3` al 100 % del ancho; `.player-hud` y `.hud-actions` en columnas que envuelven; `.crt-bottom` oculta el texto secundario; botones HUD y `select` de skins con altura mínima de 44 px.
   - Orientación vertical: grupos izquierdo y derecho del overlay en una fila bajo el canvas, `min-height: 56px` por botón, separación suficiente para dedos distintos.
   - Orientación horizontal baja (`(orientation: landscape) and (max-height: 500px)`): el canvas se limita con `max-height: calc(100dvh - 24px)` y el overlay pasa a columnas a izquierda y derecha del canvas.
   - Modal de fin: sin desbordes a 360 px, `input-row` envuelve.
   Verificación: sin scroll horizontal a 360, 390 y 430 px de ancho, en vertical y horizontal.
7. **Revisión manual.** Con `bun run dev` y emulación táctil de DevTools (iPhone y Android, vertical y horizontal), jugar los cuatro juegos completos solo con los botones. Después probar en un dispositivo real: `bun run dev -H 0.0.0.0`, abrir la IP de la red local en el móvil y repetir el recorrido (si Next bloquea el origen, añadir la IP a `allowedDevOrigins` solo de forma local y no commitearlo). Confirmar guardado de puntaje desde el móvil y que escritorio no cambia.
8. **Cierre.** `bun run lint`, `bunx tsc --noEmit` y `bun run build` sin errores ni warnings.

---

## Acceptance criteria

- [ ] `bun run lint`, `bunx tsc --noEmit` y `bun run build` terminan con código 0 y sin warnings.
- [ ] `git status` no muestra cambios en `games/`, `supabase/`, `lib/supabase/` ni `references/`.
- [ ] `lib/touch-controls.ts` tiene entrada para `asteroides`, `tetris`, `arkanoid` y `snake` con los botones de la tabla del modelo de datos.
- [ ] En un dispositivo con `(pointer: coarse)` el overlay aparece bajo el canvas en `/games/<id>/jugar`; en escritorio con ratón no aparece y la página se ve igual que antes.
- [ ] Sin teclado, `asteroides` se puede girar, empujar y disparar; se pueden mantener girar y empujar a la vez (multitouch).
- [ ] Sin teclado, `tetris` mueve la pieza a izquierda y derecha, la baja con `▼`, rota con `ROTAR` y la suelta con `CAER`; mantener `◀`, `▶` o `▼` repite el movimiento (primer repetido a ~180 ms, luego cada ~80 ms).
- [ ] Sin teclado, `arkanoid` mueve la paleta mientras se mantiene `◀` o `▶` y se detiene al soltar.
- [ ] Sin teclado, `snake` gira en las cuatro direcciones con un toque por botón, y el giro de 180° se ignora como con teclado.
- [ ] Soltar un botón, cancelar el toque (`pointercancel`), pausar, terminar la partida o salir de la página nunca deja una tecla retenida (la nave no sigue girando, la paleta no sigue moviéndose).
- [ ] El overlay se desactiva (no responde) mientras el juego está en pausa o el modal de fin está abierto.
- [ ] Cambiar de pestaña o bloquear la pantalla durante una partida la pausa; al volver, muestra `EN PAUSA` y `REANUDAR` continúa sin giros ni teclas fantasma.
- [ ] A 360, 390 y 430 px de ancho, en vertical y en horizontal, `/games/<id>/jugar` no tiene scroll horizontal, el canvas conserva 4:3 completo y visible, y HUD, selector de skin, `PAUSA`, `FIN` y `SALIR` son usables.
- [ ] Todos los botones táctiles, `PAUSA`, `FIN`, `SALIR` y el `select` de skins miden al menos 44×44 px en pantallas táctiles.
- [ ] Arrastrar o mantener el dedo sobre el canvas y los botones no hace scroll, no hace zoom y no dispara pull-to-refresh ni menú contextual; la clase `playing` de `<html>` se quita al salir del reproductor.
- [ ] El modal de fin de partida cabe en 360 px y permite escribir el nombre, guardar el puntaje y `JUGAR DE NUEVO` desde el móvil; la fila aparece en `scores`.
- [ ] La emulación táctil de DevTools y un dispositivo real (iOS o Android) completan una partida de cada juego.
- [ ] Sin errores ni warnings en la consola del navegador ni en `next dev`, incluida ausencia de errores de hidratación.
- [ ] Los controles de teclado de escritorio siguen funcionando en los cuatro juegos.

---

## Decisions

- **Sí:** botones virtuales en pantalla. **No:** gestos (swipe/tap/arrastre), que no cubren bien `asteroides` (girar, empujar y disparar a la vez).
- **Sí:** overlay React que emite `KeyboardEvent` sintéticos en `window`. **No:** tocar los motores ni ampliar `games/types.ts`; se conservan como TypeScript puro y sin conocimiento del táctil.
- **Sí:** mapeo por `KeyboardEvent.code`, que es lo único que leen los cuatro motores. **No:** inventar eventos propios.
- **Sí:** modo `repeat` en `tetris` porque su `input.ts` depende del auto-repeat del teclado. **No:** un `keydown` único que obligaría a pulsar una vez por casilla.
- **Sí:** `Space` de `asteroides` como `tap` (`keydown` + `keyup`). **No:** `hold`, que solo dispararía una vez hasta soltar y no reiniciaría `pressed()`.
- **Sí:** mostrar el overlay solo con `(pointer: coarse)`, leído con `useSyncExternalStore` y snapshot de servidor `false`. **No:** detectar por user agent ni leer `matchMedia` en el render (rompe la hidratación).
- **Sí:** `touch-action`, `overscroll-behavior` y `user-select` por CSS en el reproductor. **No:** `maximum-scale=1` / `user-scalable=no` global, que dañaría la accesibilidad en el resto del sitio.
- **Sí:** pausa automática con `visibilitychange`, también en escritorio. **No:** reanudar sola al volver; el jugador usa `REANUDAR`.
- **Sí:** controles bajo el canvas en vertical y a los lados en horizontal bajo. **No:** sobreponerlos sobre el canvas, que taparía el juego en 360 px de ancho.
- **Sí:** solo el reproductor y su modal. **No:** rediseñar biblioteca, home y nav para móvil; va en otra spec.
- **Sí:** `bun`, sin dependencias nuevas, sin migraciones.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| iOS Safari ignora `touch-action` parcialmente y hace zoom con doble toque | `touch-action: manipulation` en el reproductor, `none` en canvas y botones, y prueba en dispositivo real (paso 7) |
| Menú contextual o selección de texto al mantener un botón | `onContextMenu` con `preventDefault`, `user-select: none`, `-webkit-touch-callout: none` |
| Tecla retenida si el sistema cancela el toque (llamada, gesto del sistema) | `pointercancel` y `lostpointercapture` llaman a `releaseAll()`; `visibilitychange` pausa el juego |
| `matchMedia` en render rompe la hidratación con `cacheComponents` | `useSyncExternalStore` con snapshot de servidor `false`; el overlay aparece tras hidratar |
| Teclados sintéticos afectan a otros listeners de `window` (por ejemplo atajos de la página) | Solo se emiten mientras el reproductor está montado; los motores son los únicos listeners de teclas de juego |
| Arkanoid también escucha `mousemove`: los toques generan eventos de ratón emulados que mueven la paleta | Se acepta: es el mismo comportamiento que con ratón; si interfiere con los botones, se documenta y se resuelve en otra spec de gestos |
| Un dispositivo híbrido (portátil táctil con ratón) no muestra el overlay | `(pointer: coarse)` evalúa el puntero principal; el teclado sigue funcionando. Se acepta; un toggle manual va en otra spec |
| `next dev` bloquea el origen de la IP de red local | Añadir la IP a `allowedDevOrigins` solo de forma local y no commitearlo (hay un cambio sin commitear en `next.config.ts`; no mezclarlo) |
| Texto del HUD y modal desborda a 360 px | Criterio de aceptación explícito a 360 px y revisión en emulación |

---

## What is **not** in this spec

- Gestos táctiles y arrastre analógico de la paleta de Arkanoid.
- Cambios en motores, contrato `games/types.ts` o registro.
- Háptica, sonido, giroscopio, pantalla completa, bloqueo de orientación, PWA y gamepad.
- Rediseño móvil de biblioteca, home, navegación y Salón de la Fama.
- Toggle manual para mostrar u ocultar controles táctiles.
- Cambios en base de datos, `submitScore` o leaderboard.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
