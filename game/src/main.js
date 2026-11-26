// main.js — boot the game: canvas, loop, phase switching and screenshot mode.

import { createAudio } from './audio.js';
import { createGame, PHASE } from './game.js';
import { drawOverlay } from './hud.js';
import { createInput } from './input.js';
import { renderWorld } from './render.js';
import { applyShotPreset, shotNumber } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const game = createGame();
const state = game.state;
const input = createInput(canvas);
const audio = createAudio();

let last = performance.now();
let paused = false;
let shotMode = false;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resize);
resize();

function announce(text) {
  status.textContent = text;
}

function startFlying() {
  audio.unlock();
  game.reset();
  paused = false;
  announce('Flying. Thread the golden rings, then land on the runway.');
}

canvas.addEventListener('mousedown', () => {
  audio.unlock();
  if (state.phase === PHASE.MENU) startFlying();
  else if (state.phase !== PHASE.FLYING) { game.reset(); paused = false; }
});

window.addEventListener('keydown', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'Enter' && state.phase === PHASE.MENU) startFlying();
  else if (k === 'r' && state.phase !== PHASE.FLYING && state.phase !== PHASE.MENU) { game.reset(); paused = false; }
  else if (k === 'p' && state.phase === PHASE.FLYING) { paused = !paused; announce(paused ? 'Paused.' : 'Resumed.'); }
  else if (k === 'c' && state.phase === PHASE.FLYING) {
    state.camera = state.camera === 'chase' ? 'cockpit' : 'chase';
  } else if (k === 'm') {
    state.muted = audio.toggleMute();
  }
});

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (!shotMode && state.phase === PHASE.FLYING && !paused) {
    game.step(input, dt, audio);
    audio.setEngine(state.speed, state.throttle);
  }
  state.paused = paused;

  renderWorld(ctx, state, w, h, now / 1000);
  drawOverlay(ctx, state, w, h);
  requestAnimationFrame(frame);
}

// Screenshot mode: stage a preset, let a few frames render, then hold still.
const shot = shotNumber();
if (shot > 0) {
  shotMode = true;
  applyShotPreset(state, shot);
  state.paused = false; // no PAUSED banner over a screenshot
}

requestAnimationFrame(frame);
