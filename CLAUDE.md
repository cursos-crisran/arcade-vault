# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos. El repo está en etapa inicial (solo el scaffold de Create Next App con `app/page.tsx` y `app/layout.tsx`; el metadata aún es el de por defecto).

El README indica que el desarrollo sigue **Spec Driven Design** (comandos `/spec` y `/spec-impl`) y las buenas prácticas de las skills de [Fernando Skills](https://github.com/Klerith/fernando-skills) (`npx skills@latest add Klerith/fernando-skills`). Todavía no existe un directorio `spec/`.

## Next.js: versión con cambios incompatibles

Next 16.4.6 + React 19.3 (versiones posteriores a tu conocimiento previo). `AGENTS.md` exige **leer la guía relevante en `node_modules/next/dist/docs/`** (`01-app`, `02-pages`, `03-architecture`, `04-community`) antes de escribir código de Next, y respetar los avisos de deprecación. Ejemplo: `RootLayout` usa el tipo global `LayoutProps<"/">` en lugar de tipar `children` manualmente.

## Configuración relevante

- `next.config.ts` activa flags experimentales/nuevos: `cacheComponents: true`, `partialPrefetching: true`, `experimental.agentFeedback`. `cacheComponents` cambia el modelo de caché/render (Partial Prerendering), así que consulta la documentación de ese modo antes de usar fetch, datos dinámicos o APIs de request.
- Tailwind CSS 4 se procesa vía regla de Turbopack (`@tailwindcss/turbopack`) en `next.config.ts`; los estilos y tokens de tema (`--background`, `--foreground`, fuentes Geist) viven en `app/globals.css` con `@theme inline` y modo oscuro por `prefers-color-scheme`.
- Alias de imports: `@/*` → raíz del proyecto (`tsconfig.json`). TypeScript en modo `strict`.
- Estructura App Router: todo el código de rutas está en `app/`.

# Skills
- Usa siempre /frontend-desing para hacer interfaces de usuarios
- En cada sesion siempre inicializa la skill de /caveman