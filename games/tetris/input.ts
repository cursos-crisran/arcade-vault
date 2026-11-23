const BLOCKED_CODES = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
]);

export type Input = {
  /** Devuelve y vacía las pulsaciones (con auto-repeat) desde la última llamada. */
  drain: () => string[];
  /** Descarta las pulsaciones pendientes. */
  reset: () => void;
  /** Quita los listeners de window. */
  dispose: () => void;
};

export function createInput(): Input {
  let queue: string[] = [];

  const onKeyDown = (e: KeyboardEvent) => {
    if (BLOCKED_CODES.has(e.code)) e.preventDefault();
    queue.push(e.code);
  };

  window.addEventListener("keydown", onKeyDown);

  return {
    drain() {
      const out = queue;
      queue = [];
      return out;
    },
    reset() {
      queue = [];
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
