"use server";

import { createClient } from "@/lib/supabase/server";

export type SubmitScoreResult = { ok: true } | { ok: false; error: string };

const NAME_MAX = 10;
const SCORE_MAX = 10_000_000;

// Guarda un puntaje llamando al RPC `submit_score`. Valida el formato aquí y
// otra vez en la base (última defensa). Nunca lanza: devuelve `{ ok }`.
export async function submitScore(input: {
  gameId: string;
  playerName: string;
  score: number;
}): Promise<SubmitScoreResult> {
  const gameId = typeof input?.gameId === "string" ? input.gameId.trim() : "";
  const playerName =
    typeof input?.playerName === "string" ? input.playerName.trim() : "";
  const score = input?.score;

  if (gameId.length === 0) {
    return { ok: false, error: "Juego inválido." };
  }
  if (playerName.length < 1 || playerName.length > NAME_MAX) {
    return { ok: false, error: "El nombre debe tener entre 1 y 10 caracteres." };
  }
  if (!Number.isInteger(score) || score < 0 || score > SCORE_MAX) {
    return { ok: false, error: "Puntaje inválido." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_score", {
      p_game_id: gameId,
      p_player_name: playerName,
      p_score: score,
    });
    if (error) {
      return { ok: false, error: "No se pudo guardar la puntuación." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No se pudo guardar la puntuación." };
  }
}
