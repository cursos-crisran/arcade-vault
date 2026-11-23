# SPEC 10 — Mostrar solo juegos funcionales en biblioteca, home y Salón de la Fama

> **Status:** Implementado
> **Depends on:** SPEC 02, SPEC 06, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-11-23
> **Objective:** Mostrar en la biblioteca, el home y el Salón de la Fama (y permitir abrir por URL) únicamente los juegos que tienen fila en la tabla `games` de Supabase y motor registrado en `GAME_ENGINES`, y eliminar del catálogo las 8 entradas mock.

---

## Por qué existe esta spec

Hoy la plataforma lista 11 juegos, pero solo 3 funcionan de verdad (`asteroides`, `tetris`, `arkanoid`): tienen motor en `games/registry.ts` y fila en `public.games`. Los otros 8 (`bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) son mocks que simulan una partida y muestran puntajes falsos de `seededScores()`. La biblioteca, el home y las pestañas del Salón los siguen mostrando como si existieran. Esta spec alinea lo que ve el jugador con lo que realmente se puede jugar.

Decisiones ya tomadas por el usuario, no se reabren:

- "Funcional" = fila en `games` **Y** motor en `GAME_ENGINES`. Ambas condiciones.
- El filtro aplica a: biblioteca (`/games`), Salón de la Fama (`/salon`), home (sección "JUEGOS DISPONIBLES AHORA") y chips de categoría de la biblioteca.
- Un juego no funcional abierto por URL directa responde 404.
- Se borran las 8 entradas mock de `lib/games.ts`. Al portar un juego futuro se crea su entrada de nuevo (según el flujo de la skill `new-game`).

Contexto verificado al escribirla:

- `getRealGameIds()` en `lib/leaderboard.ts` ya devuelve los ids de `games`. `/salon`, `/games/[id]` y `/games/[id]/jugar` ya lo usan para distinguir real de mock.
- `components/library.tsx`, `components/home.tsx` y `components/hall-of-fame.tsx` son Client Components que importan `GAMES` directo, sin saber qué es funcional.
- `createClient()` usa `cookies()`: con `cacheComponents: true` toda lectura de Supabase va dentro de `<Suspense>`.

---

## Scope

**In:**

- `lib/functional-games.ts` (solo servidor) con la única definición de "funcional": `getFunctionalGames()`, `isFunctionalGame(id)` y `getCategories(games)`.
- Borrar las 8 entradas mock de `GAMES` en `lib/games.ts` (quedan `asteroides`, `tetris`, `arkanoid`).
- `/games`: Server Component con `<Suspense>` que carga los juegos funcionales y los pasa por props a `Library`; los chips de categoría salen de esos juegos.
- Home (`/`): mismo patrón; la sección "JUEGOS DISPONIBLES AHORA" muestra solo funcionales.
- `/salon`: pestañas solo para juegos funcionales; sin pestañas mock, sin `seededScores` y sin la fila falsa "TU MEJOR MARCA".
- `/games/[id]` y `/games/[id]/jugar`: `notFound()` si el juego no es funcional; sin rama mock (`seededScores`).
- `GamePlayer`: quitar `persistScores` y el mensaje "MODO DEMO" (todo juego que llega es funcional y guarda) y la rama del simulador de puntaje.
- `lib/scores.ts`: eliminar `seededScores` y su lista `PLAYERS`; conservar el tipo `ScoreRow`.
- Verificación manual (no hay tests automatizados).

**Out of scope (para futuras specs):**

- Datos falsos del home que nombran juegos mock: `RECENT_SCORES`, `TOP_PLAYERS`, `STATS` en `lib/home.ts`.
- Borrar las clases CSS de portadas mock (`.cover-bricks`, `.cover-tetro`, `.cover-snake`, `.cover-glot`, `.cover-invaders`, `.cover-rocas`, etc.) de `app/globals.css`.
- Cambios en la base de datos, migraciones o `lib/supabase/database.types.ts`.
- Cambios en los motores (`games/*`), `submitScore`, vistas del leaderboard o `lib/leaderboard.ts`.
- Estadísticas reales de `best` y `plays`.
- Portar los 8 juegos mock.
- Tests automatizados.

---

## Data model

Sin tablas ni columnas nuevas. Solo un módulo nuevo que define "funcional" en un único lugar:

```ts
// lib/functional-games.ts (solo servidor; usa createClient() → cookies())
import type { Game, GameCategory } from "@/lib/games";

// GAMES ∩ filas de `games` ∩ claves de GAME_ENGINES, en el orden de GAMES.
export async function getFunctionalGames(): Promise<Game[]>;
export async function isFunctionalGame(id: string): Promise<boolean>;

// Categorías con al menos un juego, en el orden de CATS, precedidas por "TODOS".
export function getCategories(games: Game[]): ["TODOS", ...GameCategory[]];
```

Cambios en estructuras existentes:

- `GAMES` en `lib/games.ts`: de 11 a 3 entradas (`asteroides`, `tetris`, `arkanoid`). `CATS` y `getGame` se mantienen (`CATS` define el orden de las categorías).
- `Library` recibe `games: Game[]`; `Home` recibe `games: Game[]`; `HallOfFame` recibe `games: Game[]` además de `globalRows` y `byGame`.
- `GamePlayer` pierde la prop `persistScores`.

Reglas:

- Funcional = `id` en `games` **y** `id in GAME_ENGINES` **y** entrada en `GAMES` (sin entrada no hay título ni portada que mostrar).
- Los ids de la BD sin motor, o con motor pero sin fila, no aparecen.
- El orden de las listas es el de `GAMES`.

Archivos que aparecen o cambian:

```
lib/functional-games.ts              // nuevo
lib/games.ts                         // 8 entradas mock borradas
lib/scores.ts                        // sin seededScores; conserva ScoreRow
app/page.tsx                         // Suspense + carga de juegos funcionales
components/home.tsx                  // recibe games por props
app/games/page.tsx                   // Suspense + carga de juegos funcionales
components/library.tsx               // recibe games por props; chips dinámicos
app/salon/page.tsx                   // pasa games y byGame solo de funcionales
components/hall-of-fame.tsx          // pestañas desde games; sin mock ni "TU MEJOR MARCA"
app/games/[id]/page.tsx              // notFound si no funcional; sin seededScores
app/games/[id]/jugar/page.tsx        // notFound si no funcional; sin persistScores
components/game-player.tsx           // sin persistScores, sin demo ni simulador
```

---

## Implementation plan

Antes de empezar, leer en `node_modules/next/dist/docs/01-app/` la guía de `cacheComponents` (datos dinámicos y `<Suspense>`) y la de Server/Client Components (pasar props de servidor a cliente). Usar `/frontend-design` solo si cambia algo visual (el estado vacío y los chips no deberían cambiar de estilo).

1. **Definición de funcional.** Crear `lib/functional-games.ts` con `getFunctionalGames`, `isFunctionalGame` y `getCategories`, apoyándose en `getRealGameIds()`, `GAMES` y las claves de `GAME_ENGINES`. Verificación: `bunx tsc --noEmit` y `bun run lint`.
2. **Biblioteca.** `app/games/page.tsx` pasa a Server Component con `<Suspense fallback={<PageLoading />}>` que carga `getFunctionalGames()`. `Library` recibe `games` y calcula los chips con `getCategories(games)` (importado como función pura sin tocar Supabase; si el módulo del paso 1 mezcla servidor y cliente, mover `getCategories` a `lib/games.ts`). Verificación: `/games` lista 3 juegos y el catálogo mock sigue en `lib/games.ts` todavía; ningún mock aparece.
3. **Home.** `app/page.tsx` carga los juegos funcionales dentro de `<Suspense>` y los pasa a `Home`; la sección de juegos usa `games.slice(0, 6)`. Verificación: el home muestra 3 `MiniCard`.
4. **Detalle y jugar.** En `app/games/[id]/page.tsx` y `app/games/[id]/jugar/page.tsx`, llamar `notFound()` si `!getGame(id) || !(await isFunctionalGame(id))`. Quitar `seededScores` y la rama mock del detalle. Verificación: `/games/arkanoid` y `/games/arkanoid/jugar` responden 200 con su top 10 real.
5. **Salón de la Fama.** `app/salon/page.tsx` usa `getFunctionalGames()` para decidir las pestañas y consultar `getGameLeaderboard` solo de esos ids. `HallOfFame` recibe `games`, renderiza una pestaña por juego funcional, elimina `seededScores`, `mockRows`, `showYou` y la fila "TU MEJOR MARCA". Verificación: `/salon` muestra GLOBAL + ASTEROIDES + TETRIS + ARKANOID y nada falso.
6. **GamePlayer.** Quitar la prop `persistScores`, el bloque "MODO DEMO" y la rama del simulador de puntaje/vidas/nivel. Ajustar `jugar/page.tsx` a la nueva firma. Verificación: `tsc` y lint; jugar y guardar un puntaje sigue funcionando.
7. **Limpiar el catálogo mock.** Borrar las 8 entradas mock de `lib/games.ts` y `seededScores` + `PLAYERS` de `lib/scores.ts` (mantener `ScoreRow`). Verificación: `bunx tsc --noEmit` sin errores y `grep -rn "seededScores" app components lib` sin resultados.
8. **Revisión manual.** Con `bun run dev` recorrer `/`, `/games` (buscar "CAÍDA", filtrar por categorías), `/salon` (todas las pestañas), `/games/caida`, `/games/caida/jugar` y los 3 juegos funcionales (jugar y guardar un puntaje). Probar la condición doble: quitar temporalmente `tetris` de `GAME_ENGINES` y confirmar que desaparece de biblioteca, home y Salón; restaurarlo. Borrar cualquier fila de prueba de `scores`.
9. **Cierre.** `bun run lint` y `bun run build` sin errores ni warnings.

---

## Acceptance criteria

- [ ] `lib/games.ts` contiene exactamente 3 juegos: `asteroides`, `tetris` y `arkanoid`.
- [ ] `/games` lista exactamente 3 tarjetas: ASTEROIDES, TETRIS y ARKANOID.
- [ ] Buscar "CAÍDA" o "BLOQUE BUSTER" en la biblioteca muestra "NO HAY RESULTADOS".
- [ ] Los chips de categoría de `/games` son `TODOS`, `ARCADE`, `PUZZLE` y `SHOOTER`; `VERSUS` no aparece.
- [ ] La sección "JUEGOS DISPONIBLES AHORA" del home muestra 3 tarjetas, todas con enlace a un juego funcional.
- [ ] `/salon` muestra las pestañas `GLOBAL`, `ASTEROIDES`, `TETRIS` y `ARKANOID`, y ninguna otra.
- [ ] Ninguna pestaña de `/salon` muestra filas falsas ni "TU MEJOR MARCA"; sin puntajes muestra "SIN PUNTUACIONES AÚN".
- [ ] `/games/caida`, `/games/bloque-buster` y `/games/caida/jugar` renderizan la página 404 (`notFound()` con `noindex`). El código HTTP de la petición puede ser 200: con `cacheComponents` la cabecera sale antes de resolver el `<Suspense>`.
- [ ] `/games/asteroides`, `/games/tetris` y `/games/arkanoid` y sus rutas `/jugar` responden 200; guardar un puntaje sigue creando la fila en `scores`.
- [ ] Quitar temporalmente `tetris` de `GAME_ENGINES` hace que TETRIS desaparezca de `/games`, del home y de las pestañas de `/salon`; al restaurarlo vuelve.
- [ ] `grep -rn "seededScores\|persistScores" app components lib games` no devuelve resultados.
- [ ] `lib/functional-games.ts` es la única definición de "funcional" (ningún otro archivo repite la intersección BD ∩ motor).
- [ ] `bun run lint`, `bunx tsc --noEmit` y `bun run build` terminan con código 0 y sin warnings.
- [ ] La consola del navegador y `next dev` no muestran errores ni warnings en `/`, `/games`, `/salon` y las páginas de los 3 juegos.
- [ ] `git status` no muestra cambios en `supabase/`, `games/` ni `lib/supabase/`.

---

## Decisions

- **Sí:** funcional = fila en `games` **y** motor en `GAME_ENGINES`. **No:** solo BD (un juego sin motor aparecería y no se podría jugar) ni solo motor (sin fila no se guarda el puntaje).
- **Sí:** una sola función `getFunctionalGames()` en `lib/functional-games.ts`, usada por todas las pantallas. **No:** repetir la lógica en cada página.
- **Sí:** el filtrado se hace en el servidor (Server Component + `<Suspense>`) y se pasan `games` por props a los Client Components. **No:** `fetch` desde el cliente ni exponer Supabase al navegador.
- **Sí:** filtro en biblioteca, home, chips de categoría y Salón. **No:** dejar el home con mocks, porque contradice "JUEGOS DISPONIBLES AHORA".
- **Sí:** 404 por URL directa para juegos no funcionales. **No:** mantener las páginas mock accesibles; los listados y las URLs deben decir lo mismo.
- **Sí:** borrar las 8 entradas mock de `lib/games.ts`. **No:** conservarlas filtradas; el usuario prefirió un catálogo limpio y aceptó volver a crear la entrada al portar cada juego (flujo de la skill `new-game`).
- **Sí:** borrar `seededScores`, la rama mock de `/salon` y `/games/[id]`, `persistScores` y el simulador de `GamePlayer`: quedan sin uso. **No:** dejar código muerto.
- **Sí:** los chips de categoría salen de los juegos funcionales (`VERSUS` desaparece). **No:** chips que filtran a "NO HAY RESULTADOS".
- **Sí:** dejar fuera de esta spec los datos falsos de `lib/home.ts` y el CSS de portadas mock. Son decoración independiente del catálogo; limpiarlos mezclaría dos cambios.
- **Sí:** `bun`, sin dependencias nuevas, sin migraciones.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| `getRealGameIds()` falla (red o Supabase caído) y `/`, `/games` y `/salon` rompen en conjunto | Ya es el comportamiento de `/salon` y `/games/[id]`. Se mantiene el `error.tsx` existente; mejorar el degradado va en otra spec. |
| `createClient()` usa `cookies()` y rompe el build con `cacheComponents` si se llama fuera de `<Suspense>` | Cada página carga los juegos dentro de `<Suspense>`; se valida con `bun run build`. |
| Importar `games/registry.ts` en código de servidor arrastra los motores al bundle | El registro solo contiene `import()` dinámicos perezosos; solo se leen sus claves. Se confirma con `bun run build`. |
| El home pasa a depender de Supabase y deja de ser estático | Es aceptado: la fuente de verdad es la BD. `<Suspense>` con `PageLoading` evita bloquear el render. |
| El Salón global puede mostrar puntajes de un juego con fila en BD pero sin motor | Improbable hoy (los 3 juegos tienen ambas cosas). La vista `leaderboard_global` no se toca; se reevalúa si aparece el caso. |
| Borrar entradas mock pierde `long`, `short` y `cover` de esos juegos | Quedan en el historial de git; la skill `new-game` recrea la entrada al portar cada uno. |
| Estado de categoría del chip activo queda inválido | Los chips y el estado inicial (`TODOS`) salen de los mismos `games`; `TODOS` siempre existe. |

---

## What is **not** in this spec

- Datos falsos del home (`RECENT_SCORES`, `TOP_PLAYERS`, `STATS`).
- Eliminar el CSS de portadas mock.
- Migraciones, cambios de esquema o de tipos de Supabase.
- Cambios en los motores, `submitScore` o las vistas del leaderboard.
- Portar los 8 juegos mock.
- Estadísticas reales de `best` y `plays`.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
