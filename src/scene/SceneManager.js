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
      antialias: false, // handled by post-processing SMAA
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
    this.scene.fog = new THREE.FogExp2(0x0A0A1A, 0.005);
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 30);
    this.cameraTarget = new THREE.Vector3(0, 0, 30);
  }

  _initPostProcessing() {
    try {
      this.composer = new EffectComposer(this.renderer);

      // Render pass
      const renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);

      // Bloom — cranked up for neon glow
      this.bloomEffect = new BloomEffect({
        intensity: 2.2,
        luminanceThreshold: 0.12,
        luminanceSmoothing: 0.85,
        mipmapBlur: true
      });

      // Chromatic Aberration
      this.chromaticAberration = new ChromaticAberrationEffect({
        offset: new THREE.Vector2(0.0008, 0.0008)
      });
      this.chromaticBaseOffset = 0.0008;
      this.chromaticTargetOffset = 0.0008;

      // Vignette
      this.vignetteEffect = new VignetteEffect({
        offset: 0.3,
        darkness: 0.6
      });

      // Film Grain / Noise
      this.noiseEffect = new NoiseEffect({
        blendFunction: BlendFunction.OVERLAY
      });
      this.noiseEffect.blendMode.opacity.value = 0.12;

      // Combine core effects (skip SMAA — it can crash on some GPUs)
      const effects = [
        this.bloomEffect,
        this.chromaticAberration,
        this.vignetteEffect,
        this.noiseEffect
      ];

      const effectPass = new EffectPass(this.camera, ...effects);
      this.composer.addPass(effectPass);

      this.useComposer = true;
      console.log('[SceneManager] Post-processing initialized');
    } catch (err) {
      console.warn('[SceneManager] Post-processing failed, using fallback renderer:', err);
      this.useComposer = false;
    }
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0x0A0A1A, 0.3);
    this.scene.add(ambient);

    const pointLight1 = new THREE.PointLight(0x008C8C, 2, 100);
    pointLight1.position.set(10, 10, 20);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xD4A843, 1.5, 80);
    pointLight2.position.set(-10, -5, 15);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xE8725A, 1, 60);
    pointLight3.position.set(0, 5, 25);
    this.scene.add(pointLight3);
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

  // Trigger a chromatic aberration burst
  chromaticBurst(intensity = 0.012, duration = 500) {
    if (!this.chromaticAberration) return;
    this.chromaticTargetOffset = intensity;
    setTimeout(() => {
      this.chromaticTargetOffset = this.chromaticBaseOffset;
    }, duration * 0.3);
  }

  // Update camera position based on scroll — cinematic zoom in/out per section
  setCameraForSection(sectionIndex, progress) {
    // Dramatic camera choreography: alternating zoom-in / zoom-out / dolly / arc
    const sections = [
      { pos: new THREE.Vector3(0, 0, 30),   fov: 60 },   // Hero — wide establishing shot
      { pos: new THREE.Vector3(0, -2, 18),   fov: 50 },   // Mission — zoom IN tight
      { pos: new THREE.Vector3(2, -5, 28),   fov: 65 },   // Pillars — pull OUT + pan right
      { pos: new THREE.Vector3(-1, -8, 20),  fov: 48 },   // Stats — zoom IN close + pan left
      { pos: new THREE.Vector3(0, -11, 26),  fov: 58 },   // Social — medium pull out
      { pos: new THREE.Vector3(0, -14, 32),  fov: 62 }    // Footer — wide farewell
    ];

    const current = sections[Math.min(sectionIndex, sections.length - 1)];
    const next = sections[Math.min(sectionIndex + 1, sections.length - 1)];

    // Smooth ease curve for transitions (cubic ease in-out)
    const t = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    this.cameraTarget.lerpVectors(current.pos, next.pos, t);

    // Animate FOV for zoom effect
    const targetFov = current.fov + (next.fov - current.fov) * t;
    this.camera.fov += (targetFov - this.camera.fov) * 0.12;
    this.camera.updateProjectionMatrix();
  }

  // Feed scroll velocity for reactive post-processing
  setScrollVelocity(vel) {
    this._scrollVelocity = vel;
  }

  update() {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();
    const scrollVel = this._scrollVelocity || 0;

    // Smooth camera — slightly faster lerp for snappier feel
    this.camera.position.lerp(this.cameraTarget, 0.065);

    // Parallax camera sway from mouse (amplified)
    const swayX = this.mouseNDC.x * 0.5;
    const swayY = this.mouseNDC.y * 0.25;
    this.camera.position.x += (swayX + this.cameraTarget.x - this.camera.position.x) * 0.03;
    this.camera.position.y += (swayY + this.cameraTarget.y - this.camera.position.y) * 0.03;

    // Subtle breathing on Z axis
    this.camera.position.z += Math.sin(elapsed * 0.4) * 0.003;

    this.camera.lookAt(
      this.cameraTarget.x * 0.7,
      this.cameraTarget.y - 2,
      0
    );

    // Dynamic vignette — tightens during scroll
    if (this.vignetteEffect) {
      const targetDarkness = 0.6 + Math.min(scrollVel * 0.003, 0.25);
      this.vignetteEffect.darkness += (targetDarkness - this.vignetteEffect.darkness) * 0.08;
    }

    // Dynamic bloom — intensifies slightly during scroll
    if (this.bloomEffect) {
      const targetBloom = 1.0 + Math.min(scrollVel * 0.005, 0.6);
      this.bloomEffect.intensity += (targetBloom - this.bloomEffect.intensity) * 0.06;
    }

    // Smooth chromatic aberration
    if (this.chromaticAberration) {
      // Scroll adds subtle chromatic push
      const scrollChroma = Math.min(scrollVel * 0.00004, 0.006);
      const target = this.chromaticTargetOffset + scrollChroma;
      const currentOffset = this.chromaticAberration.offset.x;
      const newOffset = currentOffset + (target - currentOffset) * 0.1;
      this.chromaticAberration.offset.set(newOffset, newOffset);
    }

    // Render
    if (this.useComposer && this.composer) {
      this.composer.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }

    return { delta, elapsed };
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }
}
