// input.js — keyboard + mouse flight controls, one clear job: read the pilot.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0.5, y: 0.5, active: false, down: false };

  function keyOf(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(keyOf(e));
  });
  window.addEventListener('keyup', (e) => keys.delete(keyOf(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) / r.width;
    mouse.y = (e.clientY - r.top) / r.height;
    mouse.active = true;
  });
  canvas.addEventListener('mousedown', () => { mouse.down = true; });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  /** -1..1 roll demand: keys first, mouse steers when no keys are held. */
  function rollDemand() {
    if (keys.has('ArrowLeft') || keys.has('a')) return -1;
    if (keys.has('ArrowRight') || keys.has('d')) return 1;
    if (mouse.active) return Math.max(-1, Math.min(1, (mouse.x - 0.5) * 2.4));
    return 0;
  }

  /** -1..1 pitch demand: up = climb. */
  function pitchDemand() {
    if (keys.has('ArrowUp') || keys.has('w')) return 1;
    if (keys.has('ArrowDown') || keys.has('s')) return -1;
    if (mouse.active) return Math.max(-1, Math.min(1, (0.5 - mouse.y) * 2.4));
    return 0;
  }

  /** -1..1 throttle demand: Shift speeds up, Ctrl / S slows down. */
  function throttleDemand() {
    if (keys.has('Shift')) return 1;
    if (keys.has('Control')) return -1;
    if (keys.has('ArrowDown') && keys.has('ArrowUp')) return 0;
    return 0;
  }

  function pressed(name) {
    return keys.has(name);
  }

  function consume(name) {
    if (!keys.has(name)) return false;
    keys.delete(name);
    return true;
  }

  return { keys, mouse, rollDemand, pitchDemand, throttleDemand, pressed, consume };
}
