import type { Metadata } from "next";
import { Suspense } from "react";
import { HallOfFame, type HallRow } from "@/components/hall-of-fame";
import { toScoreRows } from "@/components/leaderboard-list";
import { PageLoading } from "@/components/page-loading";
import { getFunctionalGames } from "@/lib/functional-games";
import { getGame } from "@/lib/games";
import {
  SALON_TOP_N,
  getGameLeaderboard,
  getGlobalLeaderboard,
} from "@/lib/leaderboard";

export const metadata: Metadata = {
  title: "Salón de la Fama | Arcade Vault",
};

export default function SalonPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Salon />
    </Suspense>
  );
}

// Lee Supabase dentro del <Suspense>: `createClient()` usa `cookies()`.
async function Salon() {
  const games = await getFunctionalGames();
  const [globalRaw, ...perGame] = await Promise.all([
    getGlobalLeaderboard(SALON_TOP_N),
    ...games.map((g) => getGameLeaderboard(g.id, SALON_TOP_N)),
  ]);

  const globalRows: HallRow[] = toScoreRows(globalRaw).map((row, i) => {
    const gameId = globalRaw[i].gameId;
    return {
      ...row,
      game: (gameId && getGame(gameId)?.title) || gameId?.toUpperCase() || "",
    };
  });

  const byGame: Record<string, HallRow[]> = {};
  games.forEach((g, i) => {
    byGame[g.id] = toScoreRows(perGame[i]);
  });

  return <HallOfFame games={games} globalRows={globalRows} byGame={byGame} />;
}
