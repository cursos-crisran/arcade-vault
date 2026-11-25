import type { Skin, SkinId } from "../types";
import { COLORS } from "./constants";

export type SnakeSkin = Skin & {
  bg: string;
  hud: string;
  hudLine: string;
  text: string;
  gridA: string;
  gridB: string;
  bodyA: string;
  bodyB: string;
  bodyEdge: string;
  head: string;
  eye: string;
  /** shadowBlur del glow (0 = sin glow). */
  glow: number;
  pixelated: boolean;
  scanlines: boolean;
};

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKINS: Record<SkinId, SnakeSkin> = {
  clasico: {
    id: "clasico",
    label: "Clásico",
    ...COLORS,
    glow: 0,
    pixelated: false,
    scanlines: false,
  },
  neon: {
    id: "neon",
    label: "Neón",
    bg: "#05010d",
    hud: "#0a0418",
    hudLine: "#d400ff",
    text: "#ffffff",
    gridA: "#07021a",
    gridB: "#0b0424",
    bodyA: "#00f0ff",
    bodyB: "#00b8ff",
    bodyEdge: "#08204a",
    head: "#ff2bd6",
    eye: "#05010d",
    glow: 14,
    pixelated: false,
    scanlines: false,
  },
  retro: {
    id: "retro",
    label: "Retro",
    bg: "#0a1408",
    hud: "#0a1408",
    hudLine: "#3f9f3f",
    text: "#9bff9b",
    gridA: "#0c180a",
    gridB: "#0f1d0c",
    bodyA: "#7ae07a",
    bodyB: "#5cc85c",
    bodyEdge: "#16301a",
    head: "#b8ffb8",
    eye: "#0a1408",
    glow: 0,
    pixelated: true,
    scanlines: true,
  },
};
