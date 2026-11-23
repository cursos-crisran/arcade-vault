export type GameEvents = {
  /** Cada vez que cambia el puntaje. */
  onScore: (score: number) => void;
  /** Al iniciar y cada vez que cambian las vidas. */
  onLives: (lives: number) => void;
  /** Al iniciar y cada vez que cambia el nivel. */
  onLevel: (level: number) => void;
  /** Una sola vez por partida. */
  onGameOver: (result: { score: number; level: number }) => void;
};

export type GameEngine = {
  /** Congela update/draw y suelta las teclas retenidas. */
  pause: () => void;
  resume: () => void;
  /** Nueva partida; vuelve a emitir score 0, lives 3, level 1. */
  restart: () => void;
  /** Cancela el rAF y quita los listeners de window. */
  destroy: () => void;
};

export type CreateGame = (
  canvas: HTMLCanvasElement,
  events: GameEvents,
) => GameEngine;
