# SPEC JAM-paletas-02 — Integración de PALETAS en la plataforma y leaderboard

> **Status:** Borrador
> **Depends on:** SPEC JAM-paletas-01, SPEC 06, SPEC 07, SPEC 10
> **Date:** 2026-11-25
> **Objective:** Registrar el motor `paletas` en `GAME_ENGINES`, añadirlo al catálogo como primer juego `VERSUS` con portada propia `.cover-paletas`, insertar su fila en `public.games` mediante migración y verificar de punta a punta juego, guardado de puntaje, detalle y Salón de la Fama.

---

## Por qué existe esta spec

Un juego solo es "funcional" (`lib/functional-games.ts`) si está en `GAMES`, en la tabla `games` y en `GAME_ENGINES`. JAM-paletas-01 crea el motor; esta spec lo conecta. Es el primer juego de categoría `VERSUS`, así que `getCategories` mostrará por primera vez el filtro VERSUS en `/games` sin cambiar código (la categoría ya existe en `GameCategory` y `CATS`). `GamePlayer`, `submitScore`, `lib/leaderboard.ts`, `/games/[id]` y `/salon` se activan solos.

Decisiones ya tomadas, no se reabren:

- Id `paletas`, título `PALETAS`, `cat: "VERSUS"`, `color: "cyan"`, `cover: "cover-paletas"`, `best: 0`, `plays: "0"`.
- Sin assets de imagen ni sonido: `public/games/paletas/` **no se crea**. Nada referencia `references/`.
- Migración mínima: solo `insert` en `public.games`.

---

## Scope

**In:**

- `games/registry.ts`: `paletas: () => import("./paletas")`.
- Entrada en `lib/games.ts` (al final del array `GAMES`).
- Clase `.cover-paletas` en `app/globals.css`, diseñada con `/frontend-design`.
- Migración `supabase/migrations/<timestamp>_add_game_paletas.sql` aplicada al proyecto remoto y `bun run db:types`.
- Verificación manual de `/games`, `/games/paletas`, `/games/paletas/jugar` y `/salon`.

**Out of scope (para futuras specs):**

- Cambios en el motor (JAM-paletas-01).
- Cambios en `GamePlayer`, `submitScore`, `lib/leaderboard.ts`, `lib/home.ts`, vistas, RLS o `submit_score`.
- Estadísticas reales de `best` y `plays`, anti-trampas, auth.
- Tests automatizados.

---

## Data model

Sin tablas nuevas. Una fila en `games`:

```sql
-- supabase/migrations/<timestamp>_add_game_paletas.sql
insert into public.games (id, title) values ('paletas', 'PALETAS');
```

`<timestamp>` con el formato `YYYYMMDDHHMMSS` de las migraciones existentes y posterior a la última.

Entrada de catálogo (nuevo elemento al final de `GAMES` en `lib/games.ts`):

```ts
{
  id: "paletas",
  title: "PALETAS",
  short: "Duelo de paletas de neón contra una CPU que no deja de acelerar.",
  long: "Mueve tu paleta con las flechas o W/S y devuelve la pelota a la CPU. Pulsa espacio justo antes del golpe para rematar y el efecto de tu paleta curva el tiro. Cada punto ganado suma según el nivel y tu racha; cada 5 puntos la CPU se vuelve más rápida. Puedes conceder 5 puntos: gana 50 para cerrar el campeonato con bonus.",
  cat: "VERSUS",
  cover: "cover-paletas",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

Registro:

```ts
// games/registry.ts (añadir al objeto)
paletas: () => import("./paletas"),
```

Portada `.cover-paletas` (`app/globals.css`), lineamientos para `/frontend-design`:

- Solo CSS (gradientes, `box-shadow`, pseudo-elementos `::before`/`::after`); sin imágenes externas.
- Fondo oscuro `#05060f` con rejilla tenue; red central discontinua vertical; paleta cian (`#00f0ff`) a la izquierda y paleta magenta (`#ff3df0`) a la derecha con resplandor; pelota blanca con estela magenta en diagonal.
- Debe verse bien en la tarjeta de `/games`, en el detalle y en la home, igual que las demás portadas; no reutilizar ni modificar `.cover-asteroides`, `.cover-tetris`, `.cover-arkanoid` ni `.cover-snake`.

Estructura de archivos tocados:

```
games/registry.ts                                  // +1 línea
lib/games.ts                                       // +1 objeto
app/globals.css                                    // +.cover-paletas
supabase/migrations/<timestamp>_add_game_paletas.sql
lib/supabase/database.types.ts                     // regenerado
```

---

## Implementation plan

Antes de empezar: leer `node_modules/next/dist/docs/01-app/` (Client Components, `cacheComponents`), invocar `/supabase` antes de la migración y `/frontend-design` para la portada.

