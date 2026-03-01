import * as THREE from 'three';

export class Logo {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this.mouseNDC = new THREE.Vector2(0, 0);
    this.spinSpeed = 0;
    this.targetSpinSpeed = 0;
    this.assemblyProgress = 0;
    this.assemblyStartTime = -1;
    this.assemblyDuration = 3.5;
    this._build();
  }

  _build() {
    this._defineLogoShape();
    this._buildLogoParticles();
    this._buildSmokeParticles();
    this._buildGlowHalo();
  }

  _defineLogoShape() {
    // 4 colors — one per blade
    this.bladeColors = [
      new THREE.Color(0x008C8C),  // Teal (Marrs green)
      new THREE.Color(0xE8725A),  // Coral
      new THREE.Color(0xD4A843),  // Gold
      new THREE.Color(0x00FF88),  // Green
    ];

    // Base parallelogram extending upward with skew (pinwheel blade)
    const w = 0.4;
    const h = 2.8;
    const skew = 0.45;
    const gap = 0.1;

    const baseVerts = [
      [-w, gap], [w, gap], [w + skew, h], [-w + skew, h]
    ];

    this.bladeParticles = [];
    const particlesPerBlade = 600;

    for (let b = 0; b < 4; b++) {
      const angle = (b * Math.PI) / 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);

      // Rotate base shape
      const rv = baseVerts.map(([x, y]) => [x * ca - y * sa, x * sa + y * ca]);

      for (let i = 0; i < particlesPerBlade; i++) {
        let px, py;

        if (i < particlesPerBlade * 0.15) {
          // Edge-concentrated particles for crisp outline
          const edge = Math.floor(Math.random() * 4);
          const t = Math.random();
          const e0 = rv[edge];
          const e1 = rv[(edge + 1) % 4];
          px = e0[0] + (e1[0] - e0[0]) * t + (Math.random() - 0.5) * 0.04;
          py = e0[1] + (e1[1] - e0[1]) * t + (Math.random() - 0.5) * 0.04;
        } else {
          // Fill particles — uniform random in parallelogram via two triangles
          let u = Math.random(), v = Math.random();
          if (u + v > 1) { u = 1 - u; v = 1 - v; }
          const tri = Math.random() > 0.5
            ? [rv[0], rv[1], rv[2]]
            : [rv[0], rv[2], rv[3]];
          px = tri[0][0] * (1 - u - v) + tri[1][0] * u + tri[2][0] * v;
          py = tri[0][1] * (1 - u - v) + tri[1][1] * u + tri[2][1] * v;
        }

        // Scattered start position (sphere distribution)
        const r = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const dist = 5 + Math.random() * 10;

        this.bladeParticles.push({
          target: [px, py, (Math.random() - 0.5) * 0.06],
          blade: b,
          start: [
            Math.sin(phi) * Math.cos(r) * dist,
            Math.sin(phi) * Math.sin(r) * dist,
            Math.cos(phi) * dist * 0.4
          ]
        });
      }
    }
  }

  _buildLogoParticles() {
    const count = this.bladeParticles.length;
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = this.bladeParticles[i];

      starts[i * 3]     = p.start[0];
      starts[i * 3 + 1] = p.start[1];
      starts[i * 3 + 2] = p.start[2];

      targets[i * 3]     = p.target[0];
      targets[i * 3 + 1] = p.target[1];
      targets[i * 3 + 2] = p.target[2];

      // Start scattered
      positions[i * 3]     = p.start[0];
      positions[i * 3 + 1] = p.start[1];
      positions[i * 3 + 2] = p.start[2];

      sizes[i] = Math.random() * 2.0 + 1.5;
      randoms[i] = Math.random();

      const c = this.bladeColors[p.blade];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    geo.setAttribute('aStart',  new THREE.BufferAttribute(starts, 3));
    geo.setAttribute('aSize',   new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor',  new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 aTarget;
        attribute vec3 aStart;
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aRandom;

        uniform float uTime;
        uniform float uAssembly;
        uniform float uHover;
        uniform float uPixelRatio;
        uniform vec2 uMouse;

        varying vec3 vColor;
        varying float vAlpha;
        varying float vGlow;

        void main() {
          vColor = aColor;

          // Staggered assembly per particle
          float stagger = aRandom * 0.35;
          float t = clamp((uAssembly - stagger) / (1.0 - stagger), 0.0, 1.0);
          t = 1.0 - pow(1.0 - t, 3.0); // cubic ease-out

          // Interpolate from scattered start → target
          vec3 pos = mix(aStart, aTarget, t);

          // Spiral path during assembly (more dramatic)
          float spiralPhase = (1.0 - t) * 6.28318;
          float spiralRadius = (1.0 - t) * 0.8;
          pos.x += cos(spiralPhase * 1.5 + aRandom * 6.28) * spiralRadius;
          pos.y += sin(spiralPhase * 1.5 + aRandom * 6.28) * spiralRadius;

          // Gentle organic breathing when assembled
          pos.x += sin(uTime * 0.5 + aRandom * 6.28) * 0.018 * t;
          pos.y += cos(uTime * 0.4 + aRandom * 6.28) * 0.018 * t;
          pos.z += sin(uTime * 0.6 + aRandom * 12.56) * 0.012 * t;

          // Floating when scattered
          float scatter = 1.0 - t;
          pos.x += sin(uTime * 0.2 + aRandom * 20.0) * 0.5 * scatter;
          pos.y += cos(uTime * 0.15 + aRandom * 15.0) * 0.4 * scatter;
          pos.z += sin(uTime * 0.25 + aRandom * 10.0) * 0.25 * scatter;

          // Mouse repulsion
          float mouseDist = length(pos.xy - uMouse * 2.5);
          float mouseForce = smoothstep(3.0, 0.0, mouseDist) * 0.12 * t;
          pos.xy += normalize(pos.xy - uMouse * 2.5 + 0.001) * mouseForce;

          // Hover expansion
          pos *= 1.0 + uHover * 0.04;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          float sizeScale = mix(0.6, 1.0, t);
          gl_PointSize = aSize * sizeScale * uPixelRatio * (150.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 0.5);

          gl_Position = projectionMatrix * mvPosition;

          vAlpha = mix(0.2, 0.88, t);
          vGlow = t;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vGlow;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Hot core + soft falloff
          float core = 1.0 - smoothstep(0.0, 0.1, dist);
          float soft = 1.0 - smoothstep(0.0, 0.5, dist);

          float alpha = (soft * 0.55 + core * 0.45 * vGlow) * vAlpha;

          // Neon: brighten core significantly when assembled
          vec3 color = vColor * (1.0 + core * 2.5 * vGlow);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime:       { value: 0 },
        uAssembly:   { value: 0 },
        uHover:      { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uMouse:      { value: new THREE.Vector2(0, 0) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.logoPoints = new THREE.Points(geo, mat);
    this.group.add(this.logoPoints);
  }

  /* ═══ SMOKE / FOG ═══ */
  _buildSmokeParticles() {
    const innerCount = 250;
    const outerCount = 200;
    const count = innerCount + outerCount;

    const positions = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const alphas    = new Float32Array(count);
    const colors    = new Float32Array(count * 3);
    const speeds    = new Float32Array(count);

    const palette = [
      new THREE.Color(0x008C8C),
      new THREE.Color(0xE8725A),
      new THREE.Color(0xD4A843),
      new THREE.Color(0x00FF88),
    ];

    for (let i = 0; i < count; i++) {
      const isInner = i < innerCount;
      const angle  = Math.random() * Math.PI * 2;
      const radius = isInner
        ? 0.2 + Math.random() * 1.8
        : 1.5 + Math.random() * 3.5;

      positions[i * 3]     = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * (isInner ? 1.0 : 2.5);

      sizes[i]  = isInner
        ? Math.random() * 12 + 6
        : Math.random() * 22 + 10;

      alphas[i] = isInner
        ? Math.random() * 0.06 + 0.015
        : Math.random() * 0.035 + 0.008;

      speeds[i] = Math.random() * 0.5 + 0.1;

      const c = palette[Math.floor(Math.random() * 4)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize',   new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha',  new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aColor',  new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSpeed',  new THREE.BufferAttribute(speeds, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3  aColor;
        attribute float aSpeed;

        uniform float uTime;
        uniform float uAssembly;
        uniform float uPixelRatio;

        varying float vAlpha;
        varying vec3  vColor;

        void main() {
          vColor = aColor;

          vec3 pos = position;

          // Organic turbulent motion (smoke swirl)
          float t = uTime * aSpeed;
          pos.x += sin(t * 0.7 + position.y * 1.5) * 0.6;
          pos.y += cos(t * 0.5 + position.x * 1.2) * 0.5;
          pos.z += sin(t * 0.3 + position.x * position.y * 0.5) * 0.35;

          // Secondary turbulence layer
          pos.x += cos(t * 0.35 + position.z * 2.0) * 0.25;
          pos.y += sin(t * 0.4 + position.z * 1.8) * 0.3;

          // Slow outward expansion (breathing)
          float expandPhase = sin(uTime * 0.12 + length(position.xy) * 1.5);
          pos.xy *= 1.0 + expandPhase * 0.18;

          // Smoke rises slowly
          pos.y += sin(uTime * 0.08 + position.x * 0.5) * 0.4;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

          gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);

          gl_Position = projectionMatrix * mvPosition;

          // Fade in as logo assembles
          vAlpha = aAlpha * (0.15 + uAssembly * 0.85);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3  vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Very soft gaussian-like falloff (smoke blob)
          float alpha = exp(-dist * dist * 6.0) * vAlpha;

          gl_FragColor = vec4(vColor * 0.7, alpha);
        }
      `,
      uniforms: {
        uTime:       { value: 0 },
        uAssembly:   { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.smokePoints = new THREE.Points(geo, mat);
    this.group.add(this.smokePoints);
  }

  /* ═══ NEON GLOW HALO ═══ */
  _buildGlowHalo() {
    const count = 350;
    const positions = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const alphas    = new Float32Array(count);
    const colors    = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(0x008C8C),
      new THREE.Color(0xE8725A),
      new THREE.Color(0xD4A843),
      new THREE.Color(0x00FF88),
    ];

    for (let i = 0; i < count; i++) {
      const angle  = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 2.5;

      positions[i * 3]     = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.0;

      sizes[i]  = Math.random() * 3.5 + 1.0;
      alphas[i] = Math.random() * 0.3 + 0.08;

      const c = palette[Math.floor(Math.random() * 4)];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize',   new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha',  new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aColor',  new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute vec3  aColor;
        varying float vAlpha;
        varying vec3  vColor;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vAlpha = aAlpha;
          vColor = aColor;

          vec3 pos = position;
          pos.x += sin(uTime * 0.4 + position.y * 1.8) * 0.18;
          pos.y += cos(uTime * 0.25 + position.x * 1.8) * 0.14;
          pos.z += sin(uTime * 0.3 + position.x * position.y) * 0.06;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3  vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.05, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      uniforms: {
        uTime:       { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.haloParticles = new THREE.Points(geo, mat);
    this.group.add(this.haloParticles);
  }

  /* ═══ PUBLIC API ═══ */

  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  setMouse(ndc) {
    this.mouseNDC.copy(ndc);
  }

  update(elapsed, delta) {
    // Assembly timing (0.5 s delay, then 3.5 s animation)
    if (this.assemblyStartTime < 0) {
      this.assemblyStartTime = elapsed;
    }
    const assemblyElapsed = Math.max(0, elapsed - this.assemblyStartTime - 0.5);
    this.assemblyProgress = Math.min(assemblyElapsed / this.assemblyDuration, 1.0);

    // Smooth hover
    this.hover += (this.targetHover - this.hover) * 0.08;

    // ── Logo particles ──
    if (this.logoPoints) {
      const u = this.logoPoints.material.uniforms;
      u.uTime.value     = elapsed;
      u.uAssembly.value = this.assemblyProgress;
      u.uHover.value    = this.hover;
      u.uMouse.value.copy(this.mouseNDC);
    }

    // ── Smoke ──
    if (this.smokePoints) {
      const u = this.smokePoints.material.uniforms;
      u.uTime.value     = elapsed;
      u.uAssembly.value = this.assemblyProgress;
    }

    // ── Glow halo ──
    if (this.haloParticles) {
      this.haloParticles.material.uniforms.uTime.value = elapsed;
    }

    // 3D rotation toward mouse
    const targetRotY = this.mouseNDC.x * 0.08 + Math.sin(elapsed * 0.3) * 0.03;
    const targetRotX = -this.mouseNDC.y * 0.05;
    this.group.rotation.y += (targetRotY - this.group.rotation.y) * 0.06;
    this.group.rotation.x += (targetRotX - this.group.rotation.x) * 0.06;

    // Spin on hover
    this.targetSpinSpeed = this.targetHover ? -1.8 : 0;
    this.spinSpeed += (this.targetSpinSpeed - this.spinSpeed) * (this.targetHover ? 0.02 : 0.008);
    if (Math.abs(this.spinSpeed) > 0.001) {
      this.group.rotation.z += this.spinSpeed * delta;
    }

    // Organic breathing
    const breathPhase = Math.sin(elapsed * 0.7) * 0.012 + Math.sin(elapsed * 1.1) * 0.006;
    this.group.scale.setScalar(1 + breathPhase + this.hover * 0.06);
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
