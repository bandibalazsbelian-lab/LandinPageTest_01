// Social link canvas particle icons + GSAP text animations
import gsap from 'gsap';

/* ─── Icon shape definitions (line segments in -1..1 space) ─── */
const SHAPES = {
  twitch: [
    [[-0.5, 0.6], [0.5, 0.6]],
    [[0.5, 0.6], [0.5, -0.15]],
    [[0.5, -0.15], [0.25, -0.45]],
    [[0.25, -0.45], [0.0, -0.45]],
    [[0.0, -0.45], [-0.15, -0.15]],
    [[-0.15, -0.15], [-0.5, -0.15]],
    [[-0.5, -0.15], [-0.5, 0.6]],
    [[-0.15, 0.4], [-0.15, 0.05]],
    [[0.15, 0.4], [0.15, 0.05]]
  ],
  discord: [
    [[-0.45, 0.35], [-0.25, 0.55]],
    [[-0.25, 0.55], [0.25, 0.55]],
    [[0.25, 0.55], [0.45, 0.35]],
    [[0.45, 0.35], [0.45, -0.1]],
    [[0.45, -0.1], [0.3, -0.4]],
    [[0.3, -0.4], [-0.3, -0.4]],
    [[-0.3, -0.4], [-0.45, -0.1]],
    [[-0.45, -0.1], [-0.45, 0.35]],
    [[-0.2, 0.2], [-0.05, 0.2]],
    [[0.05, 0.2], [0.2, 0.2]]
  ],
  x: [
    [[-0.4, 0.5], [-0.15, 0.15]],
    [[-0.15, 0.15], [0.0, 0.0]],
    [[0.0, 0.0], [0.15, -0.15]],
    [[0.15, -0.15], [0.4, -0.5]],
    [[0.4, 0.5], [0.15, 0.15]],
    [[0.15, 0.15], [0.0, 0.0]],
    [[0.0, 0.0], [-0.15, -0.15]],
    [[-0.15, -0.15], [-0.4, -0.5]]
  ]
};

const COLORS = {
  twitch:  { base: [0, 140, 140], hover: [232, 114, 90] },
  discord: { base: [0, 140, 140], hover: [232, 114, 90] },
  x:       { base: [0, 140, 140], hover: [232, 114, 90] }
};