1. **Registro.** Añadir `paletas` a `GAME_ENGINES`. Verificación: `bunx tsc --noEmit` (requiere `games/paletas/index.ts` de JAM-paletas-01).
2. **Catálogo.** Añadir la entrada a `lib/games.ts`. Verificación: `tsc`; `getCategories(GAMES)` incluye `"VERSUS"`.
3. **Portada.** Diseñar `.cover-paletas` con `/frontend-design`. Verificación: `/games` muestra la tarjeta con portada propia y sin errores de CSS en consola.
4. **Base de datos.** Crear la migración, aplicarla (`bunx supabase db push` o MCP `apply_migration`) y ejecutar `bun run db:types`. Verificación: `select * from public.games where id = 'paletas'` devuelve una fila; `get_advisors` (security) sin avisos nuevos.
5. **Revisión manual.** Con `bun run dev`:
   - `/games`: aparece el filtro VERSUS y al elegirlo solo se lista PALETAS.
   - `/games/paletas/jugar`: jugar una partida completa (mover, golpear con borde y centro, rematar, ganar puntos con racha, subir de nivel, conceder 5 puntos). Pausar/reanudar. Ver el modal de fin una sola vez, guardar puntaje y `JUGAR DE NUEVO`. Salir y volver.
   - Revisar la fila con `execute_sql`: `game_id = 'paletas'`, `user_id` nulo.
   - `/games/paletas`: top 10 real. `/salon`: pestaña PALETAS (top 20) y presencia en GLOBAL.
   - Confirmar que `asteroides`, `tetris`, `arkanoid` y `snake` no cambian.
   - Borrar las filas de prueba de `scores`.
6. **Cierre.** `bun run lint` y `bun run build` sin errores ni warnings; `git status` sin cambios en `references/`.

---

## Acceptance criteria

- [ ] `bun run lint`, `bunx tsc --noEmit` y `bun run build` terminan con código 0 y sin warnings.
- [ ] `GAME_ENGINES` contiene `paletas` con import dinámico.
- [ ] `lib/games.ts` contiene `{ id: "paletas", title: "PALETAS", cat: "VERSUS", color: "cyan", cover: "cover-paletas" }`.
- [ ] `app/globals.css` define `.cover-paletas` propia y no altera las otras portadas.
- [ ] La migración `<timestamp>_add_game_paletas.sql` existe, está aplicada y `public.games` tiene la fila `paletas`; `database.types.ts` regenerado.
- [ ] `/games` muestra el filtro VERSUS con PALETAS; la home y la biblioteca lo listan como juego funcional.
- [ ] `/games/paletas/jugar` monta el canvas 800×600 en `crt-screen` sin deformación; el HUD de React (puntaje, vidas, nivel) coincide con el del canvas.
- [ ] Al terminar aparece el modal una sola vez; guardar crea una fila en `scores` con `game_id = 'paletas'` y `user_id` nulo.
- [ ] `/games/paletas` muestra el top 10 real y `/salon` la pestaña PALETAS (top 20) y el juego en GLOBAL.
- [ ] Salir y volver crea una sola instancia (sin listeners ni bucles duplicados).
- [ ] Los demás juegos siguen igual; sin errores en consola ni en `next dev`.
- [ ] Ningún archivo referencia `references/`; no existe `public/games/paletas/`.
- [ ] Filas de prueba de `scores` borradas.

---

## Decisions

- **Sí:** primer juego `VERSUS`, sin tocar `GameCategory` ni `CATS`. **No:** crear una categoría nueva.
- **Sí:** color `cyan` (paleta del jugador). **No:** `magenta`, ya usado por `tetris` y `arkanoid`.
- **Sí:** portada solo CSS con `/frontend-design`. **No:** imágenes en la portada.
- **Sí:** sin carpeta `public/games/paletas/` porque el motor no usa assets. **No:** crear la carpeta vacía.
- **Sí:** migración de una sola línea `insert`. **No:** tocar vistas, RLS o `submit_score` (el máximo 55 250 cabe en el tope de 10 000 000).
- **Sí:** reutilizar `GamePlayer`, `submitScore` y leaderboard. **No:** componentes específicos de PALETAS.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Juego en `GAMES` pero sin fila en `games` → 404 por `functional-games` | Paso 4 antes de la revisión manual; verificar con `select` |
| Timestamp de migración anterior a otra existente | Usar un timestamp posterior a la última migración del directorio |
| Tipos de Supabase desactualizados | `bun run db:types` tras aplicar la migración |
| Filtro VERSUS rompe el layout de categorías al aparecer por primera vez | Revisar `/games` en ancho de escritorio y móvil en el paso 5 |
| Portada choca visualmente con otras | `/frontend-design` y revisión junto a las otras tarjetas |
| `cacheComponents` y motor importado en servidor | Solo se carga por `GAME_ENGINES` dentro de `GamePlayer` (cliente) |
| Filas de prueba en el leaderboard real | Borrarlas al final del paso 5 |

---

## What is **not** in this spec

- Lógica del motor (JAM-paletas-01).
- Cambios en `GamePlayer`, `submitScore`, leaderboard, `/salon`, `/games/[id]` o `lib/home.ts`.
- Assets, sonido, estadísticas reales de `best`/`plays`, auth y anti-trampas.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
