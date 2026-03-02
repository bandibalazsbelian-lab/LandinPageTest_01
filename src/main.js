// InnovationHub — Kozmikus Showcase v2.0
// Main orchestrator — initializes all systems and runs the render loop

import { SceneManager } from './scene/SceneManager.js';
import { ScrollController } from './scene/ScrollController.js';
import { TransitionFX } from './scene/TransitionFX.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { Starfield } from './objects/Starfield.js';
import { Icosahedron } from './objects/Icosahedron.js';
import { ParticleText } from './objects/ParticleText.js';
import { ParticleSphere } from './objects/ParticleSphere.js';
import { AsteroidSystem } from './objects/Asteroids.js';
import { SatelliteSystem } from './objects/Satellites.js';
import { BlackHole } from './objects/BlackHole.js';
import { CustomCursor } from './ui/CustomCursor.js';
import { Preloader } from './ui/Preloader.js';
import { TextAnimator } from './ui/TextAnimator.js';
import { Gamification } from './ui/Gamification.js';
import { EasterEggs } from './ui/EasterEggs.js';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

class InnovationHubApp {
  constructor() {
    this.objects = [];
    this.statsAnimated = false;
    this.heroAnimated = false;
    this.missionAnimated = false;
    this._assemblyStartTime = -1;
    this._currentHovered3D = null;

    this._init();
  }

  async _init() {
    this.soundEngine = new SoundEngine();
    this.cursor = new CustomCursor(this.soundEngine);
    this.gamification = new Gamification(this.soundEngine);
    this.easterEggs = new EasterEggs(this.gamification, this.soundEngine);

    this.preloader = new Preloader(() => this._onPreloaderComplete());
    this.preloader.start();
  }

  async _onPreloaderComplete() {
    try {
      const canvas = document.getElementById('webgl-canvas');
      this.sceneManager = new SceneManager(canvas);
      this.transitionFX = new TransitionFX(this.sceneManager);

      this._buildScene();

      this.scrollController = new ScrollController(this.sceneManager, this.soundEngine);
      this._setupScrollTriggers();
      this._setupSoundToggle();
      this._setupInteractions();

      await this.transitionFX.glitchBurst(400);
    } catch (err) {
      console.error('[InnovationHub] Initialization error:', err);
    }

    await this.preloader.hide();

    document.getElementById('sound-toggle').classList.add('visible');
    this.gamification.show();
    this._animateHero();

    if (this.sceneManager) this._animate();

    console.log('%c[InnovationHub] Kozmikus rendszer online.', 'color: #008C8C; font-weight: bold;');
  }

  _buildScene() {
    // Starfield (background)
    this.starfield = new Starfield();
    this.sceneManager.add(this.starfield.group);

    // Ambient particles
    this._buildAmbientParticles();

    // Icosahedron (hero)
    this.icosahedron = new Icosahedron();
    this.icosahedron.group.position.set(0, 0, 0);
    this.sceneManager.add(this.icosahedron.group);

    // Particle text "InnovationHub"
    this.particleText = new ParticleText('InnovationHub', 2000);
    this.particleText.group.position.set(0, 6, 0);
    this.sceneManager.add(this.particleText.group);

    // Particle Sphere (mid-depth)
    this.particleSphere = new ParticleSphere(2000, 16);
    this.particleSphere.group.position.set(0, -5, -8);
    this.sceneManager.add(this.particleSphere.group);

    // Asteroids (pillars)
    this.asteroidSystem = new AsteroidSystem();
    this.sceneManager.add(this.asteroidSystem.group);

    // Satellites (social)
    this.satelliteSystem = new SatelliteSystem();
    this.sceneManager.add(this.satelliteSystem.group);

    // Black Hole (footer)
    this.blackHole = new BlackHole();
    this.sceneManager.add(this.blackHole.group);
  }

