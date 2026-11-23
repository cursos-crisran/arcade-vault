# SPEC 05 — Corregir los errores de lint excluyendo `references/`

> **Status:** Implementado
> **Depends on:** SPEC 04
> **Date:** 2026-11-23
> **Objective:** Dejar `bun run lint` en 0 errores y 0 warnings excluyendo `references/` del análisis de ESLint, sin tocar el código de la app.

---

## Por qué existe esta spec

`bun run lint` reporta 33 problemas (18 errores, 15 warnings) y termina con código 1. Todos están en `references/`:

- `references/templates/*.jsx` y `references/templates/home-about/*.jsx`: plantillas visuales en JSX que usan `React` global (cargado por CDN en el prototipo), componentes definidos en otros archivos, comentarios `//` como texto y comillas sin escapar. Errores: `react/jsx-no-undef`, `react/jsx-no-comment-textnodes`, `react/no-unescaped-entities`.
- `references/started-games/04-arkanoid/*.js`: scripts de navegador sin módulos, cuyas funciones y constantes se comparten por `<script>` en `index.html`. Warnings: `@typescript-eslint/no-unused-vars`.

Esas carpetas son material fuente que las SPEC 01–03 ya portaron a TypeScript dentro de `app/`, `components/` y `lib/`. No son código de la aplicación. Corregirlas las alejaría del original que sirve de referencia. Ningún archivo de `app/`, `components/`, `lib/`, `scripts/` ni `proxy.ts` tiene problemas de lint hoy.

Esta spec no cambia el comportamiento de la app.

---

## Scope

**In:**

- Agregar `"references/**"` a `globalIgnores` en `eslint.config.mjs`, con un comentario que explique el motivo.
- Verificar que `bun run lint` termina con código 0 y sin warnings.

**Out of scope (para futuras specs):**

- Editar archivos dentro de `references/`.
- Cambiar el script `lint` de `package.json` (por ejemplo `--max-warnings 0`).
- Agregar o desactivar reglas de ESLint para el código de la app.
- Configurar Prettier, hooks de pre-commit o lint en CI.
- Refactorizar `app/`, `components/` o `lib/`.

---

## Data model

Esta spec no introduce datos, tipos ni claves de `localStorage`. Solo cambia la configuración de ESLint:

```js
// eslint.config.mjs
globalIgnores([
  ".next/**",
  "out/**",
  "build/**",
  "next-env.d.ts",
  "references/**", // material fuente (plantillas JSX y juegos de ejemplo), no código de la app
]),
```

---

## Implementation plan

1. Agregar `"references/**"` (con comentario) a `globalIgnores` en `eslint.config.mjs`. Verificación: `bun run lint` termina con código 0 y sin ninguna línea `warning` ni `error`.
2. Confirmar que el ignore no oculta código de la app: `bunx eslint app components lib scripts proxy.ts` sigue sin problemas y `git status` muestra solo `eslint.config.mjs` modificado. Verificación: criterios de aceptación.
3. Ejecutar `bun run build` para asegurar que nada más cambió. Verificación: build sin errores.

---

## Acceptance criteria

- [ ] `bun run lint` termina con código 0.
- [ ] La salida de `bun run lint` no contiene ningún `warning` ni `error`.
- [ ] `eslint.config.mjs` incluye `"references/**"` en `globalIgnores` con un comentario que explica el motivo.
- [ ] `git diff --stat` muestra únicamente `eslint.config.mjs` (más esta spec) como archivos modificados.
- [ ] `package.json` no cambia: el script `lint` sigue siendo `eslint`.
- [ ] Introducir temporalmente una variable sin uso en `components/about.tsx` hace que `bun run lint` la reporte (el lint sigue activo en la app); el cambio se revierte después.
- [ ] `bun run build` termina sin errores.

---

## Decisions

- **Sí:** ignorar `references/**` en ESLint. Es material de referencia ya portado a TypeScript y no forma parte del bundle de la app. **No:** corregir las plantillas y juegos, porque los aleja del original, y el `React` global y los scripts sin módulos son intencionales en ese formato.
- **No:** desactivar solo algunas reglas dentro de `references/`. Mantener el lint activo en archivos que nadie va a editar genera ruido sin beneficio.
- **Sí:** criterio estricto de 0 errores y 0 warnings, para que la salida limpia sea la línea base.
- **No:** agregar `--max-warnings 0` al script `lint`. Cambiar la política hacia adelante es otro tema y puede ir en una spec propia.
- **Sí:** `bun` como gestor de paquetes (`bun.lock`), igual que las SPEC 02 a 04.

---

## Risks

| Riesgo | Mitigación |
| ------ | ---------- |
| El ignore amplio oculta problemas reales si alguien pone código de la app dentro de `references/` | `references/` es solo material fuente. El criterio de aceptación comprueba que el lint sigue activo en `components/`. |
| Hay otros archivos con problemas que `bun run lint` no mostraba por el recorte de salida | El paso 1 exige la salida completa sin ninguna línea `warning` ni `error`, no solo el código de salida. |

---

## What is **not** in this spec

- Cambios dentro de `references/`.
- Cambios al script `lint` o a las reglas de ESLint de la app.
- Prettier, hooks de pre-commit o lint en CI.
- Refactors de `app/`, `components/` o `lib/`.

Cada uno de ellos, si se hace, va en su propia spec.
