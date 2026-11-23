# SPEC NN — Juego <TITLE> en canvas con leaderboard

> **Status:** Borrador
> **Depends on:** SPEC 01, SPEC 02, SPEC 04, SPEC 06, SPEC 07
> **Date:** <YYYY-MM-DD>
> **Objective:** <una frase: portar/crear el juego <TITLE> como motor de canvas en `games/<id>/`, registrado en la plataforma, con leaderboard real en Supabase.>

---

## Por qué existe esta spec

<Contexto: de dónde viene el juego (`references/started-games/<dir>` o diseño propio), qué estado tiene hoy en el catálogo (inexistente o simulador mock) y por qué se agrega ahora. La infraestructura genérica (SPEC 06: motor/registro/GamePlayer; SPEC 07: games/scores/leaderboard) ya existe y no se modifica.>

Decisiones ya tomadas por el usuario, no se reabren:

- <id oficial: `<id>`, título `<TITLE>`.>
- <Reemplaza un mock o es nuevo.>
- <Mapeo a eventos: qué significan vidas y nivel.>
- <Controles: solo teclado, etc.>

---

## Scope

**In:**

- Motor en `games/<id>/` (TypeScript puro, sin React, sin dependencias): <entidades, constantes, entrada, bucle>, <reglas/velocidades/puntos idénticos al original si es port>. Canvas lógico <W×H>.
- Registro en `games/registry.ts`: `<id>: () => import("./<id>")`.
- Entrada en `lib/games.ts` y portada `.cover-<id>` en `app/globals.css`.
- Migración `supabase/migrations/<timestamp>_add_game_<id>.sql` que inserta `<id>` en `public.games`; regenerar tipos con `bun run db:types`.
- Verificación manual completa (no hay tests automatizados).

**Out of scope (para futuras specs):**

- Controles táctiles (si aplica), sonido, nuevos power-ups o rebalanceo.
- Cambios en `GamePlayer`, `submitScore`, `lib/leaderboard.ts`, `/salon`, `/games/[id]`: se activan solos.
- Anti-trampas, auth, estadísticas reales de `best`/`plays`.
- Portar otros juegos de `references/`.
- Tests automatizados.

---

## Data model

Sin tablas nuevas. Solo una fila en `games`:

```sql
-- supabase/migrations/<timestamp>_add_game_<id>.sql
insert into public.games (id, title) values ('<id>', '<TITLE>');
```

Entrada de catálogo:

```ts
{
  id: "<id>",
  title: "<TITLE>",
  short: "<...>",
  long: "<...>",
  cat: "<CAT>",
  cover: "cover-<id>",
  color: "<color>",
  best: 0,
  plays: "0",
}
```

Estructura de archivos:

```
games/<id>/
  index.ts       // createGame: estado, update, draw, bucle, eventos
  constants.ts   // <...>
  utils.ts       // <...>
  input.ts       // listeners con dispose() y reset()
  entities.ts    // <...>
```

Reglas de emisión de eventos (contrato `games/types.ts`):

- `onScore`, `onLives`, `onLevel` solo al cambiar (más emisión inicial y tras `restart()`).
- `onGameOver({ score, level })` una sola vez por partida. <Condición exacta de fin.>
- El canvas no dibuja "GAME OVER" ni reinicia por teclado; lo hace React.
- <Mapeo de vidas/nivel si el juego no los tiene de forma natural.>

---

## Implementation plan

Antes de empezar, leer `node_modules/next/dist/docs/01-app/` (Client Components, `cacheComponents`) y usar `/frontend-design` para la portada.

