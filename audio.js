/**
 * WORD ROGUE // Procedural Web Audio Sound Engine
 * Mechanical tactile keystrokes, word clear laser blade slashes,
 * critical damage crunch, enemy death screams, level-up fanfares,
 * shield blocks, boss warning sirens, and high-energy electronic battle pulse.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicPlaying = false;
    this.step = 0;
    this.bpm = 142;
    this.musicTimer = null;
    this.wpmSpeed = 1.0;

    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
  }

  ensure() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.musicPlaying && !this.muted) {
      this.startMusic();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.75, this.ctx.currentTime);
    }
    return this.muted;
  }

  setWpmSpeed(wpm) {
    this.wpmSpeed = 1.0 + Math.min(1.0, wpm / 120) * 0.5;
  }

  // Mechanical Tactile Keystroke
  keyTap(isCorrect = true) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();

    if (isCorrect) {
      osc.type = 'triangle';
      const freq = (900 + Math.random() * 300) * this.wpmSpeed;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.035);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.07);
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    }

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + (isCorrect ? 0.04 : 0.075));
  }

  // Word Finish / Strike Impact
  wordStrike(isCrit = false) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;

    // Resonant blade slice
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    const baseF = isCrit ? 1200 : 880;
    osc.frequency.setValueAtTime(baseF * this.wpmSpeed, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.14);

    g.gain.setValueAtTime(isCrit ? 0.45 : 0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);

    this.noiseBurst(isCrit ? 0.18 : 0.09, isCrit ? 0.45 : 0.25, 2200);
  }

  // Enemy Destroyed
  enemyKill() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + i * 0.03);
      g.gain.setValueAtTime(0.2, t + i * 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.03 + 0.25);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t + i * 0.03);
      osc.stop(t + i * 0.03 + 0.26);
    });
    this.noiseBurst(0.2, 0.4, 1200);
  }

  // Hero Hurt
  playerHurt() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.linearRampToValueAtTime(40, t + 0.2);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.22);
    this.noiseBurst(0.18, 0.4, 600);
  }

  // Potion Heal
  heal() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [523, 659, 783, 1046].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.04);
      g.gain.setValueAtTime(0.18, t + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.04 + 0.1);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t + i * 0.04);
      osc.stop(t + i * 0.04 + 0.11);
    });
  }

  // Level Up
  levelUp() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [440, 554, 659, 880, 1108].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.06);
      g.gain.setValueAtTime(0.24, t + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.4);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.42);
    });
  }

  noiseBurst(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq || 1600, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    noise.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    noise.start(t);
  }

  // --- 142 BPM ADRENALINE BATTLE MUSIC ---
  startMusic() {
    if (this.musicPlaying) return;
    this.musicPlaying = true;
    this.scheduleStep();
  }

  scheduleStep() {
    if (!this.musicPlaying || !this.ctx) return;
    const stepDuration = (60 / this.bpm) / 4;
    const t = this.ctx.currentTime;
    const step = this.step;

    // Heavy 4/4 Kick on 0, 4, 8, 12
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, t);
      osc.frequency.exponentialRampToValueAtTime(36, t + 0.09);
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 0.11);
    }

    // Snare on 4, 12
    if (step === 4 || step === 12) {
      this.noiseBurst(0.08, 0.18, 3000);
    }

    // Rolling Hat
    if (step % 2 === 0) {
      this.noiseBurst(0.02, 0.06, 7500);
    }

    // Cyber Synth Bassline (Am - F - C - G)
    const notes = [45, 45, 48, 45,  41, 41, 45, 41,  48, 48, 52, 48,  43, 43, 47, 43];
    const midi = notes[step % 16];
    const f = 440 * Math.pow(2, (midi - 69) / 12);

    const osc = this.ctx.createOscillator();
    const flt = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(f, t);

    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(f * 3, t);

    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.9);

    osc.connect(flt);
    flt.connect(g);
    g.connect(this.musicGain);

    osc.start(t);
    osc.stop(t + stepDuration);

    this.step = (this.step + 1) % 16;
    this.musicTimer = setTimeout(() => this.scheduleStep(), stepDuration * 1000);
  }
}

window.SoundEngine = SoundEngine;
