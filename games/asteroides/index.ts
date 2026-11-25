import type { CreateGame } from "../types";
import { H, POINTS, POWERUP_DROP_CHANCE, POWERUP_DURATION, W } from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  setDrawSkin,
} from "./entities";
import { DEFAULT_SKIN, SKINS } from "./skins";
import { createInput } from "./input";
import { dist, rand } from "./utils";

type State = "playing" | "dead" | "gameover";

export const createGame: CreateGame = (canvas, events, options) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  canvas.width = W;
  canvas.height = H;

  const input = createInput();
  let skin = SKINS[options?.skin ?? DEFAULT_SKIN] ?? SKINS[DEFAULT_SKIN];

  // ── Estado ──────────────────────────────────────────────────────────────────
  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: State = "playing";
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;

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
  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    state = "playing";
    spawnAsteroids(4);
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }

  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      state = "gameover";
      syncEvents();
      events.onGameOver({ score, level });
    } else {
      state = "dead";
      deadTimer = 2;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (input.pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, input.keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado (no si la partida acaba de terminar)
    if (state === "playing" && asteroids.length === 0) nextLevel();

    syncEvents();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawLifeIcon(x: number, y: number) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    ctx.strokeStyle = skin.hud;
    ctx.lineWidth = 1.2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -5);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawHUD(c: CanvasRenderingContext2D) {
    c.fillStyle = skin.hud;
    c.font = "15px monospace";

    c.textAlign = "left";
    c.fillText(`SCORE  ${score}`, 14, 26);

    c.textAlign = "center";
    c.fillText(`NIVEL ${level}`, W / 2, 26);

    for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);

    if (ship.tripleShot > 0) {
      c.textAlign = "left";
      c.fillStyle = skin.hudAccent;
      c.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
    }
  }

  function draw(c: CanvasRenderingContext2D) {
    setDrawSkin(skin);
    c.imageSmoothingEnabled = !skin.pixelated;
    c.fillStyle = skin.bg;
    c.fillRect(0, 0, W, H);

    c.save();
    particles.forEach((p) => p.draw(c));
    asteroids.forEach((a) => a.draw(c));
    powerUps.forEach((p) => p.draw(c));
    bullets.forEach((b) => b.draw(c));
    ship.draw(c);
    c.restore();

    drawHUD(c);

    if (skin.scanlines) {
      c.fillStyle = "rgba(0,0,0,0.25)";
      for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
    }
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
