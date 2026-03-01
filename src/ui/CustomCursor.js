import gsap from 'gsap';

export class CustomCursor {
  constructor(soundEngine) {
    this.soundEngine = soundEngine;
    this.dot = document.getElementById('cursor-dot');
    this.ring = document.getElementById('cursor-ring');

    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.visible = false;

    // Particle trail
    this.trailParticles = [];
    this.trailContainer = document.createElement('div');
    this.trailContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9997;';
    document.body.appendChild(this.trailContainer);

    this._bind();
  }

  _bind() {
    document.addEventListener('mousemove', (e) => {
      this.target.x = e.clientX;
      this.target.y = e.clientY;
      if (!this.visible) {
        this.visible = true;
        this.dot.style.opacity = '1';
        this.ring.style.opacity = '1';
      }
      this._addTrailParticle(e.clientX, e.clientY);
    });

    // Hover states for interactive elements
    const interactives = document.querySelectorAll('a, button, .pillar-card, .stat-hex, .social-link');
    interactives.forEach(el => {
      el.addEventListener('mouseenter', () => {
        this.ring.classList.add('hover');
      });
      el.addEventListener('mouseleave', () => {
        this.ring.classList.remove('hover');
      });
    });

    // Click burst
    document.addEventListener('mousedown', (e) => {
      this._clickBurst(e.clientX, e.clientY);
      // Scale punch
      gsap.to(this.dot, {
        scale: 0.5,
        duration: 0.1,
        ease: 'power2.in',
        onComplete: () => {
          gsap.to(this.dot, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
        }
      });
    });

    // Hide on mobile
    if ('ontouchstart' in window) {
      this.dot.style.display = 'none';
      this.ring.style.display = 'none';
    }
  }

  _addTrailParticle(x, y) {
    if (this.trailParticles.length > 6) return;

    const particle = document.createElement('div');
    particle.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 4px;
      height: 4px;
      background: #D4A843;
      border-radius: 50%;
      pointer-events: none;
      will-change: transform, opacity;
      transform: translate(${x - 2}px, ${y - 2}px);
      box-shadow: 0 0 4px #D4A843;
    `;
    this.trailContainer.appendChild(particle);
    this.trailParticles.push(particle);

    gsap.to(particle, {
      opacity: 0,
      scale: 0,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => {
        particle.remove();
        const idx = this.trailParticles.indexOf(particle);
        if (idx > -1) this.trailParticles.splice(idx, 1);
      }
    });
  }

  _clickBurst(x, y) {
    for (let i = 0; i < 8; i++) {
      const particle = document.createElement('div');
      const angle = (i / 8) * Math.PI * 2;
      const dist = 20 + Math.random() * 20;

      particle.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 3px;
        height: 3px;
        background: #D4A843;
        border-radius: 50%;
        pointer-events: none;
        will-change: transform, opacity;
        transform: translate(${x - 1.5}px, ${y - 1.5}px);
        box-shadow: 0 0 6px #D4A843;
      `;
      this.trailContainer.appendChild(particle);

      gsap.to(particle, {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        opacity: 0,
        scale: 0,
        duration: 0.5 + Math.random() * 0.3,
        ease: 'expo.out',
        onComplete: () => particle.remove()
      });
    }
  }

  update() {
    // Spring physics follow
    this.pos.x += (this.target.x - this.pos.x) * 0.15;
    this.pos.y += (this.target.y - this.pos.y) * 0.15;

    this.dot.style.transform = `translate(${this.target.x - 4}px, ${this.target.y - 4}px)`;
    this.ring.style.transform = `translate(${this.pos.x - 16}px, ${this.pos.y - 16}px)`;
  }

  dispose() {
    this.trailContainer.remove();
  }
}
