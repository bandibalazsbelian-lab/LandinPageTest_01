import * as THREE from 'three';

export class ParticleText {
  constructor(text = 'InnovationHub', particleCount = 2000) {
    this.group = new THREE.Group();
    this.text = text;
    this.particleCount = particleCount;
    this.mouseNDC = new THREE.Vector2(0, 0);
    this.assemblyProgress = 0;
    this.dissolveProgress = 0; // 0 = visible, 1 = dissolved
    this._build();
  }

  _build() {
    // Sample text shape using offscreen canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 120;
    canvas.width = 1200;
    canvas.height = 200;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${fontSize}px Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, canvas.width / 2, canvas.height / 2);

    // Sample white pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const validPositions = [];

    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const idx = (y * canvas.width + x) * 4;
        if (pixels[idx] > 128) {
          validPositions.push({
            x: (x - canvas.width / 2) / canvas.width * 16,
            y: (canvas.height / 2 - y) / canvas.height * 2.8
          });
        }
      }
    }

    // Pick random subset for our particle count
    const count = Math.min(this.particleCount, validPositions.length);
    const positions = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = validPositions[Math.floor(Math.random() * validPositions.length)];

      targets[i * 3]     = p.x;
      targets[i * 3 + 1] = p.y;
      targets[i * 3 + 2] = (Math.random() - 0.5) * 0.1;

      // Start scattered
      const angle = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const dist = 5 + Math.random() * 12;
      starts[i * 3]     = Math.sin(phi) * Math.cos(angle) * dist;
      starts[i * 3 + 1] = Math.sin(phi) * Math.sin(angle) * dist;
      starts[i * 3 + 2] = Math.cos(phi) * dist * 0.3;

      positions[i * 3]     = starts[i * 3];
      positions[i * 3 + 1] = starts[i * 3 + 1];
      positions[i * 3 + 2] = starts[i * 3 + 2];

      sizes[i] = 1.0 + Math.random() * 1.5;
      randoms[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3));
    geo.setAttribute('aStart', new THREE.BufferAttribute(starts, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec3 aTarget;
        attribute vec3 aStart;
        attribute float aSize;
        attribute float aRandom;

        uniform float uTime;
        uniform float uAssembly;
        uniform float uDissolve;
        uniform float uPixelRatio;
        uniform vec2 uMouse;

        varying float vAlpha;

        void main() {
          // Staggered assembly
          float stagger = aRandom * 0.4;
          float t = clamp((uAssembly - stagger) / (1.0 - stagger), 0.0, 1.0);
          t = 1.0 - pow(1.0 - t, 3.0); // cubic ease-out

          vec3 pos = mix(aStart, aTarget, t);

          // Spiral during assembly
          float spiralPhase = (1.0 - t) * 6.283;
          float spiralR = (1.0 - t) * 1.0;
          pos.x += cos(spiralPhase + aRandom * 6.283) * spiralR;
          pos.y += sin(spiralPhase + aRandom * 6.283) * spiralR;

          // Breathing when assembled
          float waveX = sin(uTime * 0.4 + aTarget.x * 2.0) * 0.015 * t;
          float waveY = sin(uTime * 0.3 + aTarget.x * 1.5 + 1.0) * 0.3 * t;
          pos.x += waveX;
          pos.y += waveY;

          // Mouse repulsion
          float mouseDist = length(pos.xy - uMouse * 5.0);
          float mouseForce = smoothstep(2.0, 0.0, mouseDist) * 0.8 * t;
          pos.xy += normalize(pos.xy - uMouse * 5.0 + 0.001) * mouseForce;

          // Dissolve — particles scatter like stardust
          if (uDissolve > 0.0) {
            float dStagger = aRandom * 0.3;
            float d = clamp((uDissolve - dStagger) / (1.0 - dStagger), 0.0, 1.0);
            vec3 scatterDir = normalize(aStart) * 8.0;
            pos = mix(pos, pos + scatterDir, d);
          }

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (150.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 0.5);
          gl_Position = projectionMatrix * mvPosition;

          vAlpha = mix(0.15, 0.8, t) * (1.0 - uDissolve * 0.9);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float core = 1.0 - smoothstep(0.0, 0.12, dist);
          float soft = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = (soft * 0.5 + core * 0.5) * vAlpha;
          // Teal to white gradient
          vec3 color = mix(vec3(0.0, 0.55, 0.55), vec3(0.9, 0.92, 0.94), core * 0.6);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uAssembly: { value: 0 },
        uDissolve: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uMouse: { value: new THREE.Vector2(0, 0) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);
  }

  setMouse(ndc) { this.mouseNDC.copy(ndc); }
  setAssembly(value) { this.assemblyProgress = Math.max(0, Math.min(1, value)); }
  setDissolve(value) { this.dissolveProgress = Math.max(0, Math.min(1, value)); }

  update(elapsed) {
    const u = this.points.material.uniforms;
    u.uTime.value = elapsed;
    u.uAssembly.value = this.assemblyProgress;
    u.uDissolve.value = this.dissolveProgress;
    u.uMouse.value.copy(this.mouseNDC);
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
