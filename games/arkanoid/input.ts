const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight"]);

export type Input = {
  isLeft: () => boolean;
  isRight: () => boolean;
  /** Suelta las teclas retenidas. */
  reset: () => void;
  /** Quita los listeners de window y del canvas. */
  dispose: () => void;
};

/**
 * Teclado (flechas) en window y ratón en el canvas.
 * `onMouseX` recibe la X del ratón en coordenadas del canvas lógico.
 */
export function createInput(
  canvas: HTMLCanvasElement,
  onMouseX: (x: number) => void,
): Input {
  const keys = { ArrowLeft: false, ArrowRight: false };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    keys[e.code as keyof typeof keys] = true;
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    keys[e.code as keyof typeof keys] = false;
  };

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    onMouseX(((e.clientX - rect.left) * canvas.width) / rect.width);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("mousemove", onMouseMove);

  return {
    isLeft: () => keys.ArrowLeft,
    isRight: () => keys.ArrowRight,
    reset() {
      keys.ArrowLeft = false;
      keys.ArrowRight = false;
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}
