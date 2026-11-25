import {
  BLOCK,
  BOARD_X,
  BOARD_Y,
  COLS,
  GHOST_ALPHA,
  H,
  PANEL_X,
  ROWS,
  W,
  type Shape,
} from "./constants";
import { DEFAULT_SKIN, SKINS, type TetrisSkin } from "./skins";

let skin: TetrisSkin = SKINS[DEFAULT_SKIN];

/** Skin usada por las funciones de dibujo (se fija antes de cada frame). */
export function setDrawSkin(next: TetrisSkin): void {
  skin = next;
}

export type Piece = {
  type: number;
  shape: Shape;
  x: number;
  y: number;
};

export type PanelData = {
  score: number;
  lines: number;
  level: number;
  next: Piece;
};

const FONT_LABEL = '12px "Press Start 2P", monospace';
const FONT_VALUE = '20px "Press Start 2P", monospace';
const FONT_CONTROLS = '12px "Courier New", monospace';

const CONTROLS = [
  "← →   MOVER",
  "↓     BAJAR",
  "↑ / X ROTAR",
  "ESPACIO CAER",
];

/** Dibuja un bloque en píxeles del canvas (x, y = esquina superior izquierda de la celda). */
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  colorIndex: number,
  size: number = BLOCK,
  alpha = 1,
): void {
  const color = skin.pieces[colorIndex];
  if (!colorIndex || !color) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  if (skin.glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = skin.glow;
  }
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = skin.highlight;
  ctx.fillRect(px + 1, py + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = skin.bg;
  ctx.fillRect(0, 0, W, H);
}

export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = skin.grid;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let c = 1; c < COLS; c++) {
    ctx.moveTo(BOARD_X + c * BLOCK, BOARD_Y);
    ctx.lineTo(BOARD_X + c * BLOCK, BOARD_Y + ROWS * BLOCK);
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.moveTo(BOARD_X, BOARD_Y + r * BLOCK);
    ctx.lineTo(BOARD_X + COLS * BLOCK, BOARD_Y + r * BLOCK);
  }
  ctx.stroke();
  ctx.strokeRect(BOARD_X, BOARD_Y, COLS * BLOCK, ROWS * BLOCK);
}

export function drawBoard(
  ctx: CanvasRenderingContext2D,
  board: number[][],
): void {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, BOARD_X + c * BLOCK, BOARD_Y + r * BLOCK, board[r][c]);
}

/** Dibuja una pieza en coordenadas de celda del tablero. `ghost` usa alpha 0.2. */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  y: number = piece.y,
  ghost = false,
): void {
  const alpha = ghost ? GHOST_ALPHA : 1;
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      drawBlock(
        ctx,
        BOARD_X + (piece.x + c) * BLOCK,
        BOARD_Y + (y + r) * BLOCK,
        piece.shape[r][c],
        BLOCK,
        alpha,
      );
}

function drawStat(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: string,
  y: number,
): void {
  ctx.textBaseline = "top";
  ctx.fillStyle = skin.labelColor;
  ctx.font = FONT_LABEL;
  ctx.fillText(label, PANEL_X, y);
  ctx.fillStyle = skin.valueColor;
  ctx.font = FONT_VALUE;
  ctx.fillText(value, PANEL_X, y + 22);
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  { score, lines, level, next }: PanelData,
): void {
  drawStat(ctx, "SCORE", score.toLocaleString("en-US"), 24);
  drawStat(ctx, "LINES", String(lines), 100);
  drawStat(ctx, "LEVEL", String(level), 176);

  // NEXT: cuadrícula de 4×4 bloques (120×120)
  const boxY = 290;
  ctx.fillStyle = skin.labelColor;
  ctx.font = FONT_LABEL;
  ctx.fillText("NEXT", PANEL_X, 262);
  ctx.strokeStyle = skin.grid;
  ctx.lineWidth = 1;
  ctx.strokeRect(PANEL_X, boxY, 4 * BLOCK, 4 * BLOCK);
  const { shape } = next;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(
        ctx,
        PANEL_X + (offX + c) * BLOCK,
        boxY + (offY + r) * BLOCK,
        shape[r][c],
      );

  // CONTROLES
  ctx.fillStyle = skin.labelColor;
  ctx.font = FONT_LABEL;
  ctx.fillText("CONTROLES", PANEL_X, 436);
  ctx.font = FONT_CONTROLS;
  ctx.fillStyle = skin.valueColor;
  CONTROLS.forEach((line, i) => ctx.fillText(line, PANEL_X, 466 + i * 22));
}

/** Scanlines CRT (solo skins con `scanlines`). */
export function drawOverlay(ctx: CanvasRenderingContext2D): void {
  if (!skin.scanlines) return;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
}
