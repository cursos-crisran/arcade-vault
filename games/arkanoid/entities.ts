import { EXPLOSION_DURATION } from "./constants";
import type { BlockColor } from "./levels";
import { drawFrame, drawSprite, EXPLOSION_FRAMES } from "./sprites";

export type Paddle = { x: number; y: number; w: number; h: number };
export type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};
export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};
export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
};

export function drawBlock(ctx: CanvasRenderingContext2D, b: Block): void {
  if (!b.alive) return;
  drawSprite(ctx, `block_${b.color}`, b.x, b.y, b.w, b.h);
}

export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  e: Explosion,
): void {
  const idx = Math.min(Math.floor((e.elapsed / EXPLOSION_DURATION) * 4), 3);
  drawFrame(ctx, EXPLOSION_FRAMES[e.color][idx], e.x, e.y, e.w, e.h);
}

export function drawPaddle(ctx: CanvasRenderingContext2D, p: Paddle): void {
  drawSprite(ctx, "paddle", p.x, p.y, p.w, p.h);
}

export function drawBall(
  ctx: CanvasRenderingContext2D,
  b: Pick<Ball, "x" | "y" | "w" | "h">,
): void {
  drawSprite(ctx, "ball", b.x, b.y, b.w, b.h);
}
