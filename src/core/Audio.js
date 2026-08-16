// Procedural Sound Synthesizer using Web Audio API (Zero external assets required)

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.rainGain = null;
    this.rainSource = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupRainAmbient();
        this.initialized = true;
      }
    } catch (e) {
      console.warn("Web Audio not supported or blocked", e);
    }
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Continuous rain background generator
  setupRainAmbient() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to sound like soft rainfall
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 300;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.0;

    whiteNoise.connect(filter);
    filter.connect(highpass);
    highpass.connect(this.rainGain);
    this.rainGain.connect(this.ctx.destination);

    whiteNoise.start(0);
    this.rainSource = whiteNoise;
  }

  setRainIntensity(intensity) { // 0 to 1
    if (!this.rainGain || !this.ctx || !this.enabled) return;
    const target = Math.max(0, Math.min(0.2, intensity * 0.15));
    this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.5);
  }

  // Sword Swing / Whoosh
  playSwing(isHeavy = false) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.25;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = isHeavy ? 3.0 : 4.0;
    filter.frequency.setValueAtTime(isHeavy ? 400 : 700, now);
    filter.frequency.exponentialRampToValueAtTime(isHeavy ? 150 : 250, now + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(isHeavy ? 0.35 : 0.25, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.25 : 0.18));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + (isHeavy ? 0.25 : 0.18));
  }

  // Jump swoosh
  playJump() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Hit impact
  playHit(isHeavy = false) {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Metallic slash tone
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isHeavy ? 280 : 440, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);

    oscGain.gain.setValueAtTime(0.3, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    // Punch impact noise
    const bufferSize = this.ctx.sampleRate * 0.1;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isHeavy ? 0.4 : 0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.1);
  }

  // Blocked attack
  playBlock() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 500;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Perfect Parry (high ringing chime)
  playParry() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [1200, 1800, 2400].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.02);

      gain.gain.setValueAtTime(0.18, now + i * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35 + i * 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.02);
      osc.stop(now + 0.35 + i * 0.02);
    });
  }

  // Footstep scuff
  playFootstep() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.04;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 350;
    filter.Q.value = 1.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.04);
  }

  // Lightning & Thunder
  playThunder() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Sub rumble
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 1.2);

    oscGain.gain.setValueAtTime(0.35, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);

    // Crack noise
    const bufferSize = this.ctx.sampleRate * 0.8;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.8);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.8);
  }

  // Victory fanfare notes
  playVictory() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0.2, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.4);
    });
  }

  // Defeat / sad tone
  playDefeat() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 392, 349.23, 293.66];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.2);

      gain.gain.setValueAtTime(0.15, now + i * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.35);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.35);
    });
  }
  // Dull "No" / Refusal tone when stamina is insufficient
  playNo() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Guard Break crash
  playGuardBreak() {
    if (!this.enabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1500, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.25);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const sound = new SoundSystem();
