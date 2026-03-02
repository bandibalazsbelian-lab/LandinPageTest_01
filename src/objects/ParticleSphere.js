import * as THREE from 'three';

export class ParticleSphere {
  constructor(count = 2000, radius = 16) {
    this.count = count;
    this.radius = radius;
    this.group = new THREE.Group();
    this._velocities = [];
    this._origins = [];
    this.scrollVelocity = 0;
    this.scrollExpansion = 1.0;
    this._build();
  }

  _build() {
    const positions = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const alphas = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
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

      sizes[i] = 1 + Math.random() * 2;
      alphas[i] = 0.1 + Math.random() * 0.3;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uTime;
        uniform float uScrollVel;
        uniform float uExpansion;
        void main() {
          vAlpha = aAlpha;
          vec3 pos = position * uExpansion;
          float scrollPush = uScrollVel * 0.15;
          vec3 dir = normalize(pos);
          pos += dir * scrollPush;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
          vec3 color = vec3(0.0, 0.55, 0.55);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
        uScrollVel: { value: 0 },
        uExpansion: { value: 1.0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);

    const wireGeo = new THREE.IcosahedronGeometry(this.radius * 0.9, 3);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x008C8C,
      wireframe: true,
      transparent: true,
      opacity: 0.04
    });
    this.wireframe = new THREE.Mesh(wireGeo, wireMat);
    this.group.add(this.wireframe);
  }

  setScrollVelocity(vel) { this.scrollVelocity = vel; }
  setExpansion(val) { this.scrollExpansion = val; }

  update(elapsed, delta, mouseNDC) {
    this.points.material.uniforms.uTime.value = elapsed;
    this.points.material.uniforms.uScrollVel.value +=
      (this.scrollVelocity - this.points.material.uniforms.uScrollVel.value) * 0.05;
    this.points.material.uniforms.uExpansion.value +=
      (this.scrollExpansion - this.points.material.uniforms.uExpansion.value) * 0.03;

    const scrollBoost = 1 + this.scrollVelocity * 0.02;
    this.group.rotation.y = elapsed * 0.04 * scrollBoost;
    this.group.rotation.x = Math.sin(elapsed * 0.03) * 0.1;

    if (this.wireframe) {
      this.wireframe.rotation.y = -elapsed * 0.03;
      this.wireframe.rotation.z = elapsed * 0.02;
    }

    const positions = this.points.geometry.attributes.position.array;
    const scrollPert = this.scrollVelocity * 0.0005;
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      const origin = this._origins[i];
      const vel = this._velocities[i];
      vel.x += (origin.x - positions[i3]) * 0.0003;
      vel.y += (origin.y - positions[i3 + 1]) * 0.0003;
      vel.z += (origin.z - positions[i3 + 2]) * 0.0003;
      vel.multiplyScalar(0.995);
      vel.x += (Math.random() - 0.5) * (0.002 + scrollPert);
      vel.y += (Math.random() - 0.5) * (0.002 + scrollPert);
      vel.z += (Math.random() - 0.5) * (0.002 + scrollPert);
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
