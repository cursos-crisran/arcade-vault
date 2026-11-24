import {
  BOARD_X,
  BOARD_Y,
  CELL,
  COLORS,
  COLS,
  HUD_H,
  ROWS,
  W,
} from "./constants";
import type { Dir } from "./input";
import { drawFruit } from "./sprites";

export type Cell = { x: number; y: number };
/** Cuerpo de la serpiente: índice 0 = cabeza, último = cola. */
export type Snake = Cell[];
export type Fruit = { cell: Cell; kind: number };

const FONT = "bold 20px monospace";

export function drawBoard(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, BOARD_Y + ROWS * CELL);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.gridA : COLORS.gridB;
      ctx.fillRect(BOARD_X + x * CELL, BOARD_Y + y * CELL, CELL, CELL);
    }
  }
}

export function drawFruitEntity(
  ctx: CanvasRenderingContext2D,
  fruit: Fruit,
): void {
  drawFruit(ctx, fruit.kind, fruit.cell.x, fruit.cell.y, BOARD_X, BOARD_Y);
}

export function drawSnake(
  ctx: CanvasRenderingContext2D,
  snake: Snake,
  dir: Dir,
): void {
  // Cuerpo de cola a cabeza para que la cabeza quede encima.
  for (let i = snake.length - 1; i >= 1; i--) {
    const c = snake[i];
    const px = BOARD_X + c.x * CELL;
    const py = BOARD_Y + c.y * CELL;
    ctx.fillStyle = COLORS.bodyEdge;
    ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
    ctx.fillStyle = i % 2 === 0 ? COLORS.bodyA : COLORS.bodyB;
    ctx.fillRect(px + 4, py + 4, CELL - 8, CELL - 8);
  }

  const h = snake[0];
  const hx = BOARD_X + h.x * CELL;
  const hy = BOARD_Y + h.y * CELL;
  ctx.fillStyle = COLORS.bodyEdge;
  ctx.fillRect(hx + 1, hy + 1, CELL - 2, CELL - 2);
  ctx.fillStyle = COLORS.head;
  ctx.fillRect(hx + 3, hy + 3, CELL - 6, CELL - 6);

  // Ojos: dos cuadrados a los lados de la dirección, adelantados hacia ella.
  const cx = hx + CELL / 2;
  const cy = hy + CELL / 2;
  const fwd = 8;
  const side = 8;
  const eye = 6;
  ctx.fillStyle = COLORS.eye;
  for (const s of [-1, 1]) {
    const ex = cx + dir.x * fwd + -dir.y * side * s;
    const ey = cy + dir.y * fwd + dir.x * side * s;
    ctx.fillRect(ex - eye / 2, ey - eye / 2, eye, eye);
  }
}

// Corazón pixel-art de 7×6 "píxeles".
const HEART = [
  "0110110",
  "1111111",
  "1111111",
  "0111110",
  "0011100",
  "0001000",
];

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const p = 3;
  ctx.fillStyle = COLORS.head;
  HEART.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] === "1") ctx.fillRect(x + rx * p, y + ry * p, p, p);
    }
  });
}

export function drawHud(
  ctx: CanvasRenderingContext2D,
  score: number,
  level: number,
  lives: number,
): void {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = COLORS.hudLine;
  ctx.fillRect(0, HUD_H - 2, W, 2);

  ctx.fillStyle = COLORS.text;
  ctx.font = FONT;
  ctx.textBaseline = "middle";
  const midY = (HUD_H - 2) / 2;

  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 12, midY);
  ctx.textAlign = "center";
  ctx.fillText(`Nivel: ${level}`, W / 2, midY);

  const iconW = 7 * 3;
  const gap = 8;
  for (let i = 0; i < lives; i++) {
    const x = W - 12 - (i + 1) * iconW - i * gap;
    drawHeart(ctx, x, midY - 9);
  }
}
