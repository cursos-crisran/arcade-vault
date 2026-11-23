import type { CreateGame } from "./types";

export const GAME_ENGINES: Record<
  string,
  () => Promise<{ createGame: CreateGame }>
> = {
  asteroides: () => import("./asteroides"),
};
