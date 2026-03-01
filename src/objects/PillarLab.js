import * as THREE from 'three';

// ATOM 3D particle symbol — nucleus, orbital rings, and electrons
export class PillarLab {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this._build();
  }

  _build() {
    // ---------------------------------------------------
    // Constants
    // ---------------------------------------------------
    this.NUCLEUS_COUNT = 80;
    this.RINGS = 3;
    this.PARTICLES_PER_RING = 120;
    this.ORBITAL_COUNT = this.RINGS * this.PARTICLES_PER_RING; // 360
    this.ELECTRON_COUNT = 3;

    // Ring definitions: [tiltX (rad), tiltZ (rad)]
    this._ringDefs = [
      { tiltX: 0, tiltZ: 0 },
      { tiltX: THREE.MathUtils.degToRad(60), tiltZ: THREE.MathUtils.degToRad(30) },
      { tiltX: THREE.MathUtils.degToRad(-60), tiltZ: THREE.MathUtils.degToRad(-30) }
    ];

    // Ellipse parameters
    this._semiMajor = 1.6;
    this._semiMinor = 1.2;

    // Electron orbit speeds (rad/s) — varied per ring
    this._electronSpeeds = [1.0, 1.25, 1.5];

    // Build all three particle systems
    this._buildNucleus();
    this._buildOrbitals();
    this._buildElectrons();

    this.group.scale.setScalar(1.0);
  }

  // =====================================================
  // NUCLEUS — 80 particles in a dense central sphere
  // =====================================================
  _buildNucleus() {
    const count = this.NUCLEUS_COUNT;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const green = new THREE.Color(0x00ff88);
    const radius = 0.25;

    // Store base alphas and sizes for animation
    this._nucleusBaseAlphas = new Float32Array(count);
    this._nucleusBaseSizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Volume-uniform distribution: cube root for radius
      const r = radius * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const s = Math.random() * 3 + 2; // medium point sizes
      sizes[i] = s;
      this._nucleusBaseSizes[i] = s;

      const a = Math.random() * 0.3 + 0.6; // high alpha
      alphas[i] = a;
      this._nucleusBaseAlphas[i] = a;

      colors[i * 3] = green.r;
      colors[i * 3 + 1] = green.g;
      colors[i * 3 + 2] = green.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = this._createPointMaterial();

    this.nucleus = new THREE.Points(geo, mat);
    this.group.add(this.nucleus);
  }

  // =====================================================
  // ORBITAL RINGS — 3 rings x 120 particles each
  // =====================================================
  _buildOrbitals() {
    const count = this.ORBITAL_COUNT;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const cyan = new THREE.Color(0x00e5ff);

    // Store per-particle data for animation
    this._orbitalAngles = new Float32Array(count);   // original angle on ellipse
    this._orbitalRingIndex = new Uint8Array(count);   // which ring (0,1,2)

    for (let ring = 0; ring < this.RINGS; ring++) {
      for (let p = 0; p < this.PARTICLES_PER_RING; p++) {
        const idx = ring * this.PARTICLES_PER_RING + p;
        const angle = (p / this.PARTICLES_PER_RING) * Math.PI * 2 + Math.random() * 0.05;

        this._orbitalAngles[idx] = angle;
        this._orbitalRingIndex[idx] = ring;

        // Compute position on ellipse then apply ring tilt
        const pos = this._ellipsePoint(angle, this._ringDefs[ring]);
        positions[idx * 3] = pos.x;
        positions[idx * 3 + 1] = pos.y;
        positions[idx * 3 + 2] = pos.z;

        sizes[idx] = Math.random() * 1.5 + 1.0;
        alphas[idx] = 0.3;

        colors[idx * 3] = cyan.r;
        colors[idx * 3 + 1] = cyan.g;
        colors[idx * 3 + 2] = cyan.b;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = this._createPointMaterial();

    this.orbitals = new THREE.Points(geo, mat);
    this.group.add(this.orbitals);
  }

  // =====================================================
  // ELECTRONS — 3 bright particles, one per ring
  // =====================================================
  _buildElectrons() {
    const count = this.ELECTRON_COUNT;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const cyan = new THREE.Color(0x00e5ff);

    // Store current angle per electron
    this._electronAngles = [0, Math.PI * 2 / 3, Math.PI * 4 / 3]; // evenly spaced start

    for (let i = 0; i < count; i++) {
      const pos = this._ellipsePoint(this._electronAngles[i], this._ringDefs[i]);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      sizes[i] = 8.0; // large point size
      alphas[i] = 0.9; // high alpha
      colors[i * 3] = cyan.r;
      colors[i * 3 + 1] = cyan.g;
      colors[i * 3 + 2] = cyan.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));

    const mat = this._createPointMaterial();

    this.electrons = new THREE.Points(geo, mat);
    this.group.add(this.electrons);
  }

  // =====================================================
  // Shared point shader material
  // =====================================================
  _createPointMaterial() {
    return new THREE.ShaderMaterial({
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
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = glow * glow * vAlpha;
          gl_FragColor = vec4(vColor * glow + vColor, alpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  // =====================================================
  // Utility: compute a point on a tilted ellipse
  // =====================================================
  _ellipsePoint(angle, ringDef) {
    // Flat ellipse in XZ plane
    const x = this._semiMajor * Math.cos(angle);
    const y = 0;
    const z = this._semiMinor * Math.sin(angle);

    // Apply tilt: rotate around X by tiltX, then around Z by tiltZ
    const cosX = Math.cos(ringDef.tiltX);
    const sinX = Math.sin(ringDef.tiltX);
    const cosZ = Math.cos(ringDef.tiltZ);
    const sinZ = Math.sin(ringDef.tiltZ);

    // Rotate around X axis
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;

    // Rotate around Z axis
    const x2 = x * cosZ - y1 * sinZ;
    const y2 = x * sinZ + y1 * cosZ;

    return { x: x2, y: y2, z: z1 };
  }

  // =====================================================
  // Public interface
  // =====================================================
  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  update(elapsed) {
    // Smooth hover interpolation
    this.hover += (this.targetHover - this.hover) * 0.08;

    const hoverFactor = this.hover;

    // ---- Whole group slow Y rotation ----
    this.group.rotation.y = elapsed * 0.2;

    // ---- Scale on hover (1.0 -> 1.15) ----
    const targetScale = 1.0 + hoverFactor * 0.15;
    this.group.scale.lerp(
      new THREE.Vector3(targetScale, targetScale, targetScale),
      0.05
    );

    // ---- NUCLEUS: pulse / breathe ----
    {
      const freq = 2.0 + hoverFactor * 2.0; // frequency doubles on hover
      const breathe = 1.0 + Math.sin(elapsed * freq) * 0.08;
      this.nucleus.scale.setScalar(breathe);

      const alphasAttr = this.nucleus.geometry.attributes.aAlpha;
      const alphas = alphasAttr.array;
      const sizesAttr = this.nucleus.geometry.attributes.aSize;
      const sizes = sizesAttr.array;

      const brightnessMult = 1.0 + hoverFactor * 0.5;

      for (let i = 0; i < this.NUCLEUS_COUNT; i++) {
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * freq + i * 0.3);
        alphas[i] = this._nucleusBaseAlphas[i] * (0.7 + 0.3 * pulse) * brightnessMult;
        sizes[i] = this._nucleusBaseSizes[i] * (0.9 + 0.1 * pulse);
      }

      alphasAttr.needsUpdate = true;
      sizesAttr.needsUpdate = true;
    }

    // ---- ORBITAL RING PARTICLES: slowly rotate along paths ----
    {
      const posAttr = this.orbitals.geometry.attributes.position;
      const positions = posAttr.array;
      const alphasAttr = this.orbitals.geometry.attributes.aAlpha;
      const alphas = alphasAttr.array;

      // Orbital rotation speed (slow idle)
      const orbitalSpeed = 0.3;

      const baseAlpha = 0.3 + hoverFactor * 0.3;

      for (let i = 0; i < this.ORBITAL_COUNT; i++) {
        const ring = this._orbitalRingIndex[i];
        const currentAngle = this._orbitalAngles[i] + elapsed * orbitalSpeed;

        const pos = this._ellipsePoint(currentAngle, this._ringDefs[ring]);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        alphas[i] = baseAlpha;
      }

      posAttr.needsUpdate = true;
      alphasAttr.needsUpdate = true;
    }

    // ---- ELECTRONS: orbit at steady speed, triple on hover ----
    {
      const posAttr = this.electrons.geometry.attributes.position;
      const positions = posAttr.array;
      const alphasAttr = this.electrons.geometry.attributes.aAlpha;
      const alphas = alphasAttr.array;
      const sizesAttr = this.electrons.geometry.attributes.aSize;
      const sizes = sizesAttr.array;

      const speedMult = 1.0 + hoverFactor * 2.0; // triples on hover

      for (let i = 0; i < this.ELECTRON_COUNT; i++) {
        const angle = this._electronAngles[i] + elapsed * this._electronSpeeds[i] * speedMult;

        const pos = this._ellipsePoint(angle, this._ringDefs[i]);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        // Glow pulse for electrons
        const pulse = 0.85 + 0.15 * Math.sin(elapsed * 6.0 + i * 2.0);
        alphas[i] = pulse;
        sizes[i] = 8.0 + 2.0 * Math.sin(elapsed * 4.0 + i);
      }

      posAttr.needsUpdate = true;
      alphasAttr.needsUpdate = true;
      sizesAttr.needsUpdate = true;
    }
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
