import * as THREE from 'three';

// Rocket 3D particle symbol — entirely made of particles
export class PillarFuture {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this._build();
  }

  _build() {
    this._buildBody();
    this._buildExhaust();
    this.group.scale.setScalar(1.0);
  }

  // ── Body particles (400): nose cone + fuselage + 3 fins ──
  _buildBody() {
    const count = 400;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const magenta = new THREE.Color(0x00D4D4);
    const cyan = new THREE.Color(0x008C8C);

    const jitter = () => (Math.random() - 0.5) * 0.04; // +/-0.02

    let idx = 0;

    // Helper to push a particle
    const addParticle = (x, y, z, color, size, alpha) => {
      if (idx >= count) return;
      positions[idx * 3]     = x + jitter();
      positions[idx * 3 + 1] = y + jitter();
      positions[idx * 3 + 2] = z + jitter();
      sizes[idx] = size;
      alphas[idx] = alpha;
      colors[idx * 3]     = color.r;
      colors[idx * 3 + 1] = color.g;
      colors[idx * 3 + 2] = color.b;
      idx++;
    };

    // --- Nose cone: parabolic curve from tip (0, 2.5) to (0.4, 1.5) ---
    // Parametric: t in [0,1], y = 2.5 - t*1.0, r = 0.4 * sqrt(t)
    const noseCount = 100;
    for (let i = 0; i < noseCount; i++) {
      const t = i / (noseCount - 1);
      const y = 2.5 - t * 1.0;
      const r = 0.4 * Math.sqrt(t);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      addParticle(x, y, z, cyan, 3.0 + Math.random() * 2.0, 0.9);
    }

    // --- Fuselage: cylinder from y=1.5 to y=-1.0, radius 0.4 ---
    const fuselageCount = 200;
    for (let i = 0; i < fuselageCount; i++) {
      const y = 1.5 - Math.random() * 2.5; // 1.5 to -1.0
      const angle = Math.random() * Math.PI * 2;
      const r = 0.4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      addParticle(x, y, z, magenta, 2.5 + Math.random() * 2.0, 0.8);
    }

    // --- 3 Fins: triangular shapes at 120 degree intervals at the bottom ---
    const finCount = 100; // total across 3 fins
    const finPerFin = Math.floor(finCount / 3);
    for (let f = 0; f < 3; f++) {
      const baseAngle = (f * Math.PI * 2) / 3;
      for (let i = 0; i < finPerFin; i++) {
        // Fin triangle: from y=-0.2 to y=-1.0, extending outward from body radius
        // t goes from 0 (top of fin) to 1 (bottom of fin)
        const t = Math.random();
        const y = -0.2 - t * 0.8; // y from -0.2 to -1.0
        // Fin width increases toward bottom, extends from body (0.4) outward by up to 0.3
        const extent = t * 0.3;
        const radialOffset = 0.4 + Math.random() * extent;
        const angleSpread = t * 0.15; // slight angular spread at bottom
        const angle = baseAngle + (Math.random() - 0.5) * angleSpread;
        const x = Math.cos(angle) * radialOffset;
        const z = Math.sin(angle) * radialOffset;
        addParticle(x, y, z, magenta, 2.0 + Math.random() * 1.5, 0.85);
      }
    }

    // Fill any remaining slots with fuselage particles
    while (idx < count) {
      const y = 1.5 - Math.random() * 2.5;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * 0.4;
      const z = Math.sin(angle) * 0.4;
      addParticle(x, y, z, magenta, 2.5 + Math.random() * 2.0, 0.8);
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
        uniform float uBrightness;
        void main() {
          vAlpha = aAlpha * uBrightness;
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = exp(-dist * 5.0);
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uBrightness: { value: 1.0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.bodyPoints = new THREE.Points(geo, mat);
    this.group.add(this.bodyPoints);
  }

  // ── Exhaust particles (150): flame/thrust from bottom ──
  _buildExhaust() {
    const count = 150;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const gold = new THREE.Color(0x00B3B3);
    const magenta = new THREE.Color(0x00D4D4);
    const tmpColor = new THREE.Color();

    this._exhaustData = [];
    this._exhaustBasePositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Cone expanding downward from (0, -1.0) to radius 0.6 at y=-2.5
      // t: 0 = top of exhaust (y=-1.0), 1 = bottom (y=-2.5)
      const t = Math.random();
      const y = -1.0 - t * 1.5;
      const maxRadius = t * 0.6;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * maxRadius;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Store base positions for animation reset
      this._exhaustBasePositions[i * 3]     = x;
      this._exhaustBasePositions[i * 3 + 1] = y;
      this._exhaustBasePositions[i * 3 + 2] = z;

      sizes[i] = 3.0 + Math.random() * 3.0;

      // Alpha decreases toward bottom (tip bright, end fades)
      const baseAlpha = 1.0 - t * 0.7;
      alphas[i] = baseAlpha;

      // Color: gold at center, magenta at edges
      const edgeFactor = r / Math.max(maxRadius, 0.001);
      tmpColor.copy(gold).lerp(magenta, edgeFactor);
      colors[i * 3]     = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;

      // Store per-particle phase for wave animation
      const phase = Math.random();
      this._exhaustData.push({
        phase,
        baseAlpha,
        t, // how far down the cone (0=top, 1=bottom)
        baseX: x,
        baseZ: z
      });
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
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (100.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = exp(-dist * 5.0);
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.exhaustPoints = new THREE.Points(geo, mat);
    this.group.add(this.exhaustPoints);
  }

  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  update(elapsed) {
    // Lerp hover
    this.hover += (this.targetHover - this.hover) * 0.08;

    // ── Idle: gentle Y-axis wobble ──
    this.group.rotation.x = Math.sin(elapsed * 0.5) * 0.05;
    this.group.rotation.z = Math.cos(elapsed * 0.5) * 0.05;

    // ── Hover: lift up ──
    this.group.position.y = this.hover * 0.3;

    // ── Hover: slight tilt ──
    this.group.rotation.z += this.hover * 0.1;

    // ── Hover: body particles glow brighter ──
    if (this.bodyPoints) {
      this.bodyPoints.material.uniforms.uBrightness.value = 1.0 + this.hover * 0.5;
    }

    // ── Exhaust animation ──
    if (this.exhaustPoints && this._exhaustData) {
      const posAttr = this.exhaustPoints.geometry.attributes.position;
      const alphaAttr = this.exhaustPoints.geometry.attributes.aAlpha;
      const pos = posAttr.array;
      const alp = alphaAttr.array;

      for (let i = 0; i < this._exhaustData.length; i++) {
        const d = this._exhaustData[i];

        // Flicker alpha: modulate by sin wave using particle phase
        const flicker = Math.sin(elapsed * 8.0 + d.phase * 6.28) * 0.3;
        const hoverAlphaBoost = this.hover * 0.3;
        alp[i] = Math.max(0.0, d.baseAlpha + flicker + hoverAlphaBoost);

        // Oscillate Y position (drift downward slightly and reset via sin)
        const yOscillation = Math.sin(elapsed * 3.0 + d.phase * 6.28) * 0.08;
        const yDrift = ((elapsed * 0.5 + d.phase) % 1.0) * -0.1;
        pos[i * 3 + 1] = this._exhaustBasePositions[i * 3 + 1] + yOscillation + yDrift;

        // Hover: exhaust cone widens (scale x/z by 1 + hover * 0.5)
        const widen = 1.0 + this.hover * 0.5;
        pos[i * 3]     = d.baseX * widen;
        pos[i * 3 + 2] = d.baseZ * widen;
      }

      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    }
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
