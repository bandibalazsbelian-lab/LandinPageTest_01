import * as THREE from 'three';
import logoVertShader from '../shaders/logoSDF.vert';
import logoFragShader from '../shaders/logoSDF.frag';

export class Logo {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this._build();
  }

  _build() {
    // Main logo plane with SDF shader
    const geo = new THREE.PlaneGeometry(6, 6, 1, 1);
    this.material = new THREE.ShaderMaterial({
      vertexShader: logoVertShader,
      fragmentShader: logoFragShader,
      uniforms: {
        uTime: { value: 0 },
        uHover: { value: 0 },
        uColor1: { value: new THREE.Color(0x00ff88) },
        uColor2: { value: new THREE.Color(0x33cc55) },
        uCircuitColor: { value: new THREE.Color(0x00e5ff) }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.group.add(this.mesh);

    // Add particle glow halo
    this._buildGlowHalo();

    // Add circuit energy particles
    this._buildCircuitParticles();
  }

  _buildGlowHalo() {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const green = new THREE.Color(0x00ff88);
    const cyan = new THREE.Color(0x00e5ff);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.5 + Math.random() * 1.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      sizes[i] = Math.random() * 3 + 1;
      alphas[i] = Math.random() * 0.4 + 0.1;

      const c = Math.random() > 0.5 ? green : cyan;
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
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vAlpha = aAlpha;
          vColor = aColor;
          vec3 pos = position;
          pos.x += sin(uTime * 0.5 + position.y * 2.0) * 0.1;
          pos.y += cos(uTime * 0.3 + position.x * 2.0) * 0.1;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.1, 0.5, dist)) * vAlpha;
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

    this.haloParticles = new THREE.Points(geo, mat);
    this.group.add(this.haloParticles);
  }

  _buildCircuitParticles() {
    // Small energy particles that travel along circuit-like paths
    const count = 60;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const cyan = new THREE.Color(0x00e5ff);

    this._circuitPaths = [];

    for (let i = 0; i < count; i++) {
      // Store path data for animation
      this._circuitPaths.push({
        angle: Math.random() * Math.PI * 2,
        radius: 0.5 + Math.random() * 2.0,
        speed: 0.5 + Math.random() * 1.5,
        offset: Math.random() * Math.PI * 2,
        axis: Math.random() > 0.5 ? 'x' : 'y'
      });

      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0.1;
      sizes[i] = Math.random() * 2 + 1.5;
      alphas[i] = Math.random() * 0.6 + 0.3;
      colors[i * 3] = cyan.r;
      colors[i * 3 + 1] = cyan.g;
      colors[i * 3 + 2] = cyan.b;
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
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z);
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

    this.circuitPoints = new THREE.Points(geo, mat);
    this.group.add(this.circuitPoints);
  }

  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  update(elapsed, delta) {
    // Smooth hover
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Update main shader
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uHover.value = this.hover;

    // Update halo
    if (this.haloParticles) {
      this.haloParticles.material.uniforms.uTime.value = elapsed;
    }

    // Subtle Y rotation oscillation
    this.group.rotation.y = Math.sin(elapsed * 0.3) * 0.035 * (1 + this.hover);

    // Breathing scale
    const breathPhase = Math.sin(elapsed * 0.7) * 0.015;
    this.group.scale.setScalar(1 + breathPhase + this.hover * 0.05);

    // Update circuit energy particles
    if (this.circuitPoints) {
      const positions = this.circuitPoints.geometry.attributes.position.array;
      const speedMult = 1 + this.hover;

      for (let i = 0; i < this._circuitPaths.length; i++) {
        const p = this._circuitPaths[i];
        const t = elapsed * p.speed * speedMult + p.offset;

        if (p.axis === 'x') {
          positions[i * 3] = Math.cos(t) * p.radius;
          positions[i * 3 + 1] = Math.sin(t * 0.7) * p.radius * 0.6;
        } else {
          positions[i * 3] = Math.sin(t * 0.7) * p.radius * 0.6;
          positions[i * 3 + 1] = Math.cos(t) * p.radius;
        }
        positions[i * 3 + 2] = Math.sin(t * 1.3) * 0.15;
      }
      this.circuitPoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
