import type { CreateGame } from "../types";
import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_H,
  BLOCK_POINTS,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  EXPLOSION_DURATION,
  H,
  LIVES,
  MAX_DT,
  MAX_LEVEL,
  PADDLE,
  PADDLE_SPEED,
  SOUND_BOUNCE_SRC,
  SOUND_BREAK_SRC,
  W,
} from "./constants";
import {
  drawBall,
  drawBlock,
  drawExplosion,
  drawPaddle,
  type Ball,
  type Block,
  type Explosion,
  type Paddle,
} from "./entities";
import { createInput } from "./input";
import { LEVELS } from "./levels";
import { loadSpritesheet } from "./sprites";

type State = "playing" | "gameover";

export const createGame: CreateGame = (canvas, events) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  canvas.width = W;
  canvas.height = H;

  const bounceSound = new Audio(SOUND_BOUNCE_SRC);
  const breakSound = new Audio(SOUND_BREAK_SRC);

  function play(sound: HTMLAudioElement) {
    (sound.cloneNode() as HTMLAudioElement).play().catch(() => {});
  }

  // ── Estado ──────────────────────────────────────────────────────────────────
  const paddle: Paddle = { x: 0, y: PADDLE.y, w: PADDLE.w, h: PADDLE.h };
  const ball: Ball = {
    x: 0,
    y: 0,
    w: BALL_SIZE,
    h: BALL_SIZE,
    vx: BASE_BALL_VX,
    vy: BASE_BALL_VY,
  };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let lives = LIVES;
  let score = 0;
  let level = 1;
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

  // ── Lógica ──────────────────────────────────────────────────────────────────
  function placeBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    placeBall();
  }

  function initGame() {
    score = 0;
    lives = LIVES;
    state = "playing";
    paddle.x = (W - paddle.w) / 2;
    loadLevel(1);
  }

  function collideAABB(b: Block): boolean {
    return (
      ball.x < b.x + b.w &&
      ball.x + ball.w > b.x &&
      ball.y < b.y + b.h &&
      ball.y + ball.h > b.y
    );
  }

  function endGame(finalLevel: number) {
    state = "gameover";
    syncEvents();
    events.onGameOver({ score, level: finalLevel });
  }

  const input = createInput(canvas, (mouseX) => {
    if (paused || state !== "playing") return;
    paddle.x = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
  });

  function update(dt: number) {
    if (state !== "playing") return;

    if (input.isLeft()) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (input.isRight())
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      play(bounceSound);
    }

    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      play(bounceSound);
    }

    for (const block of blocks) {
      if (!block.alive) continue;
      if (collideAABB(block)) {
        block.alive = false;
        explosions.push({
          x: block.x,
          y: block.y,
          w: block.w,
          h: block.h,
          color: block.color,
          elapsed: 0,
        });
        score += BLOCK_POINTS;
        ball.vy = -ball.vy;
        play(breakSound);
        if (blocks.every((b) => !b.alive)) {
          if (level < MAX_LEVEL) {
            loadLevel(level + 1);
          } else {
            endGame(MAX_LEVEL);
            return;
          }
        }
        break; // un bloque por frame
      }
    }

    for (const e of explosions) e.elapsed += dt * 1000;
    explosions = explosions.filter((e) => e.elapsed < EXPLOSION_DURATION);

    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        endGame(level);
        return;
      }
      placeBall();
    }
  }

  // ── Dibujo ──────────────────────────────────────────────────────────────────
  function drawHud(c: CanvasRenderingContext2D) {
    c.fillStyle = "#fff";
    c.font = "bold 18px monospace";
    c.textAlign = "left";
    c.textBaseline = "top";
    c.fillText(`Score: ${score}`, 10, 10);
    c.textAlign = "center";
    c.fillText(`Nivel: ${level}`, W / 2, 10);
    const spacing = 4;
    for (let i = 0; i < lives; i++) {
      const bx = W - 10 - (lives - i) * (BALL_SIZE + spacing);
      drawBall(c, { x: bx, y: 10, w: BALL_SIZE, h: BALL_SIZE });
    }
  }

  function draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    for (const b of blocks) drawBlock(c, b);
    for (const e of explosions) drawExplosion(c, e);
    drawPaddle(c, paddle);
    drawBall(c, ball);
    if (state === "playing") drawHud(c);
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

  loadSpritesheet(() => {
    if (destroyed) return;
    ready = true;
    if (!paused) startLoop();
  });

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
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopLoop();
      input.dispose();
    },
  };
};
