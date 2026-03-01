import * as THREE from 'three';

export class ParticleSphere {
  constructor(count = 3000, radius = 12) {
    this.count = count;
    this.radius = radius;
    this.group = new THREE.Group();
    this._velocities = [];
    this._origins = [];
    this._build();
  }

  _build() {
    const positions = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const alphas = new Float32Array(this.count);
    const colors = new Float32Array(this.count * 3);

    const green = new THREE.Color(0x00ff88);
    const cyan = new THREE.Color(0x00e5ff);
    const white = new THREE.Color(0xe8eaf0);

    for (let i = 0; i < this.count; i++) {
      // Fibonacci sphere distribution
      const phi = Math.acos(1 - 2 * (i + 0.5) / this.count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;

      const r = this.radius * (0.85 + Math.random() * 0.3);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      this._origins.push(new THREE.Vector3(x, y, z));
      this._velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ));

      sizes[i] = Math.random() * 2.5 + 0.5;
      alphas[i] = Math.random() * 0.5 + 0.15;

      // Color mix
      const colorChoice = Math.random();
      let c;
      if (colorChoice < 0.6) c = green;
      else if (colorChoice < 0.85) c = cyan;
      else c = white;

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

        void main() {
          vAlpha = aAlpha;
          vColor = aColor;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
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
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          float glow = exp(-dist * 5.0) * 0.3;
          gl_FragColor = vec4(vColor + vColor * glow, alpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);

    // Wireframe sphere outline
    const wireGeo = new THREE.IcosahedronGeometry(this.radius * 0.9, 3);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      wireframe: true,
      transparent: true,
      opacity: 0.04
    });
    this.wireframe = new THREE.Mesh(wireGeo, wireMat);
    this.group.add(this.wireframe);
  }

  update(elapsed, delta, mouseNDC) {
    this.points.material.uniforms.uTime.value = elapsed;

    // Slow rotation
    this.group.rotation.y = elapsed * 0.05;
    this.group.rotation.x = Math.sin(elapsed * 0.03) * 0.1;

    // Wireframe counter-rotation
    if (this.wireframe) {
      this.wireframe.rotation.y = -elapsed * 0.03;
      this.wireframe.rotation.z = elapsed * 0.02;
    }

    // Particle drift with gravitational pull back to origins
    const positions = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const origin = this._origins[i];
      const vel = this._velocities[i];

      // Gravity toward origin
      vel.x += (origin.x - positions[i3]) * 0.0003;
      vel.y += (origin.y - positions[i3 + 1]) * 0.0003;
      vel.z += (origin.z - positions[i3 + 2]) * 0.0003;

      // Damping
      vel.multiplyScalar(0.995);

      // Random perturbation
      vel.x += (Math.random() - 0.5) * 0.002;
      vel.y += (Math.random() - 0.5) * 0.002;
      vel.z += (Math.random() - 0.5) * 0.002;

      positions[i3] += vel.x;
      positions[i3 + 1] += vel.y;
      positions[i3 + 2] += vel.z;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
