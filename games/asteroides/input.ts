const BLOCKED_CODES = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);

export type Input = {
  keys: Record<string, boolean>;
  /** true una sola vez por pulsación nueva de `code`. */
  pressed: (code: string) => boolean;
  /** Suelta todas las teclas retenidas. */
  reset: () => void;
  /** Quita los listeners de window. */
  dispose: () => void;
};

export function createInput(): Input {
  const keys: Record<string, boolean> = {};
  const justPressed: Record<string, boolean> = {};

  const onKeyDown = (e: KeyboardEvent) => {
    if (BLOCKED_CODES.has(e.code)) e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (BLOCKED_CODES.has(e.code)) e.preventDefault();
    keys[e.code] = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return {
    keys,
    pressed(code) {
      const val = !!justPressed[code];
      justPressed[code] = false;
      return val;
    },
    reset() {
      for (const k of Object.keys(keys)) keys[k] = false;
      for (const k of Object.keys(justPressed)) justPressed[k] = false;
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    },
  };
}
