# SPEC 02 — Home en `/`, biblioteca en `/games` y nuevo Nav

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-11-20
> **Objective:** Mover la biblioteca a `/games` (con detalle y reproductor bajo la misma raíz), portar el home de `references/templates/home-about/` a `/` y actualizar el Nav a Inicio, Biblioteca, Salón de la Fama y Acerca de.

---

## Por qué existe esta spec

La SPEC 01 dejó la biblioteca en `/` y los juegos en `/juegos/[id]`. La plantilla `references/templates/home-about/` trae una landing (`home.jsx`) y una página "Acerca de" (`about.jsx`). Esta spec porta solo la landing y reorganiza las rutas para que `/` sea el home.

Esta spec modifica rutas y enlaces creados en la SPEC 01. Es un cambio intencional de esa spec.

El CSS del home no está en `app/globals.css`. Vive en `references/templates/home-about/styles.css` y se anexa a `globals.css`.

---

## Scope

**In:**

- Mover `app/juegos/` a `app/games/`. Rutas resultantes: `/games` (biblioteca), `/games/[id]` (detalle) y `/games/[id]/jugar` (reproductor).
- Actualizar todos los enlaces internos que apuntaban a `/juegos/...` o a la biblioteca en `/`.
- Nuevo `app/page.tsx` con el home de la plantilla: hero, "¿Por qué Arcade Vault?", juegos disponibles, stats, actividad en vivo, precios y CTA final.
- Componentes del home en `components/`, con datos mock estáticos en `lib/home.ts`.
- Anexar a `app/globals.css` los estilos del home de la plantilla, con los mismos nombres de clase.
- `Nav` (escritorio y panel móvil) con cuatro enlaces: Inicio `/`, Biblioteca `/games`, Salón de la Fama `/salon`, Acerca de `/about`.
- Página placeholder `app/about/page.tsx` con el texto "PRÓXIMAMENTE".
- Metadata `title` de `/games` ("Biblioteca | Arcade Vault").

**Out of scope (para futuras specs):**

- Portar `about.jsx` (la página "Acerca de" real).
- Redirecciones desde `/juegos/...` hacia `/games/...`.
- Datos reales en "Últimas puntuaciones" y "Top jugadores": son mock fijo.
- Variantes de tema, gamepad y cualquier otra sección de `styles.css` que no sea del home.
- Cambios de lógica en la biblioteca, el detalle, el salón, el auth o el reproductor, aparte de las rutas.
- Tests automatizados e internacionalización.

---

## Data model

```ts
// lib/home.ts
export type NeonColor = "cyan" | "magenta" | "yellow" | "green";

export type Feature = {
  icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";
  title: string;
  desc: string;
  color: NeonColor;
};

export type Stat = { n: string; u: string; s: string };

export type RecentScore = {
  player: string;
  game: string;
  score: number;
  ago: string;        // texto ya formateado: "hace 2 min"
  color: NeonColor;
};

export type TopPlayer = { rank: number; player: string; score: number };

export type FaqItem = { q: string; a: string };

export const FEATURES: readonly Feature[];     // 4 elementos
export const STATS: readonly Stat[];           // 3 elementos
export const RECENT_SCORES: readonly RecentScore[]; // 7 elementos
export const TOP_PLAYERS: readonly TopPlayer[];     // 5 elementos
export const PRICING_FEATURES: readonly string[];   // 6 elementos
export const FAQ: readonly FaqItem[];               // 3 elementos
```

Los valores son los textos de `home.jsx`, copiados tal cual. Las tarjetas de "Juegos disponibles ahora" no usan `lib/home.ts`: salen de `GAMES.slice(0, 6)` en `lib/games.ts`.

Este cambio no introduce claves nuevas de `localStorage`.

Convenciones:

- Números con `toLocaleString("es-ES")`.
- El ancho de la barra del top es `100 - i * 16` por ciento, como en la plantilla.

---

## Implementation plan

Antes de empezar, leer la guía de rutas y `Link` en `node_modules/next/dist/docs/01-app`.

