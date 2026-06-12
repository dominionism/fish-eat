export interface Fish {
  x: number;
  y: number;
  size: number;
  speed: number;
  dir: number;
  color: string;
  tailColor: string;
}

interface Player extends Fish {
  grow(amount: number): void;
}

interface Bubble {
  x: number;
  y: number;
  r: number;
  speed: number;
  opacity: number;
}

interface Seaweed {
  x: number;
  height: number;
  width: number;
  hue: number;
  phase: number;
}

type GameState = "start" | "playing" | "gameover";

const W = 900;
const H = 550;
const FISH_COUNT = 18;

const fishPalette: [string, string][] = [
  ["#4fc3f7", "#0288d1"],
  ["#81c784", "#388e3c"],
  ["#e57373", "#c62828"],
  ["#ffb74d", "#e65100"],
  ["#ba68c8", "#6a1b9a"],
  ["#4dd0e1", "#00838f"],
  ["#fff176", "#f9a825"],
  ["#f06292", "#ad1457"],
];

function createPlayer(): Player {
  return {
    x: W / 2,
    y: H / 2,
    size: 28,
    speed: 4,
    dir: 1,
    color: "#f4a460",
    tailColor: "#e8832a",
    grow(amount: number) {
      this.size += amount;
    },
  };
}

const MAX_AI_SIZE = 80;

function spawnFish(player: Player): Fish {
  const minS = Math.max(10, player.size * 0.3);
  const maxS = Math.min(MAX_AI_SIZE, player.size * 2.2);
  const s = minS + Math.random() * (maxS - minS);
  const L = Math.random() < 0.5;
  const p = fishPalette[Math.floor(Math.random() * fishPalette.length)];
  return {
    x: L ? -s : W + s,
    y: 30 + Math.random() * (H - 60),
    size: s,
    speed: 1 + Math.random() * 2.5,
    dir: L ? 1 : -1,
    color: p[0],
    tailColor: p[1],
  };
}

function initBubbles(): Bubble[] {
  const bubbles: Bubble[] = [];
  for (let i = 0; i < 25; i++) {
    bubbles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 2 + Math.random() * 5,
      speed: 0.3 + Math.random() * 0.8,
      opacity: 0.15 + Math.random() * 0.3,
    });
  }
  return bubbles;
}

