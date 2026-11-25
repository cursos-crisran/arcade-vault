import type { Skin, SkinId } from "../types";
import type { BlockColor } from "./levels";

export type ArkanoidSkin = Skin & {
  bg: string;
  hud: string;
  /** true = sprites originales; false = dibujo vectorial con la paleta. */
  sprites: boolean;
  blocks: Record<BlockColor, string>;
  paddle: string;
  ball: string;
  /** shadowBlur del glow (0 = sin glow). */
  glow: number;
  pixelated: boolean;
  scanlines: boolean;
};

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKINS: Record<SkinId, ArkanoidSkin> = {
  clasico: {
    id: "clasico",
    label: "Clásico",
    bg: "#000",
    hud: "#fff",
    sprites: true,
    blocks: {
      red: "#e53935",
      yellow: "#fdd835",
      cyan: "#26c6da",
      magenta: "#ab47bc",
      hotpink: "#ec407a",
      green: "#66bb6a",
      gray: "#9e9e9e",
    },
    paddle: "#cfd8dc",
    ball: "#ffffff",
    glow: 0,
    pixelated: false,
    scanlines: false,
  },
  neon: {
    id: "neon",
    label: "Neón",
    bg: "#05010d",
    hud: "#e0e0ff",
    sprites: false,
    blocks: {
      red: "#ff1744",
      yellow: "#fff200",
      cyan: "#00f0ff",
      magenta: "#d400ff",
      hotpink: "#ff2fa8",
      green: "#39ff14",
      gray: "#b0b0ff",
    },
    paddle: "#00f0ff",
    ball: "#ffffff",
    glow: 14,
    pixelated: false,
    scanlines: false,
  },
  retro: {
    id: "retro",
    label: "Retro",
    bg: "#0a1408",
    hud: "#9bff9b",
    sprites: false,
    blocks: {
      red: "#9bff9b",
      yellow: "#b8ffb8",
      cyan: "#7ae07a",
      magenta: "#5cc85c",
      hotpink: "#88f088",
      green: "#46b046",
      gray: "#3a8a3a",
    },
    paddle: "#9bff9b",
    ball: "#b8ffb8",
    glow: 0,
    pixelated: true,
    scanlines: true,
  },
};
