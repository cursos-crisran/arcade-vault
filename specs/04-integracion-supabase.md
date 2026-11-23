# SPEC 04 — Integración base de Supabase (clientes SSR, proxy y tipos)

> **Status:** Implementado
> **Depends on:** SPEC 03
> **Date:** 2026-11-23
> **Objective:** Dejar Supabase integrado en la app Next.js (clientes de navegador y servidor con `@supabase/ssr`, `proxy.ts` que refresca la sesión, tipos generados y carpeta `supabase/` enlazada al proyecto remoto) sin implementar ninguna función de producto.

---

## Por qué existe esta spec

Arcade Vault necesitará base de datos, auth real y, más adelante, Realtime y Edge Functions. Cada una será su propia spec. Para que esas specs no repitan cableado, esta deja lista la capa común: variables de entorno, clientes, refresco de sesión por cookies, tipos y herramientas de migración.

Esta spec **no cambia el comportamiento visible de la app**. El `AuthProvider` mock (`localStorage`, clave `av_user`) y los puntajes mock (`av_scores`) de la SPEC 01 siguen igual. Reemplazarlos es tema de la spec de auth.

Contexto verificado al escribirla:

- El proyecto remoto es `cqvnbudaucntlzqaheae` (URL `https://cqvnbudaucntlzqaheae.supabase.co`, ya referenciado en `.mcp.json`). Su esquema `public` no tiene tablas.
- El proyecto ya expone una clave publicable nueva (`sb_publishable_...`). La clave legacy `anon` queda sin uso.
- `.env.local` ya contiene `SUPABASE_DB_PASSWORD`. El CLI de Supabase no está instalado globalmente: se usa como dependencia de desarrollo con `bunx`.
- Next 16 renombró `middleware` a `proxy` (`proxy.ts` en la raíz, función exportada `proxy`). `cacheComponents: true` está activo, así que `cookies()` solo se puede leer en contexto dinámico.

---

## Scope

**In:**

- Dependencias: `@supabase/supabase-js` y `@supabase/ssr` (runtime), `supabase` (CLI, devDependency).
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.example` (vacías) y en `.env.local` (valores reales, sin versionar). `SUPABASE_DB_PASSWORD` se documenta en `.env.example` como variable solo para el CLI.
- `lib/supabase/env.ts`: lee y valida las dos variables públicas; si falta alguna lanza un error con el nombre de la variable.
- `lib/supabase/client.ts`: `createClient()` para componentes cliente (`createBrowserClient<Database>`).
- `lib/supabase/server.ts`: `createClient()` asíncrono para Server Components, Server Actions y Route Handlers (`createServerClient<Database>` con `cookies()` de `next/headers`).
- `lib/supabase/proxy.ts` con `updateSession(request)` y `proxy.ts` en la raíz que lo invoca: refresca la sesión llamando a `supabase.auth.getClaims()` y propaga las cookies a la respuesta. No redirige ni protege rutas.
- `lib/supabase/database.types.ts`: tipos generados de la base y script `db:types` en `package.json`. Los tres clientes usan `Database`.
- Carpeta `supabase/` creada con `supabase init` y enlazada al proyecto remoto con `supabase link` (queda `supabase/config.toml`, listo para migraciones versionadas).
- `scripts/supabase-smoke.ts` y script `smoke:supabase` en `package.json`: prueba contra el proyecto real, fuera de la app.

**Out of scope (para futuras specs):**

- Auth real: formularios, sesión en `AuthProvider`, OAuth, confirmación de correo, URLs de redirección en el dashboard, rutas protegidas.
- Tablas, migraciones, políticas RLS y datos (`profiles`, `scores`, etc.). `supabase/migrations/` queda vacío.
- Reemplazar `av_user` y `av_scores` de `localStorage`.
- Realtime y Edge Functions (no se crea `supabase/functions/`).
- Cliente admin con `SUPABASE_SERVICE_ROLE_KEY`. No hay caso de uso todavía.
- Ruta de salud `/api/health` o cualquier página nueva.
- Stack local con Docker (`supabase start`).
- Storage, Cron, Queues y Vectors.
- Tests automatizados.

---

## Data model

Esta spec no introduce tablas ni claves de `localStorage`. Solo agrega estas estructuras de código:

```ts
// lib/supabase/env.ts
export function getSupabaseEnv(): { url: string; publishableKey: string };
// Lanza Error("Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL") (o _PUBLISHABLE_KEY).

// lib/supabase/client.ts
import type { Database } from "./database.types";
export function createClient(): SupabaseClient<Database>;               // navegador

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>; // servidor

// lib/supabase/proxy.ts
export async function updateSession(request: NextRequest): Promise<NextResponse>;

