import * as THREE from 'three';

// Lightning Bolt — 3D particle symbol
export class PillarChallenge {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this._build();
  }

  _build() {
    // ── Bolt waypoints (zigzag from top to bottom) ──
    this.waypoints = [
      new THREE.Vector2(0, 2),
      new THREE.Vector2(0.4, 1.4),
      new THREE.Vector2(-0.3, 0.8),
      new THREE.Vector2(0.5, 0.2),
      new THREE.Vector2(-0.2, -0.4),
      new THREE.Vector2(0.3, -1.0),
      new THREE.Vector2(-0.1, -1.5),
      new THREE.Vector2(0, -2)
    ];

    // Precompute segment lengths for distributing particles
    const segments = [];
    let totalLength = 0;
    for (let i = 0; i < this.waypoints.length - 1; i++) {
      const a = this.waypoints[i];
      const b = this.waypoints[i + 1];
      const len = a.distanceTo(b);
      segments.push({ a, b, len });
      totalLength += len;
    }

    // ── Build bolt particles (350) ──
    const boltCount = 350;
    const boltPositions = new Float32Array(boltCount * 3);
    const boltSizes = new Float32Array(boltCount);
    const boltAlphas = new Float32Array(boltCount);
    const boltColors = new Float32Array(boltCount * 3);

    const goldCore = new THREE.Color(0xffd700);
    const orangeOuter = new THREE.Color(0xff8800);

    // Store base positions for jitter animation
    this._boltBasePositions = new Float32Array(boltCount * 3);

    // Gaussian-ish random (Box-Muller approximation using sum of randoms)
    const gaussRand = () => {
      let sum = 0;
      for (let i = 0; i < 6; i++) sum += Math.random();
      return (sum / 6 - 0.5) * 2; // range roughly -1..1, peaked at 0
    };

    for (let i = 0; i < boltCount; i++) {
      // Pick a random position along the total bolt path
      let dist = Math.random() * totalLength;
      let seg = null;
      let t = 0;
      for (let s = 0; s < segments.length; s++) {
        if (dist <= segments[s].len) {
          seg = segments[s];
          t = dist / seg.len;
          break;
        }
        dist -= segments[s].len;
      }
      if (!seg) {
        seg = segments[segments.length - 1];
        t = 1;
      }

      // Position along segment
      const px = seg.a.x + (seg.b.x - seg.a.x) * t;
      const py = seg.a.y + (seg.b.y - seg.a.y) * t;

      // Perpendicular direction for thickness
      const dx = seg.b.x - seg.a.x;
      const dy = seg.b.y - seg.a.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / segLen; // perpendicular
      const ny = dx / segLen;

      // Gaussian thickness offset (thicker in center)
      const thickness = gaussRand() * 0.15;
      const bx = px + nx * thickness;
      const by = py + ny * thickness;
      // Add z depth for 3D feel
      const bz = gaussRand() * 0.08;

      // Small random jitter for electrical feel
      const jx = (Math.random() - 0.5) * 0.04;
      const jy = (Math.random() - 0.5) * 0.04;
      const jz = (Math.random() - 0.5) * 0.04;

      boltPositions[i * 3] = bx + jx;
      boltPositions[i * 3 + 1] = by + jy;
      boltPositions[i * 3 + 2] = bz + jz;

      this._boltBasePositions[i * 3] = bx + jx;
      this._boltBasePositions[i * 3 + 1] = by + jy;
      this._boltBasePositions[i * 3 + 2] = bz + jz;

      // Inner particles (close to center line) are gold, outer are orange
      const distFromCenter = Math.abs(thickness);
      const isInner = distFromCenter < 0.07;
      const color = isInner ? goldCore : orangeOuter;
      boltColors[i * 3] = color.r;
      boltColors[i * 3 + 1] = color.g;
      boltColors[i * 3 + 2] = color.b;

      // Size: inner particles slightly larger
      boltSizes[i] = isInner ? (3.0 + Math.random() * 2.0) : (1.5 + Math.random() * 1.5);
      boltAlphas[i] = isInner ? (0.8 + Math.random() * 0.2) : (0.4 + Math.random() * 0.3);
    }

    const boltGeo = new THREE.BufferGeometry();
    boltGeo.setAttribute('position', new THREE.BufferAttribute(boltPositions, 3));
    boltGeo.setAttribute('aSize', new THREE.BufferAttribute(boltSizes, 1));
    boltGeo.setAttribute('aAlpha', new THREE.BufferAttribute(boltAlphas, 1));
    boltGeo.setAttribute('aColor', new THREE.BufferAttribute(boltColors, 3));

    const boltMat = new THREE.ShaderMaterial({
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
          float glow = exp(-dist * 6.0);
          gl_FragColor = vec4(vColor * 1.5, glow * vAlpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.bolt = new THREE.Points(boltGeo, boltMat);
    this.group.add(this.bolt);

    // Store base alphas for animation
    this._boltBaseAlphas = new Float32Array(boltAlphas);

    // ── Build spark particles (120) ──
    const sparkCount = 120;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkSizes = new Float32Array(sparkCount);
    const sparkAlphas = new Float32Array(sparkCount);
    const sparkColors = new Float32Array(sparkCount * 3);

    const sparkGold = new THREE.Color(0xffd700);
    const sparkGreen = new THREE.Color(0x00ff88);

    this._sparkData = [];

    for (let i = 0; i < sparkCount; i++) {
      // Pick random origin on bolt
      const segIdx = Math.floor(Math.random() * segments.length);
      const seg = segments[segIdx];
      const t2 = Math.random();
      const ox = seg.a.x + (seg.b.x - seg.a.x) * t2;
      const oy = seg.a.y + (seg.b.y - seg.a.y) * t2;
      const oz = (Math.random() - 0.5) * 0.1;

      // Outward velocity (perpendicular + some random)
      const dx = seg.b.x - seg.a.x;
      const dy = seg.b.y - seg.a.y;
      const segL = Math.sqrt(dx * dx + dy * dy);
      const side = Math.random() > 0.5 ? 1 : -1;
      const vx = (-dy / segL) * side * (0.3 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.2;
      const vy = (dx / segL) * side * (0.3 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.2;
      const vz = (Math.random() - 0.5) * 0.3;

      sparkPositions[i * 3] = ox;
      sparkPositions[i * 3 + 1] = oy;
      sparkPositions[i * 3 + 2] = oz;

      const c = Math.random() > 0.5 ? sparkGold : sparkGreen;
      sparkColors[i * 3] = c.r;
      sparkColors[i * 3 + 1] = c.g;
      sparkColors[i * 3 + 2] = c.b;

      sparkSizes[i] = 1.0 + Math.random() * 1.5;
      sparkAlphas[i] = 0;

      this._sparkData.push({
        ox, oy, oz,           // origin on bolt
        vx, vy, vz,           // velocity
        life: Math.random(),  // current lifetime [0..1]
        maxLife: 0.8 + Math.random() * 1.2, // how long before respawn
        speed: 0.6 + Math.random() * 0.8,
        segIdx, t: t2         // for respawning at bolt
      });
    }

    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    sparkGeo.setAttribute('aSize', new THREE.BufferAttribute(sparkSizes, 1));
    sparkGeo.setAttribute('aAlpha', new THREE.BufferAttribute(sparkAlphas, 1));
    sparkGeo.setAttribute('aColor', new THREE.BufferAttribute(sparkColors, 3));

    const sparkMat = new THREE.ShaderMaterial({
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
          float glow = exp(-dist * 6.0);
          gl_FragColor = vec4(vColor * 1.5, glow * vAlpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.sparks = new THREE.Points(sparkGeo, sparkMat);
    this.group.add(this.sparks);

    // Store segments reference for respawning
    this._segments = segments;

    this._lastElapsed = 0;
  }

  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  update(elapsed) {
    // Lerp hover
    this.hover += (this.targetHover - this.hover) * 0.08;

    const dt = elapsed - this._lastElapsed;
    this._lastElapsed = elapsed;

    // ── Bolt particle animation ──
    const boltPositions = this.bolt.geometry.attributes.position.array;
    const boltAlphas = this.bolt.geometry.attributes.aAlpha.array;
    const boltCount = boltAlphas.length;

    // Jitter amplitude: base 0.03, hover increases 3x
    const jitterAmp = 0.03 * (1 + this.hover * 2);

    // Flash: sharp sine pulse for hover
    const flash = Math.pow(Math.sin(elapsed * 8), 16);
    const hoverBrightness = 1 + this.hover * (0.6 + flash * 0.8);

    for (let i = 0; i < boltCount; i++) {
      // Apply random jitter displacement from base position
      boltPositions[i * 3] = this._boltBasePositions[i * 3] + (Math.random() - 0.5) * 2 * jitterAmp;
      boltPositions[i * 3 + 1] = this._boltBasePositions[i * 3 + 1] + (Math.random() - 0.5) * 2 * jitterAmp;
      boltPositions[i * 3 + 2] = this._boltBasePositions[i * 3 + 2] + (Math.random() - 0.5) * 2 * jitterAmp;

      // Alpha: base alpha * hover brightness
      boltAlphas[i] = Math.min(1.0, this._boltBaseAlphas[i] * hoverBrightness);
    }

    this.bolt.geometry.attributes.position.needsUpdate = true;
    this.bolt.geometry.attributes.aAlpha.needsUpdate = true;

    // ── Spark particle animation ──
    const sparkPositions = this.sparks.geometry.attributes.position.array;
    const sparkAlphas = this.sparks.geometry.attributes.aAlpha.array;
    const sparkCount = this._sparkData.length;

    // Speed multiplier: hover emits 3x faster
    const speedMul = 1 + this.hover * 2;

    for (let i = 0; i < sparkCount; i++) {
      const s = this._sparkData[i];

      // Advance lifetime
      s.life += dt * s.speed * speedMul;

      if (s.life >= s.maxLife) {
        // Respawn at a random point on the bolt
        const segIdx = Math.floor(Math.random() * this._segments.length);
        const seg = this._segments[segIdx];
        const t2 = Math.random();
        s.ox = seg.a.x + (seg.b.x - seg.a.x) * t2;
        s.oy = seg.a.y + (seg.b.y - seg.a.y) * t2;
        s.oz = (Math.random() - 0.5) * 0.1;

        // New outward velocity
        const dx = seg.b.x - seg.a.x;
        const dy = seg.b.y - seg.a.y;
        const segL = Math.sqrt(dx * dx + dy * dy);
        const side = Math.random() > 0.5 ? 1 : -1;
        const velScale = 1 + this.hover * 2; // more velocity on hover
        s.vx = (-dy / segL) * side * (0.3 + Math.random() * 0.5) * velScale + (Math.random() - 0.5) * 0.2;
        s.vy = (dx / segL) * side * (0.3 + Math.random() * 0.5) * velScale + (Math.random() - 0.5) * 0.2;
        s.vz = (Math.random() - 0.5) * 0.3 * velScale;

        s.life = 0;
        s.maxLife = 0.8 + Math.random() * 1.2;
        s.speed = 0.6 + Math.random() * 0.8;
        s.segIdx = segIdx;
        s.t = t2;
      }

      const lifeRatio = s.life / s.maxLife; // 0..1

      // Position: origin + velocity * life
      sparkPositions[i * 3] = s.ox + s.vx * s.life;
      sparkPositions[i * 3 + 1] = s.oy + s.vy * s.life;
      sparkPositions[i * 3 + 2] = s.oz + s.vz * s.life;

      // Alpha: fade in quickly, fade out toward end
      const fadeIn = Math.min(1, lifeRatio * 5);
      const fadeOut = 1 - Math.pow(lifeRatio, 2);
      sparkAlphas[i] = fadeIn * fadeOut * (0.4 + this.hover * 0.6);
    }

    this.sparks.geometry.attributes.position.needsUpdate = true;
    this.sparks.geometry.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
