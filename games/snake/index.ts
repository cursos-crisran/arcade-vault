import type { CreateGame } from "../types";
import {
  BASE_STEP_MS,
  COLS,
  FRUIT_POINTS,
  FRUITS_PER_LEVEL,
  H,
  LIVES,
  MAX_DT,
  MIN_STEP_MS,
  ROWS,
  START_CELL,
  START_DIR,
  START_LENGTH,
  STEP_DECREASE_MS,
  W,
} from "./constants";
import {
  drawBoard,
  drawFruitEntity,
  drawHud,
  drawSnake,
  type Cell,
  type Fruit,
  type Snake,
} from "./entities";
import { createInput, type Dir } from "./input";
import { FRUIT_ATLAS, loadFruits } from "./sprites";

type State = "playing" | "gameover";

export const createGame: CreateGame = (canvas, events) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  canvas.width = W;
  canvas.height = H;

  // ── Estado ──────────────────────────────────────────────────────────────────
  let snake: Snake = [];
  let dir: Dir = START_DIR;
  let fruit: Fruit | null = null;
  let lives = LIVES;
  let score = 0;
  let level = 1;
  let fruitsEaten = 0;
  let acc = 0; // ms acumulados desde el último paso
  let state: State = "playing";

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;
  let ready = false;

  // ── Eventos: solo se emiten cuando el valor cambia ──────────────────────────
  let emittedScore: number | null = null;
  let emittedLives: number | null = null;
  let emittedLevel: number | null = null;

  function syncEvents() {
    if (score !== emittedScore) {
      emittedScore = score;
      events.onScore(score);
    }
    if (lives !== emittedLives) {
      emittedLives = lives;
      events.onLives(lives);
    }
    if (level !== emittedLevel) {
      emittedLevel = level;
      events.onLevel(level);
    }
  }

  const input = createInput();

  // ── Lógica ──────────────────────────────────────────────────────────────────
  function stepInterval(): number {
    return Math.max(MIN_STEP_MS, BASE_STEP_MS - (level - 1) * STEP_DECREASE_MS);
  }

  function resetSnake() {
    snake = [];
    for (let i = 0; i < START_LENGTH; i++) {
      snake.push({ x: START_CELL.x - i, y: START_CELL.y });
    }
    dir = START_DIR;
    acc = 0;
    input.reset(START_DIR);
  }

  /** Coloca una fruta en una celda libre. Devuelve false si no queda ninguna. */
  function spawnFruit(): boolean {
    const occupied = new Set(snake.map((c) => c.y * COLS + c.x));
    const free: Cell[] = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!occupied.has(y * COLS + x)) free.push({ x, y });
      }
    }
    if (free.length === 0) {
      fruit = null;
      return false;
    }
    fruit = {
      cell: free[Math.floor(Math.random() * free.length)],
      kind: Math.floor(Math.random() * FRUIT_ATLAS.length),
    };
    return true;
  }

  function initGame() {
    score = 0;
    lives = LIVES;
    level = 1;
    fruitsEaten = 0;
    state = "playing";
    resetSnake();
    spawnFruit();
  }

  function endGame() {
    state = "gameover";
    syncEvents();
    events.onGameOver({ score, level });
  }

  function step() {
    const turn = input.next();
    if (turn) dir = turn;

    const head = snake[0];
    const next: Cell = {
      x: (head.x + dir.x + COLS) % COLS,
      y: (head.y + dir.y + ROWS) % ROWS,
    };
    const eats =
      fruit !== null && next.x === fruit.cell.x && next.y === fruit.cell.y;

    // La punta de la cola cuenta como libre salvo que la serpiente crezca.
    const solid = eats ? snake : snake.slice(0, -1);
    if (solid.some((c) => c.x === next.x && c.y === next.y)) {
      lives--;
      if (lives > 0) {
        syncEvents();
        resetSnake();
        spawnFruit();
      } else {
        lives = 0;
        endGame();
      }
      return;
    }

    snake.unshift(next);
    if (!eats) {
      snake.pop();
      return;
    }

    score += FRUIT_POINTS;
    fruitsEaten++;
    level = 1 + Math.floor(fruitsEaten / FRUITS_PER_LEVEL);
    if (!spawnFruit()) {
      endGame();
      return;
    }
    syncEvents();
  }

  function update(dt: number) {
    if (state !== "playing") return;
    acc += dt * 1000;
    const interval = stepInterval();
    if (acc < interval) return;
    acc -= interval; // como máximo un paso por frame
    step();
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function draw(c: CanvasRenderingContext2D) {
    drawBoard(c);
    if (fruit) drawFruitEntity(c, fruit);
    drawSnake(c, snake, dir);
    drawHud(c, score, level, lives);
  }

  // ── Bucle principal ─────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed || paused || !ctx) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    draw(ctx);
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (!ready || destroyed) return;
    if (rafId !== null) cancelAnimationFrame(rafId);
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ── API pública ─────────────────────────────────────────────────────────────
  initGame();
  syncEvents();
  draw(ctx);

  loadFruits(() => {
    if (destroyed) return;
    ready = true;
    if (!paused) startLoop();
  });

  return {
    pause() {
      if (destroyed || paused) return;
      paused = true;
      stopLoop();
      input.reset(dir);
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      input.reset(dir);
      startLoop();
    },
    restart() {
      if (destroyed) return;
      paused = false;
      initGame();
      emittedScore = emittedLives = emittedLevel = null;
      syncEvents();
      startLoop();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopLoop();
      input.dispose();
    },
  };
};
