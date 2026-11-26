// shots.js — screenshot presets: real game states, staged for the camera.
// ?shot=1..4 on the page URL places the plane mid-course and pauses the sim
// so a screenshot catches the game at its best. Nothing here edits the game.

import { RINGS } from './world.js';

const PRESETS = {
  // Cover: chase view, golden ring dead ahead over a green island coast.
  1: { x: -40, alt: 74, z: 300, heading: 0.06, bank: 0.08, pitch: 0.02, speed: 86, ringsPassed: 0, camera: 'chase' },
  // Cockpit view on final approach: runway, windsock and instruments lit.
  2: { x: 40, alt: 46, z: 3560, heading: 0.0, bank: 0.0, pitch: -0.05, speed: 72, ringsPassed: 8, camera: 'cockpit' },
  // Low pass along the coast, ring ahead, snow-capped peak behind.
  3: { x: 180, alt: 88, z: 1150, heading: -0.05, bank: -0.1, pitch: 0.03, speed: 96, ringsPassed: 2, camera: 'chase' },
  // Cockpit view threading a ring over the sea at golden light.
  4: { x: 120, alt: 82, z: 780, heading: 0.05, bank: 0.05, pitch: 0.0, speed: 90, ringsPassed: 1, camera: 'cockpit' },
};

/** Read ?shot=N from the URL. Returns 0 when absent. */
export function shotNumber() {
  const n = Number(new URLSearchParams(window.location.search).get('shot'));
  return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 0;
}

/** Apply a preset to a fresh game state and mark its rings as passed so far. */
export function applyShotPreset(state, n) {
  const p = PRESETS[n];
  if (!p) return false;
  state.phase = 'flying';
  state.x = p.x;
  state.alt = p.alt;
  state.z = p.z;
  state.heading = p.heading;
  state.bank = p.bank;
  state.pitch = p.pitch;
  state.speed = p.speed;
  state.throttle = 0.6;
  state.fuel = 78;
  state.score = p.ringsPassed * 100;
  state.ringsPassed = p.ringsPassed;
  state.ringStates = RINGS.map((_, i) => (i < p.ringsPassed ? 'passed' : 'todo'));
  state.timeLeft = 148 - p.ringsPassed * 6;
  state.camera = p.camera;
  state.message = p.ringsPassed >= RINGS.length
    ? 'All rings cleared! Now land on the runway!'
    : `Ring ${p.ringsPassed + 1} ahead — thread it!`;
  state.messageUntil = 999999;
  state.elapsed = 60;
  return true;
}
