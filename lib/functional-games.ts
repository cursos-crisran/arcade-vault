import { GAME_ENGINES } from "@/games/registry";
import { CATS, GAMES, type Game, type GameCategory } from "@/lib/games";
import { getRealGameIds } from "@/lib/leaderboard";

// Solo servidor: usa `getRealGameIds()`, que lee `cookies()`. Con
// `cacheComponents: true` hay que llamarlo dentro de un <Suspense>.
//
// Única definición de "juego funcional": entrada en GAMES ∩ fila en `games`
// ∩ motor en GAME_ENGINES. El orden es el de GAMES.
export async function getFunctionalGames(): Promise<Game[]> {
  const realIds = new Set(await getRealGameIds());
  return GAMES.filter((game) => realIds.has(game.id) && game.id in GAME_ENGINES);
}

export async function isFunctionalGame(id: string): Promise<boolean> {
  const games = await getFunctionalGames();
  return games.some((game) => game.id === id);
}

// Categorías con al menos un juego, en el orden de CATS, precedidas por "TODOS".
export function getCategories(games: Game[]): ["TODOS", ...GameCategory[]] {
  const present = new Set(games.map((game) => game.cat));
  const cats = CATS.filter(
    (cat): cat is GameCategory => cat !== "TODOS" && present.has(cat),
  );
  return ["TODOS", ...cats];
}
