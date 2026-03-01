// Pure Web Audio API sound synthesis — zero external audio files
// Soft, ambient aesthetic — no harsh transients
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

  // === AMBIENT PAD (one octave lower, warmer) ===
  startAmbient() {
    if (!this.initialized || this.ambientOsc) return;
    const ctx = this.ctx;

    // Deep C major drone (C2-C3 range)
    const notes = [65.41, 82.41, 98.00, 130.81]; // C2, E2, G2, C3
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0;
    this.ambientGain.connect(this.masterGain);

    // Lower LPF for deeper warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.4;
    filter.connect(this.ambientGain);

    this.ambientOscs = notes.map(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.03;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      return { osc, gain: g };
    });

    // Slow fade in
    this.ambientGain.gain.setTargetAtTime(0.12, ctx.currentTime, 3);
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

  // === SOUND LIBRARY (softer, lower frequencies) ===
  play(sound) {
    if (!this.initialized || this.muted) return;
    this.resume();

    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (sound) {
      case 'hover_blip':
        // Soft sweep 200 → 400 Hz, longer duration
        this._playSoftTone(200, 400, 0.15, 0.06);
        break;

      case 'click_confirm':
        // Softer percussive at 600 Hz
        this._playSoftPercussive(600, 0.15, 0.08);
        break;

      case 'transition_whoosh':
        this._playNoiseSweep(0.8, 0.1);
        break;

      case 'pillar_chime_1': // C (one octave lower)
        this._playSoftBell(261.63, 1.2, 0.1);
        break;
      case 'pillar_chime_2': // E
        this._playSoftBell(329.63, 1.2, 0.1);
        break;
      case 'pillar_chime_3': // G
        this._playSoftBell(392.00, 1.2, 0.1);
        break;
      case 'pillar_chime_4': // B
        this._playSoftBell(493.88, 1.2, 0.1);
        break;

      case 'particle_form':
        this._playRisingHarmonic(2.0, 0.07);
        break;

      case 'achievement_ding':
        this._playAchievement(0.1);
        break;

      case 'logo_harmonic':
        this._playHarmonicChord(0.08);
        break;

      case 'social_twitch':
        this._playSoftBell(196, 0.6, 0.07);
        break;
      case 'social_discord':
        this._playSoftBell(220, 0.6, 0.07);
        break;
      case 'social_x':
        this._playSoftBell(261.63, 0.5, 0.07);
        break;

      case 'stat_tick':
        // Much softer: sine instead of square, lower freq
        this._playSoftTone(600, 600, 0.06, 0.03);
        break;
    }
  }

  // Soft tone with attack ramp (no harsh transient)
  _playSoftTone(startFreq, endFreq, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration * 0.8);
    }

    // Soft attack ramp (25ms)
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // Softer percussive sound
  _playSoftPercussive(freq, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + duration);

    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    // Soft attack
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
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
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4000, now);
    filter.frequency.exponentialRampToValueAtTime(150, now + duration);
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
    // Soft attack
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.03);
    gain.gain.setValueAtTime(volume, now + duration * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(now);
    source.stop(now + duration + 0.01);
  }

  // Softer bell with attack ramp
  _playSoftBell(freq, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const harmonics = [1, 2.4, 5.0, 7.3];
    const gains = [volume, volume * 0.3, volume * 0.1, volume * 0.05];

    // LPF for warmth
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.connect(this.masterGain);

    harmonics.forEach((h, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * h;

      // Soft 20ms attack
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gains[i], now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * (1 - i * 0.15));

      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    });
  }

  _playRisingHarmonic(duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [130.81, 164.81, 196, 261.63]; // One octave lower

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = now + i * 0.25;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume * 0.4, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration - i * 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    });
  }

  _playAchievement(volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;

    [261.63, 392.00].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  _playHarmonicChord(volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [130.81, 164.81, 196, 261.63];

    notes.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.25);
    });
  }

  dispose() {
    this.stopAmbient();
    if (this.ctx) {
      this.ctx.close();
    }
  }
}
