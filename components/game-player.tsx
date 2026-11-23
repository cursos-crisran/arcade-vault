"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { GAME_ENGINES } from "@/games/registry";
import type { GameEngine } from "@/games/types";
import type { Game } from "@/lib/games";

const LIVES = 3;
const SCORE_KEY = "av_scores";

function saveScore(entry: { game: string; score: number; name: string }) {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    const all: unknown[] = raw ? JSON.parse(raw) : [];
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORE_KEY, JSON.stringify(all));
  } catch {}
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [engineLives, setEngineLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  const [ready, setReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Con motor real, vidas y nivel vienen del canvas; con el simulador, no.
  const hasEngine = game.id in GAME_ENGINES;
  const lives = hasEngine ? engineLives : LIVES;
  const level = hasEngine ? engineLevel : Math.floor(score / 2500) + 1;

  // El nombre sigue a la sesión hasta que el jugador lo edita en el modal.
  const name = nameInput ?? user?.name ?? "INVITADO";

  // Motor real: se carga solo en el cliente y se destruye al salir.
  useEffect(() => {
    if (!hasEngine) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let engine: GameEngine | null = null;

    GAME_ENGINES[game.id]().then(({ createGame }) => {
      if (cancelled) return;
      engine = createGame(canvas, {
        onScore: setScore,
        onLives: setEngineLives,
        onLevel: setEngineLevel,
        onGameOver: (result) => {
          setScore(result.score);
          setEngineLevel(result.level);
          setOver(true);
        },
      });
      engineRef.current = engine;
      setReady(true);
    });

    return () => {
      cancelled = true;
      engine?.destroy();
      engineRef.current = null;
    };
  }, [game.id, hasEngine]);

  // Simulador mock para los juegos sin motor.
  useEffect(() => {
    if (hasEngine || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [hasEngine, over, paused]);

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    if (next) engineRef.current?.pause();
    else engineRef.current?.resume();
  };

  const finish = () => {
    setOver(true);
    engineRef.current?.pause();
  };

  const restart = () => {
    setScore(0);
    setPaused(false);
    setOver(false);
    setSaved(false);
    engineRef.current?.restart();
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div className="flex flex-wrap gap-6">
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v text-[var(--ink)]">{name}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={finish}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {hasEngine ? (
            <>
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="block h-full w-full"
              />
              {!ready && <div className="crt-content">CARGANDO</div>}
            </>
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content z-[5] bg-black/60">
              <div>
                <div className="pixel neon-yellow text-[22px]">EN PAUSA</div>
                <div className="mono mt-2.5 text-[11px] tracking-[0.16em] text-[var(--ink-dim)]">
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setNameInput(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={() => {
                    saveScore({ game: game.id, score, name });
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
