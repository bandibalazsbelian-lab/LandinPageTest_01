// InnovationHub — Immersive Digital Experience
// Main orchestrator — initializes all systems and runs the render loop

import { SceneManager } from './scene/SceneManager.js';
import { ScrollController } from './scene/ScrollController.js';
import { TransitionFX } from './scene/TransitionFX.js';
import { SoundEngine } from './audio/SoundEngine.js';
import { Logo } from './objects/Logo.js';
import { ParticleSphere } from './objects/ParticleSphere.js';
import { TestTubeSymbol, LightningSymbol, AtomSymbol, RocketSymbol } from './ui/PillarSymbol.js';
import { SocialAnimation } from './ui/SocialAnimation.js';
import { CustomCursor } from './ui/CustomCursor.js';
import { Preloader } from './ui/Preloader.js';
import { TextAnimator } from './ui/TextAnimator.js';
import { Gamification } from './ui/Gamification.js';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

class InnovationHubApp {
  constructor() {
    this.objects = [];
    this.pillarSymbols = {};
    this.statsAnimated = false;
    this.socialAssembled = false;
    this.heroAnimated = false;
    this.missionAnimated = false;

    this._init();
  }

  async _init() {
    // Initialize core systems
    this.soundEngine = new SoundEngine();
    this.cursor = new CustomCursor(this.soundEngine);
    this.gamification = new Gamification(this.soundEngine);

    // Start preloader
    this.preloader = new Preloader(() => this._onPreloaderComplete());
    this.preloader.start();
  }

  async _onPreloaderComplete() {
    try {
      // Initialize 3D scene
      const canvas = document.getElementById('webgl-canvas');
      this.sceneManager = new SceneManager(canvas);
      this.transitionFX = new TransitionFX(this.sceneManager);

      // Build 3D objects
      this._buildScene();

      // Initialize scroll controller
      this.scrollController = new ScrollController(this.sceneManager, this.soundEngine);
      this._setupScrollTriggers();

      // Setup sound toggle
      this._setupSoundToggle();

      // Setup pillar interactions
      this._setupPillarInteractions();

      // Setup social interactions
      this._setupSocialInteractions();

      // Glitch transition out of preloader
      await this.transitionFX.glitchBurst(400);
    } catch (err) {
      console.error('[InnovationHub] Initialization error:', err);
    }

    // Always hide preloader and start render — even if something above failed
    await this.preloader.hide();

    // Show UI
    document.getElementById('sound-toggle').classList.add('visible');
    this.gamification.show();

    // Animate hero section
    this._animateHero();

    // Start render loop
    if (this.sceneManager) {
      this._animate();
    }

    console.log('%c[InnovationHub] Rendszer online. Üdvözöljük a jövőben.', 'color: #008C8C; font-weight: bold;');
  }

  _buildScene() {
    // Ambient floating particles (background)
    this._buildAmbientParticles();

    // Hero: Logo
    this.logo = new Logo();
    this.logo.group.position.set(0, 2, 0);
    this.sceneManager.add(this.logo.group);
    this.objects.push(this.logo);

    // Hero: Particle Sphere
    this.particleSphere = new ParticleSphere(2500, 14);
    this.particleSphere.group.position.set(0, 0, -5);
    this.sceneManager.add(this.particleSphere.group);
    this.objects.push(this.particleSphere);

    // Pillar canvas symbols (rendered inside HTML card slots)
    this._buildPillarSymbols();

    // Social canvas animations (rendered inside HTML social slots)
    this.socialAnimation = new SocialAnimation();
  }

