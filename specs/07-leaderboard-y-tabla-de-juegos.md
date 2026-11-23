# SPEC 07 — Leaderboard por juego y global con tabla de juegos en Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 02, SPEC 04, SPEC 06
> **Date:** 2026-11-23
> **Objective:** Crear en Supabase las tablas `games` y `scores` (con `user_id` opcional) y conectarlas a un leaderboard por juego (top 10 en `/games/[id]`, top 20 en `/salon`) y a uno global en `/salon`, con el juego ASTEROIDES guardando sus puntajes reales.

---

## Por qué existe esta spec

Hoy los rankings son falsos: `lib/scores.ts` genera filas con `seededScores()` y el modal de fin de juego escribe en `localStorage` (`av_scores`), que nadie lee. Las páginas existen (`/salon` con `components/hall-of-fame.tsx` y el aside de `/games/[id]`), pero no están conectadas a datos. La SPEC 04 dejó Supabase integrado sin tablas y la SPEC 06 dejó un juego real (`asteroides`) que notifica `onGameOver`. Esta spec une las tres piezas.

Decisiones ya tomadas por el usuario, no se reabren:

- La tabla de juegos (`games`) y el leaderboard (`scores`) van juntos en esta spec.
- Cada juego tiene su propio top N y además existe uno global.
- `games` guarda solo los juegos que realmente existen. Hoy: solo `asteroides`.
- Columnas de `scores`: `id`, `game_id`, `player_name`, `score`, `created_at`, más `user_id` opcional (nulo), porque por ahora no todo el mundo juega autenticado.
- Integración con Supabase.
- El ranking muestra el **mejor puntaje por `player_name`** y el nombre **distingue mayúsculas y minúsculas**.
- Los puntajes se insertan por Server Action con validación.

Contexto verificado al escribirla:

- `/salon` ya está enlazado desde `components/nav.tsx` y `components/home.tsx`. Lo que no está conectado es el **dato**, no la ruta.
- `GamePlayer` ya limita el nombre a 10 caracteres en mayúsculas.
- `lib/supabase/database.types.ts` no tiene tablas en `public`. El CLI (`supabase/config.toml`) está enlazado y `supabase/migrations/` está vacío.
- No existe cliente admin (`service role`) y esta spec no lo agrega.

---

## Scope

**In:**

- Migración versionada `supabase/migrations/<timestamp>_games_and_scores.sql` (aplicada al proyecto remoto con el CLI o con el MCP `apply_migration`) que crea:
  - Tabla `public.games` con una fila: `asteroides`.
  - Tabla `public.scores` con `user_id` nullable.
  - Vistas `public.leaderboard_by_game` y `public.leaderboard_global`.
  - Función `public.submit_score(...)` que valida e inserta.
  - RLS: lectura pública de `games`, `scores` y las vistas; sin política de `INSERT` directo.
- Regenerar `lib/supabase/database.types.ts` con `bun run db:types`.
- `lib/leaderboard.ts`: funciones de lectura del servidor (`getGameLeaderboard`, `getGlobalLeaderboard`, `getRealGameIds`) tipadas con `Database`.
- `app/games/actions.ts`: Server Action `submitScore` que valida y llama al RPC `submit_score`.
- `GamePlayer`: para juegos con fila en `games`, llamar a `submitScore` en vez de escribir en `av_scores`, con estados de guardado (guardando / guardado / error).
- `/games/[id]`: para juegos reales, reemplazar `seededScores` por el top 10 real; con estado vacío.
- `/salon`: pestaña `GLOBAL` (top 20 con columna de juego) más una pestaña por juego del catálogo. Los juegos reales leen de Supabase; los 8 juegos mock siguen con `seededScores`.
- Verificación manual con datos reales en el proyecto remoto.

**Out of scope (para futuras specs):**

