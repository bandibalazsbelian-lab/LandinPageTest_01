import gsap from 'gsap';

export class Preloader {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.element = document.getElementById('preloader');
    this.bootLines = document.getElementById('boot-lines');
    this.progressFill = document.getElementById('progress-fill');
    this.bootPercent = document.getElementById('boot-percent');
    this.progress = 0;

    this.canvas = document.getElementById('preloader-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.stars = [];
    this.nebulaParticles = [];
    this._running = true;
    this._resizeCanvas();
  }

  _resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  async start() {
    this._initStars(120);
    this._startRenderLoop();
    await this._igniteStars(1500);

    this._initNebula(80);

    const lines = [
      'Csillagrendszer inicializálása...',
      'Navigációs koordináták betöltése...',
      'Nebula-térkép feltérképezése...',
      'Gravitációs mezők kalibrálása...',
      'Aszteroidaöv szkennelése...',
      'Kommunikációs csatornák megnyitása...',
      'Warp-hajtómű szinkronizálása...',
      'Belépés az InnovationHub űrébe...'
    ];

    for (let i = 0; i < lines.length; i++) {
      await this._typeLine(lines[i], 30);
      this.setProgress((i + 1) / lines.length * 100);
      await this._wait(80 + Math.random() * 120);
    }

    await this._wait(300);
    this.setProgress(100);
    await this._wait(200);

    if (this.onComplete) {
      try {
        await this.onComplete();
      } catch (err) {
        console.error('[Preloader] onComplete error:', err);
        this.hide();
      }
    }
  }

  _initStars(count) {
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        alpha: 0,
        targetAlpha: 0.3 + Math.random() * 0.7,
        igniteDelay: Math.random() * 1500,
        twinkleSpeed: 2 + Math.random() * 6,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  _igniteStars(duration) {
    return new Promise(resolve => {
      const start = performance.now();
      const check = () => {
        const elapsed = performance.now() - start;
        for (const s of this.stars) {
          if (elapsed >= s.igniteDelay && s.alpha < s.targetAlpha) {
            s.alpha = Math.min(s.alpha + 0.05, s.targetAlpha);
          }
        }
        if (elapsed < duration) requestAnimationFrame(check);
        else resolve();
      };
      check();
    });
  }

  _initNebula(count) {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const colors = [[0,140,140],[232,114,90],[212,168,67]];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 150;
      this.nebulaParticles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        angle, dist,
        size: 30 + Math.random() * 80,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0,
        targetAlpha: 0.02 + Math.random() * 0.06,
        speed: 0.0003 + Math.random() * 0.001,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  _startRenderLoop() {
    const t0 = performance.now();
    const render = () => {
      if (!this._running) return;
      requestAnimationFrame(render);
      const t = (performance.now() - t0) * 0.001;
      const ctx = this.ctx;
      if (!ctx) return;

      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (const s of this.stars) {
        if (s.alpha <= 0) continue;
        const twinkle = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinklePhase);
        ctx.globalAlpha = s.alpha * twinkle;
        ctx.fillStyle = '#e8eaf0';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      const cx = this.canvas.width / 2;
      const cy = this.canvas.height / 2;
      for (const n of this.nebulaParticles) {
        n.alpha = Math.min(n.alpha + 0.0005, n.targetAlpha);
        n.angle += n.speed;
        const wobble = Math.sin(t * 0.5 + n.phase) * 20;
        n.x = cx + Math.cos(n.angle) * (n.dist + wobble);
        n.y = cy + Math.sin(n.angle) * (n.dist + wobble) * 0.7;
        ctx.globalAlpha = n.alpha;
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size);
        const [r, g, b] = n.color;
        grad.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},0.1)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(n.x - n.size, n.y - n.size, n.size * 2, n.size * 2);
      }
      ctx.globalAlpha = 1;
    };
    render();
  }

  async _typeLine(text, speed) {
    return new Promise(resolve => {
      const line = document.createElement('div');
      line.style.color = '#008C8C';
      this.bootLines.appendChild(line);
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          line.textContent = '> ' + text.substring(0, i + 1);
          i++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, speed);
    });
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setProgress(value) {
    this.progress = Math.min(value, 100);
    if (this.progressFill) this.progressFill.style.width = this.progress + '%';
    if (this.bootPercent) this.bootPercent.textContent = Math.round(this.progress) + '%';
  }

  hide() {
    this._running = false;
    return new Promise(resolve => {
      if (this.ctx) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      }
      gsap.to(this.element, {
        opacity: 0,
        duration: 0.4,
        delay: 0.15,
        ease: 'power2.inOut',
        onComplete: () => {
          this.element.style.display = 'none';
          resolve();
        }
      });
    });
  }
}
