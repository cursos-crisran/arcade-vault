import type { Skin, SkinId } from "../types";
import { BG_COLOR, COLORS, GRID_COLOR } from "./constants";

export type TetrisSkin = Skin & {
  bg: string;
  grid: string;
  labelColor: string;
  valueColor: string;
  /** Índice 0 = vacío. */
  pieces: (string | null)[];
  /** Brillo superior del bloque. */
  highlight: string;
  /** shadowBlur del glow (0 = sin glow). */
  glow: number;
  pixelated: boolean;
  scanlines: boolean;
};

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKINS: Record<SkinId, TetrisSkin> = {
  clasico: {
    id: "clasico",
    label: "Clásico",
    bg: BG_COLOR,
    grid: GRID_COLOR,
    labelColor: "#8a8aa0",
    valueColor: "#f0f0f8",
    pieces: COLORS,
    highlight: "rgba(255,255,255,0.12)",
    glow: 0,
    pixelated: false,
    scanlines: false,
  },
  neon: {
    id: "neon",
    label: "Neón",
    bg: "#05010d",
    grid: "#1a0f33",
    labelColor: "#b388ff",
    valueColor: "#ffffff",
    pieces: [
      null,
      "#00f0ff",
      "#fff200",
      "#d400ff",
      "#39ff14",
      "#ff1744",
      "#2979ff",
      "#ff9100",
      "#e0e0ff",
    ],
    highlight: "rgba(255,255,255,0.25)",
    glow: 14,
    pixelated: false,
    scanlines: false,
  },
  retro: {
    id: "retro",
    label: "Retro",
    bg: "#0a1408",
    grid: "#16301a",
    labelColor: "#3f9f3f",
    valueColor: "#9bff9b",
    pieces: [
      null,
      "#9bff9b",
      "#7ae07a",
      "#5cc85c",
      "#b8ffb8",
      "#46b046",
      "#88f088",
      "#6ad46a",
      "#3a8a3a",
    ],
    highlight: "rgba(0,0,0,0.25)",
    glow: 0,
    pixelated: true,
    scanlines: true,
  },
};
