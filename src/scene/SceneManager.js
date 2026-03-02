import * as THREE from 'three';
import { EffectComposer, EffectPass, RenderPass, BloomEffect, ChromaticAberrationEffect, VignetteEffect, NoiseEffect, BlendFunction } from 'postprocessing';

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(0, 0);
    this.mouseNDC = new THREE.Vector2(0, 0);
    this.scrollProgress = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._initRenderer();
    this._initScene();
    this._initCamera();
    this._initPostProcessing();
    this._initLights();
    this._bindEvents();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x0A0A1A, 1);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0A0A1A, 0.004);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 32);
    this.cameraTarget = new THREE.Vector3(0, 0, 32);
  }

  _initPostProcessing() {
    try {
      this.composer = new EffectComposer(this.renderer);
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      this.bloomEffect = new BloomEffect({
        intensity: 2.0,
        luminanceThreshold: 0.15,
        luminanceSmoothing: 0.8,
        mipmapBlur: true
      });

      this.chromaticAberration = new ChromaticAberrationEffect({
        offset: new THREE.Vector2(0.0008, 0.0008)
      });
      this.chromaticBaseOffset = 0.0008;
      this.chromaticTargetOffset = 0.0008;

      this.vignetteEffect = new VignetteEffect({
        offset: 0.3,
        darkness: 0.55
      });

      this.noiseEffect = new NoiseEffect({
        blendFunction: BlendFunction.OVERLAY
      });
      this.noiseEffect.blendMode.opacity.value = 0.08;

      const effectPass = new EffectPass(this.camera,
        this.bloomEffect, this.chromaticAberration,
        this.vignetteEffect, this.noiseEffect
      );
      this.composer.addPass(effectPass);
      this.useComposer = true;
    } catch (err) {
      console.warn('[SceneManager] Post-processing failed:', err);
      this.useComposer = false;
    }
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0x0A0A1A, 0.3);
    this.scene.add(ambient);

    const light1 = new THREE.PointLight(0x008C8C, 1.2, 100);
    light1.position.set(8, 12, 22);
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0xD4A843, 0.8, 80);
    light2.position.set(-10, -6, 18);
    this.scene.add(light2);

    const light3 = new THREE.PointLight(0xE8725A, 0.6, 60);
    light3.position.set(2, 6, 28);
    this.scene.add(light3);
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('mousemove', (e) => {
      this.mouse.set(e.clientX, e.clientY);
      this.mouseNDC.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );
    });
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  }

  chromaticBurst(intensity = 0.008, duration = 300) {
    if (!this.chromaticAberration) return;
    this.chromaticTargetOffset = intensity;
    setTimeout(() => {
      this.chromaticTargetOffset = this.chromaticBaseOffset;
    }, duration * 0.3);
  }

  setCameraForSection(sectionIndex, progress) {
    const sections = [
      { pos: new THREE.Vector3(0, 0, 32),    fov: 60 },   // Hero
      { pos: new THREE.Vector3(0, -3, 16),    fov: 48 },   // Mission
      { pos: new THREE.Vector3(3, -7, 30),    fov: 68 },   // Pillars
      { pos: new THREE.Vector3(-2, -11, 18),  fov: 45 },   // Stats
      { pos: new THREE.Vector3(0, -15, 24),   fov: 55 },   // Social
      { pos: new THREE.Vector3(0, -19, 35),   fov: 62 }    // Footer
    ];

    const current = sections[Math.min(sectionIndex, sections.length - 1)];
    const next = sections[Math.min(sectionIndex + 1, sections.length - 1)];

    const t = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    this.cameraTarget.lerpVectors(current.pos, next.pos, t);

    const targetFov = current.fov + (next.fov - current.fov) * t;
    this.camera.fov += (targetFov - this.camera.fov) * 0.12;
    this.camera.updateProjectionMatrix();
  }

  setScrollVelocity(vel) {
    this._scrollVelocity = vel;
  }

  // Track current section for vignette darkening at footer
  setCurrentSection(index) {
    this._currentSection = index;
  }

  update() {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    const scrollVel = this._scrollVelocity || 0;

    // Smooth camera with lerp
    this.camera.position.lerp(this.cameraTarget, 0.055);

    // Parallax sway
    const swayX = this.mouseNDC.x * 0.5;
    const swayY = this.mouseNDC.y * 0.25;
    this.camera.position.x += (swayX + this.cameraTarget.x - this.camera.position.x) * 0.03;
    this.camera.position.y += (swayY + this.cameraTarget.y - this.camera.position.y) * 0.03;

    // Z-axis breathing (4s cycle, ±0.3)
    this.camera.position.z += Math.sin(elapsed * (Math.PI * 2 / 4)) * 0.003;

    this.camera.lookAt(
      this.cameraTarget.x * 0.7,
      this.cameraTarget.y - 2,
      0
    );

    // Dynamic vignette
    if (this.vignetteEffect) {
      // Footer section: darken to 0.9
      const footerDarken = (this._currentSection === 5) ? 0.35 : 0;
      const targetDarkness = 0.55 + Math.min(scrollVel * 0.003, 0.25) + footerDarken;
      this.vignetteEffect.darkness += (targetDarkness - this.vignetteEffect.darkness) * 0.05;
    }

    // Dynamic bloom
    if (this.bloomEffect) {
      const targetBloom = 2.0 + Math.min(scrollVel * 0.003, 0.4);
      this.bloomEffect.intensity += (targetBloom - this.bloomEffect.intensity) * 0.06;
    }

    // Smooth chromatic aberration
    if (this.chromaticAberration) {
      const scrollChroma = Math.min(scrollVel * 0.00003, 0.004);
      const target = this.chromaticTargetOffset + scrollChroma;
      const currentOffset = this.chromaticAberration.offset.x;
      const newOffset = currentOffset + (target - currentOffset) * 0.1;
      this.chromaticAberration.offset.set(newOffset, newOffset);
    }

    // Noise: spike on transitions
    if (this.noiseEffect && this.noiseEffect.blendMode && this.noiseEffect.blendMode.opacity) {
      const targetNoise = 0.08 + Math.min(scrollVel * 0.0005, 0.17);
      this.noiseEffect.blendMode.opacity.value +=
        (targetNoise - this.noiseEffect.blendMode.opacity.value) * 0.1;
    }

    // Render
    if (this.useComposer && this.composer) {
      this.composer.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    return { delta, elapsed };
  }

  add(object) { this.scene.add(object); }
  remove(object) { this.scene.remove(object); }
}