// proxy.ts (raíz)
export async function proxy(request: NextRequest): Promise<NextResponse>;
export const config: { matcher: string[] };
```

Variables de entorno:

```
# .env.example
NEXT_PUBLIC_SUPABASE_URL=            # https://<project_ref>.supabase.co (pública)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= # sb_publishable_... (pública, protegida por RLS)
SUPABASE_DB_PASSWORD=                 # solo para el CLI (supabase link). Nunca NEXT_PUBLIC_.
```

Scripts de `package.json`:

```
"db:types": "supabase gen types typescript --linked > lib/supabase/database.types.ts",
"smoke:supabase": "bun run scripts/supabase-smoke.ts"
```

Matcher de `proxy.ts`: todas las rutas excepto `_next/static`, `_next/image`, `favicon.ico` y archivos de imagen (`svg|png|jpg|jpeg|gif|webp`).

---

## Implementation plan

Antes de empezar, leer `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, la guía de `cookies()` con `cacheComponents` en `01-app` y la documentación vigente de Supabase para Next.js (`@supabase/ssr`, vía `.agents/skills/supabase` o el MCP `search_docs`). Usar la forma de `cookies.getAll/setAll` y `getClaims()` que indique esa documentación.

1. Instalar dependencias: `bun add @supabase/supabase-js @supabase/ssr` y `bun add -d supabase`. Verificación: `bun run build` sin errores y `bunx supabase --version` responde.
2. Variables de entorno: agregar las tres variables a `.env.example` (comentadas y vacías) y las dos públicas con sus valores reales a `.env.local` (URL con `get_project_url` o el dashboard; clave `sb_publishable_...` con `get_publishable_keys`). Crear `lib/supabase/env.ts`. Verificación: `git status` no muestra `.env.local` y `tsc` sin errores.
3. Inicializar el CLI: `bunx supabase init` (genera `supabase/config.toml`) y `bunx supabase link --project-ref cqvnbudaucntlzqaheae` (requiere `supabase login` o `SUPABASE_ACCESS_TOKEN`, y `SUPABASE_DB_PASSWORD`). Verificación: existe `supabase/config.toml` y `bunx supabase projects list` marca el proyecto como enlazado. Los archivos temporales (`supabase/.temp`) quedan ignorados.
4. Generar tipos: agregar el script `db:types`, ejecutarlo y versionar `lib/supabase/database.types.ts`. Si el CLI no puede autenticarse, usar la herramienta MCP `generate_typescript_types` y guardar la salida en el mismo archivo. Verificación: el archivo exporta `Database` y `tsc` sin errores.
5. Crear `lib/supabase/client.ts` y `lib/supabase/server.ts`, ambos tipados con `Database` y leyendo la configuración de `env.ts`. En `server.ts`, `setAll` tolera el error de escritura de cookies en Server Components (el proxy ya refresca la sesión). Verificación: `tsc` y `bun run lint` sin errores.
6. Crear `lib/supabase/proxy.ts` y `proxy.ts` en la raíz con el matcher indicado. `updateSession` crea el cliente con las cookies de la request, llama a `getClaims()` y devuelve la respuesta con las cookies actualizadas. No redirige. Verificación: `bun run build` lista `Proxy` en la salida y `bun run dev` responde 200 en `/`, `/games` y `/about`.
7. Crear `scripts/supabase-smoke.ts` y el script `smoke:supabase`. El script usa `@supabase/supabase-js` con las variables de `.env.local` y comprueba: (a) las variables existen, (b) `GET <url>/auth/v1/health` con la clave publicable responde 200, (c) `auth.getClaims()` sin sesión no devuelve error, (d) una consulta a PostgREST responde sin error de autenticación. Sale con código 0 si todo pasa y con código distinto de 0 y el motivo si algo falla. Verificación: `bun run smoke:supabase` termina con código 0.
8. Revisión final: `bun run build`, `bun run lint`, `grep -r "SUPABASE_DB_PASSWORD" .next/static` sin resultados y recorrido manual de `/`, `/games`, `/auth` y `/about`. Verificación: los criterios de aceptación.

---

## Acceptance criteria

