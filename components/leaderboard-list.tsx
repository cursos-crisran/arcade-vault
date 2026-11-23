import type { LeaderboardRow } from "@/lib/leaderboard";
import type { ScoreRow } from "@/lib/scores";

// dd/mm/aaaa en UTC, para que servidor y cliente muestren lo mismo.
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getUTCFullYear()}`;
}

// Filas reales de Supabase al formato que ya usa la UI (`ScoreRow`).
export function toScoreRows(rows: LeaderboardRow[]): ScoreRow[] {
  return rows.map((r) => ({
    rank: r.rank,
    name: r.playerName,
    score: r.score,
    date: formatDate(r.createdAt),
  }));
}

export function LeaderboardList({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="leaderboard">
      <h3>MEJORES PUNTUACIONES</h3>
      {rows.length === 0 ? (
        <div className="mono px-1 py-6 text-center text-[11px] leading-relaxed tracking-[0.16em] text-[var(--ink-dim)]">
          SIN PUNTUACIONES AÚN
          <br />
          <span className="neon-yellow">SÉ EL PRIMERO</span>
        </div>
      ) : (
        rows.map((r, i) => (
          <div
            key={`${r.rank}-${r.name}`}
            className={
              "lb-row" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">
              {r.name}
              <div className="text-[10px] tracking-[0.1em] text-[var(--ink-faint)]">
                {r.date}
              </div>
            </div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
          </div>
        ))
      )}
    </div>
  );
}
