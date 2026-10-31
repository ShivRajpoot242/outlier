/**
 * ═══════════════════════════════════════════════════════
 * DIGITAL EXORCIST — Audio Engine
 * Retro 8-bit SFX via Web Audio API
 * ═══════════════════════════════════════════════════════
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Audio not available:', e);
      this.enabled = false;
    }
  }

  _playTone(freq, duration, type = 'square', volume = 0.3) {
    if (!this.enabled || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  _playNoise(duration, volume = 0.1) {
    if (!this.enabled || !this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    src.buffer = buffer;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start();
  }

  shoot() {
    this._playTone(880, 0.08, 'square', 0.15);
    this._playTone(660, 0.06, 'square', 0.1);
  }

  hit() {
    this._playTone(200, 0.15, 'sawtooth', 0.2);
    this._playNoise(0.1, 0.15);
  }

  enemyDie() {
    const t = this.ctx ? this.ctx.currentTime : 0;
    this._playTone(600, 0.05, 'square', 0.2);
    setTimeout(() => this._playTone(400, 0.05, 'square', 0.15), 30);
    setTimeout(() => this._playTone(200, 0.15, 'sawtooth', 0.2), 60);
    this._playNoise(0.12, 0.1);
  }

  bossDie() {
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this._playTone(300 - i * 40, 0.2, 'sawtooth', 0.25);
        this._playNoise(0.15, 0.15);
      }, i * 80);
    }
  }

  playerDie() {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this._playTone(400 - i * 80, 0.2, 'sawtooth', 0.3), i * 100);
    }
    setTimeout(() => this._playNoise(0.4, 0.2), 200);
  }

  combo() {
    this._playTone(523, 0.06, 'square', 0.15);
    setTimeout(() => this._playTone(659, 0.06, 'square', 0.15), 50);
    setTimeout(() => this._playTone(784, 0.1, 'square', 0.2), 100);
  }

  powerUp() {
    const notes = [523, 587, 659, 784, 880];
    notes.forEach((n, i) => {
      setTimeout(() => this._playTone(n, 0.08, 'square', 0.15), i * 50);
    });
  }

  waveStart() {
    this._playTone(440, 0.1, 'square', 0.15);
    setTimeout(() => this._playTone(880, 0.15, 'square', 0.2), 120);
  }

  menuSelect() {
    this._playTone(660, 0.06, 'square', 0.12);
  }

  gameOver() {
    const notes = [392, 349, 330, 262];
    notes.forEach((n, i) => {
      setTimeout(() => this._playTone(n, 0.3, 'triangle', 0.25), i * 250);
    });
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

window.audioEngine = new AudioEngine();
