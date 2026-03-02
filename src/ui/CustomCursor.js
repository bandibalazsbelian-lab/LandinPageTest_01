import gsap from 'gsap';

export class CustomCursor {
  constructor(soundEngine) {
    this.soundEngine = soundEngine;
    this.dot = document.getElementById('cursor-dot');

    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.visible = false;

    this.trailContainer = document.getElementById('cursor-trail') ||
      document.createElement('div');
    if (!this.trailContainer.parentElement) {
      this.trailContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9997;';
      document.body.appendChild(this.trailContainer);
    }

    this.ghosts = [];
    this._buildGhosts();
    this._bind();
  }

  _buildGhosts() {
    const lerpValues = [0.08, 0.06, 0.05, 0.04, 0.035, 0.03, 0.025, 0.02];
    const sizes = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1];
    const alphas = [0.6, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1, 0.05];

    for (let i = 0; i < 8; i++) {
      const el = document.createElement('div');
      el.className = 'cursor-ghost';
      const size = sizes[i];
      const tint = Math.round(140 + (0 - 140) * (i / 7));
      el.style.cssText = `
        width: ${size}px; height: ${size}px;
        opacity: ${alphas[i]};
        background: rgb(0, ${tint}, ${tint});
        box-shadow: 0 0 ${size}px rgba(0, ${tint}, ${tint}, 0.3);
      `;
      this.trailContainer.appendChild(el);
      this.ghosts.push({
        el, lerp: lerpValues[i],
        x: this.pos.x, y: this.pos.y, size
      });
    }
  }

  _bind() {
    document.addEventListener('mousemove', (e) => {
      this.target.x = e.clientX;
      this.target.y = e.clientY;
      if (!this.visible) {
        this.visible = true;
        this.dot.style.opacity = '1';
        for (const g of this.ghosts) {
          g.x = e.clientX;
          g.y = e.clientY;
        }
      }
    });

    const interactives = document.querySelectorAll('a, button, .stat-module, .back-to-top');
    interactives.forEach(el => {
      el.addEventListener('mouseenter', () => this.dot.classList.add('hover'));
      el.addEventListener('mouseleave', () => this.dot.classList.remove('hover'));
    });

    document.addEventListener('mousedown', (e) => {
      this._clickBurst(e.clientX, e.clientY);
      gsap.to(this.dot, {
        scale: 0.3, duration: 0.15, ease: 'power2.in',
        onComplete: () => {
          gsap.to(this.dot, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
        }
      });
    });

    if ('ontouchstart' in window) {
      this.dot.style.display = 'none';
      this.trailContainer.style.display = 'none';
    }
  }

  _clickBurst(x, y) {
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 15 + Math.random() * 15;
      const size = 2 + Math.random() * 2;
      particle.style.cssText = `
        position:fixed; left:0; top:0;
        width:${size}px; height:${size}px;
        background:#00D4D4; border-radius:50%;
        pointer-events:none; will-change:transform,opacity;
        transform:translate(${x - size / 2}px, ${y - size / 2}px);
        box-shadow:0 0 4px #00D4D4; z-index:9999;
      `;
      document.body.appendChild(particle);
      gsap.to(particle, {
        x: Math.cos(angle) * dist, y: Math.sin(angle) * dist,
        opacity: 0, scale: 0, duration: 0.4, ease: 'expo.out',
        onComplete: () => particle.remove()
      });
    }
  }

  update() {
    const dotSize = this.dot.classList.contains('hover') ? 5 : 3;
    this.dot.style.transform = `translate(${this.target.x - dotSize}px, ${this.target.y - dotSize}px)`;

    let prevX = this.target.x;
    let prevY = this.target.y;
    for (const g of this.ghosts) {
      g.x += (prevX - g.x) * g.lerp;
      g.y += (prevY - g.y) * g.lerp;
      const hs = g.size / 2;
      g.el.style.transform = `translate(${g.x - hs}px, ${g.y - hs}px)`;
      prevX = g.x;
      prevY = g.y;
    }
  }

  setHoverExtended(value) {
    if (value) this.dot.classList.add('hover');
    else this.dot.classList.remove('hover');
  }

  dispose() { this.trailContainer.remove(); }
}
