# SPEC 01 — MVP visual de Arcade Vault (5 pantallas)

> **Status:** Implementado
> **Depends on:** Ninguna
> **Date:** 2026-11-20
> **Objective:** Portar a Next.js (App Router) las cinco pantallas de `references/templates/` (biblioteca, detalle, reproductor simulado, auth y salón de la fama) con datos mock y sin implementar ningún juego.

---

## Por qué existe esta spec

La carpeta `references/templates/` contiene un prototipo SPA (React por CDN + Babel, ruta en `location.hash`). El proyecto real usa Next 16.4.6 con `cacheComponents: true`, así que no se copia el prototipo: se reparte en rutas reales, componentes tipados y datos en `lib/`.

Los estilos ya están portados: `app/globals.css` (952 líneas, mismas clases que `styles.css` de la plantilla) y las fuentes `next/font` en `app/layout.tsx`. Esta spec solo agrega componentes y páginas.

---

## Scope

**In:**

- Rutas reales del App Router: `/` (biblioteca), `/juegos/[id]` (detalle), `/juegos/[id]/jugar` (reproductor), `/auth`, `/salon`.
- `Nav` (con menú móvil), `Footer` y fondos (`av-bg`, `av-noise`) compartidos desde `app/layout.tsx`.
- Datos mock tipados en `lib/`: 8 juegos, 4 categorías más `TODOS`, y `seededScores` determinista.
- Sesión mock con `AuthProvider` (React Context) persistida en `localStorage` bajo `av_user`.
- Reproductor simulado: arena CRT decorativa, HUD con puntaje que sube con un temporizador, pausa, botón `FIN` y modal de fin de juego con guardado en `localStorage` (`av_scores`).
- Página 404 temática (`app/not-found.tsx`) y `notFound()` cuando el `id` de juego no existe.
- Estilos nuevos que se necesiten: Tailwind 4. Las clases existentes de `globals.css` se reutilizan tal cual.
- Metadata por página (`title`).

**Out of scope (para futuras specs):**

- Cualquier juego real (lógica, canvas, controles).
- Backend, base de datos, autenticación real, OAuth (Google/GitHub), validación de formularios.
- Ranking real: el salón y el detalle usan datos generados por `seededScores`.
- Leer `av_scores` en el salón de la fama (se guardan, pero no se muestran).
- Internacionalización, tests automatizados, modo claro.
- Re-portar o refactorizar `app/globals.css`.

---

## Data model

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;            // slug de la URL: "bloque-buster", "caida", ...
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;         // clase CSS existente: "cover-bricks", "cover-tetro", ...
  color: GameColor;
  best: number;
  plays: string;         // texto ya formateado: "12.4K"
};

export const GAMES: Game[];                                   // los 8 de data.jsx
export const CATS: readonly ["TODOS", ...GameCategory[]];
export function getGame(id: string): Game | undefined;

// lib/scores.ts
export type ScoreRow = { rank: number; name: string; score: number; date: string }; // date: "DD/MM/2026"
export function seededScores(seed: number, count?: number): ScoreRow[]; // count por defecto: 12
```

```ts
// components/auth-provider.tsx
export type SessionUser = { name: string };  // MAYÚSCULAS, máx. 10 caracteres

