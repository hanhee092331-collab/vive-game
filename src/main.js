const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 32,
  speed: 240,
};

const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.key));
window.addEventListener("keyup", (e) => keys.delete(e.key));

let lastTime = performance.now();

function update(dt) {
  const move = player.speed * dt;
  if (keys.has("ArrowUp") || keys.has("w")) player.y -= move;
  if (keys.has("ArrowDown") || keys.has("s")) player.y += move;
  if (keys.has("ArrowLeft") || keys.has("a")) player.x -= move;
  if (keys.has("ArrowRight") || keys.has("d")) player.x += move;

  player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(player.x, player.y, player.size, player.size);
}

function loop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;

  update(dt);
  render();

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