- Auth real y vincular `user_id` a la sesión. La columna existe y queda en `NULL`.
- Anti-trampas fuertes (firma del puntaje desde el motor, Edge Function, rate limit, captcha). Solo validación de formato y rango.
- Sembrar los 8 juegos mock en `games` o escribir sus puntajes en Supabase.
- Reemplazar `game.best` y `game.plays` de `lib/games.ts` por estadísticas reales.
- Realtime (actualización en vivo del leaderboard).
- Paginación, búsqueda o filtros por fecha del ranking.
- Moderación de nombres, borrado o edición de puntajes.
- Cliente admin con `SUPABASE_SERVICE_ROLE_KEY`.
- Migrar o importar las entradas viejas de `av_scores`.
- Tests automatizados.

---

## Data model

```sql
-- supabase/migrations/<timestamp>_games_and_scores.sql

create table public.games (
  id         text primary key,          -- slug, igual al id de lib/games.ts
  title      text not null,
  created_at timestamptz not null default now()
);

insert into public.games (id, title) values ('asteroides', 'ASTEROIDES');

create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games (id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 10),
  score       integer not null check (score >= 0 and score <= 10000000),
  user_id     uuid null references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_player_idx on public.scores (player_name);
```

Vistas (mejor puntaje por `player_name`, sensible a mayúsculas, empate resuelto por el más antiguo):

```sql
-- una fila por (game_id, player_name)
create view public.leaderboard_by_game with (security_invoker = true) as
select distinct on (game_id, player_name)
       game_id, player_name, score, created_at
from public.scores
order by game_id, player_name, score desc, created_at asc;

-- una fila por player_name (mejor score en cualquier juego)
create view public.leaderboard_global with (security_invoker = true) as
select distinct on (player_name)
       player_name, game_id, score, created_at
from public.scores
order by player_name, score desc, created_at asc;
```

Las consultas del servidor ordenan y limitan sobre las vistas:

```
leaderboard_by_game: where game_id = $1 order by score desc, created_at asc limit N
leaderboard_global:  order by score desc, created_at asc limit N
```

Seguridad (RLS):

```sql
alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
-- Sin políticas de INSERT/UPDATE/DELETE: nadie escribe directo con la clave publicable.

create function public.submit_score(p_game_id text, p_player_name text, p_score integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- valida: juego existe, nombre 1–10 caracteres tras trim, score 0..10_000_000
  -- inserta con user_id = null
end;
$$;

revoke all on function public.submit_score(text, text, integer) from public;
grant execute on function public.submit_score(text, text, integer) to anon, authenticated;
```

Estructuras de código nuevas:

```ts
// lib/leaderboard.ts (solo servidor)
export type LeaderboardRow = {
  rank: number;
  playerName: string;
  score: number;
  createdAt: string;      // ISO; la UI lo formatea dd/mm/aaaa
  gameId?: string;        // solo en el global
};
export async function getRealGameIds(): Promise<string[]>;                       // select id from games
export async function getGameLeaderboard(gameId: string, limit: number): Promise<LeaderboardRow[]>;
export async function getGlobalLeaderboard(limit: number): Promise<LeaderboardRow[]>;

// app/games/actions.ts
"use server";
export type SubmitScoreResult = { ok: true } | { ok: false; error: string };
export async function submitScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<SubmitScoreResult>;
```

Constantes (en `lib/leaderboard.ts`): `GAME_TOP_N = 10` (página del juego) y `SALON_TOP_N = 20` (Salón de la Fama).

Archivos que aparecen o cambian:

```
supabase/migrations/<timestamp>_games_and_scores.sql   // nuevo
lib/supabase/database.types.ts                         // regenerado
lib/leaderboard.ts                                     // nuevo
app/games/actions.ts                                   // nuevo
app/games/[id]/page.tsx                                // top 10 real para juegos reales
app/salon/page.tsx                                     // Server Component con Suspense, carga datos
components/hall-of-fame.tsx                            // recibe datos por props; pestaña GLOBAL
components/game-player.tsx                             // guarda vía submitScore para juegos reales
components/leaderboard-list.tsx                        // nuevo: aside reutilizable (si hace falta)
```

Reglas de datos:

