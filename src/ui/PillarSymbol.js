// Canvas 2D particle symbol renderers for the 4 pillar cards

/* ─── Base ─── */
class PillarSymbolBase {
  constructor(slotId) {
    this.slot = document.getElementById(slotId);
    if (!this.slot) { this.running = false; return; }

    this.canvas = document.createElement('canvas');
    this.slot.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.hover = 0;
    this.targetHover = 0;
    this.dpr = Math.min(window.devicePixelRatio, 2);
    this.w = 0; this.h = 0; this.cx = 0; this.cy = 0; this.scale = 1;
    this.running = true;
    this.t0 = performance.now();
    this._sprites = {};
    this._resize();
  }

  _start() {
    if (!this.running) return;
    this._initParticles();
    this._raf();
    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.slot);
  }

  _sprite(r, g, b) {
    const k = (r << 16) | (g << 8) | b;
    if (this._sprites[k]) return this._sprites[k];
    const S = 64, H = S >> 1;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(H, H, 0, H, H, H);
    gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
    gr.addColorStop(0.3, `rgba(${r},${g},${b},0.5)`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    x.fillStyle = gr;
    x.fillRect(0, 0, S, S);
    this._sprites[k] = c;
    return c;
  }

  _resize() {
    if (!this.slot) return;
    this.w = this.slot.clientWidth || 300;
    this.h = this.slot.clientHeight || 180;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    this.scale = Math.min(this.w, this.h) * 0.35;
  }

  _tx(lx) { return this.cx + lx * this.scale; }
  _ty(ly) { return this.cy - ly * this.scale; }

  _p(lx, ly, rgb, type, size, alpha) {
    const p = {
      lx, ly, x: 0, y: 0, bx: lx, by: ly,
      r: rgb[0], g: rgb[1], b: rgb[2],
      type, size, alpha, ba: alpha,
      ph: Math.random() * 6.283
    };
    this.particles.push(p);
    return p;
  }

  _initParticles() {}
  _update(_t) {}

  setHover(v) { this.targetHover = v ? 1 : 0; }

  _raf() {
    if (!this.running) return;
    requestAnimationFrame(() => this._raf());
    const t = (performance.now() - this.t0) * 0.001;
    this.hover += (this.targetHover - this.hover) * 0.08;
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    c.globalCompositeOperation = 'lighter';
    this._update(t);
    for (const p of this.particles) {
      if (p.alpha < 0.01) continue;
      p.x = this._tx(p.lx);
      p.y = this._ty(p.ly);
      const sp = this._sprite(p.r, p.g, p.b);
      c.globalAlpha = Math.min(p.alpha, 1);
      c.drawImage(sp, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    }
    c.globalAlpha = 1;
  }

  destroy() {
    this.running = false;
    this._ro?.disconnect();
    this.canvas?.remove();
  }
}

/* ─── TEST TUBE (CoLab) ─── */
export class TestTubeSymbol extends PillarSymbolBase {
  constructor(slotId) { super(slotId); this._start(); }

  _initParticles() {
    const C = [0, 229, 255], G = [0, 255, 136], LG = [120, 255, 200];
    const W = 0.25, T = 0.85, B = -0.85;

    // Shell outline
    for (let i = 0; i < 55; i++) {
      const f = i / 55;
      let x, y;
      if (f < 0.3) { x = -W; y = B + (f / 0.3) * (T - B); }
      else if (f < 0.6) { x = W; y = B + ((f - 0.3) / 0.3) * (T - B); }
      else if (f < 0.85) {
        const a = Math.PI + ((f - 0.6) / 0.25) * Math.PI;
        x = Math.cos(a) * W; y = B + Math.sin(a) * W + W;
      } else { x = ((f - 0.85) / 0.15) * W * 2 - W; y = T; }
      this._p(x, y, C, 'shell', 2.5 + Math.random() * 2, 0.4 + Math.random() * 0.3);
    }

    // Liquid fill
    for (let i = 0; i < 40; i++) {
      this._p(
        (Math.random() - 0.5) * W * 1.6,
        B + 0.15 + Math.random() * 0.7,
        G, 'liquid', 2.5 + Math.random() * 2.5, 0.25 + Math.random() * 0.3
      );
    }

    // Bubbles
    for (let i = 0; i < 12; i++) {
      const p = this._p(
        (Math.random() - 0.5) * W * 1.2, B + 0.2 + Math.random() * 0.6,
        LG, 'bubble', 1.5 + Math.random() * 1.5, 0.4 + Math.random() * 0.3
      );
      p.rs = 0.3 + Math.random() * 0.5;
      p.wf = 2 + Math.random() * 3;
      p.wa = 0.02 + Math.random() * 0.06;
    }
  }

  _update(t) {
    const h = this.hover;
    for (const p of this.particles) {
      if (p.type === 'shell') {
        p.lx = p.bx + Math.sin(t * 0.5 + p.ph) * 0.01;
        p.ly = p.by + Math.cos(t * 0.3 + p.ph) * 0.01;
        p.alpha = p.ba * (1 + h * 0.5 + Math.sin(t * 2 + p.ph) * 0.1);
      } else if (p.type === 'liquid') {
        const wave = Math.sin(t * 2 + p.bx * 8) * (0.03 + h * 0.06);
        p.lx = p.bx + Math.sin(t * 1.5 + p.ph) * 0.02 * (1 + h * 2);
        p.ly = p.by + wave * Math.max(0, 1 - (0 - p.by) * 1.5);
        if (h > 0.1) {
          p.lx += (Math.random() - 0.5) * 0.04 * h;
          p.ly += (Math.random() - 0.5) * 0.03 * h;
        }
        p.alpha = p.ba * (1 + h * 0.4);
      } else if (p.type === 'bubble') {
        p.ly += p.rs * (1 + h * 2) * 0.008;
        p.lx = p.bx + Math.sin(t * p.wf + p.ph) * p.wa;
        if (p.ly > 0.1) {
          p.ly = -0.65;
          p.bx = (Math.random() - 0.5) * 0.2;
          p.ph = Math.random() * 6.283;
        }
      }
    }
  }
}

/* ─── LIGHTNING (InnoChallenge) ─── */
export class LightningSymbol extends PillarSymbolBase {
  constructor(slotId) { super(slotId); this._start(); }

  _initParticles() {
    const GOLD = [255, 215, 0], GRN = [0, 255, 136];
    this._wp = [
      [0, 0.9], [0.2, 0.6], [-0.15, 0.3], [0.18, 0.0],
      [-0.2, -0.3], [0.12, -0.55], [-0.08, -0.8], [0.1, -0.95]
    ];

    for (let i = 0; i < 50; i++) {
      const si = Math.floor(Math.random() * (this._wp.length - 1));
      const a = this._wp[si], b = this._wp[si + 1];
      const tt = Math.random();
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const nx = -dy / len, ny = dx / len;
      const thick = (Math.random() - 0.5) * 0.06;
      this._p(a[0] + dx * tt + nx * thick, a[1] + dy * tt + ny * thick,
        GOLD, 'bolt', 3 + Math.random() * 3, 0.6 + Math.random() * 0.4);
    }

    for (let i = 0; i < 25; i++) {
      const si = Math.floor(Math.random() * (this._wp.length - 1));
      const a = this._wp[si], b = this._wp[si + 1];
      const tt = Math.random();
      const p = this._p(a[0] + (b[0] - a[0]) * tt, a[1] + (b[1] - a[1]) * tt,
        Math.random() > 0.5 ? GRN : GOLD, 'spark',
        1.5 + Math.random() * 2, 0.3 + Math.random() * 0.4);
      p.vx = (Math.random() - 0.5) * 0.4;
      p.vy = (Math.random() - 0.5) * 0.4;
      p.life = Math.random(); p.maxLife = 0.5 + Math.random();
    }
  }

  _update(t) {
    const h = this.hover;
    const flash = Math.pow(Math.max(0, Math.sin(t * 8)), 8) * h;
    for (const p of this.particles) {
      if (p.type === 'bolt') {
        const j = 0.02 + h * 0.06;
        p.lx = p.bx + (Math.random() - 0.5) * j;
        p.ly = p.by + (Math.random() - 0.5) * j * 0.5;
        p.alpha = p.ba * (1 + h * 0.6 + flash * 0.8);
      } else {
        const spd = 1 + h * 2;
        p.life += 0.016 * spd;
        p.lx = p.bx + p.vx * p.life;
        p.ly = p.by + p.vy * p.life;
        p.alpha = p.ba * Math.max(0, 1 - p.life / p.maxLife) * (1 + h * 0.5);
        if (p.life >= p.maxLife) {
          const si = Math.floor(Math.random() * (this._wp.length - 1));
          const a = this._wp[si], b = this._wp[si + 1];
          const tt = Math.random();
          p.bx = a[0] + (b[0] - a[0]) * tt;
          p.by = a[1] + (b[1] - a[1]) * tt;
          p.lx = p.bx; p.ly = p.by;
          p.vx = (Math.random() - 0.5) * 0.4;
          p.vy = (Math.random() - 0.5) * 0.4;
          p.life = 0; p.maxLife = 0.5 + Math.random();
        }
      }
    }
  }
}

/* ─── ATOM (InnoLab) ─── */
export class AtomSymbol extends PillarSymbolBase {
  constructor(slotId) { super(slotId); this._start(); }

  _initParticles() {
    const G = [0, 255, 136], C = [0, 229, 255];
    this._rings = [
      { tilt: 0, speed: 0.3 },
      { tilt: Math.PI / 3, speed: 0.25 },
      { tilt: -Math.PI / 3, speed: 0.35 }
    ];

    // Nucleus
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * 6.283;
      const r = Math.sqrt(Math.random()) * 0.12;
      this._p(r * Math.cos(a), r * Math.sin(a), G, 'nucleus',
        3 + Math.random() * 3, 0.5 + Math.random() * 0.4);
    }

    // Orbital rings
    for (let ring = 0; ring < 3; ring++) {
      const tilt = this._rings[ring].tilt;
      for (let i = 0; i < 25; i++) {
        const angle = (i / 25) * Math.PI * 2;
        const ox = 0.7 * Math.cos(angle);
        const oy = 0.4 * Math.sin(angle) * Math.cos(tilt);
        const p = this._p(ox, oy, C, 'orbital',
          1.5 + Math.random() * 1.5, 0.2 + Math.random() * 0.15);
        p.ring = ring; p.angle = angle;
      }
    }

    // Electrons
    for (let ring = 0; ring < 3; ring++) {
      const p = this._p(0.7, 0, C, 'electron', 6 + Math.random() * 2, 0.85);
      p.ring = ring; p.speed = [1.0, 1.25, 1.5][ring];
      p.angle = ring * 2.094;
    }
  }

  _update(t) {
    const h = this.hover;
    const rot = t * 0.2;
    const cr = Math.cos(rot), sr = Math.sin(rot);

    for (const p of this.particles) {
      if (p.type === 'nucleus') {
        const breathe = 1 + Math.sin(t * 3 + p.ph) * (0.05 + h * 0.15);
        p.lx = p.bx * breathe;
        p.ly = p.by * breathe;
        p.alpha = p.ba * (1 + h * 0.5 + Math.sin(t * 4 + p.ph) * 0.15);
      } else if (p.type === 'orbital') {
        const ring = this._rings[p.ring];
        const a = p.angle + t * ring.speed;
        const ox = 0.7 * Math.cos(a);
        const oy = 0.4 * Math.sin(a) * Math.cos(ring.tilt);
        p.lx = ox * cr - oy * sr;
        p.ly = ox * sr + oy * cr;
        p.alpha = (0.2 + h * 0.3) + Math.sin(t * 2 + p.ph) * 0.05;
      } else if (p.type === 'electron') {
        const ring = this._rings[p.ring];
        const spd = p.speed * (1 + h * 2);
        const a = p.angle + t * spd;
        const ox = 0.7 * Math.cos(a);
        const oy = 0.4 * Math.sin(a) * Math.cos(ring.tilt);
        p.lx = ox * cr - oy * sr;
        p.ly = ox * sr + oy * cr;
        p.alpha = 0.8 + Math.sin(t * 6 + p.ph) * 0.15;
        p.size = 6 + Math.sin(t * 4 + p.ph) * 1.5;
      }
    }
  }
}

