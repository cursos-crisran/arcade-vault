"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { submitScore } from "@/app/games/actions";
import { useAuth } from "@/components/auth-provider";
import { GAME_ENGINES, GAME_SKINS } from "@/games/registry";
import type { GameEngine, SkinId } from "@/games/types";
import type { Game } from "@/lib/games";

const LIVES = 3;
const DEFAULT_SKIN: SkinId = "clasico";
const skinKey = (id: string) => `arcade-vault:skin:${id}`;

function readSkin(gameId: string): SkinId {
  const options = GAME_SKINS[gameId] ?? [];
  try {
    const stored = window.localStorage.getItem(skinKey(gameId));
    const found = options.find((o) => o.id === stored);
    if (found) return found.id;
  } catch {
    // Sin storage: se usa la skin por defecto.
  }
  return DEFAULT_SKIN;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Solo recibe juegos funcionales (fila en `games` y motor registrado).
export function GamePlayer({ game }: { game: Game }) {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  const [engineLives, setEngineLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  const [ready, setReady] = useState(false);
  const [skin, setSkinState] = useState<SkinId>(DEFAULT_SKIN);
  const skinOptions = GAME_SKINS[game.id];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // El nombre sigue a la sesión hasta que el jugador lo edita en el modal.
  const name = nameInput ?? user?.name ?? "INVITADO";

  // El motor se carga solo en el cliente y se destruye al salir.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let engine: GameEngine | null = null;
    // Storage solo en cliente (efecto), nunca en el render prerenderizado.
    const initialSkin = readSkin(game.id);
    setSkinState(initialSkin);

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
      }, { skin: initialSkin });
      engineRef.current = engine;
      setReady(true);
    });

    return () => {
      cancelled = true;
      engine?.destroy();
      engineRef.current = null;
    };
  }, [game.id]);

  const changeSkin = (id: SkinId) => {
    setSkinState(id);
    engineRef.current?.setSkin?.(id);
    try {
      window.localStorage.setItem(skinKey(game.id), id);
    } catch {
      // Sin storage: la elección dura solo esta sesión.
    }
    canvasRef.current?.focus();
  };

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
    setSaveStatus("idle");
    setSaveError("");
    engineRef.current?.restart();
  };

  const save = async () => {
    if (saveStatus === "saving" || saveStatus === "saved") return;
    setSaveStatus("saving");
    setSaveError("");
    const result = await submitScore({
      gameId: game.id,
      playerName: name,
      score,
    });
    if (result.ok) {
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
      setSaveError(result.error);
    }
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
            <div className="v">{"♥ ".repeat(engineLives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(engineLevel).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          {skinOptions && skinOptions.length > 1 && (
            <div className="skin-picker">
              <label htmlFor="skin-select">Skin</label>
              <select
                id="skin-select"
                value={skin}
                onChange={(e) => changeSkin(e.target.value as SkinId)}
              >
                {skinOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
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
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            tabIndex={-1}
            className="block h-full w-full"
          />
          {!ready && <div className="crt-content">CARGANDO</div>}
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
            {saveStatus !== "saved" ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    disabled={saveStatus === "saving"}
                    onChange={(e) =>
                      setNameInput(e.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="TUS INICIALES"
                  />
                  <button
                    className="btn yellow"
                    disabled={saveStatus === "saving"}
                    onClick={save}
                  >
                    {saveStatus === "saving"
                      ? "GUARDANDO…"
                      : saveStatus === "error"
                        ? "REINTENTAR"
                        : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveStatus === "error" && (
                  <div
                    role="alert"
                    className="mono mt-2 text-[11px] tracking-[0.16em] text-[var(--magenta)]"
                  >
                    ✕ {saveError}
                  </div>
                )}
              </>
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
