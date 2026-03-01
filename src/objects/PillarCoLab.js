import * as THREE from 'three';

// Test Tube (Kémcső) 3D particle symbol
export class PillarCoLab {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;

    // Per-bubble animation state
    this.bubbleData = [];

    this._build();
  }

  _build() {
    const SHELL_COUNT = 500;
    const LIQUID_COUNT = 300;
    const BUBBLE_COUNT = 40;
    const TOTAL = SHELL_COUNT + LIQUID_COUNT + BUBBLE_COUNT;

    // Tube dimensions
    const RADIUS = 0.5;
    const CYL_HEIGHT = 2.0;   // cylinder extends y: 0 to 2.0
    const JITTER = 0.02;

    // Colors
    const shellColor = new THREE.Color('#008C8C');
    const liquidColor = new THREE.Color('#00B3B3');
    const bubbleColor = new THREE.Color('#00D4D4');

    // Allocate buffers
    const positions = new Float32Array(TOTAL * 3);
    const sizes = new Float32Array(TOTAL);
    const alphas = new Float32Array(TOTAL);
    const colors = new Float32Array(TOTAL * 3);

    // Store base positions for animation
    this.basePositions = new Float32Array(TOTAL * 3);

    let idx = 0;

    // ── 1. Shell particles (500) ──────────────────────────────────
    // Distribute ~70% on cylinder, ~30% on hemisphere bottom cap
    const cylShellCount = Math.floor(SHELL_COUNT * 0.7);
    const hemiShellCount = SHELL_COUNT - cylShellCount;

    // Cylinder shell: angle 0-2PI, height 0 to CYL_HEIGHT, radius = RADIUS
    for (let i = 0; i < cylShellCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const h = Math.random() * CYL_HEIGHT;
      const x = Math.cos(angle) * RADIUS + (Math.random() - 0.5) * JITTER * 2;
      const y = h + (Math.random() - 0.5) * JITTER * 2;
      const z = Math.sin(angle) * RADIUS + (Math.random() - 0.5) * JITTER * 2;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      this.basePositions[idx * 3] = x;
      this.basePositions[idx * 3 + 1] = y;
      this.basePositions[idx * 3 + 2] = z;

      sizes[idx] = 3.0 + Math.random() * 1.5;
      alphas[idx] = 0.5 + Math.random() * 0.3;
      colors[idx * 3] = shellColor.r;
      colors[idx * 3 + 1] = shellColor.g;
      colors[idx * 3 + 2] = shellColor.b;

      idx++;
    }

    // Hemisphere bottom cap: center at y=0, curving downward
    // phi from 0 to PI/2 (equator to south pole), angle 0-2PI
    for (let i = 0; i < hemiShellCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5; // 0 = equator, PI/2 = bottom pole

      const x = Math.cos(angle) * Math.cos(phi) * RADIUS + (Math.random() - 0.5) * JITTER * 2;
      const y = -Math.sin(phi) * RADIUS + (Math.random() - 0.5) * JITTER * 2;
      const z = Math.sin(angle) * Math.cos(phi) * RADIUS + (Math.random() - 0.5) * JITTER * 2;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      this.basePositions[idx * 3] = x;
      this.basePositions[idx * 3 + 1] = y;
      this.basePositions[idx * 3 + 2] = z;

      sizes[idx] = 3.0 + Math.random() * 1.5;
      alphas[idx] = 0.5 + Math.random() * 0.3;
      colors[idx * 3] = shellColor.r;
      colors[idx * 3 + 1] = shellColor.g;
      colors[idx * 3 + 2] = shellColor.b;

      idx++;
    }

    // ── 2. Liquid particles (300) ─────────────────────────────────
    // Fill the bottom 60% of the tube interior
    // Liquid y range: from bottom of hemisphere (-0.5) to 60% of cylinder (0.6 * 2.0 = 1.2)
    // But spec says y from -0.5 to 0.7, radius < 0.45
    this.liquidStartIdx = idx;

    for (let i = 0; i < LIQUID_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const y = -0.5 + Math.random() * 1.2; // -0.5 to 0.7
      const maxR = y < 0
        ? Math.sqrt(Math.max(0, RADIUS * RADIUS - y * y)) * 0.9  // inside hemisphere
        : 0.45; // inside cylinder
      const r = Math.random() * maxR;

      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      this.basePositions[idx * 3] = x;
      this.basePositions[idx * 3 + 1] = y;
      this.basePositions[idx * 3 + 2] = z;

      sizes[idx] = 2.5 + Math.random() * 1.5;
      alphas[idx] = 0.4 + Math.random() * 0.3;
      colors[idx * 3] = liquidColor.r;
      colors[idx * 3 + 1] = liquidColor.g;
      colors[idx * 3 + 2] = liquidColor.b;

      idx++;
    }

    // ── 3. Bubble particles (40) ──────────────────────────────────
    this.bubbleStartIdx = idx;

    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.3;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = -0.4 + Math.random() * 1.0; // start within liquid region

      positions[idx * 3] = x;
      positions[idx * 3 + 1] = y;
      positions[idx * 3 + 2] = z;

      this.basePositions[idx * 3] = x;
      this.basePositions[idx * 3 + 1] = y;
      this.basePositions[idx * 3 + 2] = z;

      sizes[idx] = 5.0 + Math.random() * 3.0;
      alphas[idx] = 0.5 + Math.random() * 0.3;
      colors[idx * 3] = bubbleColor.r;
      colors[idx * 3 + 1] = bubbleColor.g;
      colors[idx * 3 + 2] = bubbleColor.b;

      // Bubble animation data
      this.bubbleData.push({
        riseSpeed: 0.15 + Math.random() * 0.2,    // base rising speed
        wobbleFreqX: 1.5 + Math.random() * 2.0,
        wobbleFreqZ: 1.5 + Math.random() * 2.0,
        wobbleAmpX: 0.02 + Math.random() * 0.04,
        wobbleAmpZ: 0.02 + Math.random() * 0.04,
        phaseX: Math.random() * Math.PI * 2,
        phaseZ: Math.random() * Math.PI * 2,
        baseX: x,
        baseZ: z,
        y: y,
      });

      idx++;
    }

    // Store counts
    this.shellCount = SHELL_COUNT;
    this.liquidCount = LIQUID_COUNT;
    this.bubbleCount = BUBBLE_COUNT;
    this.totalCount = TOTAL;

    // ── Build geometry ────────────────────────────────────────────
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    // ── Shader material ───────────────────────────────────────────
    const material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3 aColor;

        varying float vAlpha;
        varying vec3 vColor;

        uniform float uPixelRatio;

        void main() {
          vAlpha = aAlpha;
          vColor = aColor;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Soft circular edge using smoothstep
          float edge = 1.0 - smoothstep(0.25, 0.5, dist);
          float alpha = edge * vAlpha;

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geometry, material);
    this.group.add(this.points);

    // Center the tube so it looks nicely placed (cylinder midpoint at ~y=1.0)
    this.group.position.y = -0.5;
  }

  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  update(elapsed) {
    // Smooth hover interpolation
    this.hover += (this.targetHover - this.hover) * 0.08;

    const posAttr = this.points.geometry.attributes.position;
    const alphaAttr = this.points.geometry.attributes.aAlpha;
    const pos = posAttr.array;
    const alp = alphaAttr.array;

    // ── Idle rotation ────────────────────────────────────────────
    this.group.rotation.y = elapsed * 0.3;

    // ── Scale on hover (1.0 to 1.1) ─────────────────────────────
    const targetScale = 1.0 + this.hover * 0.1;
    this.group.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.08
    );

    // ── Shell particles: gentle glow brightening on hover ────────
    for (let i = 0; i < this.shellCount; i++) {
      alp[i] = 0.5 + Math.sin(elapsed * 1.5 + i * 0.3) * 0.1 + this.hover * 0.25;
    }

    // ── Liquid particles: wave + boiling effect on hover ─────────
    const liquidEnd = this.liquidStartIdx + this.liquidCount;
    for (let i = this.liquidStartIdx; i < liquidEnd; i++) {
      const bx = this.basePositions[i * 3];
      const by = this.basePositions[i * 3 + 1];
      const bz = this.basePositions[i * 3 + 2];

      // Gentle wave bob in idle
      const wave = Math.sin(elapsed * 1.2 + bx * 4.0 + bz * 4.0) * 0.03;
      pos[i * 3 + 1] = by + wave;

      // Boiling alpha oscillation on hover
      const boilFreq = 3.0 + (i % 7) * 0.5;
      const boilAmp = this.hover * 0.35;
      const baseAlpha = 0.4 + Math.random() * 0.05; // tiny flicker
      alp[i] = baseAlpha + Math.sin(elapsed * boilFreq + i * 1.7) * (0.1 + boilAmp);
    }

    // ── Bubble particles: rise, wobble, reset ────────────────────
    const hoverSpeedMult = 1.0 + this.hover * 3.0; // 1x idle, 4x hover
    const liquidTopY = 0.7;
    const liquidBottomY = -0.4;

    for (let b = 0; b < this.bubbleCount; b++) {
      const idx = this.bubbleStartIdx + b;
      const bd = this.bubbleData[b];

      // Rise upward
      bd.y += bd.riseSpeed * hoverSpeedMult * 0.016; // ~60fps dt approximation

      // Reset when reaching top of liquid
      if (bd.y > liquidTopY) {
        bd.y = liquidBottomY + Math.random() * 0.2;
        bd.baseX = (Math.random() - 0.5) * 0.6;
        bd.baseZ = (Math.random() - 0.5) * 0.6;

        // Clamp inside tube radius
        const dist = Math.sqrt(bd.baseX * bd.baseX + bd.baseZ * bd.baseZ);
        if (dist > 0.35) {
          const scale = 0.35 / dist;
          bd.baseX *= scale;
          bd.baseZ *= scale;
        }
      }

      // X/Z wobble
      const wobbleX = Math.sin(elapsed * bd.wobbleFreqX + bd.phaseX) * bd.wobbleAmpX;
      const wobbleZ = Math.cos(elapsed * bd.wobbleFreqZ + bd.phaseZ) * bd.wobbleAmpZ;

      pos[idx * 3] = bd.baseX + wobbleX;
      pos[idx * 3 + 1] = bd.y;
      pos[idx * 3 + 2] = bd.baseZ + wobbleZ;

      // Bubbles alpha: brighter on hover
      alp[idx] = 0.5 + this.hover * 0.3 + Math.sin(elapsed * 2.0 + b) * 0.1;
    }

    // Flag buffers for GPU upload
    posAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