/* ─── ROCKET (FutureWatch) ─── */
export class RocketSymbol extends PillarSymbolBase {
  constructor(slotId) { super(slotId); this._start(); }

  _initParticles() {
    const MAG = [255, 0, 170], CYAN = [0, 229, 255], GOLD = [255, 215, 0];

    // Nose cone
    for (let i = 0; i < 12; i++) {
      const tt = i / 11;
      const y = 0.4 + tt * 0.5;
      const w = 0.15 * Math.sqrt(1 - tt);
      const side = (i % 2 === 0) ? -1 : 1;
      this._p(side * w * (0.3 + Math.random() * 0.7), y, CYAN, 'body',
        2.5 + Math.random() * 2, 0.6 + Math.random() * 0.3);
    }

    // Fuselage
    for (let i = 0; i < 25; i++) {
      const y = -0.4 + (i / 24) * 0.8;
      const side = (i % 2 === 0) ? -1 : 1;
      this._p(side * 0.15 * (0.7 + Math.random() * 0.3), y, MAG, 'body',
        2.5 + Math.random() * 2, 0.5 + Math.random() * 0.3);
    }

    // Fins
    const fins = [
      [-0.15, -0.3], [-0.3, -0.5], [-0.2, -0.55], [-0.15, -0.45],
      [0.15, -0.3], [0.3, -0.5], [0.2, -0.55], [0.15, -0.45],
      [0, -0.45], [0, -0.55]
    ];
    for (const [x, y] of fins) {
      this._p(x, y, MAG, 'body', 2 + Math.random() * 1.5, 0.5 + Math.random() * 0.3);
    }

    // Exhaust
    for (let i = 0; i < 30; i++) {
      const tt = Math.random();
      const y = -0.5 - tt * 0.45;
      const spread = 0.15 + tt * 0.25;
      const p = this._p((Math.random() - 0.5) * spread * 2, y,
        GOLD, 'exhaust', 3 + Math.random() * 3, 0.4 + (1 - tt) * 0.5);
      p.fp = Math.random() * 6.283;
      p.drift = (Math.random() - 0.5) * 0.1;
    }
  }

  _update(t) {
    const h = this.hover;
    const lift = h * 0.15;
    const wx = Math.sin(t * 0.5) * 0.02;
    const wr = Math.cos(t * 0.7) * 0.02;

    for (const p of this.particles) {
      if (p.type === 'body') {
        p.lx = p.bx + wx;
        p.ly = p.by + lift + wr * (p.by > 0 ? 1 : -0.5);
        p.alpha = p.ba * (1 + h * 0.5);
      } else {
        const flicker = Math.sin(t * 8 + p.fp) * 0.3;
        const spread = 1 + h * 0.5;
        p.lx = p.bx * spread + wx + p.drift * Math.sin(t * 3 + p.ph);
        p.ly = p.by + Math.sin(t * 5 + p.fp) * 0.03 - h * 0.1;
        p.alpha = Math.max(0.1, p.ba * (1 + flicker) * (1 + h * 0.3));
      }
    }
  }
}
