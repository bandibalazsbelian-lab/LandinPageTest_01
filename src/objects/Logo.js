import * as THREE from 'three';
import logoVertShader from '../shaders/logoSDF.vert';
import logoFragShader from '../shaders/logoSDF.frag';

export class Logo {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this.mouseNDC = new THREE.Vector2(0, 0);
    this.spinSpeed = 0;          // current spin velocity (rad/s)
    this.targetSpinSpeed = 0;    // target spin velocity
    this._build();
  }

  _build() {
    // Main logo plane with SDF shader (higher segment count for parallax)
    const geo = new THREE.PlaneGeometry(6, 6, 8, 8);
    this.material = new THREE.ShaderMaterial({
      vertexShader: logoVertShader,
      fragmentShader: logoFragShader,
      uniforms: {
        uTime: { value: 0 },
        uHover: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uColor1: { value: new THREE.Color(0x008C8C) },
        uColor2: { value: new THREE.Color(0x006B6B) },
        uCircuitColor: { value: new THREE.Color(0xD4A843) }
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.group.add(this.mesh);

    // Particle glow halo (more particles)
    this._buildGlowHalo();

    // Circuit energy particles (more particles)
    this._buildCircuitParticles();
  }

  _buildGlowHalo() {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const primary = new THREE.Color(0x008C8C);
    const secondary = new THREE.Color(0xD4A843);
    const accent = new THREE.Color(0xE8725A);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.2 + Math.random() * 2.0;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
      sizes[i] = Math.random() * 3 + 0.8;
      alphas[i] = Math.random() * 0.35 + 0.08;

      const rnd = Math.random();
      const c = rnd > 0.55 ? primary : rnd > 0.2 ? secondary : accent;
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
          pos.x += sin(uTime * 0.4 + position.y * 1.8) * 0.15;
          pos.y += cos(uTime * 0.25 + position.x * 1.8) * 0.12;
          pos.z += sin(uTime * 0.3 + position.x * position.y) * 0.05;
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
          float alpha = (1.0 - smoothstep(0.05, 0.5, dist)) * vAlpha;
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
    const count = 60;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const secondary = new THREE.Color(0xD4A843);
    const primary = new THREE.Color(0x008C8C);

    this._circuitPaths = [];

    for (let i = 0; i < count; i++) {
      this._circuitPaths.push({
        angle: Math.random() * Math.PI * 2,
        radius: 0.4 + Math.random() * 2.2,
        speed: 0.4 + Math.random() * 1.8,
        offset: Math.random() * Math.PI * 2,
        axis: Math.random() > 0.5 ? 'x' : 'y'
      });

      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0.1;
      sizes[i] = Math.random() * 2.5 + 1.0;
      alphas[i] = Math.random() * 0.6 + 0.2;

      const c = Math.random() > 0.3 ? secondary : primary;
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
          float alpha = exp(-dist * 5.0) * vAlpha;
          gl_FragColor = vec4(vColor * 1.4, alpha);
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

  setMouse(ndc) {
    this.mouseNDC.copy(ndc);
  }

  update(elapsed, delta) {
    // Smooth hover
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Update main shader
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uHover.value = this.hover;
    this.material.uniforms.uMouse.value.copy(this.mouseNDC);

    // Update halo
    if (this.haloParticles) {
      this.haloParticles.material.uniforms.uTime.value = elapsed;
    }

    // 3D rotation toward mouse
    const targetRotY = this.mouseNDC.x * 0.08 + Math.sin(elapsed * 0.3) * 0.03;
    const targetRotX = -this.mouseNDC.y * 0.05;
    this.group.rotation.y += (targetRotY - this.group.rotation.y) * 0.06;
    this.group.rotation.x += (targetRotX - this.group.rotation.x) * 0.06;

    // Wheel-of-fortune spin on hover (spins left = negative Z rotation)
    this.targetSpinSpeed = this.targetHover ? -1.8 : 0;
    this.spinSpeed += (this.targetSpinSpeed - this.spinSpeed) * (this.targetHover ? 0.02 : 0.008);
    if (Math.abs(this.spinSpeed) > 0.001) {
      this.group.rotation.z += this.spinSpeed * delta;
    }

    // Organic breathing (dual sine)
    const breathPhase = Math.sin(elapsed * 0.7) * 0.012 + Math.sin(elapsed * 1.1) * 0.006;
    this.group.scale.setScalar(1 + breathPhase + this.hover * 0.06);

    // Update circuit energy particles
    if (this.circuitPoints) {
      const positions = this.circuitPoints.geometry.attributes.position.array;
      const speedMult = 1 + this.hover * 1.5;

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
        positions[i * 3 + 2] = Math.sin(t * 1.3) * 0.2;
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
