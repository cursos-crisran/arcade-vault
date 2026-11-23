import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LeaderboardList, toScoreRows } from "@/components/leaderboard-list";
import { PageLoading } from "@/components/page-loading";
import { GAMES, getGame } from "@/lib/games";
import { isFunctionalGame } from "@/lib/functional-games";
import { GAME_TOP_N, getGameLeaderboard } from "@/lib/leaderboard";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[id]">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  if (!game) return { title: "404 | Arcade Vault" };
  return { title: `${game.title} | Arcade Vault`, description: game.short };
}

export default function GameDetailPage({
  params,
}: PageProps<"/games/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <GameDetail params={params} />
    </Suspense>
  );
}

async function GameDetail({
  params,
}: Pick<PageProps<"/games/[id]">, "params">) {
  const { id } = await params;
  const game = getGame(id);
  if (!game || !(await isFunctionalGame(id))) notFound();

  const scores = toScoreRows(await getGameLeaderboard(id, GAME_TOP_N));

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div className="detail-info mt-5">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div className="v text-[var(--magenta)] [text-shadow:0_0_6px_rgba(255,0,110,0.5)]">
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div className="v text-[var(--yellow)] [text-shadow:0_0_6px_rgba(245,255,0,0.5)]">
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/games/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/games" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>

      <aside>
        <LeaderboardList rows={scores} />
      </aside>
    </div>
  );
}
