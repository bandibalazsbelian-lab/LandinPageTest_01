import * as THREE from 'three';
import { EffectComposer, EffectPass, RenderPass, BloomEffect, ChromaticAberrationEffect, VignetteEffect, NoiseEffect, BlendFunction, SMAAEffect } from 'postprocessing';

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
    this.renderer.setClearColor(0x0a0e17, 1);
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0e17, 0.008);
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
    this.composer = new EffectComposer(this.renderer);

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Bloom
    this.bloomEffect = new BloomEffect({
      intensity: 0.6,
      luminanceThreshold: 0.4,
      luminanceSmoothing: 0.7,
      mipmapBlur: true
    });

    // Chromatic Aberration
    this.chromaticAberration = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0008, 0.0008),
      radialModulation: true,
      modulationOffset: 0.3
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
      blendFunction: BlendFunction.OVERLAY,
      premultiply: true
    });
    this.noiseEffect.blendMode.opacity.value = 0.12;

    // SMAA
    this.smaaEffect = new SMAAEffect();

    // Combine effects
    const effectPass = new EffectPass(
      this.camera,
      this.bloomEffect,
      this.chromaticAberration,
      this.vignetteEffect,
      this.noiseEffect,
      this.smaaEffect
    );
    this.composer.addPass(effectPass);
  }

  _initLights() {
    const ambient = new THREE.AmbientLight(0x0a0e17, 0.5);
    this.scene.add(ambient);

    const pointLight1 = new THREE.PointLight(0x00ff88, 2, 100);
    pointLight1.position.set(10, 10, 20);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00e5ff, 1.5, 80);
    pointLight2.position.set(-10, -5, 15);
    this.scene.add(pointLight2);
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
    this.composer.setSize(w, h);
  }

  // Trigger a chromatic aberration burst
  chromaticBurst(intensity = 0.012, duration = 500) {
    this.chromaticTargetOffset = intensity;
    setTimeout(() => {
      this.chromaticTargetOffset = this.chromaticBaseOffset;
    }, duration * 0.3);
  }

  // Update camera position based on scroll
  setCameraForSection(sectionIndex, progress) {
    // Each section has a camera zone
    const sections = [
      { pos: new THREE.Vector3(0, 0, 30), look: new THREE.Vector3(0, 0, 0) },     // Hero
      { pos: new THREE.Vector3(0, -2, 22), look: new THREE.Vector3(0, -2, 0) },    // Mission
      { pos: new THREE.Vector3(0, -5, 26), look: new THREE.Vector3(0, -5, 0) },    // Pillars
      { pos: new THREE.Vector3(0, -8, 24), look: new THREE.Vector3(0, -8, 0) },    // Stats
      { pos: new THREE.Vector3(0, -11, 28), look: new THREE.Vector3(0, -11, 0) },  // Social
      { pos: new THREE.Vector3(0, -14, 30), look: new THREE.Vector3(0, -14, 0) }   // Footer
    ];

    const current = sections[Math.min(sectionIndex, sections.length - 1)];
    const next = sections[Math.min(sectionIndex + 1, sections.length - 1)];

    this.cameraTarget.lerpVectors(current.pos, next.pos, progress);
  }

  update() {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Smooth camera
    this.camera.position.lerp(this.cameraTarget, 0.05);

    // Subtle camera sway from mouse
    const swayX = this.mouseNDC.x * 0.3;
    const swayY = this.mouseNDC.y * 0.15;
    this.camera.position.x += (swayX - this.camera.position.x) * 0.02;
    this.camera.position.y += (swayY + this.cameraTarget.y - this.camera.position.y) * 0.02;

    this.camera.lookAt(
      this.cameraTarget.x,
      this.cameraTarget.y - 2,
      0
    );

    // Smooth chromatic aberration
    const currentOffset = this.chromaticAberration.offset.x;
    const newOffset = currentOffset + (this.chromaticTargetOffset - currentOffset) * 0.1;
    this.chromaticAberration.offset.set(newOffset, newOffset);

    // Render
    this.composer.render(delta);

    return { delta, elapsed };
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }
}