1. Mover `app/juegos/` a `app/games/` con `git mv`. Actualizar en `components/game-card.tsx`, `components/game-player.tsx`, `components/nav.tsx`, `components/library.tsx`, `app/games/[id]/page.tsx` y `app/games/[id]/jugar/page.tsx` todo enlace `/juegos/...` a `/games/...`. Verificación: `bun run build` sin errores y `/games/caida` muestra el detalle.
2. Crear `app/games/page.tsx` con la biblioteca (el contenido actual de `app/page.tsx`, con su `metadata`). Los enlaces "volver" del detalle y del reproductor apuntan a `/games`. Verificación: `/games` muestra las 8 tarjetas. En este paso `/` conserva la biblioteca, así que la app sigue completa.
3. Anexar a `app/globals.css` los bloques "HOME PAGE" (`styles.css` líneas 930–1070) y "ACTIVITY" + "PRICING" (líneas 1621–1726), incluidos sus `@keyframes` (`bounce`, `float`, `pulse-led`, `tickin`) y sus reglas responsive. Verificación: `bun run build` sin errores y la biblioteca se ve igual que antes.
4. Crear `lib/home.ts` con los tipos y datos mock del modelo. Verificación: `bun run lint` y `tsc` sin errores.
5. Crear `components/floating-silhouettes.tsx`, `components/feature-icon.tsx` y `components/mini-card.tsx`. La tarjeta usa `Link` a `/games/<id>`. Verificación: `tsc` sin errores.
6. Crear `components/home.tsx` (cliente) con las seis secciones y el hook `useReveal` (`IntersectionObserver` que agrega la clase `in` a cada `.reveal`). Los botones de navegación pasan a `Link` con las clases `btn`. Reemplazar `app/page.tsx` para que renderice `<Home />`. Verificación: `/` muestra el home y `/games` sigue mostrando la biblioteca.
7. Actualizar `components/nav.tsx` (escritorio y panel móvil) a los cuatro enlaces y su lógica de enlace activo. Crear `app/about/page.tsx` con el placeholder. Verificación: los cuatro enlaces navegan y `/about` muestra "PRÓXIMAMENTE".

---

## Acceptance criteria

- [ ] `bun run build` y `bun run lint` terminan sin errores.
- [ ] `/` muestra el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA" y las secciones `// 01`, `// 02`, `// 03` y `// 04`, más el bloque de stats y el CTA final "¿LISTO PARA JUGAR?".
- [ ] `/` muestra 4 tarjetas de "¿Por qué Arcade Vault?", 6 mini-tarjetas de juego, 3 stats, 7 filas de últimas puntuaciones y 5 filas de top jugadores.
- [ ] La primera fila del top tiene la clase `top1`, la segunda `top2` y la tercera `top3`.
- [ ] Hacer clic en una mini-tarjeta navega a `/games/<id>`. "VER TODOS LOS JUEGOS →", "▶ EXPLORAR JUEGOS" e "INSERTAR MONEDA →" navegan a `/games`.
- [ ] "✦ CREAR CUENTA", "EMPEZAR GRATIS →" navegan a `/auth`. "VER SALÓN →" navega a `/salon`.
- [ ] Las secciones con clase `reveal` reciben la clase `in` al entrar en el viewport.
- [ ] `/games` muestra las 8 tarjetas de la biblioteca, el hero "ARCADE VAULT" y los chips de la SPEC 01.
- [ ] `/games/caida` muestra el detalle. `/games/caida/jugar` muestra el reproductor. `/games/xyz` y `/games/xyz/jugar` muestran el 404 temático.
- [ ] `/juegos` y `/juegos/caida` muestran el 404 temático.
- [ ] En el detalle y el reproductor, el enlace de regreso a la biblioteca lleva a `/games`, y `SALIR` vuelve a `/games/<id>`.
- [ ] El Nav de escritorio muestra, en este orden, "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de", con destinos `/`, `/games`, `/salon` y `/about`.
- [ ] El enlace activo es "Inicio" solo en `/`, "Biblioteca" en `/games` y `/games/*`, "Salón de la Fama" en `/salon` y "Acerca de" en `/about`.
- [ ] A 375 px de ancho el panel móvil muestra los cuatro enlaces más "Iniciar Sesión" (o "Cuenta" con sesión), y cada enlace cierra el panel.
- [ ] `/about` muestra el texto "PRÓXIMAMENTE" y conserva Nav y Footer.
- [ ] Enviar el formulario de `/auth` sigue redirigiendo a `/` y el Nav muestra el nombre del usuario.
- [ ] `grep -r "juegos" app components lib` no encuentra rutas `/juegos`.
- [ ] La consola del navegador no muestra errores ni warnings de React en `/`, `/games`, `/about` ni en recargas con sesión iniciada.

