// Canvas lógico 800×600 (4:3). Franja de HUD arriba y tablero de 20×14 celdas debajo.
export const W = 800;
export const H = 600;
export const CELL = 40;
export const HUD_H = 40; // franja superior del HUD
export const COLS = 20; // 800 / 40
export const ROWS = 14; // (600 - 40) / 40; tablero 800×560 con origen y = 40
export const BOARD_X = 0;
export const BOARD_Y = HUD_H;

export const START_LENGTH = 3;
export const START_CELL = { x: 10, y: 7 }; // cabeza; cuerpo hacia la izquierda
export const START_DIR = { x: 1, y: 0 }; // dirección inicial: derecha

export const LIVES = 1;
export const FRUIT_POINTS = 10;
export const FRUITS_PER_LEVEL = 5;

export const BASE_STEP_MS = 150; // intervalo entre pasos en nivel 1
export const STEP_DECREASE_MS = 12; // se resta por nivel
export const MIN_STEP_MS = 60; // piso de velocidad
export const MAX_DT = 0.05; // s
export const INPUT_QUEUE_MAX = 2;

export const FRUIT_MAX_H = 36; // alto máximo de la fruta dentro de la celda

export const FRUITS_SRC = "/games/snake/fruits.png";

export const COLORS = {
  bg: "#050a05",
  hud: "#0a140a",
  hudLine: "#1f3a1f",
  text: "#e8ffe8",
  gridA: "#0b160b",
  gridB: "#0e1c0e",
  bodyA: "#2fdc4f",
  bodyB: "#1fa83a",
  bodyEdge: "#0a3d16",
  head: "#7dff8f",
  eye: "#050a05",
} as const;