- Un juego es "real" si su `id` está en `games`. El resto es mock y no toca Supabase.
- `player_name` se guarda tal cual lo escribe el usuario tras `trim()` (el input ya lo pasa a mayúsculas). `Kai` y `KAI` son jugadores distintos.
- `rank` se calcula en `lib/leaderboard.ts` como posición dentro del resultado (1..N).
- `user_id` siempre `NULL` en esta spec.

---

## Implementation plan

Antes de empezar, leer en `node_modules/next/dist/docs/01-app/` las guías de Server Actions / `"use server"`, la de `cacheComponents` (datos dinámicos y `<Suspense>`) y la de `cookies()`. Leer también la skill `supabase` y `supabase-postgres-best-practices` para RLS, vistas con `security_invoker` y funciones `security definer`. Usar `frontend-design` para cualquier cambio visual (estado vacío, pestaña GLOBAL).

1. **Migración.** Crear `supabase/migrations/<timestamp>_games_and_scores.sql` con tablas, índices, vistas, RLS y `submit_score`. Aplicarla al proyecto remoto (`bunx supabase db push` o MCP `apply_migration`). Verificación: con el MCP `list_tables`, `public.games` y `public.scores` existen con RLS activo; `select * from games` devuelve `asteroides`; `get_advisors` (security) no reporta tablas sin RLS ni vistas `SECURITY DEFINER` en `public`.
2. **Tipos.** Ejecutar `bun run db:types` y versionar `lib/supabase/database.types.ts`. Verificación: el archivo contiene `games`, `scores`, las dos vistas y `submit_score`; `bunx tsc --noEmit` sin errores.
3. **Capa de lectura.** Crear `lib/leaderboard.ts` con `getRealGameIds`, `getGameLeaderboard`, `getGlobalLeaderboard` y las constantes. Usa `createClient()` de `lib/supabase/server.ts`. Si Supabase devuelve error, lanza un `Error` con el mensaje. Verificación: `tsc` y `bun run lint` sin errores.
4. **Server Action.** Crear `app/games/actions.ts` con `submitScore`: valida `gameId` (string no vacío), `playerName` (trim, 1–10 caracteres), `score` (entero entre 0 y 10 000 000), llama a `supabase.rpc("submit_score", ...)` y devuelve `{ ok }` o `{ ok: false, error }` sin lanzar. Verificación: `tsc` y lint sin errores.
5. **Guardado desde el juego.** En `components/game-player.tsx`, para juegos reales (los que existen en `games`, pasados por prop desde la página de la ruta `/games/[id]/jugar`) llamar a `submitScore` en el botón `GUARDAR PUNTUACIÓN` con estados `guardando` / `guardado` / `error` (con opción de reintentar). Quitar `saveScore` y `SCORE_KEY` de `localStorage`. Para juegos mock, no guardar nada (sin `av_scores`). Verificación: jugar `/games/asteroides/jugar`, guardar y ver la fila en `scores` con el MCP `execute_sql`, con `user_id` nulo.
6. **Leaderboard en la página del juego.** En `app/games/[id]/page.tsx`, si el juego es real, leer `getGameLeaderboard(id, GAME_TOP_N)` dentro del `<Suspense>` existente y renderizar las filas; con 0 filas, mostrar "SIN PUNTUACIONES AÚN · SÉ EL PRIMERO". Los juegos mock conservan `seededScores`. Verificación: `/games/asteroides` muestra el puntaje guardado en el paso 5 y `/games/caida` sigue igual que antes.
7. **Salón de la Fama.** Convertir `app/salon/page.tsx` en Server Component con `<Suspense fallback={<PageLoading />}>` que carga el global y el top de cada juego real (`SALON_TOP_N`) y los pasa por props a `HallOfFame`. Agregar la pestaña `GLOBAL` (primera, activa por defecto) con columna JUEGO, mantener una pestaña por juego del catálogo (reales con datos de Supabase, mock con `seededScores`), tratar podio y tabla con menos de 3 filas y estado vacío, y no mostrar la fila falsa "TU MEJOR MARCA" en las pestañas con datos reales. Verificación: `/salon` abre en GLOBAL con el puntaje guardado y la pestaña ASTEROIDES lo muestra.
8. **Revisión manual y cierre.** Con `bun run dev`: jugar y guardar 3 partidas con nombres distintos y una repetida con mejor puntaje (el ranking muestra solo la mejor), probar nombre `Kai` y `KAI`, probar el error de red (quitar la variable de entorno o cortar la red) y revisar consola y terminal. Después `bun run lint` y `bun run build`. Verificación: criterios de aceptación.

