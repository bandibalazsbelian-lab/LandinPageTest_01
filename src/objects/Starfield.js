import * as THREE from 'three';

export class Starfield {
  constructor() {
    this.group = new THREE.Group();
    this._buildDistantStars();
    this._buildCloseStars();
    this._buildNebulaPlane();
  }

  // Layer 1: 4000 distant stars
  _buildDistantStars() {
    const count = 4000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const phases = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      sizes[i] = 0.5 + Math.random() * 1.5;
      alphas[i] = 0.2 + Math.random() * 0.6;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          float twinkle = 0.5 + 0.5 * sin(uTime * (2.0 + aPhase * 3.0) + aPhase * 10.0);
          vAlpha = aAlpha * twinkle;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z);
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
          gl_FragColor = vec4(0.91, 0.92, 0.94, alpha);
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

    this.distantStars = new THREE.Points(geo, mat);
    this.group.add(this.distantStars);
  }

  // Layer 2: 800 close stars
  _buildCloseStars() {
    const count = 800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      sizes[i] = 2 + Math.random() * 3;
      alphas[i] = 0.4 + Math.random() * 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        uniform float uPixelRatio;
        uniform float uTime;
        uniform vec2 uMouse;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha;
          vec3 pos = position;
          // Mouse repulsion (close stars)
          float mouseDist = length(pos.xy - uMouse * 10.0);
          float mouseForce = smoothstep(5.0, 0.0, mouseDist) * 0.3;
          pos.xy += normalize(pos.xy - uMouse * 10.0 + 0.001) * mouseForce;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          float soft = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = (soft * 0.6 + core * 0.4) * vAlpha;
          gl_FragColor = vec4(0.91, 0.92, 0.94, alpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.closeStars = new THREE.Points(geo, mat);
    this.group.add(this.closeStars);
  }

  // Layer 3: Nebula background plane with noise
  _buildNebulaPlane() {
    const geo = new THREE.PlaneGeometry(120, 120);
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uScrollOffset;

        // Simplex-ish noise
        vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }

        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865, 0.366025403, -0.577350269, 0.024390243);
          vec2 i = floor(v + dot(v, C.yy));
          vec2 x0 = v - i + dot(i, C.xx);
          vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m * m; m = m * m;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 a0 = x - floor(x + 0.5);
          m *= 1.79284 - 0.85373 * (a0*a0 + h*h);
          vec3 g;
          g.x = a0.x * x0.x + h.x * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }

        void main() {
          vec2 uv = vUv + vec2(0.0, uScrollOffset * 0.1);
          float t = uTime * 0.0003;

          float n1 = snoise(uv * 1.5 + t * 0.5) * 0.5 + 0.5;
          float n2 = snoise(uv * 3.0 - t * 0.3) * 0.5 + 0.5;
          float n3 = snoise(uv * 5.0 + t * 0.2) * 0.5 + 0.5;

          vec3 teal = vec3(0.0, 0.2, 0.2);
          vec3 purple = vec3(0.1, 0.0, 0.2);
          vec3 coral = vec3(0.16, 0.08, 0.08);

          vec3 color = teal * n1 + purple * n2 + coral * n3;
          float alpha = (n1 * 0.15 + n2 * 0.1 + n3 * 0.05) * 0.8;
          alpha *= smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
          alpha *= smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uScrollOffset: { value: 0 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.nebulaPlane = new THREE.Mesh(geo, mat);
    this.nebulaPlane.position.z = -40;
    this.group.add(this.nebulaPlane);
  }

  update(elapsed, mouseNDC, scrollOffset) {
    // Distant stars: very slow rotation
    this.distantStars.rotation.y = elapsed * 0.005;
    this.distantStars.material.uniforms.uTime.value = elapsed;

    // Close stars: parallax
    this.closeStars.material.uniforms.uTime.value = elapsed;
    this.closeStars.material.uniforms.uMouse.value.set(
      mouseNDC.x * 2, mouseNDC.y * 2
    );

    // Nebula
    this.nebulaPlane.material.uniforms.uTime.value = elapsed * 1000;
    this.nebulaPlane.material.uniforms.uScrollOffset.value = scrollOffset || 0;
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
