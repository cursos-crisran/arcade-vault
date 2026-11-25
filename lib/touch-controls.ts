export type TouchMode =
  | "hold" // keydown al presionar, keyup al soltar
  | "tap" // keydown + keyup inmediatos al presionar
  | "repeat"; // keydown al presionar y cada REPEAT_MS tras REPEAT_DELAY_MS; keyup al soltar

export type TouchButton = {
  id: string; // estable, usado como key de React y aria
  label: string; // texto o símbolo visible
  ariaLabel: string; // etiqueta accesible en español
  code: string; // KeyboardEvent.code que leen los motores
  mode: TouchMode;
  side: "left" | "right";
};

export const REPEAT_DELAY_MS = 180;
export const REPEAT_MS = 80;

export const TOUCH_CONTROLS: Record<string, TouchButton[]> = {
  asteroides: [
    { id: "left", label: "◀", ariaLabel: "Girar a la izquierda", code: "ArrowLeft", mode: "hold", side: "left" },
    { id: "right", label: "▶", ariaLabel: "Girar a la derecha", code: "ArrowRight", mode: "hold", side: "left" },
    { id: "thrust", label: "▲", ariaLabel: "Empuje", code: "ArrowUp", mode: "hold", side: "right" },
    { id: "fire", label: "FUEGO", ariaLabel: "Disparar", code: "Space", mode: "tap", side: "right" },
  ],
  tetris: [
    { id: "left", label: "◀", ariaLabel: "Mover a la izquierda", code: "ArrowLeft", mode: "repeat", side: "left" },
    { id: "right", label: "▶", ariaLabel: "Mover a la derecha", code: "ArrowRight", mode: "repeat", side: "left" },
    { id: "down", label: "▼", ariaLabel: "Caída suave", code: "ArrowDown", mode: "repeat", side: "left" },
    { id: "rotate", label: "ROTAR", ariaLabel: "Rotar pieza", code: "ArrowUp", mode: "tap", side: "right" },
    { id: "drop", label: "CAER", ariaLabel: "Caída dura", code: "Space", mode: "tap", side: "right" },
  ],
  arkanoid: [
    { id: "left", label: "◀", ariaLabel: "Mover paleta a la izquierda", code: "ArrowLeft", mode: "hold", side: "left" },
    { id: "right", label: "▶", ariaLabel: "Mover paleta a la derecha", code: "ArrowRight", mode: "hold", side: "right" },
  ],
  snake: [
    { id: "left", label: "◀", ariaLabel: "Girar a la izquierda", code: "ArrowLeft", mode: "tap", side: "left" },
    { id: "right", label: "▶", ariaLabel: "Girar a la derecha", code: "ArrowRight", mode: "tap", side: "left" },
    { id: "up", label: "▲", ariaLabel: "Girar hacia arriba", code: "ArrowUp", mode: "tap", side: "right" },
    { id: "down", label: "▼", ariaLabel: "Girar hacia abajo", code: "ArrowDown", mode: "tap", side: "right" },
  ],
};
