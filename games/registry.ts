import type { CreateGame, SkinOption } from "./types";

export const GAME_ENGINES: Record<
  string,
  () => Promise<{ createGame: CreateGame }>
> = {
  asteroides: () => import("./asteroides"),
  tetris: () => import("./tetris"),
  arkanoid: () => import("./arkanoid"),
  snake: () => import("./snake"),
};

/** Skins por juego (sin importar el motor). Ausente = sin selector. */
export const GAME_SKINS: Record<string, SkinOption[]> = {
  asteroides: [
    { id: "clasico", label: "Clásico" },
    { id: "neon", label: "Neón" },
    { id: "retro", label: "Retro" },
  ],
  arkanoid: [
    { id: "clasico", label: "Clásico" },
    { id: "neon", label: "Neón" },
    { id: "retro", label: "Retro" },
  ],
  tetris: [
    { id: "clasico", label: "Clásico" },
    { id: "neon", label: "Neón" },
    { id: "retro", label: "Retro" },
  ],
  snake: [
    { id: "clasico", label: "Clásico" },
    { id: "neon", label: "Neón" },
    { id: "retro", label: "Retro" },
  ],
};
