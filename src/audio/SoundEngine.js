// Pure Web Audio API sound synthesis — zero external audio files
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = true; // Start muted per autoplay policy
    this.initialized = false;
    this.ambientOsc = null;
    this.ambientGain = null;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.init();
    this.resume();
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 1,
        this.ctx.currentTime,
        0.1
      );
    }
    if (!this.muted) {
      this.startAmbient();
      this.play('click_confirm');
    } else {
      this.stopAmbient();
    }
    return !this.muted;
  }

  // === AMBIENT PAD ===
  startAmbient() {
    if (!this.initialized || this.ambientOsc) return;
    const ctx = this.ctx;

    // Warm C major chord drone
    const notes = [130.81, 164.81, 196.00, 261.63]; // C3, E3, G3, C4
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0;
    this.ambientGain.connect(this.masterGain);

    // LPF for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;
    filter.connect(this.ambientGain);

    this.ambientOscs = notes.map(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.04;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      return { osc, gain: g };
    });

    // Fade in
    this.ambientGain.gain.setTargetAtTime(0.15, ctx.currentTime, 2);
    this.ambientOsc = true;
  }

  stopAmbient() {
    if (!this.ambientOscs) return;
    const ctx = this.ctx;
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    }
    setTimeout(() => {
      if (this.ambientOscs) {
        this.ambientOscs.forEach(o => { try { o.osc.stop(); } catch(e) {} });
        this.ambientOscs = null;
        this.ambientOsc = null;
      }
    }, 2000);
  }

  // === SOUND LIBRARY ===
  play(sound, options = {}) {
    if (!this.initialized || this.muted) return;
    this.resume();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (sound) {
      case 'hover_blip':
        this._playTone(880, 0.05, 0.08, 'sine', freq => {
          // Quick sweep 440 -> 880
          return (osc) => {
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);
          };
        });
        break;

      case 'click_confirm':
        this._playPercussive(1200, 0.1, 0.12);
        break;

      case 'transition_whoosh':
        this._playNoiseSweep(0.6, 0.15);
        break;

      case 'pillar_chime_1': // C
        this._playBell(523.25, 0.8, 0.15);
        break;
      case 'pillar_chime_2': // E
        this._playBell(659.25, 0.8, 0.15);
        break;
      case 'pillar_chime_3': // G
        this._playBell(783.99, 0.8, 0.15);
        break;
      case 'pillar_chime_4': // B
        this._playBell(987.77, 0.8, 0.15);
        break;

      case 'particle_form':
        this._playRisingHarmonic(1.5, 0.1);
        break;

      case 'achievement_ding':
        this._playAchievement(0.15);
        break;

      case 'logo_harmonic':
        this._playHarmonicChord(0.12);
        break;

      case 'social_twitch':
        this._playBell(392, 0.4, 0.1);
        break;
      case 'social_discord':
        this._playBell(440, 0.4, 0.1);
        break;
      case 'social_x':
        this._playBell(523.25, 0.3, 0.1);
        break;

      case 'stat_tick':
        this._playTone(1400, 0.03, 0.05, 'square');
        break;
    }
  }

  _playTone(freq, duration, volume = 0.1, type = 'sine', modFn = null) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    if (modFn) {
      const mod = modFn(osc);
      if (typeof mod === 'function') mod(osc);
    }

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  _playPercussive(freq, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + duration);

    filter.type = 'highpass';
    filter.frequency.value = 400;

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  _playNoiseSweep(duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(8000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.value = 2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.setValueAtTime(volume, now + duration * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(now);
    source.stop(now + duration + 0.01);
  }

  _playBell(freq, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Bell = fundamental + harmonics with quick attack and slow decay
    const harmonics = [1, 2.4, 5.0, 7.3];
    const gains = [volume, volume * 0.4, volume * 0.15, volume * 0.08];

    harmonics.forEach((h, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * h;
      gain.gain.setValueAtTime(gains[i], now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * (1 - i * 0.15));
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    });
  }

  _playRisingHarmonic(duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392, 523.25];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = now + i * 0.2;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume * 0.5, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - i * 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    });
  }

  _playAchievement(volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // Two ascending tones
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  _playHarmonicChord(volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392, 523.25];

    notes.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.85);
    });
  }

  dispose() {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close();
    }
  }
}
