import * as THREE from 'three';

export class BlackHole {
  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(0, -19, 0);
    this._buildCore();
    this._buildAccretionDisk();
  }

  _buildCore() {
    // Dark sphere at center
    const geo = new THREE.SphereGeometry(2, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.95
    });
    this.core = new THREE.Mesh(geo, mat);
    this.group.add(this.core);
  }

  _buildAccretionDisk() {
    const count = 500;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const radii = new Float32Array(count);
    const phases = new Float32Array(count);

    const teal = new THREE.Color(0x008C8C);
    const coral = new THREE.Color(0xE8725A);
    const gold = new THREE.Color(0xD4A843);

    for (let i = 0; i < count; i++) {
      const r = 3 + Math.random() * 6;
      const angle = Math.random() * Math.PI * 2;

      positions[i * 3]     = Math.cos(angle) * r;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * r * 0.4; // flattened disk

      sizes[i] = 0.5 + Math.random() * 2.5;
      speeds[i] = 0.3 + (1 / r) * 3; // inner particles orbit faster
      radii[i] = r;
      phases[i] = angle;

      const t = (r - 3) / 6;
      const c = t < 0.5 ? coral.clone().lerp(gold, t * 2) : gold.clone().lerp(teal, (t - 0.5) * 2);
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aSpeed;
        attribute float aRadius;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          // Spiral inward
          float angle = aPhase + uTime * aSpeed;
          float r = aRadius - uTime * 0.02;
          r = max(r, 2.5); // don't go past event horizon
          float spiral = mod(r + uTime * 0.1, 6.0) + 3.0;
          vec3 pos = vec3(
            cos(angle) * spiral,
            position.y * (spiral / aRadius),
            sin(angle) * spiral * 0.4
          );
          vAlpha = (0.05 + (1.0 - (spiral - 3.0) / 6.0) * 0.25);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.disk = new THREE.Points(geo, mat);
    this.group.add(this.disk);
  }

  update(elapsed) {
    this.disk.material.uniforms.uTime.value = elapsed;
    // Slow disk rotation
    this.disk.rotation.y = elapsed * 0.05;
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