  _buildAmbientParticles() {
    const count = 400;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80 - 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      sizes[i] = 1 + Math.random() * 3;
      alphas[i] = Math.random() * 0.2 + 0.05;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uScrollVel;
        void main() {
          vAlpha = aAlpha;
          vec3 pos = position;
          float scrollAmp = 1.0 + uScrollVel * 0.3;
          pos.x += sin(uTime * 0.15 * scrollAmp + position.y * 0.1) * 0.7;
          pos.y += cos(uTime * 0.12 * scrollAmp + position.x * 0.1) * 0.5;
          pos.z += sin(uTime * 0.08 + position.x * 0.05) * 0.3;
          // Mouse repulsion
          float mDist = 1.0 / (1.0 + length(pos.xy - uMouse * 15.0));
          pos.x += (pos.x - uMouse.x * 15.0) * mDist * 0.2;
          pos.y += (pos.y - uMouse.y * 15.0) * mDist * 0.1;
          // Scroll turbulence
          pos.x += sin(pos.y * 0.3 + uTime * 2.0) * uScrollVel * 0.05;
          pos.y += cos(pos.x * 0.3 + uTime * 2.0) * uScrollVel * 0.05;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z) * (1.0 + uScrollVel * 0.05);
          gl_PointSize = max(gl_PointSize, 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.05, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(0.0, 0.55, 0.55, alpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uScrollVel: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.ambientParticles = new THREE.Points(geo, mat);
    this.sceneManager.add(this.ambientParticles);
  }

  _animateHero() {
    if (this.heroAnimated) return;
    this.heroAnimated = true;

    const subtitle = document.getElementById('hero-subtitle');
    const scrollInd = document.getElementById('scroll-indicator');

    TextAnimator.animateSubtitle(subtitle, 1.5);
    TextAnimator.animateScrollIndicator(scrollInd, 2.5);

    this.gamification.visitSection(0);
  }

  _setupScrollTriggers() {
    const sc = this.scrollController;

    // Section 1: Mission
    sc.onSectionEnter(1, () => {
      this.gamification.visitSection(1);
      if (!this.missionAnimated) {
        this.missionAnimated = true;
        const headline = document.getElementById('mission-headline');
        const body = document.getElementById('mission-body');
        TextAnimator.animateHeadline(headline, 0.2);
        TextAnimator.animateBody(body, 1.0);
      }
    });

    // Section 2: Pillars
    sc.onSectionEnter(2, () => {
      this.gamification.visitSection(2);
    });

    // Section 3: Stats
    sc.onSectionEnter(3, () => {
      this.gamification.visitSection(3);
      if (!this.statsAnimated) {
        this.statsAnimated = true;
        this._animateStats();
      }
    });

    // Section 4: Social
    sc.onSectionEnter(4, () => {
      this.gamification.visitSection(4);
    });

    // Section 5: Footer
    sc.onSectionEnter(5, () => {
      this.gamification.visitSection(5);
    });
  }

  _animateStats() {
    const stats = [
      { el: document.getElementById('stat-ideas'), value: 147, suffix: '+' },
      { el: document.getElementById('stat-challenges'), value: 23, suffix: '' },
      { el: document.getElementById('stat-members'), value: 890, suffix: '+' },
      { el: document.getElementById('stat-launched'), value: 34, suffix: '' }
    ];

    stats.forEach((stat, i) => {
      setTimeout(() => {
        TextAnimator.animateCounter(stat.el, stat.value, 2.5, stat.suffix);
        this.soundEngine.play('stat_tick');
      }, i * 200);
    });
  }

  _setupSoundToggle() {
    const btn = document.getElementById('sound-toggle');
    const onIcon = document.getElementById('sound-on-icon');
    const offIcon = document.getElementById('sound-off-icon');

    btn.addEventListener('click', () => {
      const isOn = this.soundEngine.toggleMute();
      onIcon.style.display = isOn ? 'block' : 'none';
      offIcon.style.display = isOn ? 'none' : 'block';
    });
  }

  _setupInteractions() {
    const canvas = document.getElementById('webgl-canvas');

    // Click on 3D objects
    canvas.addEventListener('click', (e) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

      // Check asteroids
      const asteroidData = this.asteroidSystem.raycast(ndcX, ndcY, this.sceneManager.camera);
      if (asteroidData) {
        this._openAsteroidPanel(asteroidData);
        this.soundEngine.play('asteroid_open');
        this.gamification.explorePillar(asteroidData.key);
        return;
      }

      // Check satellites
      const satData = this.satelliteSystem.raycast(ndcX, ndcY, this.sceneManager.camera);
      if (satData) {
        window.open(satData.url, '_blank', 'noopener');
        this.soundEngine.play(`social_${satData.key}`);
        this.gamification.hoverSocial(satData.key);
        return;
      }
    });

    // Hover detection on 3D objects
    canvas.addEventListener('mousemove', (e) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;

      const asteroidHover = this.asteroidSystem.checkHover(ndcX, ndcY, this.sceneManager.camera);
      const satHover = this.satelliteSystem.checkHover(ndcX, ndcY, this.sceneManager.camera);

      const hovered = asteroidHover || satHover;
      if (hovered !== this._currentHovered3D) {
        this._currentHovered3D = hovered;
        this.cursor.setHoverExtended(!!hovered);
        if (hovered) this.soundEngine.play('hover_blip');
      }
    });

    // Asteroid panel close
    const panel = document.getElementById('asteroid-panel');
    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        this._closeAsteroidPanel();
        this.soundEngine.play('asteroid_close');
      }
    });

    // Back to top
    const backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      backToTop.addEventListener('click', (e) => {
        e.preventDefault();
        this.scrollController.scrollToTop();
      });
    }

    // Stat click for easter egg
    document.querySelectorAll('.stat-module').forEach(mod => {
      mod.addEventListener('click', () => {
        const statKey = mod.dataset.stat;
        const numberEl = mod.querySelector('.stat-number');
        if (numberEl) {
          const val = parseInt(numberEl.textContent);
          this.easterEggs.checkStatClick(statKey, val);
        }
      });
    });
  }

  _openAsteroidPanel(data) {
    const panel = document.getElementById('asteroid-panel');
    const title = document.getElementById('asteroid-panel-title');
    const desc = document.getElementById('asteroid-panel-desc');

    title.textContent = data.name;
    title.style.color = '#' + data.color.toString(16).padStart(6, '0');
    title.style.textShadow = `0 0 10px ${title.style.color}`;
    desc.textContent = data.desc;

    panel.style.display = 'flex';
    gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  }

  _closeAsteroidPanel() {
    const panel = document.getElementById('asteroid-panel');
    gsap.to(panel, {
      opacity: 0, duration: 0.3,
      onComplete: () => { panel.style.display = 'none'; }
    });
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const scrollVel = this.scrollController ? this.scrollController.scrollVelocity : 0;
    this.sceneManager.setScrollVelocity(scrollVel);

    const { delta, elapsed } = this.sceneManager.update();

    // Assembly timing for particle text
    if (this._assemblyStartTime < 0) this._assemblyStartTime = elapsed;
    const assemblyElapsed = Math.max(0, elapsed - this._assemblyStartTime - 0.5);
    const assemblyProgress = Math.min(assemblyElapsed / 3.0, 1.0);

    // Icosahedron fragmentation — driven by scroll (Hero→Mission transition)
    const scrollProgress = this.scrollController ? this.scrollController.scrollProgress : 0;
    const currentSection = this.scrollController ? this.scrollController.currentSection : 0;

    // Fragment when scrolling past hero
    let fragProgress = 0;
    if (currentSection >= 1) fragProgress = 1;
    else fragProgress = Math.min(scrollProgress * 2, 1);

    // Particle text dissolve in sync
    let dissolveProgress = 0;
    if (currentSection >= 1) dissolveProgress = Math.min((scrollProgress || 0) + 0.5, 1);
    else dissolveProgress = Math.max(0, scrollProgress * 2 - 0.5);

    // ParticleSphere expansion at footer
    const sphereExpansion = currentSection >= 5 ? 1.3 : 1.0;

    // Update ambient particles
    if (this.ambientParticles) {
      const u = this.ambientParticles.material.uniforms;
      u.uTime.value = elapsed;
      u.uMouse.value.copy(this.sceneManager.mouseNDC);
      u.uScrollVel.value += (scrollVel * 0.1 - u.uScrollVel.value) * 0.05;
    }

    // Update starfield
    this.starfield.update(elapsed, this.sceneManager.mouseNDC, scrollProgress);

    // Update icosahedron
    this.icosahedron.setMouse(this.sceneManager.mouseNDC);
    this.icosahedron.setFragmentProgress(fragProgress);
    this.icosahedron.update(elapsed, delta);

    // Update particle text
    this.particleText.setMouse(this.sceneManager.mouseNDC);
    this.particleText.setAssembly(assemblyProgress);
    this.particleText.setDissolve(dissolveProgress);
    this.particleText.update(elapsed);

    // Update particle sphere
    this.particleSphere.setScrollVelocity(scrollVel);
    this.particleSphere.setExpansion(sphereExpansion);
    this.particleSphere.update(elapsed, delta, this.sceneManager.mouseNDC);

    // Update asteroids
    this.asteroidSystem.update(elapsed);

    // Update satellites
    this.satelliteSystem.update(elapsed);

    // Update black hole
    this.blackHole.update(elapsed);

    // Update scroll controller
    if (this.scrollController) this.scrollController.update(delta);

    // Update cursor
    this.cursor.update();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new InnovationHubApp();
});
