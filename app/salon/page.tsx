import type { Metadata } from "next";
import { Suspense } from "react";
import { HallOfFame, type HallRow } from "@/components/hall-of-fame";
import { toScoreRows } from "@/components/leaderboard-list";
import { PageLoading } from "@/components/page-loading";
import { getGame } from "@/lib/games";
import {
  SALON_TOP_N,
  getGameLeaderboard,
  getGlobalLeaderboard,
  getRealGameIds,
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
  const realGameIds = await getRealGameIds();
  const [globalRaw, ...perGame] = await Promise.all([
    getGlobalLeaderboard(SALON_TOP_N),
    ...realGameIds.map((id) => getGameLeaderboard(id, SALON_TOP_N)),
  ]);

  const globalRows: HallRow[] = toScoreRows(globalRaw).map((row, i) => {
    const gameId = globalRaw[i].gameId;
    return {
      ...row,
      game: (gameId && getGame(gameId)?.title) || gameId?.toUpperCase() || "",
    };
  });

  const byGame: Record<string, HallRow[]> = {};
  realGameIds.forEach((id, i) => {
    byGame[id] = toScoreRows(perGame[i]);
  });

  return <HallOfFame globalRows={globalRows} byGame={byGame} />;
}