---

## Decisions

- **Sí:** renombrar `/juegos` a `/games` completo (biblioteca, detalle y reproductor). Una sola raíz, coherente con el Nav. **No:** dejar `/juegos/[id]` y mezclar `/games` con `/juegos`.
- **Sí:** sin redirección desde `/juegos/...`. La app aún no se publica, así que no hay enlaces externos que proteger. **No:** `redirects` en `next.config.ts`.
- **Sí:** `/about` con página placeholder. El Nav no apunta a un 404 y la spec del "Acerca de" real puede reemplazarla. **No:** portar `about.jsx` ahora, porque se pidió solo el home.
- **Sí:** anexar el CSS del home a `app/globals.css` con los mismos nombres de clase de la plantilla. Es el método de la SPEC 01 y conserva la fidelidad visual. **No:** `app/home.css` aparte ni reescritura en Tailwind. Esto cambia la regla "no tocar `globals.css`" de la SPEC 01, solo para añadir.
- **Sí:** contenido del home como mock estático, tipado en `lib/home.ts`. **No:** generarlo con `seededScores` (cambiaría los datos de la plantilla), ni quitar "Actividad en vivo" y "Precios".
- **Sí:** `components/home.tsx` como componente cliente, porque `useReveal` usa `IntersectionObserver`. `app/page.tsx` sigue siendo un componente de servidor.
- **Sí:** reemplazar `navigate({ name })` de la plantilla por `Link` de `next/link`. **No:** `onClick` con `router.push`, porque pierde prefetch y semántica de enlace.
- **Sí:** el redirect tras el login sigue siendo `/`, que ahora es el home. Es decisión heredada de la SPEC 01.
- **Sí:** el contador "CRÉDITOS · 03" del Nav se mantiene estático.
- **Sí:** el título de `/` queda con el metadata por defecto del layout ("Arcade Vault").

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| `.reveal` deja las secciones invisibles si el efecto no corre (JS desactivado o error) | Ejecutar `useReveal` en un efecto sin dependencias externas y verificar que todas las secciones llegan a `.in` al hacer scroll. |
| Un enlace a `/juegos/...` olvidado produce 404 | Criterio de aceptación con `grep` y recorrido manual detalle → jugar → SALIR. |
| Anexar CSS rompe estilos existentes por nombres duplicados | Anexar solo los bloques indicados al final de `globals.css` y comparar la biblioteca antes y después del paso 3. |
| `cacheComponents` falla en el build al mover rutas dinámicas | Mantener `generateStaticParams` y el `await params` de la SPEC 01 sin cambios. Leer antes la guía en `node_modules/next/dist/docs/01-app`. |
| Diferencias visuales respecto a la plantilla | Mantener nombres de clase idénticos y comparar `/` con `references/templates/home-about/arcade-vault-standalone.html`. |

---

## What is **not** in this spec

- La página "Acerca de" real (solo un placeholder).
- Redirecciones desde `/juegos`.
- Datos reales de actividad, ranking o estadísticas.
- Backend, autenticación real u OAuth.
- Cambios de lógica en biblioteca, detalle, salón, auth o reproductor.
- Tests automatizados.
- Internacionalización.

Cada uno de ellos, si se hace, va en su propia spec.