// useAuth() → { user: SessionUser | null; login(u: SessionUser | null): void; signOut(): void }
```

Claves de `localStorage`:

- `av_user`: `SessionUser` serializado. Ausente = invitado.
- `av_scores`: arreglo de `{ game: string; score: number; name: string; at: number }`. Solo se escribe.

Convenciones:

- Números con `toLocaleString("es-ES")`.
- Semillas: detalle usa `id.length * 17 + 3` con 10 filas. Salón usa `id.length * 23 + 7` con 12 filas. Son las mismas fórmulas de la plantilla.
- Todo acceso a `localStorage` va en `try/catch`.

---

## Implementation plan

1. Crear `lib/games.ts` y `lib/scores.ts` con los tipos y datos de `references/templates/data.jsx`. Verificación: `bun run lint` y `tsc` sin errores.
2. Crear `components/auth-provider.tsx` (cliente) con `useAuth()` y envolver `children` en `app/layout.tsx`. Verificación: la app compila y la home actual sigue renderizando.
3. Crear `components/nav.tsx` (cliente, con menú móvil y `usePathname` para el enlace activo) y `components/footer.tsx`. Montarlos en `app/layout.tsx` alrededor de `<main className="av-main">`. Verificación: el Nav aparece en todas las rutas y alterna "Iniciar Sesión" / nombre de usuario.
4. Reemplazar `app/page.tsx` por la biblioteca: `components/game-card.tsx` (cliente, efecto tilt) y `components/library.tsx` (cliente, búsqueda y chips). Verificación: filtrar por texto y categoría, y ver el estado "NO HAY RESULTADOS".
5. Crear `app/not-found.tsx` y `app/juegos/[id]/page.tsx` (detalle) con `generateStaticParams`, `generateMetadata` y `notFound()`. Verificación: `/juegos/caida` renderiza el detalle y `/juegos/xyz` muestra el 404 temático.
6. Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (cliente): pestañas por juego, podio, tabla y fila "tu mejor marca" solo con sesión. Verificación: cambiar de pestaña cambia podio y tabla.
7. Crear `app/auth/page.tsx` y `components/auth-form.tsx` (cliente): pestañas entrar / crear cuenta, campo de correo solo en "crear", "jugar como invitado", botones sociales inertes. Verificación: enviar el formulario guarda `av_user`, redirige a `/` y el Nav muestra el nombre.
8. Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (cliente): HUD, arena CRT, pausa, `FIN`, modal con guardado en `av_scores`, "jugar de nuevo" y salir. Verificación: el flujo completo detalle → jugar → FIN → guardar → volver.

---

## Acceptance criteria

- [ ] `bun run build` y `bun run lint` terminan sin errores.
- [ ] No queda código de la plantilla Create Next App en `app/page.tsx`.
- [ ] `/` muestra 8 tarjetas de juego, el hero "ARCADE VAULT" y los chips `TODOS`, `ARCADE`, `PUZZLE`, `SHOOTER`, `VERSUS`.
- [ ] Escribir "caída" en el buscador deja una sola tarjeta. Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Elegir el chip `SHOOTER` muestra exactamente `INVASORES` y `ROCAS`.
- [ ] Hacer clic en una tarjeta o en `JUGAR` navega a `/juegos/<id>`.
- [ ] `/juegos/<id>` muestra título, descripción larga, tags, estadísticas y 10 filas de puntuaciones, con las tres primeras con estilo `top1`, `top2` y `top3`.
- [ ] `/juegos/xyz` y `/juegos/xyz/jugar` muestran la página 404 temática.
- [ ] `/salon` muestra 8 chips (uno por juego), el podio con 3 posiciones y 12 filas en la tabla.
- [ ] En `/salon` sin sesión no aparece la fila "TU MEJOR MARCA". Con sesión sí aparece, con el nombre del usuario.
- [ ] En `/auth` la pestaña "CREAR CUENTA" muestra el campo de correo y la de "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario de `/auth` con usuario "kai" guarda `{"name":"KAI"}` en `localStorage.av_user`, redirige a `/` y el Nav muestra `KAI ▾`.
- [ ] "JUGAR COMO INVITADO" redirige a `/` y deja el Nav con "Iniciar Sesión".
- [ ] Recargar la página con sesión iniciada mantiene el nombre en el Nav, sin error de hidratación en consola.
- [ ] Hacer clic en el nombre de usuario del Nav cierra la sesión y borra `av_user`.
- [ ] En `/juegos/<id>/jugar` el puntaje sube solo, `PAUSA` lo detiene y muestra "EN PAUSA", y `REANUDAR` lo reanuda.
- [ ] `FIN` abre el modal "FIN DEL JUEGO" con el puntaje final. `GUARDAR PUNTUACIÓN` agrega una entrada a `localStorage.av_scores` y muestra "PUNTUACIÓN GUARDADA".
- [ ] `JUGAR DE NUEVO` reinicia puntaje, vidas y nivel. `SALIR` vuelve a `/juegos/<id>`.
- [ ] El enlace activo del Nav es "Biblioteca" en `/`, `/juegos/*` y `/juegos/*/jugar`, y "Salón de la Fama" en `/salon`.
- [ ] A 375 px de ancho el Nav muestra el botón `≡` y abre el panel móvil con los tres enlaces.
- [ ] La consola del navegador no muestra errores ni warnings de React en ninguna de las 5 pantallas.

---

## Decisions

- **Sí:** rutas reales del App Router. URLs compartibles y layout común. **No:** SPA con hash de la plantilla, porque desperdicia el router.
- **Sí:** reutilizar `app/globals.css` sin cambios. Ya contiene las clases de la plantilla. **No:** reescribir en Tailwind, CSS Modules ni re-portar el CSS.
- **Sí:** Tailwind 4 para estilos nuevos que falten. Es la herramienta del proyecto.
- **Sí:** `AuthProvider` con Context, para que Nav, Auth, Salón y Reproductor reaccionen al login sin eventos manuales. **No:** hook suelto con `localStorage`.
- **Sí:** auth mock en `localStorage` (`av_user`), igual que la plantilla. **No:** backend, validación ni OAuth.
- **Sí:** mantener el simulador del reproductor (puntaje aleatorio con temporizador, modal, guardado). Valida el flujo completo sin implementar juegos.
- **Sí:** el nivel del reproductor se calcula como `Math.floor(score / 2500) + 1`. La plantilla lo incrementaba con un efecto (`score % 2500 < 100`) que podía subir varios niveles seguidos. Es una desviación intencional.
- **Sí:** datos en `lib/` y UI en `components/`, con el alias `@/*`. **No:** colocar todo dentro de cada ruta.
- **Sí:** `notFound()` y `app/not-found.tsx` temático para ids inválidos. La plantilla renderizaba `null`.
- **Sí:** `generateStaticParams` sobre `GAMES` en las rutas dinámicas, para que sean prerenderizables con `cacheComponents`.
- **Sí:** `seededScores` determinista, así servidor y cliente generan los mismos datos.
- **Sí:** `av_scores` solo se escribe. Mostrarlo en el salón requiere decidir sobre ranking real y va en otra spec.
- **Sí:** el contador "CRÉDITOS · 03" y el texto del footer son estáticos, como en la plantilla.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| Error de hidratación al leer `localStorage` en el primer render | `AuthProvider` inicia con `user: null` y lee `av_user` en un efecto tras montar. |
| `cacheComponents` falla en el build por acceso a datos dinámicos fuera de `Suspense` | Leer `params` con `await`, usar `generateStaticParams` y mantener `localStorage` solo en componentes cliente. Leer antes la guía en `node_modules/next/dist/docs/01-app`. |
| `localStorage` bloqueado o lleno (modo privado) | Todo acceso en `try/catch`. Sin persistencia la app sigue funcionando. |
| Temporizador del reproductor sigue activo al salir de la pantalla | Limpiar el `setInterval` en el cleanup del efecto. |
| Diferencias visuales respecto a la plantilla | Mantener nombres de clase idénticos y comparar cada pantalla con `references/templates/Arcade Vault.html`. |

---

## What is **not** in this spec

- Ningún juego jugable.
- Backend, autenticación real u OAuth.
- Ranking persistente o compartido entre usuarios.
- Mostrar en el salón las puntuaciones guardadas en `av_scores`.
- Cambios a `app/globals.css`.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se hace, va en su propia spec.
