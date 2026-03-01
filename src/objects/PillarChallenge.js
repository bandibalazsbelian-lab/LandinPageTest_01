import * as THREE from 'three';

// Crystal Trophy — faceted polyhedron with internal light
export class PillarChallenge {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this._build();
  }

  _build() {
    // Main crystal — icosahedron with reflective appearance
    const crystalGeo = new THREE.IcosahedronGeometry(1.0, 1);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xffd700,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.5,
      transmission: 0.6,
      thickness: 0.5,
      envMapIntensity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      emissive: 0xffd700,
      emissiveIntensity: 0.15
    });
    this.crystal = new THREE.Mesh(crystalGeo, crystalMat);
    this.group.add(this.crystal);

    // Wireframe overlay
    const wireGeo = new THREE.IcosahedronGeometry(1.02, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    this.wireframe = new THREE.Mesh(wireGeo, wireMat);
    this.group.add(this.wireframe);

    // Inner point light for caustics simulation
    this.innerLight = new THREE.PointLight(0xffd700, 2, 5);
    this.innerLight.position.set(0, 0, 0);
    this.group.add(this.innerLight);

    // Spark particles around crystal
    this._buildSparks();

    this.group.scale.setScalar(1.1);
  }

  _buildSparks() {
    const count = 80;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const gold = new THREE.Color(0xffd700);
    const green = new THREE.Color(0x00ff88);

    this._sparkData = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.2 + Math.random() * 0.8;

      positions[i * 3] = Math.sin(phi) * Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.sin(phi) * Math.sin(angle) * r;
      positions[i * 3 + 2] = Math.cos(phi) * r;

      sizes[i] = Math.random() * 3 + 1;
      alphas[i] = 0;  // Hidden by default, visible on hover

      const c = Math.random() > 0.3 ? gold : green;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      this._sparkData.push({
        theta: angle,
        phi: phi,
        radius: r,
        speed: 1 + Math.random() * 2,
        offset: Math.random() * Math.PI * 2
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
          float alpha = exp(-dist * 6.0) * vAlpha;
          gl_FragColor = vec4(vColor * 1.5, alpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.sparks = new THREE.Points(geo, mat);
    this.group.add(this.sparks);
  }

  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  update(elapsed) {
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Rotation — faster on hover
    const rotSpeed = 0.4 + this.hover * 1.5;
    this.crystal.rotation.y = elapsed * rotSpeed;
    this.crystal.rotation.x = Math.sin(elapsed * 0.3) * 0.2;
    this.wireframe.rotation.y = elapsed * rotSpeed;
    this.wireframe.rotation.x = Math.sin(elapsed * 0.3) * 0.2;

    // Emissive intensity on hover
    this.crystal.material.emissiveIntensity = 0.15 + this.hover * 0.5;
    this.crystal.material.opacity = 0.5 + this.hover * 0.2;
    this.wireframe.material.opacity = 0.3 + this.hover * 0.3;

    // Inner light pulse
    this.innerLight.intensity = 2 + Math.sin(elapsed * 2) * 0.5 + this.hover * 2;

    // Spark particles
    if (this.sparks) {
      const positions = this.sparks.geometry.attributes.position.array;
      const alphas = this.sparks.geometry.attributes.aAlpha.array;

      for (let i = 0; i < this._sparkData.length; i++) {
        const s = this._sparkData[i];
        const t = elapsed * s.speed + s.offset;

        const r = s.radius + Math.sin(t) * 0.2;
        positions[i * 3] = Math.sin(s.phi + t * 0.2) * Math.cos(s.theta + t * 0.3) * r;
        positions[i * 3 + 1] = Math.sin(s.phi + t * 0.2) * Math.sin(s.theta + t * 0.3) * r;
        positions[i * 3 + 2] = Math.cos(s.phi + t * 0.2) * r;

        alphas[i] = this.hover * (0.3 + Math.sin(t * 3) * 0.3);
      }
      this.sparks.geometry.attributes.position.needsUpdate = true;
      this.sparks.geometry.attributes.aAlpha.needsUpdate = true;
    }
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
