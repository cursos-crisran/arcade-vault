import { EXPLOSION_DURATION } from "./constants";
import type { BlockColor } from "./levels";
import { SKINS, DEFAULT_SKIN, type ArkanoidSkin } from "./skins";
import { drawFrame, drawSprite, EXPLOSION_FRAMES } from "./sprites";

let skin: ArkanoidSkin = SKINS[DEFAULT_SKIN];

/** Skin activa para las funciones de dibujo. */
export function setDrawSkin(s: ArkanoidSkin): void {
  skin = s;
}

function glowRect(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.fillStyle = color;
  if (skin.glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = skin.glow;
  }
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

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
  if (skin.sprites) {
    drawSprite(ctx, `block_${b.color}`, b.x, b.y, b.w, b.h);
    return;
  }
  const color = skin.blocks[b.color];
  if (skin.pixelated) {
    glowRect(ctx, color, b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(b.x + 2, b.y + b.h - 6, b.w - 4, 4);
  } else {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = skin.glow;
    ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = color;
    ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
    ctx.restore();
  }
}

export function drawExplosion(
  ctx: CanvasRenderingContext2D,
  e: Explosion,
): void {
  const idx = Math.min(Math.floor((e.elapsed / EXPLOSION_DURATION) * 4), 3);
  if (skin.sprites) {
    drawFrame(ctx, EXPLOSION_FRAMES[e.color][idx], e.x, e.y, e.w, e.h);
    return;
  }
  const t = (idx + 1) / 4;
  const sx = (e.w * t) / 2;
  const sy = (e.h * t) / 2;
  ctx.save();
  ctx.globalAlpha = 1 - t * 0.8;
  glowRect(
    ctx,
    skin.blocks[e.color],
    e.x - sx / 2,
    e.y - sy / 2,
    e.w + sx,
    e.h + sy,
  );
  ctx.restore();
}

export function drawPaddle(ctx: CanvasRenderingContext2D, p: Paddle): void {
  if (skin.sprites) {
    drawSprite(ctx, "paddle", p.x, p.y, p.w, p.h);
    return;
  }
  glowRect(ctx, skin.paddle, p.x, p.y, p.w, p.h);
}

export function drawBall(
  ctx: CanvasRenderingContext2D,
  b: Pick<Ball, "x" | "y" | "w" | "h">,
): void {
  if (skin.sprites) {
    drawSprite(ctx, "ball", b.x, b.y, b.w, b.h);
    return;
  }
  if (skin.pixelated) {
    glowRect(ctx, skin.ball, b.x + 2, b.y + 2, b.w - 4, b.h - 4);
    return;
  }
  ctx.save();
  ctx.fillStyle = skin.ball;
  ctx.shadowColor = skin.ball;
  ctx.shadowBlur = skin.glow;
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