/* ─── SocialIcon: canvas particle icon for one platform ─── */
class SocialIcon {
  constructor(slotId, platform) {
    this.slot = document.getElementById(slotId);
    if (!this.slot) { this.running = false; return; }

    this.canvas = document.createElement('canvas');
    this.slot.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.hover = 0;
    this.targetHover = 0;
    this.dpr = Math.min(window.devicePixelRatio, 2);
    this.w = 0; this.h = 0;
    this.running = true;
    this.t0 = performance.now();
    this._assembled = false;
    this._assembleT = 0;
    this._assembleDur = 0;

    const colors = COLORS[platform];
    // Pre-render both color sprites
    this._spriteBase = this._makeSprite(...colors.base);
    this._spriteHover = this._makeSprite(...colors.hover);

    this._resize();
    this._initFromLines(SHAPES[platform] || []);
    this._raf();

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this.slot);
  }

  _makeSprite(r, g, b) {
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
    return c;
  }

  _resize() {
    if (!this.slot) return;
    this.w = this.slot.clientWidth || 120;
    this.h = this.slot.clientHeight || 120;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    this.scale = Math.min(this.w, this.h) * 0.38;
  }

  _tx(lx) { return this.cx + lx * this.scale; }
  _ty(ly) { return this.cy - ly * this.scale; }

  _initFromLines(lines) {
    let totalLen = 0;
    const lens = lines.map(([a, b]) => {
      const l = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
      totalLen += l;
      return l;
    });

    const count = 55;
    lines.forEach(([a, b], i) => {
      const n = Math.max(2, Math.round(count * lens[i] / totalLen));
      for (let j = 0; j < n; j++) {
        const t = (j + Math.random() * 0.3) / n;
        this.particles.push({
          bx: a[0] + (b[0] - a[0]) * t,
          by: a[1] + (b[1] - a[1]) * t,
          lx: 0, ly: 0, x: 0, y: 0,
          size: 2.5 + Math.random() * 2,
          alpha: 0, ba: 0.5 + Math.random() * 0.3,
          ph: Math.random() * 6.283,
          // Assembly: start scattered
          sx: (Math.random() - 0.5) * 3,
          sy: (Math.random() - 0.5) * 3
        });
      }
    });
  }

  assemble(duration) {
    this._assembled = true;
    this._assembleT = performance.now();
    this._assembleDur = duration * 1000;
  }

  setHover(v) { this.targetHover = v ? 1 : 0; }

  _raf() {
    if (!this.running) return;
    requestAnimationFrame(() => this._raf());
    const t = (performance.now() - this.t0) * 0.001;
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Assembly progress
    let asm = 1;
    if (this._assembled) {
      const raw = (performance.now() - this._assembleT) / this._assembleDur;
      asm = Math.min(1, raw);
      asm = 1 - Math.pow(1 - asm, 3); // ease-out cubic
    } else {
      asm = 0; // Not yet triggered
    }

    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);
    c.globalCompositeOperation = 'lighter';

    const h = this.hover;
    for (const p of this.particles) {
      // Target position with breathing
      const tx = p.bx + Math.sin(t * 1.5 + p.ph) * 0.03;
      const ty = p.by + Math.cos(t * 1.2 + p.ph * 0.7) * 0.03;

      // Interpolate from scattered to target
      p.lx = p.sx + (tx - p.sx) * asm;
      p.ly = p.sy + (ty - p.sy) * asm;

      // Hover pulse
      if (h > 0.01) {
        const dist = Math.sqrt(p.bx * p.bx + p.by * p.by) || 0.01;
        const pulse = Math.sin(t * 4) * 0.05 * h;
        p.lx += (p.bx / dist) * pulse;
        p.ly += (p.by / dist) * pulse;
      }

      p.alpha = p.ba * asm * (1 + Math.sin(t * 2 + p.ph) * 0.15 + h * 0.3);
      if (p.alpha < 0.01) continue;

      p.x = this._tx(p.lx);
      p.y = this._ty(p.ly);
      const s = p.size;

      // Draw base color
      if (h < 0.99) {
        c.globalAlpha = Math.min(p.alpha * (1 - h), 1);
        c.drawImage(this._spriteBase, p.x - s, p.y - s, s * 2, s * 2);
      }
      // Draw hover color
      if (h > 0.01) {
        c.globalAlpha = Math.min(p.alpha * h, 1);
        c.drawImage(this._spriteHover, p.x - s, p.y - s, s * 2, s * 2);
      }
    }
    c.globalAlpha = 1;
  }

  destroy() {
    this.running = false;
    this._ro?.disconnect();
    this.canvas?.remove();
  }
}

/* ─── SocialAnimation: manages all 3 icons + text ─── */
export class SocialAnimation {
  constructor() {
    this._icons = {};
    this._tweens = {};

    const platforms = ['twitch', 'discord', 'x'];
    for (const key of platforms) {
      this._icons[key] = new SocialIcon(`social-slot-${key}`, key);

      // GSAP idle floating on text
      const name = document.querySelector(`[data-platform="${key}"] .social-name`);
      if (name) {
        name.style.display = 'inline-block';
        gsap.to(name, {
          y: 3, duration: 2 + Math.random() * 0.5,
          ease: 'sine.inOut', yoyo: true, repeat: -1
        });
      }
    }
  }

  setHover(platform, value) {
    const icon = this._icons[platform];
    if (icon) icon.setHover(value);

    const name = document.querySelector(`[data-platform="${platform}"] .social-name`);
    if (!name) return;

    if (this._tweens[platform]) this._tweens[platform].kill();

    if (value) {
      this._tweens[platform] = gsap.to(name, {
        scale: 1.2, letterSpacing: '4px',
        duration: 0.3, ease: 'power2.out'
      });
    } else {
      this._tweens[platform] = gsap.to(name, {
        scale: 1, letterSpacing: '2px',
        duration: 0.4, ease: 'power2.inOut'
      });
    }
  }

  assemble(duration) {
    for (const icon of Object.values(this._icons)) {
      icon.assemble(duration);
    }
  }

  destroy() {
    for (const icon of Object.values(this._icons)) {
      icon.destroy();
    }
  }
}