function initSeaweed(): Seaweed[] {
  const seaweed: Seaweed[] = [];
  for (let i = 0; i < 12; i++) {
    seaweed.push({
      x: Math.random() * W,
      height: 40 + Math.random() * 100,
      width: 8 + Math.random() * 12,
      hue: 100 + Math.random() * 40,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return seaweed;
}

// ── Drawing helpers ──

function drawFishShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  dir: number,
  color: string,
  tailColor: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  ctx.beginPath();
  ctx.ellipse(-size * 0.05, 0, size * 0.7, size * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-size * 0.7, -size * 0.3);
  ctx.lineTo(-size * 1.05, 0);
  ctx.lineTo(-size * 0.7, size * 0.3);
  ctx.closePath();
  ctx.fillStyle = tailColor;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(size * 0.35, -size * 0.08, size * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(size * 0.38, -size * 0.08, size * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = "#111";
  ctx.fill();

  ctx.restore();
}

function drawBubble(ctx: CanvasRenderingContext2D, b: Bubble) {
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200,230,255,${b.opacity})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${b.opacity * 0.8})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawSeaweed(ctx: CanvasRenderingContext2D, s: Seaweed, now: number) {
  ctx.save();
  ctx.translate(s.x, H);
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const sw = Math.sin(now * 0.001 + s.phase + t * 2) * 4;
    const h = -s.height * t;
    ctx.beginPath();
    ctx.moveTo(sw, 0);
    ctx.lineTo(sw + s.width * 0.5, h);
    ctx.lineWidth = (1 - t) * s.width;
    ctx.strokeStyle = `hsla(${s.hue},60%,${20 + t * 15}%,0.7)`;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, seaweed: Seaweed[], now: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0d1b3e");
  g.addColorStop(0.5, "#0c2d5a");
  g.addColorStop(1, "#062040");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const s = ctx.createLinearGradient(0, H - 30, 0, H);
  s.addColorStop(0, "#3d2b1f");
  s.addColorStop(1, "#5c4033");
  ctx.fillStyle = s;
  ctx.fillRect(0, H - 30, W, 30);

  seaweed.forEach((w) => drawSeaweed(ctx, w, now));
}

// ── Update helpers ──

function fishOverlap(a: Fish, b: Fish): boolean {
  // Fish bodies are ellipses: rx = size*0.7, ry = size*0.35 (2:1 aspect)
  // Scale Y by 2 to turn them into circles, then do circle collision
  const dx = a.x - b.x;
  const dy = (a.y - b.y) * 2;
  const d = Math.sqrt(dx * dx + dy * dy);
  return d < (a.size + b.size) * 0.7;
}

function updateAI(aiFish: Fish[], now: number) {
  aiFish.forEach((f) => {
    // Swim horizontally in their assigned direction with slight vertical drift
    const wanderY = Math.sin(now * 0.002 + f.size * 3) * 0.5;
    f.x += f.dir * f.speed;
    f.y += wanderY;

    // Clamp vertical
    f.y = Math.max(f.size * 0.5, Math.min(H - f.size * 0.5 - 30, f.y));

    // Wrap around — fish that exits one side reappears on the other
    if (f.x > W + f.size) {
      f.x = -f.size;
      f.y = 30 + Math.random() * (H - 60);
    } else if (f.x < -f.size) {
      f.x = W + f.size;
      f.y = 30 + Math.random() * (H - 60);
    }
  });
}

function updateBubbles(bubbles: Bubble[]) {
  bubbles.forEach((b) => {
    b.y -= b.speed;
    if (b.y < -10) {
      b.y = H + 10;
      b.x = Math.random() * W;
    }
  });
}

// ── Main game init ──

export function initGame(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;

  let state: GameState = "start";
  let score = 0;
  let player: Player = createPlayer();
  let aiFish: Fish[] = [];
  let bubbles: Bubble[] = initBubbles();
  let seaweed: Seaweed[] = initSeaweed();
  let frames = 0;

  const keys: Record<string, boolean> = {};

  function handleKeyDown(e: KeyboardEvent) {
    keys[e.key] = true;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === " " || e.key === "w" || e.key === "a" || e.key === "s" || e.key === "d") {
      e.preventDefault();
    }
    if (e.key === "Enter" && (state === "start" || state === "gameover")) {
      startGame();
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    keys[e.key] = false;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === " " || e.key === "w" || e.key === "a" || e.key === "s" || e.key === "d") {
      e.preventDefault();
    }
  }

  function handleInput() {
    if (keys["ArrowLeft"] || keys["a"]) {
      player.x -= player.speed;
      player.dir = -1;
    }
    if (keys["ArrowRight"] || keys["d"]) {
      player.x += player.speed;
      player.dir = 1;
    }
    if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
    if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;

    player.x = Math.max(player.size * 0.7, Math.min(W - player.size * 0.7, player.x));
    player.y = Math.max(player.size * 0.5, Math.min(H - player.size * 0.5 - 30, player.y));
  }

  function checkCollisions() {
    for (let i = aiFish.length - 1; i >= 0; i--) {
      const f = aiFish[i];
      if (!fishOverlap(player, f)) continue;
      if (player.size > f.size) {
        score += Math.floor(f.size * 10);
        player.grow(f.size * 0.1);
        aiFish[i] = spawnFish(player);
      } else if (f.size > player.size) {
        state = "gameover";
        return;
      }
    }
  }

  function startGame() {
    player = createPlayer();
    score = 0;
    aiFish = [];
    for (let i = 0; i < FISH_COUNT; i++) aiFish.push(spawnFish(player));
    state = "playing";
  }

  function update() {
    if (state !== "playing") return;
    handleInput();
    updateAI(aiFish, frames);
    checkCollisions();
    updateBubbles(bubbles);
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    const now = frames;

    if (state === "start") {
      drawBackground(ctx, seaweed, now);
      ctx.fillStyle = "#fff";
      ctx.font = 'bold 56px "Segoe UI",sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("fish eat", W / 2, H / 2 - 40);
      ctx.font = '18px "Segoe UI",sans-serif';
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText("eat the small fish  •  avoid the big ones", W / 2, H / 2 + 15);
      ctx.font = '14px "Segoe UI",sans-serif';
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("arrow keys or WASD to move", W / 2, H / 2 + 50);
      const p = Math.sin(now * 0.003) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255,255,255,${p})`;
      ctx.font = 'bold 22px "Segoe UI",sans-serif';
      ctx.fillText("press ENTER to start", W / 2, H / 2 + 95);
    } else if (state === "gameover") {
      drawBackground(ctx, seaweed, now);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = 'bold 48px "Segoe UI",sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("you got eaten!", W / 2, H / 2 - 40);
      ctx.fillStyle = "#fff";
      ctx.font = '28px "Segoe UI",sans-serif';
      ctx.fillText("score: " + score, W / 2, H / 2 + 20);
      const p = Math.sin(now * 0.003) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255,255,255,${p})`;
      ctx.font = 'bold 22px "Segoe UI",sans-serif';
      ctx.fillText("press ENTER to play again", W / 2, H / 2 + 65);
    } else if (state === "playing") {
      drawBackground(ctx, seaweed, now);
      bubbles.forEach((b) => drawBubble(ctx, b));
      aiFish.forEach((f) => drawFishShape(ctx, f.x, f.y, f.size, f.dir, f.color, f.tailColor));
      drawFishShape(ctx, player.x, player.y, player.size, player.dir, player.color, player.tailColor);
      ctx.fillStyle = "#fff";
      ctx.font = 'bold 20px "Segoe UI",sans-serif';
      ctx.textAlign = "left";
      ctx.fillText("score: " + score, 16, 30);
    }
  }

  function tick() {
    update();
    render();
    frames++;
  }

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  function stop() {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  }

  return { start: tick, stop };
}
