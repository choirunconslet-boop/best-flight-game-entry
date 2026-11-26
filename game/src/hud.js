// hud.js — flight instruments, course info and menus, all drawn on the canvas.
// The judge reads altitude, speed and heading here, so they stay big and lit.

import { RINGS } from './world.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8, 18, 30, 0.72)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 200, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function label(ctx, text, x, y, size = 12, color = '#9fc6e8') {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, size = 26, color = '#ffffff') {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function drawCompass(ctx, heading, w) {
  const cx = w / 2;
  const deg = ((heading * 180) / Math.PI % 360 + 360) % 360;
  panel(ctx, cx - 190, 12, 380, 46);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - 190, 12, 380, 46, 10);
  ctx.clip();
  const pxPerDeg = 2.1;
  for (let d = -60; d <= 420; d += 5) {
    const rel = ((d - deg + 540) % 360) - 180;
    const x = cx + rel * pxPerDeg;
    if (x < cx - 190 || x > cx + 190) continue;
    const major = d % 30 === 0;
    ctx.strokeStyle = major ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(x, 22);
    ctx.lineTo(x, major ? 34 : 28);
    ctx.stroke();
    if (major) {
      const names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
      const deg360 = ((d % 360) + 360) % 360;
      const t = names[deg360] ?? String(deg360);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t, x, 50);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#ffb020';
  ctx.beginPath();
  ctx.moveTo(cx, 12);
  ctx.lineTo(cx - 6, 24);
  ctx.lineTo(cx + 6, 24);
  ctx.closePath();
  ctx.fill();
  value(ctx, `${String(Math.round(deg)).padStart(3, '0')}°`, cx - 24, 74, 15, '#ffb020');
}

function drawArtificialHorizon(ctx, x, y, r, bank, pitch) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-bank);
  const pitchPx = Math.max(-r, Math.min(r, pitch * r * 2.2));
  ctx.fillStyle = '#3f8fd0';
  ctx.fillRect(-r, -r + pitchPx, r * 2, r - pitchPx);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, pitchPx, r * 2, r - pitchPx + r);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchPx);
  ctx.lineTo(r, pitchPx);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  // Fixed wings marker.
  ctx.fillStyle = '#ffb020';
  ctx.fillRect(x - r - 4, y - 2, 14, 4);
  ctx.fillRect(x + r - 10, y - 2, 14, 4);
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

function drawGaugeBar(ctx, x, y, w, frac, color, labelText) {
  label(ctx, labelText, x, y - 6, 11);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(4, w * Math.max(0, Math.min(1, frac))), 10, 5);
  ctx.fill();
}

function drawHud(ctx, state, w, h) {
  const altFt = Math.round(state.alt * 10); // 1 world unit reads as 10 ft
  const knots = Math.round(state.speed * 1.9);
  const deg = ((state.heading * 180) / Math.PI % 360 + 360) % 360;

  drawCompass(ctx, state.heading, w);

  // Left instrument stack: altitude, speed, heading.
  panel(ctx, 14, 12, 208, 162);
  label(ctx, 'ALTITUDE', 28, 34);
  value(ctx, `${altFt.toLocaleString('en-US')} ft`, 28, 62, 26);
  label(ctx, 'SPEED', 28, 88);
  value(ctx, `${knots} kt`, 28, 114, 26);
  label(ctx, 'HEADING', 28, 140);
  value(ctx, `${String(Math.round(deg)).padStart(3, '0')}°`, 28, 166, 22);

  // Right stack: artificial horizon + fuel + throttle.
  panel(ctx, w - 222, 12, 208, 172);
  drawArtificialHorizon(ctx, w - 118, 56, 30, state.bank, state.pitch);
  label(ctx, 'ATTITUDE', w - 208, 106, 11);
  drawGaugeBar(ctx, w - 208, 122, 180, state.fuel / 100, state.fuel < 25 ? '#ff5a4e' : '#57d977', 'FUEL');
  drawGaugeBar(ctx, w - 208, 156, 180, state.throttle, '#ffb020', 'THROTTLE');

  // Course progress top-right below the stack.
  panel(ctx, w - 222, 196, 208, 64);
  label(ctx, 'COURSE', w - 208, 218);
  value(ctx, `Rings ${state.ringsPassed}/${RINGS.length}`, w - 208, 244, 20);
  label(ctx, state.ringsPassed >= RINGS.length ? '→ Land on the runway' : '→ Next ring is golden', w - 208, 256, 11, '#ffd970');

  // Score + timer, bottom left.
  panel(ctx, 14, h - 76, 250, 62);
  label(ctx, 'SCORE', 28, h - 52);
  value(ctx, String(state.score), 28, h - 24, 24);
  const mm = Math.floor(state.timeLeft / 60);
  const ss = Math.floor(state.timeLeft % 60);
  const timeColor = state.timeLeft < 30 ? '#ff5a4e' : '#ffffff';
  value(ctx, `${mm}:${String(ss).padStart(2, '0')}`, 168, h - 24, 24, timeColor);
  label(ctx, 'TIME', 168, h - 52);

  // Centre message.
  if (state.message && state.elapsed < state.messageUntil) {
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(state.message).width;
    ctx.fillStyle = 'rgba(8,18,30,0.72)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2 - 18, h * 0.2 - 34, tw + 36, 48, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd970';
    ctx.fillText(state.message, w / 2, h * 0.2);
  }
}

