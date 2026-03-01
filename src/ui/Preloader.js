import gsap from 'gsap';

export class Preloader {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this.element = document.getElementById('preloader');
    this.bootLines = document.getElementById('boot-lines');
    this.bootText = document.getElementById('boot-text');
    this.progressFill = document.getElementById('progress-fill');
    this.bootPercent = document.getElementById('boot-percent');
    this.progress = 0;
  }

  async start() {
    const lines = [
      '> Kvantum kapcsolat létrehozása...',
      '> Neurális interfészek betöltése...',
      '> Innovációs mátrixok kalibrálása...',
      '> Részecske rendszerek inicializálása...',
      '> Shader programok fordítása...',
      '> Kollaboratív hálózatok szinkronizálása...',
      '> FutureWatch szenzorok aktiválása...',
      '> Rendszerindítás kész.'
    ];

    // Type out boot lines
    for (let i = 0; i < lines.length; i++) {
      await this._typeLine(lines[i], 30 + Math.random() * 20);
      this.setProgress((i + 1) / lines.length * 100);
      await this._wait(100 + Math.random() * 200);
    }

    this.bootText.textContent = 'RENDSZER KÉSZ';
    await this._wait(400);

    // Complete
    this.setProgress(100);
    await this._wait(300);

    // Trigger complete — await if async, catch errors to prevent hang
    if (this.onComplete) {
      try {
        await this.onComplete();
      } catch (err) {
        console.error('[Preloader] onComplete error:', err);
        this.hide();
      }
    }
  }

  async _typeLine(text, speed) {
    return new Promise(resolve => {
      const line = document.createElement('div');
      line.style.color = '#008C8C';
      this.bootLines.appendChild(line);

      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          line.textContent = text.substring(0, i + 1);
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
    this.progressFill.style.width = this.progress + '%';
    this.bootPercent.textContent = Math.round(this.progress) + '%';
  }

  hide() {
    return new Promise(resolve => {
      gsap.to(this.element, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.inOut',
        onComplete: () => {
          this.element.style.display = 'none';
          resolve();
        }
      });
    });
  }
}
