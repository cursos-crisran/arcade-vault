"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { GAMES } from "@/lib/games";
import { seededScores, type ScoreRow } from "@/lib/scores";

const YELLOW_GLOW = "[text-shadow:0_0_6px_rgba(245,255,0,0.5)]";
const GLOBAL_TAB = "global";

// `game` solo se rellena en el global (juego donde se logró el puntaje).
export type HallRow = ScoreRow & { game?: string };

type Props = {
  globalRows: HallRow[];
  // Filas reales de Supabase por id de juego. Un juego sin clave es mock.
  byGame: Record<string, HallRow[]>;
};

export function HallOfFame({ globalRows, byGame }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState(GLOBAL_TAB);
  const isGlobal = tab === GLOBAL_TAB;
  const isReal = isGlobal || tab in byGame;

  const mockRows = useMemo(
    () => (isReal ? [] : seededScores(tab.length * 23 + 7, 12)),
    [tab, isReal],
  );
  const rows: HallRow[] = isGlobal ? globalRows : isReal ? byGame[tab] : mockRows;

  const game = GAMES.find((g) => g.id === tab);
  const showYou = !!user && !isReal && !!game && rows.length > 5;
  const youRank = 8 + (tab.length % 4);
  const youScore = showYou ? rows[5].score - 2400 : 0;
  const podium = [rows[1], rows[0], rows[2]] as (HallRow | undefined)[];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel text-[10px]">
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        <button
          className={"chip" + (isGlobal ? " active" : "")}
          onClick={() => setTab(GLOBAL_TAB)}
        >
          GLOBAL
        </button>
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="podium">
          <PodiumSlot className="silver" num="02" row={podium[0]} />
          <PodiumSlot className="gold" num="01" row={podium[1]} champion />
          <PodiumSlot className="bronze" num="03" row={podium[2]} />
        </div>
      )}

      <div className={"hall-table" + (isGlobal ? " with-game" : "")}>
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          {isGlobal && <div>JUEGO</div>}
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.length === 0 && (
          <div className="tr empty">
            <div className="mono py-6 text-center text-[11px] leading-relaxed tracking-[0.16em] text-[var(--ink-dim)]">
              SIN PUNTUACIONES AÚN
              <br />
              <span className="neon-yellow">SÉ EL PRIMERO</span>
            </div>
          </div>
        )}
        {rows.map((r, i) => (
          <div
            key={`${tab}-${r.name}-${i}`}
            className={
              "tr" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            {isGlobal && <div className="gm">{r.game}</div>}
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
        {showYou && game && user && (
          <>
            <div className="tr you-label">
              ▸ TU MEJOR MARCA EN {game.title}
            </div>
            <div
              className="tr you"
              style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
            >
              <div className="rk text-[var(--yellow)]">
                #{String(youRank).padStart(2, "0")}
              </div>
              <div className="pl text-[var(--yellow)]">{user.name}</div>
              <div className={`sc text-[var(--yellow)] ${YELLOW_GLOW}`}>
                {youScore.toLocaleString("es-ES")}
              </div>
              <div className="dt">11/05/2026</div>
            </div>
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/games" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}

function PodiumSlot({
  className,
  num,
  row,
  champion = false,
}: {
  className: string;
  num: string;
  row?: HallRow;
  champion?: boolean;
}) {
  return (
    <div className={`podium-slot ${className}${row ? "" : " opacity-40"}`}>
      {champion && (
        <div className="pixel text-[9px] tracking-[0.18em] text-[var(--gold)]">
          CAMPEÓN
        </div>
      )}
      <div className={"rank-num" + (champion ? " mt-1 text-[36px]!" : "")}>
        {num}
      </div>
      <div className="name">{row ? row.name : "—"}</div>
      <div className={"score" + (champion ? " text-[20px]!" : "")}>
        {row ? row.score.toLocaleString("es-ES") : "—"}
      </div>
      <div className="date">{row ? row.date : ""}</div>
    </div>
  );
}
