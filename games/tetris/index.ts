import type { CreateGame } from "../types";
import { COLS, H, KICKS, LINE_SCORES, ROWS, W, type Shape } from "./constants";
import {
  drawBackground,
  drawBoard,
  drawGrid,
  drawPanel,
  drawOverlay,
  drawPiece,
  setDrawSkin,
  type Piece,
} from "./entities";
import { createInput } from "./input";
import { DEFAULT_SKIN, SKINS } from "./skins";
import { createBoard, randomPiece, rotateCW } from "./utils";

type State = "playing" | "gameover";

const dropIntervalFor = (level: number): number =>
  Math.max(100, 1000 - (level - 1) * 90);

export const createGame: CreateGame = (canvas, events, options) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  canvas.width = W;
  canvas.height = H;

  const input = createInput();
  let skin = SKINS[options?.skin ?? DEFAULT_SKIN] ?? SKINS[DEFAULT_SKIN];

  // ── Estado ──────────────────────────────────────────────────────────────────
  let board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropAccum = 0;
  let dropInterval = dropIntervalFor(1);
  let state: State = "playing";

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;

  // ── Eventos: solo se emiten cuando el valor cambia ──────────────────────────
  const LIVES = 1;
  let emittedScore: number | null = null;
  let emittedLives: number | null = null;
  let emittedLevel: number | null = null;

  function syncEvents() {
    if (score !== emittedScore) {
      emittedScore = score;
      events.onScore(score);
    }
    if (emittedLives !== LIVES) {
      emittedLives = LIVES;
      events.onLives(LIVES);
    }
    if (level !== emittedLevel) {
      emittedLevel = level;
      events.onLevel(level);
    }
  }

  // ── Lógica ──────────────────────────────────────────────────────────────────
  function collide(shape: Shape, ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function tryRotate() {
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge() {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array<number>(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] ?? 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = dropIntervalFor(level);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  // Función aparte: evita que TS estreche `state` dentro de `update`.
  const isGameOver = (): boolean => state === "gameover";

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      state = "gameover";
      syncEvents();
      events.onGameOver({ score, level });
    }
  }

  function lockPiece() {
    merge();
    clearLines();
    spawn();
  }

  function hardDrop() {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = dropIntervalFor(1);
    dropAccum = 0;
    state = "playing";
    next = randomPiece();
    spawn();
  }

  function handleKey(code: string) {
    switch (code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      input.reset();
      return;
    }

    for (const code of input.drain()) {
      handleKey(code);
      if (isGameOver()) {
        syncEvents();
        return;
      }
    }

    dropAccum += dt * 1000;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) current.y++;
      else lockPiece();
    }

    syncEvents();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw(c: CanvasRenderingContext2D) {
    setDrawSkin(skin);
    c.imageSmoothingEnabled = !skin.pixelated;
    drawBackground(c);
    drawGrid(c);
    drawBoard(c, board);
    drawPiece(c, current, ghostY(), true);
    drawPiece(c, current);
    drawPanel(c, { score, lines, level, next });
    drawOverlay(c);
  }

  // ── Bucle principal ─────────────────────────────────────────────────────────
  function loop(ts: number) {
    if (destroyed || paused || !ctx) return;
    const dt =
      lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    update(dt);
    draw(ctx);
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
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
  startLoop();

  return {
    pause() {
      if (destroyed || paused) return;
      paused = true;
      stopLoop();
      input.reset();
    },
    resume() {
      if (destroyed || !paused) return;
      paused = false;
      input.reset();
      startLoop();
    },
    restart() {
      if (destroyed) return;
      paused = false;
      input.reset();
      initGame();
      emittedScore = emittedLives = emittedLevel = null;
      syncEvents();
      startLoop();
    },
    setSkin(id) {
      if (destroyed || !SKINS[id]) return;
      skin = SKINS[id];
      // En pausa no hay bucle: redibuja para ver el cambio al instante.
      if (paused && ctx) draw(ctx);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopLoop();
      input.dispose();
    },
  };
};
