# Juegos implementados

Fuente: tabla `public.games` de Supabase, cruzada con `lib/games.ts` y `games/registry.ts`. Total: **4 juegos**.

| # | ID | Título | Categoría | Color | Spec | Alta en BD (UTC) |
|---|----|--------|-----------|-------|------|------------------|
| 1 | `asteroides` | ASTEROIDES | SHOOTER | cyan | SPEC 06 | 2026-11-23 18:34 |
| 2 | `tetris` | TETRIS | PUZZLE | magenta | SPEC 08 | 2026-11-23 22:41 |
| 3 | `arkanoid` | ARKANOID | ARCADE | magenta | SPEC 09 | 2026-11-23 23:34 |
| 4 | `snake` | SNAKE | ARCADE | green | SPEC 11 | 2026-11-24 00:10 |

## Descripciones

- **ASTEROIDES** — Destruye el campo de asteroides y sobrevive.
- **TETRIS** — Encaja las piezas y limpia líneas sin llegar al techo.
- **ARKANOID** — Rompe 5 muros de bloques con una pelota que no deja de acelerar.
- **SNAKE** — Come frutas, crece y no te muerdas la cola.

## Ubicación en el código

- Motores: `games/<id>/`, registrados en `games/registry.ts`.
- Catálogo: `lib/games.ts`.
- Rutas: `/games/<id>` (detalle) y `/games/<id>/jugar` (reproductor).