---

## Acceptance criteria

- [ ] Existe la migración en `supabase/migrations/` y está aplicada al proyecto remoto; `list_tables` muestra `games` y `scores` con RLS activo.
- [ ] `select * from public.games` devuelve exactamente una fila: `asteroides`.
- [ ] `scores` tiene las columnas `id`, `game_id`, `player_name`, `score`, `user_id` (nullable), `created_at`, y `game_id` es FK a `games.id`.
- [ ] Un `INSERT` directo sobre `scores` con la clave publicable (PostgREST) falla por RLS.
- [ ] `rpc("submit_score")` con `player_name` vacío, de 11 caracteres, `score` negativo, `score` mayor a 10 000 000 o `game_id` inexistente devuelve error y no inserta fila.
- [ ] Guardar un puntaje en `/games/asteroides/jugar` crea una fila en `scores` con `game_id = 'asteroides'`, el nombre y el puntaje mostrados en el modal, y `user_id` nulo.
- [ ] Mientras guarda, el botón muestra el estado "guardando" y no permite doble envío; si falla, muestra un error y permite reintentar.
- [ ] `/games/asteroides` muestra como máximo 10 filas, ordenadas por puntaje descendente, con una sola fila por `player_name`.
- [ ] Con dos partidas del mismo nombre, el ranking muestra solo la de mayor puntaje; `Kai` y `KAI` aparecen como filas distintas.
- [ ] `/salon` abre en la pestaña `GLOBAL`, muestra como máximo 20 filas con una sola fila por `player_name` y la columna del juego donde logró ese puntaje.
- [ ] La pestaña `ASTEROIDES` de `/salon` muestra como máximo 20 filas reales de Supabase.
- [ ] Sin puntajes en `scores`, `/games/asteroides` y las pestañas `GLOBAL` y `ASTEROIDES` muestran el estado vacío sin errores ni filas falsas.
- [ ] Las pestañas de los 8 juegos mock de `/salon` y sus páginas `/games/[id]` siguen mostrando `seededScores` igual que antes.
- [ ] Ningún código de la app escribe ni lee `av_scores`.
- [ ] Las vistas usan `security_invoker = true` y `get_advisors` (security) no reporta errores nuevos.
- [ ] `lib/supabase/database.types.ts` está regenerado y `bunx tsc --noEmit` termina sin errores.
- [ ] `bun run lint` y `bun run build` terminan con código 0 y sin warnings.
- [ ] La consola del navegador y el terminal de `next dev` no muestran errores ni warnings en `/salon`, `/games/asteroides` y `/games/asteroides/jugar`.
- [ ] `git status` no muestra la clave `sb_publishable_` ni contraseñas en archivos versionados.

---

## Decisions

