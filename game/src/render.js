// render.js — pseudo-3D forward view: sky, terrain mesh, rings, runway,
// the courier plane (chase view) or the cockpit frame (cockpit view).

import { ISLANDS, RINGS, RUNWAY, terrainColor, terrainHeight } from './world.js';

const FOCAL = 620; // perspective focal length in pixels
const NEAR = 12;

/** Project a world point into screen space. Returns null behind the camera. */
export function project(cam, point, w, h) {
  const dx = point.x - cam.x;
  const dy = point.y - cam.y;
  const dz = point.z - cam.z;
  const sin = Math.sin(cam.heading);
  const cos = Math.cos(cam.heading);
  // Rotate into camera space: forward = +z, right = +x.
  const cx = dx * cos - dz * sin;
  const cy = dy;
  const cz = dx * sin + dz * cos;
  if (cz < NEAR) return null;
  const horizon = h * 0.46 - Math.tan(cam.pitch) * FOCAL;
  const scale = FOCAL / cz;
  return {
    x: w / 2 + cx * scale,
    y: horizon - cy * scale,
    scale,
    depth: cz,
  };
}

function drawSky(ctx, w, h, heading, pitch, time) {
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  g.addColorStop(0, '#2f6fb2');
  g.addColorStop(0.55, '#7fb4dd');
  g.addColorStop(1, '#dceefb');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h * 0.62);

  // Sun, fixed in the sky ahead-left.
  const sunX = w * 0.22;
  const sunY = h * 0.16 - pitch * 300;
  const sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 70);
  sg.addColorStop(0, 'rgba(255,244,200,0.95)');
  sg.addColorStop(0.35, 'rgba(255,220,130,0.55)');
  sg.addColorStop(1, 'rgba(255,220,130,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
  ctx.fill();

  // Drifting clouds, placed by heading so they move as you turn.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 9; i++) {
    const base = i * 0.73 + 0.4;
    let cx = ((base - heading * 0.22) % 1.3 + 1.3) % 1.3 - 0.15;
    const cy = h * (0.08 + (i % 4) * 0.09) - pitch * 260 + Math.sin(time * 0.1 + i) * 3;
    const cw = 90 + (i % 3) * 46;
    ctx.beginPath();
    ctx.ellipse(cx * w, cy, cw, 15 + (i % 3) * 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx * w + cw * 0.32, cy + 7, cw * 0.55, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSea(ctx, w, h, pitch) {
  const horizon = h * 0.46 - Math.tan(pitch) * FOCAL;
  const g = ctx.createLinearGradient(0, horizon, 0, h);
  g.addColorStop(0, '#2e7fb5');
  g.addColorStop(1, '#0d4a75');
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.max(0, horizon), w, h);
}

function drawTerrainMesh(ctx, cam, w, h) {
  const sin = Math.sin(cam.heading);
  const cos = Math.cos(cam.heading);
  const rows = 22;
  const cols = 26;
  const maxDist = 1500;
  const halfWidth = 700;
  // Distances grow geometrically: detail close, reach far.
  const dists = [];
  for (let i = 0; i < rows; i++) {
    dists.push(30 * Math.pow(maxDist / 30, i / (rows - 1)));
  }
  const grid = [];
  for (let r = 0; r < rows; r++) {
    const d = dists[r];
    const row = [];
    for (let c = 0; c < cols; c++) {
      const o = -halfWidth + (2 * halfWidth * c) / (cols - 1);
      const wx = cam.x + (-sin * d + cos * o);
      const wz = cam.z + (cos * d + sin * o);
      const wy = terrainHeight(wx, wz);
      const p = project(cam, { x: wx, y: wy, z: wz }, w, h);
      row.push({ p, h: wy, d });
    }
    grid.push(row);
  }
  // Far rows first so near quads paint over them.
  for (let r = rows - 2; r >= 0; r--) {
    for (let c = 0; c < cols - 1; c++) {
      const a = grid[r][c];
      const b = grid[r][c + 1];
      const cc = grid[r + 1][c + 1];
      const dd = grid[r + 1][c];
      if (!a.p || !b.p || !cc.p || !dd.p) continue;
      const hAvg = (a.h + b.h + cc.h + dd.h) / 4;
      const shade = Math.max(0.55, Math.min(1, 1.06 - a.d / 3200));
      // Deterministic per-quad jitter breaks up flat colour slabs.
      const hash = Math.abs(Math.sin(r * 12.9898 + c * 78.233) * 43758.5453) % 1;
      ctx.fillStyle = terrainColor(hAvg, shade * (0.88 + hash * 0.24));
      ctx.beginPath();
      ctx.moveTo(a.p.x, a.p.y);
      ctx.lineTo(b.p.x, b.p.y);
      ctx.lineTo(cc.p.x, cc.p.y);
      ctx.lineTo(dd.p.x, dd.p.y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawRing(ctx, cam, ring, passed, w, h, time) {
  const p = project(cam, ring, w, h);
  if (!p) return;
  // A ring you are inside (or just flew through) fills the screen: hide it.
  if (p.depth < 120) return;
  const rad = ring.r * p.scale;
  if (rad < 2 || rad > 900) return;
  const pulse = 1 + Math.sin(time * 3) * 0.04;
  const alpha = passed ? 0.3 : 1; // passed rings fade into the background
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  ctx.scale(pulse, pulse);
  ctx.lineWidth = Math.max(3, rad * 0.09);
  ctx.strokeStyle = passed ? 'rgba(120,200,120,0.55)' : '#ffb020';
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, rad * 0.035);
  ctx.strokeStyle = passed ? 'rgba(220,255,220,0.7)' : '#fff3cf';
  ctx.beginPath();
  ctx.arc(0, 0, rad, 0, Math.PI * 2);
  ctx.stroke();
  // Chevrons on the ring so its facing reads at a glance.
  ctx.fillStyle = passed ? '#cfeccd' : '#ffd970';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + time * 0.4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * rad, Math.sin(a) * rad, Math.max(2, rad * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRunway(ctx, cam, w, h) {
  const pts = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const z = RUNWAY.zStart + ((RUNWAY.zEnd - RUNWAY.zStart) * i) / steps;
    const half = RUNWAY.width / 2;
    const left = project(cam, { x: RUNWAY.x - half, y: 14.5, z }, w, h);
    const right = project(cam, { x: RUNWAY.x + half, y: 14.5, z }, w, h);
    const mid = project(cam, { x: RUNWAY.x, y: 14.5, z }, w, h);
    pts.push({ left, right, mid, z });
  }
  for (let i = 0; i < steps; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a.left || !a.right || !b.left || !b.right) continue;
    ctx.fillStyle = i % 2 === 0 ? '#3a3f46' : '#34383e';
    ctx.beginPath();
    ctx.moveTo(a.left.x, a.left.y);
    ctx.lineTo(a.right.x, a.right.y);
    ctx.lineTo(b.right.x, b.right.y);
    ctx.lineTo(b.left.x, b.left.y);
    ctx.closePath();
    ctx.fill();
    // Centreline dash.
    if (a.mid && b.mid) {
      ctx.strokeStyle = '#f5f0dc';
      ctx.lineWidth = Math.max(1, 3 * a.mid.scale);
      ctx.beginPath();
      ctx.moveTo(a.mid.x, a.mid.y);
      ctx.lineTo(b.mid.x, b.mid.y);
      ctx.stroke();
    }
  }
  // Threshold bars at the near end.
  const t = pts[0];
  if (t.left && t.right) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, 6 * t.left.scale);
    ctx.beginPath();
    ctx.moveTo(t.left.x, t.left.y);
    ctx.lineTo(t.right.x, t.right.y);
    ctx.stroke();
  }
  // Windsock mast beside the runway.
  const sock = project(cam, { x: RUNWAY.x + 60, y: 38, z: RUNWAY.zStart + 60 }, w, h);
  const sockBase = project(cam, { x: RUNWAY.x + 60, y: 14, z: RUNWAY.zStart + 60 }, w, h);
  if (sock && sockBase) {
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sockBase.x, sockBase.y);
    ctx.lineTo(sock.x, sock.y);
    ctx.stroke();
    ctx.fillStyle = '#ff7a2f';
    ctx.beginPath();
    ctx.moveTo(sock.x, sock.y);
    ctx.lineTo(sock.x + 18 * sock.scale, sock.y + 3);
    ctx.lineTo(sock.x, sock.y + 7 * sock.scale);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlaneChase(ctx, w, h, bank, pitch, time) {
  const cx = w / 2;
  const cy = h * 0.66;
  const s = Math.min(w, h) / 560;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bank * 0.9);
  ctx.scale(s, s);
  // Propeller blur.
  ctx.fillStyle = 'rgba(200,210,220,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, -58, 5, 26 + Math.sin(time * 40) * 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Wings.
  ctx.fillStyle = '#d8433a';
  ctx.beginPath();
  ctx.moveTo(-118, 6);
  ctx.lineTo(-96, -14);
  ctx.lineTo(96, -14);
  ctx.lineTo(118, 6);
  ctx.lineTo(96, 14);
  ctx.lineTo(-96, 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  ctx.moveTo(-96, -14);
  ctx.lineTo(-58, -14);
  ctx.lineTo(-58, 14);
  ctx.lineTo(-96, 14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(96, -14);
  ctx.lineTo(58, -14);
  ctx.lineTo(58, 14);
  ctx.lineTo(96, 14);
  ctx.closePath();
  ctx.fill();
  // Tail.
  ctx.fillStyle = '#d8433a';
  ctx.beginPath();
  ctx.moveTo(-34, 52);
  ctx.lineTo(-52, 66);
  ctx.lineTo(52, 66);
  ctx.lineTo(34, 52);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  const fg = ctx.createLinearGradient(0, -70, 0, 62);
  fg.addColorStop(0, '#f6f2e8');
  fg.addColorStop(1, '#c9c2ae');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, -72);
  ctx.quadraticCurveTo(20, -30, 16, 30);
  ctx.quadraticCurveTo(14, 58, 0, 64);
  ctx.quadraticCurveTo(-14, 58, -16, 30);
  ctx.quadraticCurveTo(-20, -30, 0, -72);
  ctx.fill();
  // Canopy.
  ctx.fillStyle = '#7ec4e8';
  ctx.beginPath();
  ctx.ellipse(0, -38, 11, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-3, -44, 4, 9, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Mail stripe + nose.
  ctx.fillStyle = '#ffb020';
  ctx.fillRect(-15, 6, 30, 7);
  ctx.fillStyle = '#33414f';
  ctx.beginPath();
  ctx.ellipse(0, -70, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCockpit(ctx, w, h, bank, pitch) {
  // Dashboard.
  const dashH = h * 0.3;
  const dg = ctx.createLinearGradient(0, h - dashH, 0, h);
  dg.addColorStop(0, '#2c3138');
  dg.addColorStop(1, '#14171b');
  ctx.fillStyle = dg;
  ctx.fillRect(0, h - dashH, w, dashH);
  ctx.fillStyle = '#1d2126';
  ctx.fillRect(0, h - dashH, w, 6);
  // Glareshield.
  ctx.fillStyle = '#0e1113';
  ctx.beginPath();
  ctx.moveTo(0, h - dashH);
  ctx.quadraticCurveTo(w / 2, h - dashH - 26, w, h - dashH);
  ctx.lineTo(w, h - dashH + 14);
  ctx.quadraticCurveTo(w / 2, h - dashH - 8, 0, h - dashH + 14);
  ctx.closePath();
  ctx.fill();
  // Slim A-pillars: thin wedges at the windscreen edges, not black slabs.
  ctx.fillStyle = '#14171b';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w * 0.07, h * 0.3);
  ctx.lineTo(w * 0.07, h * 0.44);
  ctx.lineTo(0, h * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w * 0.93, h * 0.3);
  ctx.lineTo(w * 0.93, h * 0.44);
  ctx.lineTo(w, h * 0.36);
  ctx.closePath();
  ctx.fill();
  // Yoke.
  ctx.strokeStyle = '#3a4046';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 46, h - 8);
  ctx.lineTo(w / 2 - 46, h - 74);
  ctx.lineTo(w / 2 + 46, h - 74);
  ctx.lineTo(w / 2 + 46, h - 8);
  ctx.stroke();
  ctx.save();
  ctx.translate(w / 2, h - 74);
  ctx.rotate(bank * 0.7);
  ctx.fillStyle = '#22262b';
  ctx.fillRect(-58, -9, 116, 18);
  ctx.restore();
}

/** Draw one frame of the world (no HUD, no menus). */
export function renderWorld(ctx, state, w, h, time) {
  const cam = { x: state.x, y: state.alt, z: state.z, heading: state.heading, pitch: state.pitch };
  drawSky(ctx, w, h, state.heading, state.pitch, time);
  drawSea(ctx, w, h, state.pitch);
  drawTerrainMesh(ctx, cam, w, h);
  drawRunway(ctx, cam, w, h);
  for (let i = 0; i < RINGS.length; i++) {
    drawRing(ctx, cam, RINGS[i], state.ringStates[i] === 'passed', w, h, time);
  }
  if (state.camera === 'chase') drawPlaneChase(ctx, w, h, state.bank, state.pitch, time);
  else drawCockpit(ctx, w, h, state.bank, state.pitch);
  // Distance haze over far islands: soft white veil near the horizon.
  const horizon = h * 0.46 - Math.tan(state.pitch) * FOCAL;
  const hg = ctx.createLinearGradient(0, horizon - 60, 0, horizon + 30);
  hg.addColorStop(0, 'rgba(220,238,251,0)');
  hg.addColorStop(1, 'rgba(220,238,251,0.25)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, horizon - 60, w, 90);
  void ISLANDS;
}
