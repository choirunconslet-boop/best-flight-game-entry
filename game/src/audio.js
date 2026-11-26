// audio.js — tiny synthesised sound: engine hum, ring chime, wind, touchdown.
// WebAudio only, generated at runtime; no audio files, no network.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 70;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 320;
    engineOsc.connect(lowpass).connect(engineGain).connect(ctx.destination);
    engineOsc.start();
    const wind = ctx.createBufferSource();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    wind.buffer = buf;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 500;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    wind.connect(windFilter).connect(windGain).connect(ctx.destination);
    wind.start();
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  /** Continuous engine + wind bed follows speed and throttle. */
  function setEngine(speed, throttle) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    engineOsc.frequency.setTargetAtTime(55 + speed * 0.55 + throttle * 22, t, 0.1);
    engineGain.gain.setTargetAtTime(0.028 + throttle * 0.03, t, 0.15);
    windGain.gain.setTargetAtTime(Math.min(0.05, speed * 0.00028), t, 0.2);
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function ringChime() {
    blip(880, 0.35, 'sine', 0.16);
    blip(1318, 0.5, 'sine', 0.12, 0.09);
  }

  function warningBeep() {
    blip(440, 0.12, 'square', 0.06);
  }

  function touchdownThud() {
    blip(90, 0.3, 'sine', 0.22);
    blip(660, 0.4, 'sine', 0.12, 0.08);
    blip(990, 0.5, 'sine', 0.1, 0.18);
  }

  function toggleMute() {
    muted = !muted;
    if (ctx) {
      if (muted) {
        engineGain.gain.value = 0;
        windGain.gain.value = 0;
      }
    }
    return muted;
  }

  return { unlock, setEngine, ringChime, warningBeep, touchdownThud, toggleMute };
}
