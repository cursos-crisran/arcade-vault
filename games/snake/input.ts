import { INPUT_QUEUE_MAX, START_DIR } from "./constants";

export type Dir = { x: number; y: number };

const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

export type Input = {
  /** Saca el siguiente giro encolado, o null si no hay. Se consume uno por paso. */
  next: () => Dir | null;
  /** Vacía la cola y fija la dirección vigente contra la que se comparan los giros. */
  reset: (dir?: Dir) => void;
  /** Quita los listeners de window. */
  dispose: () => void;
};

/**
 * Teclado (flechas y WASD) en window con cola de giros.
 * Un giro se encola solo si no es igual ni opuesto (180°) al último giro
 * encolado (o a la dirección vigente si la cola está vacía).
 */
export function createInput(): Input {
  const queue: Dir[] = [];
  let last: Dir = START_DIR;

  const onKeyDown = (e: KeyboardEvent) => {
    const dir = KEY_DIRS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (queue.length >= INPUT_QUEUE_MAX) return;
    const same = dir.x === last.x && dir.y === last.y;
    const opposite = dir.x === -last.x && dir.y === -last.y;
    if (same || opposite) return;
    queue.push(dir);
    last = dir;
  };

  window.addEventListener("keydown", onKeyDown);

  return {
    next: () => queue.shift() ?? null,
    reset(dir = START_DIR) {
      queue.length = 0;
      last = dir;
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
    },
  };
}