1. **Núcleo del motor.** `constants.ts`, `utils.ts`, `input.ts` (`preventDefault`, `dispose()`, `reset()`). Verificación: `bunx tsc --noEmit` y `bun run lint`.
2. **Entidades.** `entities.ts` con `draw(ctx)` por parámetro. <Detalle por entidad.> Verificación: `tsc` y lint.
3. **Motor.** `index.ts` con `createGame(canvas, events)`, `update`, `draw` con HUD dibujado, rAF con `dt` capado, `pause/resume/restart/destroy` y los cuatro eventos. Quitar overlays de GAME OVER/pausa y reinicio por tecla del original. Verificación: `tsc` y lint.
4. **Registro.** Añadir `<id>` a `GAME_ENGINES`. Verificación: `tsc`.
5. **Catálogo y portada.** Entrada en `lib/games.ts` y `.cover-<id>` en `app/globals.css`. Verificación: `/games` lista el juego y `/games/<id>` responde 200.
6. **Base de datos.** Crear y aplicar la migración (CLI `bunx supabase db push` o MCP `apply_migration`), `bun run db:types`. Verificación: `select * from games` incluye `<id>`; `get_advisors` (security) sin errores nuevos.
7. **Revisión manual.** Con `bun run dev`: jugar `/games/<id>/jugar` completo, pausar/reanudar, perder, modal, guardar puntaje, jugar de nuevo, salir y volver; ver fila en `scores` (`execute_sql`); ver `/games/<id>` y `/salon` (GLOBAL y pestaña del juego); comprobar que los demás juegos siguen igual. Borrar filas de prueba de `scores`.
8. **Cierre.** `bun run lint` y `bun run build` sin errores ni warnings.

---

## Acceptance criteria

- [ ] `bun run lint`, `bunx tsc --noEmit` y `bun run build` terminan con código 0 y sin warnings.
- [ ] `GAME_ENGINES` contiene `<id>`; ningún archivo de `games/<id>/` importa fuera de su carpeta (salvo tipos de `../types`) ni usa React.
- [ ] `lib/games.ts` contiene `{ id: "<id>", title: "<TITLE>" }` y la portada `cover-<id>` es propia.
- [ ] `public.games` contiene la fila `<id>` y la migración está aplicada al proyecto remoto.
- [ ] `/games/<id>/jugar` muestra un `<canvas>` de <W×H> lógicos en `crt-screen` con el juego y el HUD dibujado.
- [ ] <Criterios de reglas de puntaje específicas (valores exactos).>
- [ ] Puntaje, vidas y nivel del HUD de React coinciden con los del canvas.
- [ ] `PAUSA` detiene todo (incluidos cronómetros) y `REANUDAR` continúa sin teclas fantasma.
- [ ] Al terminar aparece el modal de React una sola vez con el puntaje correcto; el canvas no dibuja "GAME OVER".
- [ ] `JUGAR DE NUEVO` reinicia (puntaje 0, estado inicial) sin duplicar bucle ni listeners.
- [ ] Guardar puntaje crea fila en `scores` con `game_id = '<id>'` y `user_id` nulo.
- [ ] `/games/<id>` muestra top 10 real (una fila por `player_name`) y `/salon` muestra la pestaña `<TITLE>` (top 20) y el juego aparece en GLOBAL.
- [ ] Teclas del juego no hacen scroll; `destroy()` se ejecuta al salir y volver crea una sola instancia.
- [ ] Los demás juegos (mock y reales) siguen igual.
- [ ] Sin errores ni warnings en consola ni en `next dev`.
- [ ] `git status` sin cambios en `references/` ni secretos.

---

## Decisions

- **Sí:** motor TS puro con `createGame(canvas, events)`; el canvas notifica y React no lee el estado. **No:** bucle dentro de React.
- **Sí:** pausa y modal de fin en React. **No:** overlays ni reinicio por tecla en el canvas.
- **Sí:** reutilizar `GamePlayer`, `submitScore` y leaderboard sin cambios. **No:** componentes duplicados.
- **Sí:** migración mínima (solo insertar en `games`). **No:** tocar vistas ni RLS.
- **Sí:** portada propia. **No:** reutilizar la de otro juego.
- <Decisiones propias del juego.>
- **Sí:** `bun`, sin dependencias nuevas.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Strict Mode duplica bucle y listeners | `destroy()` en cleanup; criterio de una sola instancia |
| `cacheComponents` y `window`/`canvas` en render | El motor solo corre dentro de `useEffect` |
| Teclas retenidas al pausar | `pause()` llama `input.reset()` |
| `onGameOver` duplicado | El estado `gameover` corta `update`; emisión solo al transicionar |
| Canvas deformado por CSS | Usar relación 4:3 |
| <Riesgos propios> | <...> |

---

## What is **not** in this spec

- <Lista de lo excluido, como en Scope>

Cada uno de ellos, si se hace, va en su propia spec.
