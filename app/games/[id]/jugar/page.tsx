import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GamePlayer } from "@/components/game-player";
import { PageLoading } from "@/components/page-loading";
import { GAMES, getGame } from "@/lib/games";
import { getRealGameIds } from "@/lib/leaderboard";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  if (!game) return { title: "404 | Arcade Vault" };
  return { title: `Jugar ${game.title} | Arcade Vault` };
}

export default function PlayPage({
  params,
}: PageProps<"/games/[id]/jugar">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Player params={params} />
    </Suspense>
  );
}

async function Player({
  params,
}: Pick<PageProps<"/games/[id]/jugar">, "params">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  const realGameIds = await getRealGameIds();

  return <GamePlayer game={game} persistScores={realGameIds.includes(id)} />;
}
