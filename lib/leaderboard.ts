import { createClient } from "@/lib/supabase/server";

// Solo servidor: usa `createClient()`, que lee `cookies()`. Con
// `cacheComponents: true` hay que llamarlo dentro de un <Suspense>.

export const GAME_TOP_N = 10; // página del juego (/games/[id])
export const SALON_TOP_N = 20; // Salón de la Fama (/salon)

export type LeaderboardRow = {
  rank: number;
  playerName: string;
  score: number;
  createdAt: string; // ISO; la UI lo formatea dd/mm/aaaa
  gameId?: string; // solo en el global
};

// Ids de los juegos con fila en `games` (los "reales").
export async function getRealGameIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("id");
  if (error) throw new Error(error.message);
  return data.map((game) => game.id);
}

// Mejor puntaje por `player_name` dentro de un juego.
export async function getGameLeaderboard(
  gameId: string,
  limit: number,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboard_by_game")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  // Las columnas de una vista son nullable en los tipos; en la práctica
  // nunca lo son porque vienen de `scores`.
  return data.map((row, index) => ({
    rank: index + 1,
    playerName: row.player_name ?? "",
    score: row.score ?? 0,
    createdAt: row.created_at ?? "",
  }));
}

// Mejor puntaje por `player_name` en cualquier juego.
export async function getGlobalLeaderboard(
  limit: number,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboard_global")
    .select("player_name, game_id, score, created_at")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  return data.map((row, index) => ({
    rank: index + 1,
    playerName: row.player_name ?? "",
    score: row.score ?? 0,
    createdAt: row.created_at ?? "",
    gameId: row.game_id ?? undefined,
  }));
}
