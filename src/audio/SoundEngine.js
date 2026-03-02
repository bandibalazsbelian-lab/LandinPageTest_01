// Pure Web Audio API — cosmic space sounds, zero audio files
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = true;
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
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.init();
    this.resume();
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.1);
    }
    if (!this.muted) {
      this.startAmbient();
      this.play('click_confirm');
    } else {
      this.stopAmbient();
    }
    return !this.muted;
  }

  // Deep space drone: C1 + G1
  startAmbient() {
    if (!this.initialized || this.ambientOsc) return;
    const ctx = this.ctx;
    const notes = [32.7, 49.0]; // C1, G1

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0;
    this.ambientGain.connect(this.masterGain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.3;
    filter.connect(this.ambientGain);

    this.ambientOscs = notes.map(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      // Slow random pitch modulation (LFO)
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.02;
      lfoGain.gain.value = freq * 0.003; // ±5 cent
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      const g = ctx.createGain();
      g.gain.value = 0.04;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      return { osc, gain: g, lfo };
    });

    // Pulsar pings
    this._startPulsarPings();

    this.ambientGain.gain.setTargetAtTime(0.08, ctx.currentTime, 4);
    this.ambientOsc = true;
  }

  _startPulsarPings() {
    if (!this.initialized || this.muted) return;
    const ping = () => {
      if (!this.ambientOsc || this.muted) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();

      osc.type = 'sine';
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      panner.pan.value = (Math.random() - 0.5) * 1.6;

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.9);

      const nextDelay = 2000 + Math.random() * 6000;
      setTimeout(ping, nextDelay);
    };
    setTimeout(ping, 3000 + Math.random() * 5000);
  }

  stopAmbient() {
    if (!this.ambientOscs) return;
    const ctx = this.ctx;
    if (this.ambientGain) {
      this.ambientGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
    }
    setTimeout(() => {
      if (this.ambientOscs) {
        this.ambientOscs.forEach(o => {
          try { o.osc.stop(); } catch(e) {}
          try { o.lfo.stop(); } catch(e) {}
        });
        this.ambientOscs = null;
        this.ambientOsc = null;
      }
    }, 2000);
  }

  play(sound) {
    if (!this.initialized || this.muted) return;
    this.resume();
    const ctx = this.ctx;

    switch (sound) {
      case 'hover_blip':
        this._playSoftTone(300, 500, 0.08, 0.06);
        break;
      case 'click_confirm':
        this._playChord([800, 1200], 0.15, 0.06);
        break;
      case 'transition_whoosh':
        this._playNoiseSweep(0.6, 0.08);
        break;
      case 'asteroid_open':
        this._playAsteroidCrack();
        break;
      case 'asteroid_close':
        this._playSoftTone(80, 60, 0.2, 0.04);
        break;
      case 'pillar_chime_1':
        this._playSoftBell(261.63, 1.2, 0.08);
        break;
      case 'pillar_chime_2':
        this._playSoftBell(329.63, 1.2, 0.08);
        break;
      case 'pillar_chime_3':
        this._playSoftBell(392.00, 1.2, 0.08);
        break;
      case 'pillar_chime_4':
        this._playSoftBell(493.88, 1.2, 0.08);
        break;
      case 'stat_tick':
        this._playSoftTone(1000, 1000, 0.015, 0.02);
        break;
      case 'achievement_ding':
        this._playEasterEggArpeggio();
        break;
      case 'particle_form':
        this._playRisingHarmonic(2.0, 0.05);
        break;
      case 'social_twitch':
        this._playSoftBell(196, 0.6, 0.06);
        break;
      case 'social_discord':
        this._playSoftBell(220, 0.6, 0.06);
        break;
      case 'social_x':
        this._playSoftBell(261.63, 0.5, 0.06);
        break;
    }
  }

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
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  _playChord(freqs, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.5, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    }
  }

  _playNoiseSweep(duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.value = 1.5;

    const gain = ctx.createGain();
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

  _playSoftBell(freq, duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const harmonics = [1, 2.4, 5.0, 7.3];
    const gains = [volume, volume * 0.3, volume * 0.1, volume * 0.05];

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.connect(this.masterGain);

    harmonics.forEach((h, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * h;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gains[i], now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration * (1 - i * 0.15));
      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    });
  }

  _playAsteroidCrack() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // Deep burst
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 80;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);

    // Noise sweep
    this._playNoiseSweep(0.3, 0.06);
  }

  _playEasterEggArpeggio() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392, 523.25]; // C4 E4 G4 C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  _playRisingHarmonic(duration, volume) {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const notes = [130.81, 164.81, 196, 261.63];
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

  dispose() {
    this.stopAmbient();
    if (this.ctx) this.ctx.close();
  }
}
