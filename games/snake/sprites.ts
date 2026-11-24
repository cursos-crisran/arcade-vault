import { CELL, FRUIT_MAX_H, FRUITS_SRC } from "./constants";

type Frame = { x: number; y: number; w: number; h: number };

// Fila pixel-art (y=136) de fruits.png (hoja de 3790×442 px, fondo transparente).
export const FRUIT_ATLAS: Frame[] = [
  { x: 34, y: 136, w: 110, h: 160 }, // banana
  { x: 186, y: 136, w: 150, h: 160 }, // orange
  { x: 378, y: 136, w: 110, h: 160 }, // grape
  { x: 540, y: 136, w: 130, h: 160 }, // garlic
  { x: 712, y: 136, w: 130, h: 160 }, // eggplant
  { x: 894, y: 136, w: 110, h: 160 }, // strawberry
  { x: 1066, y: 136, w: 110, h: 160 }, // cherry
  { x: 1228, y: 136, w: 130, h: 160 }, // carrot
  { x: 1400, y: 136, w: 130, h: 160 }, // mushroom
  { x: 1582, y: 136, w: 110, h: 160 }, // broccoli
  { x: 1734, y: 136, w: 150, h: 160 }, // watermelon
  { x: 1906, y: 136, w: 150, h: 160 }, // pepper
  { x: 2068, y: 136, w: 170, h: 160 }, // kiwi
  { x: 2250, y: 136, w: 140, h: 160 }, // lemon
  { x: 2432, y: 136, w: 130, h: 160 }, // peach
  { x: 2604, y: 136, w: 130, h: 160 }, // peanut
  { x: 2786, y: 136, w: 110, h: 160 }, // apple
  { x: 2948, y: 136, w: 130, h: 160 }, // tomato
  { x: 3110, y: 136, w: 150, h: 160 }, // berries
  { x: 3302, y: 136, w: 110, h: 160 }, // grapes2
  { x: 3454, y: 136, w: 150, h: 160 }, // pineapple
  { x: 3637, y: 136, w: 130, h: 160 }, // melon
];

let image: HTMLImageElement | null = null;
let loaded = false;

/**
 * Carga fruits.png (una sola vez por página). Llama a `cb` cuando está lista;
 * si falla, `cb` no se llama.
 */
export function loadFruits(cb: () => void): void {
  if (loaded) {
    cb();
    return;
  }
  if (!image) {
    image = new Image();
    image.src = FRUITS_SRC;
  }
  const img = image;
  const onLoad = () => {
    loaded = true;
    cb();
  };
  if (img.complete && img.naturalWidth > 0) {
    onLoad();
  } else {
    img.addEventListener("load", onLoad, { once: true });
  }
}

/**
 * Dibuja la fruta `kind` en la celda (cx, cy) con origen (ox, oy), escalada a
 * FRUIT_MAX_H de alto máximo, conservando proporción y centrada. No dibuja si
 * la imagen no cargó.
 */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  kind: number,
  cx: number,
  cy: number,
  ox: number,
  oy: number,
): void {
  if (!loaded || !image) return;
  const f = FRUIT_ATLAS[kind];
  if (!f) return;
  const scale = Math.min(FRUIT_MAX_H / f.h, CELL / f.w);
  const dw = f.w * scale;
  const dh = f.h * scale;
  const dx = ox + cx * CELL + (CELL - dw) / 2;
  const dy = oy + cy * CELL + (CELL - dh) / 2;
  ctx.drawImage(image, f.x, f.y, f.w, f.h, dx, dy, dw, dh);
}