- [ ] `bun run build` y `bun run lint` terminan sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` en `dependencies` y `supabase` en `devDependencies`, y `bun.lock` está actualizado.
- [ ] `.env.example` lista `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_DB_PASSWORD` vacías y está versionado. `.env.local` no está versionado.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` ausente, `getSupabaseEnv()` lanza un error que nombra la variable.
- [ ] Existen `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `lib/supabase/env.ts`, `lib/supabase/database.types.ts` y `proxy.ts` en la raíz.
- [ ] `lib/supabase/database.types.ts` exporta `Database` y los clientes de navegador y servidor están tipados con él.
- [ ] `supabase/config.toml` existe y `bunx supabase projects list` marca `cqvnbudaucntlzqaheae` como enlazado.
- [ ] `bun run db:types` regenera `lib/supabase/database.types.ts` sin errores.
- [ ] `bun run smoke:supabase` termina con código 0 contra el proyecto real.
- [ ] `bun run smoke:supabase` con la clave publicable alterada termina con código distinto de 0 e imprime el motivo.
- [ ] El `proxy.ts` no se ejecuta para `_next/static`, `_next/image`, `favicon.ico` ni imágenes.
- [ ] Con `bun run dev`, `/`, `/games`, `/games/caida`, `/auth` y `/about` responden 200 y se ven igual que antes de la spec.
- [ ] El login mock de `/auth` sigue funcionando: redirige a `/` y el Nav muestra el nombre del usuario.
- [ ] La consola del navegador y el terminal de `next dev` no muestran errores ni warnings en esas rutas.
- [ ] `grep -r "SUPABASE_DB_PASSWORD" .next/static` no encuentra resultados.
- [ ] Ningún archivo versionado contiene la clave `sb_publishable_` ni la contraseña de la base de datos.

---

## Decisions

- **Sí:** `@supabase/ssr` con `proxy.ts`. Es el patrón oficial para App Router y deja la sesión en cookies, necesaria para auth con Server Components y Server Actions. **No:** solo `supabase-js` con sesión en `localStorage`, porque habría que rehacerlo en la spec de auth.
- **Sí:** nombre `proxy.ts`, no `middleware.ts`. Next 16 deprecó `middleware`.
- **Sí:** `getClaims()` en el proxy para validar y refrescar la sesión. **No:** confiar en `getSession()` del servidor, porque no valida el token.
- **Sí:** el proxy solo refresca la sesión y no protege rutas. Qué rutas exigen sesión se decide en la spec de auth.
- **Sí:** clave publicable nueva (`sb_publishable_...`) en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. **No:** la clave legacy `anon`.
- **Sí:** proyecto remoto `cqvnbudaucntlzqaheae` más carpeta `supabase/` enlazada, sin Docker. Las migraciones futuras quedan versionadas en el repo. **No:** stack local con `supabase start` ni quedarse sin carpeta `supabase/`.
- **Sí:** CLI como devDependency y se invoca con `bunx supabase`. Todo el equipo usa la misma versión sin instalación global.
- **Sí:** tipos generados y versionados, con script `db:types`. Cada migración futura debe regenerarlos. **No:** escribir tipos a mano.
- **Sí:** verificación con script de humo fuera de la app. No agrega rutas públicas. **No:** ruta temporal `/api/health`.
- **Sí:** `AuthProvider` mock, `av_user` y `av_scores` intactos. **No:** migrarlos aquí.
- **Sí:** sin cliente admin (`service role`). No hay caso de uso y sumaría una clave sensible. Se agrega cuando una spec lo necesite.
- **Sí:** esta spec no crea tablas. Aunque el MCP de Supabase permitiría hacerlo, el pedido fue solo la integración.
- **Sí:** `bun` como gestor de paquetes (`bun.lock`), igual que las SPEC 02 y 03.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| `cookies()` en `server.ts` rompe el build con `cacheComponents` si se llama fuera de contexto dinámico | Hoy ninguna página lo usa. Documentar en `server.ts` que debe llamarse dentro de `<Suspense>` o en rutas dinámicas, y leer antes la guía de `cacheComponents`. Las specs que lo usen validan con `bun run build`. |
| El proxy corre en cada request y añade latencia | El matcher excluye estáticos e imágenes. Sin cookie de sesión, `getClaims()` no hace llamada de red. |
| Llamar a `getClaims()` o escribir cookies mal en el proxy corta la sesión del usuario en el futuro | Seguir la documentación vigente de `@supabase/ssr` y devolver siempre el `NextResponse` con las cookies que `setAll` escribió. Probar en la spec de auth. |
| Las claves o la contraseña de la base de datos se filtran al repositorio o al bundle | Solo se usan variables públicas con prefijo `NEXT_PUBLIC_`. `SUPABASE_DB_PASSWORD` no lleva prefijo y solo la usa el CLI. `.env*` ignorado y criterios de aceptación con `grep`. |
| `supabase link` o `db:types` fallan por falta de login | Ejecutar `supabase login` o definir `SUPABASE_ACCESS_TOKEN`. Plan B para tipos: MCP `generate_typescript_types`. |
| Los tipos quedan casi vacíos porque la base no tiene tablas | Es lo esperado. Cada spec con migraciones regenera `database.types.ts` con `bun run db:types`. |
| El proyecto remoto se usa también para desarrollo y los datos de prueba se mezclan con los reales | Esta spec no escribe datos. Antes de producción, crear un proyecto o rama aparte (branching está habilitado en el MCP). Queda como decisión de una spec futura. |
| Versiones nuevas de Next/React (16.4.6/19.3) incompatibles con `@supabase/ssr` | Verificar con `bun run build` y `bun run dev` en el paso 6. |

---

## What is **not** in this spec

- Auth real, OAuth y rutas protegidas.
- Tablas, migraciones, RLS y datos.
- Reemplazo de la sesión y los puntajes de `localStorage`.
- Realtime y Edge Functions.
- Cliente admin con `service role`.
- Rutas de salud o páginas nuevas.
- Stack local con Docker.
- Tests automatizados.

Cada uno de ellos, si se hace, va en su propia spec.
