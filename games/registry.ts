import type { CreateGame } from "./types";

export const GAME_ENGINES: Record<
  string,
  () => Promise<{ createGame: CreateGame }>
> = {
  asteroides: () => import("./asteroides"),
  tetris: () => import("./tetris"),
  arkanoid: () => import("./arkanoid"),
  snake: () => import("./snake"),
};
