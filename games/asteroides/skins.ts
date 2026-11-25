import type { Skin, SkinId } from "../types";

export type AsteroidesSkin = Skin & {
  bg: string;
  ship: string;
  asteroid: string;
  bullet: string;
  powerUp: string;
  thrust: string;
  /** Componentes "r,g,b" de las partículas (alpha variable). */
  particleRgb: string;
  hud: string;
  hudAccent: string;
  /** shadowBlur del glow (0 = sin glow). */
  glow: number;
  pixelated: boolean;
  scanlines: boolean;
};

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKINS: Record<SkinId, AsteroidesSkin> = {
  clasico: {
    id: "clasico",
    label: "Clásico",
    bg: "#000",
    ship: "#fff",
    asteroid: "#fff",
    bullet: "#fff",
    powerUp: "#0ff",
    thrust: "rgba(255, 130, 0, 0.85)",
    particleRgb: "255,255,255",
    hud: "#fff",
    hudAccent: "#0ff",
    glow: 0,
    pixelated: false,
    scanlines: false,
  },
  neon: {
    id: "neon",
    label: "Neón",
    bg: "#05010d",
    ship: "#00f0ff",
    asteroid: "#ff2bd6",
    bullet: "#fff200",
    powerUp: "#39ff14",
    thrust: "rgba(255, 120, 0, 0.95)",
    particleRgb: "255,43,214",
    hud: "#e0e0ff",
    hudAccent: "#39ff14",
    glow: 12,
    pixelated: false,
    scanlines: false,
  },
  retro: {
    id: "retro",
    label: "Retro",
    bg: "#0a1408",
    ship: "#9bff9b",
    asteroid: "#5cc85c",
    bullet: "#b8ffb8",
    powerUp: "#b8ffb8",
    thrust: "rgba(122, 224, 122, 0.85)",
    particleRgb: "155,255,155",
    hud: "#9bff9b",
    hudAccent: "#b8ffb8",
    glow: 0,
    pixelated: true,
    scanlines: true,
  },
};