- **Sí:** `games.id` es `text` con el slug (`asteroides`), igual al id de `lib/games.ts` y a la ruta. **No:** `uuid` con `slug` aparte, porque obliga a traducir en cada consulta y en la Server Action.
- **Sí:** `games` solo con juegos reales (hoy `asteroides`). **No:** sembrar los 9 del catálogo; no hay motor ni puntajes reales para 8 de ellos y tu indicación fue mantener ahí solo los que tenemos.
- **Sí:** los 8 juegos mock siguen con `seededScores` y sin escritura. Cambiarlos es parte de portar cada juego en su propia spec.
- **Sí:** `user_id uuid null` con FK a `auth.users` (`on delete set null`). Permite jugar sin sesión hoy y vincular después sin migrar datos.
- **Sí:** insertar con Server Action que llama a la función `submit_score` (`security definer`, `search_path = ''`) y sin política de `INSERT`. Se puede validar y no hace falta clave `service role`. **No:** `INSERT` directo desde el navegador con política `anon`, porque cualquiera podría mandar basura con la consola. **No:** Edge Function, es más infraestructura de la que esta spec necesita.
- **Sí:** validación de formato y rango (nombre 1–10, score 0–10 000 000) en la Server Action **y** en la base (`check` y la función). Dos capas porque la base es la última defensa. Asumimos que el tope de 10 000 000 es holgado para el juego actual (se confirma en la revisión manual).
- **Sí:** ranking por mejor puntaje por `player_name`, **sensible a mayúsculas**, resuelto con vistas (`DISTINCT ON`). Es decisión del usuario. **No:** todas las partidas ni agrupar sin distinguir mayúsculas.
- **Sí:** el global es una fila por `player_name` con su mejor puntaje en cualquier juego, mostrando en qué juego lo logró. **No:** sumar mejores puntajes por juego; con un solo juego real sería idéntico al ranking de ASTEROIDES y premiaría algo que aún no existe. Se reevalúa cuando haya más juegos reales.
- **Sí:** desempate por `created_at` ascendente (gana quien llegó primero al puntaje).
- **Sí:** N distinto por pantalla: top 10 en la página del juego (aside pequeño) y top 20 en `/salon`. Constantes en un solo archivo.
- **Sí:** lectura en Server Components dentro de `<Suspense>` (obligatorio con `cacheComponents` porque `createClient()` usa `cookies()`). Sin caché: cada visita ve datos frescos. **No:** `useEffect` + fetch en el cliente, sin SSR y con parpadeo.
- **Sí:** vistas `security_invoker = true`. **No:** vistas `security definer`, porque saltan RLS.
- **Sí:** quitar `av_scores`. Nadie lo lee y dos fuentes de verdad confunden. **No:** migrar sus entradas viejas, son datos de pruebas.
- **Sí:** `/salon` ya está enlazado en `Nav` y `Home`; no se agregan enlaces. Lo que se conecta es el dato.
- **Sí:** `bun` como gestor, igual que las specs anteriores. Sin dependencias nuevas.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Cualquiera puede llamar al RPC `submit_score` con un puntaje inventado (no hay auth ni firma) | Validación de rango y formato en dos capas. Se acepta el riesgo para esta etapa; anti-trampas queda como spec futura. Documentado en Scope. |
| Vistas o función `security definer` mal configuradas exponen o permiten más de lo debido | `security_invoker = true` en vistas, `search_path = ''` en la función, `revoke ... from public` y `get_advisors` en el paso 1. |
| `cookies()` en `createClient()` rompe el build con `cacheComponents` si se llama fuera de `<Suspense>` | `/salon` y `/games/[id]` leen dentro de `<Suspense>`. Se valida con `bun run build`. |
| Sensible a mayúsculas: el mismo jugador aparece dos veces con `Kai` y `KAI` | El input ya fuerza mayúsculas. Si cambia, se reevalúa. Decisión del usuario. |
| Spam de nombres o puntajes en una tabla pública | Fuera de alcance (rate limit y moderación). Los límites de longitud y rango acotan el daño. |
| El proyecto remoto se usa también para desarrollo y las pruebas ensucian el ranking | Borrar las filas de prueba con `execute_sql` al cerrar la revisión manual. Queda como decisión de una spec futura crear una rama o proyecto aparte. |
| La migración falla o deja el esquema a medias | Un solo archivo SQL transaccional; si falla en el remoto, corregir y reaplicar. Verificación con `list_tables` y `list_migrations`. |
| Server Action falla por red y el usuario cree que guardó | Estado `error` visible con reintento; el estado `guardado` solo se muestra tras `ok: true`. |

---

## What is **not** in this spec

- Auth real y vincular `user_id` a una sesión.
- Anti-trampas, firma de puntajes, rate limit o captcha.
- Sembrar o guardar puntajes de los 8 juegos mock.
- Estadísticas reales de `best` y `plays`.
- Realtime, paginación, filtros o búsqueda.
- Moderación y edición o borrado de puntajes.
- Cliente admin con `service role`.
- Migrar `av_scores`.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