  _buildAmbientParticles() {
    const count = 350;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const primary = new THREE.Color(0x008C8C);
    const secondary = new THREE.Color(0xE8725A);
    const accent = new THREE.Color(0xD4A843);
    const white = new THREE.Color(0xe8eaf0);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80 - 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      sizes[i] = Math.random() * 2.5 + 0.5;
      alphas[i] = Math.random() * 0.25 + 0.05;

      const rnd = Math.random();
      const c = rnd > 0.6 ? primary : rnd > 0.3 ? secondary : rnd > 0.1 ? accent : white;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uPixelRatio;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uScrollVel;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec3 pos = position;
          // Base organic motion (amplified by scroll)
          float scrollAmp = 1.0 + uScrollVel * 0.3;
          pos.x += sin(uTime * 0.15 * scrollAmp + position.y * 0.1) * 0.7;
          pos.y += cos(uTime * 0.12 * scrollAmp + position.x * 0.1) * 0.5;
          pos.z += sin(uTime * 0.08 + position.x * 0.05 + position.y * 0.05) * 0.3;
          // Mouse repulsion (subtle)
          float mouseInfluence = 1.0 / (1.0 + length(pos.xy - uMouse * 15.0));
          pos.x += (pos.x - uMouse.x * 15.0) * mouseInfluence * 0.3;
          pos.y += (pos.y - uMouse.y * 15.0) * mouseInfluence * 0.15;
          // Scroll turbulence burst
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
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.05, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
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

  _buildPillarSymbols() {
    this.pillarSymbols = {
      colab: new TestTubeSymbol('pillar-slot-colab'),
      challenge: new LightningSymbol('pillar-slot-challenge'),
      lab: new AtomSymbol('pillar-slot-lab'),
      future: new RocketSymbol('pillar-slot-future')
    };
  }

  _animateHero() {
    if (this.heroAnimated) return;
    this.heroAnimated = true;

    const title = document.getElementById('hero-title');
    const subtitle = document.getElementById('hero-subtitle');
    const scrollInd = document.getElementById('scroll-indicator');

    TextAnimator.animateHeroTitle(title, 0.3);
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
      if (!this.socialAssembled) {
        this.socialAssembled = true;
        this.socialAnimation.assemble(2.5);
        this.soundEngine.play('particle_form');
      }
    });

    // Section 5: Footer
    sc.onSectionEnter(5, () => {
      this.gamification.visitSection(5);
    });
  }

  _animateStats() {
    const stats = [
      { el: document.getElementById('stat-ideas'), value: 247, suffix: '+' },
      { el: document.getElementById('stat-challenges'), value: 12, suffix: '' },
      { el: document.getElementById('stat-members'), value: 180, suffix: '+' },
      { el: document.getElementById('stat-launched'), value: 8, suffix: '' }
    ];

    stats.forEach((stat, i) => {
      setTimeout(() => {
        TextAnimator.animateCounter(stat.el, stat.value, 2, stat.suffix);
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

  _setupPillarInteractions() {
    const pillarCards = document.querySelectorAll('.pillar-card');
    const chimes = ['pillar_chime_1', 'pillar_chime_2', 'pillar_chime_3', 'pillar_chime_4'];

    pillarCards.forEach((card, index) => {
      const pillarKey = card.dataset.pillar;
      const symbol = this.pillarSymbols[pillarKey];

      card.addEventListener('mouseenter', () => {
        if (symbol) symbol.setHover(true);
        this.soundEngine.play(chimes[index]);
        this.gamification.explorePillar(pillarKey);
      });

      card.addEventListener('mouseleave', () => {
        if (symbol) symbol.setHover(false);
      });
    });

    // Logo hover
    const heroSection = document.getElementById('section-hero');
    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height * 0.35;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200) {
        this.logo.setHover(true);
      } else {
        this.logo.setHover(false);
      }
    });
    heroSection.addEventListener('mouseleave', () => {
      this.logo.setHover(false);
    });
  }

  _setupSocialInteractions() {
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach(link => {
      const platform = link.dataset.platform;
      link.addEventListener('mouseenter', () => {
        this.socialAnimation.setHover(platform, true);
        this.soundEngine.play(`social_${platform}`);
        this.gamification.hoverSocial(platform);
      });
      link.addEventListener('mouseleave', () => {
        this.socialAnimation.setHover(platform, false);
      });
    });
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    // Feed scroll velocity to scene manager BEFORE update for reactive post-processing
    const scrollVel = this.scrollController ? this.scrollController.scrollVelocity : 0;
    this.sceneManager.setScrollVelocity(scrollVel);

    const { delta, elapsed } = this.sceneManager.update();

    // Update ambient particles with mouse and scroll
    if (this.ambientParticles) {
      this.ambientParticles.material.uniforms.uTime.value = elapsed;
      this.ambientParticles.material.uniforms.uMouse.value.copy(this.sceneManager.mouseNDC);
      this.ambientParticles.material.uniforms.uScrollVel.value += (scrollVel * 0.1 - this.ambientParticles.material.uniforms.uScrollVel.value) * 0.05;
    }

    // Update all 3D objects — pass mouse and scroll to objects
    this.logo.setMouse(this.sceneManager.mouseNDC);
    this.logo.update(elapsed, delta);
    this.particleSphere.setScrollVelocity(scrollVel);
    this.particleSphere.update(elapsed, delta, this.sceneManager.mouseNDC);

    // Update scroll controller
    if (this.scrollController) {
      this.scrollController.update(delta);
    }

    // Update cursor
    this.cursor.update();
  }
}

// Boot the application
document.addEventListener('DOMContentLoaded', () => {
  new InnovationHubApp();
});
