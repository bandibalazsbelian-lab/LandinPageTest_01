// 6 hidden easter eggs
export class EasterEggs {
  constructor(gamification, soundEngine) {
    this.gamification = gamification;
    this.soundEngine = soundEngine;
    this._konamiBuffer = [];
    this._clickTimes = [];
    this._idleTimer = null;
    this._circleTracker = { angles: [], lastTime: 0 };

    this._bindKonami();
    this._bindTripleClick();
    this._bindIdleWave();
    this._bindCircleDraw();
  }

  // 1. Konami Code
  _bindKonami() {
    const code = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
    document.addEventListener('keydown', (e) => {
      this._konamiBuffer.push(e.keyCode);
      if (this._konamiBuffer.length > code.length) {
        this._konamiBuffer.shift();
      }
      if (this._konamiBuffer.length === code.length &&
          this._konamiBuffer.every((v, i) => v === code[i])) {
        this._triggerKonami();
        this._konamiBuffer = [];
      }
    });
  }

  _triggerKonami() {
    this.gamification.discoverEasterEgg('konami', 'Konami kód');

    // Flash all stars — overlay effect
    const flash = document.createElement('div');
    flash.style.cssText = `
      position:fixed; inset:0; z-index:500;
      background:rgba(0,212,212,0.15);
      pointer-events:none;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1000);

    // "Cheat kód elfogadva" toast
    this.gamification.showToast('Cheat kód elfogadva!');
    this.soundEngine?.play('achievement_ding');
  }

  // 4. Morse Code — 3 rapid clicks
  _bindTripleClick() {
    document.addEventListener('mousedown', () => {
      const now = performance.now();
      this._clickTimes.push(now);

      // Keep only last 3 clicks
      if (this._clickTimes.length > 3) this._clickTimes.shift();

      // Check for 3 rapid clicks within 800ms
      if (this._clickTimes.length === 3) {
        const span = now - this._clickTimes[0];
        if (span < 800) {
          this._triggerMorse();
          this._clickTimes = [];
        }
      }
    });
  }

  _triggerMorse() {
    this.gamification.discoverEasterEgg('morse', 'Morzekód');

    // Flash morse "SOS" pattern on screen edge
    const morse = document.createElement('div');
    morse.style.cssText = `
      position:fixed; top:50%; right:20px; z-index:500;
      font-family:'Orbitron',sans-serif; font-size:12px;
      color:#00D4D4; letter-spacing:4px;
      text-shadow: 0 0 10px #00D4D4;
      pointer-events:none; transform:translateY(-50%);
    `;
    morse.textContent = '··· −−− ··· Segítség, innováció szükséges!';
    document.body.appendChild(morse);
    setTimeout(() => morse.remove(), 3000);

    this.soundEngine?.play('achievement_ding');
  }

  // 5. Gravitational Wave — idle 5s
  _bindIdleWave() {
    let lastMove = performance.now();
    let lastMouseX = 0, lastMouseY = 0;
    let waveTriggered = false;

    document.addEventListener('mousemove', (e) => {
      lastMove = performance.now();
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      waveTriggered = false;
    });

    const check = () => {
      const elapsed = performance.now() - lastMove;
      if (elapsed > 5000 && !waveTriggered) {
        waveTriggered = true;
        this._triggerGravWave(lastMouseX, lastMouseY);
      }
      requestAnimationFrame(check);
    };
    check();
  }

  _triggerGravWave(x, y) {
    this.gamification.discoverEasterEgg('gravwave', 'Gravitációs hullám');

    // Concentric circles animation
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.style.cssText = `
        position:fixed;
        left:${x}px; top:${y}px;
        width:0; height:0;
        border:1px solid rgba(0,212,212,0.3);
        border-radius:50%;
        pointer-events:none; z-index:500;
        transform:translate(-50%,-50%);
        transition: width 2s ease-out, height 2s ease-out, opacity 2s ease-out;
      `;
      document.body.appendChild(ring);

      setTimeout(() => {
        const size = 200 + i * 100;
        ring.style.width = size + 'px';
        ring.style.height = size + 'px';
        ring.style.opacity = '0';
      }, i * 300);

      setTimeout(() => ring.remove(), 2500 + i * 300);
    }
  }

  // 3. Circle drawing in Hero section
  _bindCircleDraw() {
    let positions = [];
    let lastTime = 0;

    const heroSection = document.getElementById('section-hero');
    if (!heroSection) return;

    heroSection.addEventListener('mousemove', (e) => {
      const now = performance.now();
      if (now - lastTime < 50) return;
      lastTime = now;

      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      positions.push({ angle, time: now });

      // Keep 2s of data
      positions = positions.filter(p => now - p.time < 2000);

      // Check for 3+ full loops
      if (positions.length > 20) {
        let totalAngle = 0;
        for (let i = 1; i < positions.length; i++) {
          let diff = positions[i].angle - positions[i - 1].angle;
          if (diff > Math.PI) diff -= Math.PI * 2;
          if (diff < -Math.PI) diff += Math.PI * 2;
          totalAngle += diff;
        }

        if (Math.abs(totalAngle) > Math.PI * 6) { // 3 loops
          this._triggerSpiral();
          positions = [];
        }
      }
    });
  }

  _triggerSpiral() {
    this.gamification.discoverEasterEgg('spiral', 'Csillagkép spirál');

    const spiral = document.createElement('canvas');
    spiral.width = window.innerWidth;
    spiral.height = window.innerHeight;
    spiral.style.cssText = `
      position:fixed; inset:0; z-index:500;
      pointer-events:none;
    `;
    document.body.appendChild(spiral);

    const ctx = spiral.getContext('2d');
    const cx = spiral.width / 2;
    const cy = spiral.height / 2;

    ctx.strokeStyle = '#00D4D4';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00D4D4';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    for (let t = 0; t < Math.PI * 6; t += 0.05) {
      const r = t * 15;
      const x = cx + Math.cos(t) * r;
      const y = cy + Math.sin(t) * r;
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    setTimeout(() => {
      spiral.style.transition = 'opacity 1s';
      spiral.style.opacity = '0';
      setTimeout(() => spiral.remove(), 1000);
    }, 2000);

    this.soundEngine?.play('achievement_ding');
  }

  // Called from main.js for stat-specific easter eggs
  checkStatClick(statKey, value) {
    // 6. Spaceship on clicking "34" 3x quickly
    if (statKey === 'launched' && value === 34) {
      if (!this._statClicks) this._statClicks = [];
      this._statClicks.push(performance.now());
      if (this._statClicks.length > 3) this._statClicks.shift();

      if (this._statClicks.length === 3 &&
          performance.now() - this._statClicks[0] < 1500) {
        this._triggerSpaceship();
        this._statClicks = [];
      }
    }
  }

  _triggerSpaceship() {
    this.gamification.discoverEasterEgg('spaceship', 'Űrhajó');

    const ship = document.createElement('div');
    ship.textContent = '🚀';
    ship.style.cssText = `
      position:fixed;
      top: 50%;
      right: -40px;
      font-size: 32px;
      z-index: 500;
      pointer-events: none;
      filter: drop-shadow(0 0 8px #00D4D4);
      transition: transform 2s linear;
    `;
    document.body.appendChild(ship);

    requestAnimationFrame(() => {
      ship.style.transform = `translateX(-${window.innerWidth + 80}px)`;
    });

    setTimeout(() => ship.remove(), 2500);
    this.soundEngine?.play('achievement_ding');
  }

  // 2. Secret asteroid — called externally when found
  discoverSecretAsteroid() {
    this.gamification.discoverEasterEgg('secret_asteroid', 'Az 5. dimenzió');
    this.gamification.showToast('Megtaláltad az 5. dimenziót! 🚀');
    this.soundEngine?.play('achievement_ding');
  }

  dispose() {}
}
