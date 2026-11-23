import { EXPLOSION_DURATION, SPRITESHEET_SRC } from "./constants";
import type { BlockColor } from "./levels";

type Frame = { sx: number; sy: number; sw: number; sh: number };

export { EXPLOSION_DURATION };

function explosionRow(sy: number): Frame[] {
  return [256, 288, 320, 352].map((sx) => ({ sx, sy, sw: 32, sh: 16 }));
}

export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]> = {
  red: explosionRow(176),
  cyan: explosionRow(192),
  green: explosionRow(208),
  magenta: explosionRow(224),
  yellow: explosionRow(240),
  hotpink: explosionRow(256),
  gray: explosionRow(176),
};

export const SPRITES = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 } as Frame,
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 } as Frame,
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  } as Record<BlockColor, Frame>,
};

export type SpriteName = "paddle" | "ball" | `block_${BlockColor}`;

let sheet: HTMLCanvasElement | null = null;
let loaded = false;
const callbacks: Array<() => void> = [];
let loading = false;

/**
 * Carga el spritesheet en un canvas offscreen (una sola vez por página).
 * Llama a `cb` cuando está listo; si falla, `cb` no se llama.
 */
export function loadSpritesheet(cb: () => void): void {
  if (loaded) {
    cb();
    return;
  }
  callbacks.push(cb);
  if (loading) return;
  loading = true;

  const raw = new Image();
  raw.onload = () => {
    const oc = document.createElement("canvas");
    oc.width = raw.width;
    oc.height = raw.height;
    oc.getContext("2d")?.drawImage(raw, 0, 0);
    sheet = oc;
    loaded = true;
    const pending = callbacks.splice(0);
    pending.forEach((f) => f());
  };
  raw.onerror = () => {
    loading = false;
    callbacks.length = 0;
    console.error("Failed to load spritesheet");
  };
  raw.src = SPRITESHEET_SRC;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (!loaded || !sheet) return;
  ctx.drawImage(sheet, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  name: SpriteName,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const frame = name.startsWith("block_")
    ? SPRITES.blocks[name.slice(6) as BlockColor]
    : SPRITES[name as "paddle" | "ball"];
  if (!frame) return;
  drawFrame(ctx, frame, x, y, w, h);
}
