// game.js — flight model, course progress, scoring and crash/landing rules.

import { RINGS, RUNWAY, overRunway, ringDistance, terrainHeight } from './world.js';

export const PHASE = {
  MENU: 'menu',
  FLYING: 'flying',
  LANDED: 'landed',
  CRASHED: 'crashed',
  OUT_OF_TIME: 'outoftime',
};

const START_TIME = 200;
const RING_TIME_BONUS = 15;
const RING_SCORE = 100;
const LANDING_SCORE = 500;

export function createGame() {
  const state = {
    phase: PHASE.MENU,
    x: 0,
    alt: 55,
    z: 0,
    heading: 0, // radians, 0 = due north (+z)
    bank: 0, // radians, + = right wing down
    pitch: 0, // radians, + = nose up
    speed: 78,
    throttle: 0.55,
    fuel: 100,
    score: 0,
    ringsPassed: 0,
    ringStates: RINGS.map(() => 'todo'), // todo | passed
    timeLeft: START_TIME,
    message: '',
    messageUntil: 0,
    elapsed: 0,
    camera: 'chase', // chase | cockpit
    muted: false,
    paused: false,
    lowWarned: false,
    landedBonus: 0,
    finalScore: 0,
  };

  function reset() {
    state.phase = PHASE.FLYING;
    state.x = 0;
    state.alt = 55;
    state.z = 0;
    state.heading = 0;
    state.bank = 0;
    state.pitch = 0;
    state.speed = 78;
    state.throttle = 0.55;
    state.fuel = 100;
    state.score = 0;
    state.ringsPassed = 0;
    state.ringStates = RINGS.map(() => 'todo');
    state.timeLeft = START_TIME;
    state.message = 'Fly through the golden rings, then land on the runway!';
    state.messageUntil = state.elapsed + 5;
    state.lowWarned = false;
    state.landedBonus = 0;
    state.finalScore = 0;
  }

  function showMessage(text, seconds = 2.5) {
    state.message = text;
    state.messageUntil = state.elapsed + seconds;
  }

  function nextRing() {
    return RINGS[state.ringsPassed] ?? null;
  }

  /** One physics step; dt in seconds. Returns events for sound: 'ring' | 'crash' | 'land' | 'warn'. */
  function step(input, dt, audio) {
    if (state.phase !== PHASE.FLYING) return null;
    state.elapsed += dt;
    state.timeLeft -= dt;
    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.phase = PHASE.OUT_OF_TIME;
      state.finalScore = state.score;
      return null;
    }

    // Throttle: Shift faster, Ctrl slower, otherwise ease toward cruise.
    const th = input.throttleDemand();
    state.throttle = Math.max(0.25, Math.min(1, state.throttle + th * dt * 0.7));
    const targetSpeed = 42 + state.throttle * 108;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.8);

    // Bank follows the stick; heading follows the bank.
    const roll = input.rollDemand();
    const targetBank = roll * 0.62;
    state.bank += (targetBank - state.bank) * Math.min(1, dt * 3.2);
    state.heading += -state.bank * (state.speed / 95) * dt * 0.9;

    // Pitch follows the stick; altitude follows pitch and speed.
    const pitchIn = input.pitchDemand();
    const targetPitch = pitchIn * 0.24;
    state.pitch += (targetPitch - state.pitch) * Math.min(1, dt * 2.6);
    const climb = Math.sin(state.pitch) * state.speed;
    state.alt += climb * dt;
    if (state.alt < 4) state.alt = 4;

    // Forward motion along the heading.
    const forward = Math.cos(state.pitch) * state.speed;
    state.z += Math.cos(state.heading) * forward * dt;
    state.x += -Math.sin(state.heading) * forward * dt;
    state.x = Math.max(-900, Math.min(900, state.x));
    // Soft wall behind the start line: the islands (and the course) are ahead.
    if (state.z < -80) {
      state.z = -80;
      showMessage('Turn around — the islands are ahead!', 1.5);
    }

    // Fuel burns with throttle; empty tank glides at low speed.
    state.fuel -= dt * (0.35 + state.throttle * 0.5);
    if (state.fuel <= 0) {
      state.fuel = 0;
      state.throttle = Math.max(state.throttle, 0.25);
      state.speed = Math.max(46, state.speed - 12 * dt);
    }

    // Ring capture.
    const ring = nextRing();
    if (ring) {
      const d = ringDistance(state, ring);
      if (d < ring.r) {
        state.ringStates[state.ringsPassed] = 'passed';
        state.ringsPassed++;
        state.score += RING_SCORE;
        state.timeLeft += RING_TIME_BONUS;
        state.fuel = Math.min(100, state.fuel + 6);
        showMessage(state.ringsPassed >= RINGS.length
          ? 'All rings cleared! Now land on the runway!'
          : `Ring ${state.ringsPassed} of ${RINGS.length}! +${RING_SCORE} pts, +${RING_TIME_BONUS}s`);
        if (audio) audio.ringChime();
      }
    }

    // Low-altitude warning over land or sea.
    const ground = terrainHeight(state.x, state.z);
    if (state.alt - ground < 12 && !state.lowWarned) {
      state.lowWarned = true;
      showMessage('TOO LOW — PULL UP!', 1.6);
      if (audio) audio.warningBeep();
    } else if (state.alt - ground > 22) {
      state.lowWarned = false;
    }

    // Landing: slow and low over the runway once every ring is cleared.
    if (state.ringsPassed >= RINGS.length && overRunway(state)) {
      if (state.alt < ground + 7 && state.speed < 95) {
        state.phase = PHASE.LANDED;
        state.landedBonus = LANDING_SCORE + Math.round(state.timeLeft) * 2;
        state.score += state.landedBonus;
        state.finalScore = state.score;
        showMessage('TOUCHDOWN! Courier run complete!', 6);
        if (audio) audio.touchdownThud();
        return 'land';
      }
      if (state.alt < ground + 7) {
        showMessage('Too fast to land — ease off the throttle!', 1.2);
      }
    }

    // Terrain / water strike.
    if (state.alt <= ground + 2) {
      state.phase = PHASE.CRASHED;
      state.finalScore = state.score;
      showMessage('', 0);
      return 'crash';
    }

    // Flew past the end of the course without landing.
    if (state.z > RUNWAY.zEnd + 500) {
      state.phase = PHASE.OUT_OF_TIME;
      state.finalScore = state.score;
      showMessage('You flew past the runway!', 4);
    }
    return null;
  }

  return { state, reset, step, nextRing, showMessage, PHASE };
}