function drawCentred(ctx, lines, w, h) {
  ctx.fillStyle = 'rgba(6, 14, 26, 0.66)';
  ctx.fillRect(0, 0, w, h);
  let y = h * 0.3;
  for (const line of lines) {
    ctx.fillStyle = line.color;
    ctx.font = `${line.weight} ${line.size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(line.text, w / 2, y);
    y += line.gap;
  }
}

function drawMenu(ctx, w, h) {
  drawCentred(ctx, [
    { text: 'SKYLINE COURIER', size: 56, weight: 800, color: '#ffffff', gap: 66 },
    { text: 'Island Run — fly the mail plane, thread the golden rings, land her home', size: 20, weight: 600, color: '#ffd970', gap: 44 },
    { text: '↑ / W climb    ↓ / S descend    ← → / A D or mouse to steer', size: 18, weight: 600, color: '#dfeaf4', gap: 30 },
    { text: 'SHIFT faster · CTRL slower · C cockpit / chase view · P pause · M mute', size: 18, weight: 600, color: '#dfeaf4', gap: 30 },
    { text: '8 rings, then land on the runway. Rings add +15 seconds and +100 points.', size: 16, weight: 500, color: '#9fc6e8', gap: 52 },
    { text: 'Click or press ENTER to fly', size: 24, weight: 700, color: '#57d977', gap: 0 },
  ], w, h);
}

function drawEnd(ctx, state, w, h) {
  const won = state.phase === 'landed';
  const title = won ? 'TOUCHDOWN — RUN COMPLETE!' : state.phase === 'crashed' ? 'CRASHED!' : 'OUT OF TIME';
  const sub = won
    ? `Landing bonus +${state.landedBonus} — rings ${state.ringsPassed}/${RINGS.length}`
    : state.phase === 'crashed'
      ? `You clipped the terrain after ${state.ringsPassed} rings — the mail must go on!`
      : `The clock ran out after ${state.ringsPassed} rings — fly faster next time!`;
  drawCentred(ctx, [
    { text: title, size: 48, weight: 800, color: won ? '#57d977' : '#ff5a4e', gap: 60 },
    { text: sub, size: 19, weight: 600, color: '#dfeaf4', gap: 46 },
    { text: `FINAL SCORE  ${state.finalScore}`, size: 30, weight: 800, color: '#ffb020', gap: 58 },
    { text: 'Press R or click to fly again', size: 22, weight: 700, color: '#ffffff', gap: 0 },
  ], w, h);
}

export function drawOverlay(ctx, state, w, h) {
  if (state.phase === 'menu') drawMenu(ctx, w, h);
  else if (state.phase === 'flying') drawHud(ctx, state, w, h);
  else drawEnd(ctx, state, w, h);
  if (state.paused) {
    ctx.fillStyle = 'rgba(6,14,26,0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED — press P to resume', w / 2, h / 2);
  }
}
