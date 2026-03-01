import * as THREE from 'three';

// Radar / Scanner — concentric rings + rotating scan line
export class PillarFuture {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this.rings = [];
    this._build();
  }

  _build() {
    const magenta = 0xff00aa;
    const cyan = 0x00e5ff;

    // Concentric rings
    for (let i = 0; i < 5; i++) {
      const radius = 0.4 + i * 0.3;
      const ringGeo = new THREE.RingGeometry(radius - 0.01, radius + 0.01, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? magenta : cyan,
        transparent: true,
        opacity: 0.3 - i * 0.04,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.userData.baseRadius = radius;
      ring.userData.index = i;
      this.group.add(ring);
      this.rings.push(ring);
    }

    // Center dot
    const dotGeo = new THREE.CircleGeometry(0.08, 16);
    const dotMat = new THREE.MeshBasicMaterial({
      color: magenta,
      transparent: true,
      opacity: 0.9
    });
    this.centerDot = new THREE.Mesh(dotGeo, dotMat);
    this.group.add(this.centerDot);

    // Scan line (rotating sector)
    const scanGeo = new THREE.CircleGeometry(1.6, 32, 0, Math.PI / 4);
    const scanMat = new THREE.MeshBasicMaterial({
      color: magenta,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide
    });
    this.scanLine = new THREE.Mesh(scanGeo, scanMat);
    this.group.add(this.scanLine);

    // Cross-hairs
    const crossMat = new THREE.LineBasicMaterial({
      color: cyan,
      transparent: true,
      opacity: 0.2
    });

    // Horizontal
    const hGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.6, 0, 0),
      new THREE.Vector3(1.6, 0, 0)
    ]);
    this.group.add(new THREE.Line(hGeo, crossMat));

    // Vertical
    const vGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -1.6, 0),
      new THREE.Vector3(0, 1.6, 0)
    ]);
    this.group.add(new THREE.Line(vGeo, crossMat));

    // Detection blips (small particles on rings)
    this._buildBlips();

    this.group.scale.setScalar(1.0);
  }

  _buildBlips() {
    const count = 30;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const magenta = new THREE.Color(0xff00aa);
    const cyan = new THREE.Color(0x00e5ff);

    this._blipData = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 1.2;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      positions[i * 3 + 2] = 0.01;

      sizes[i] = Math.random() * 3 + 2;
      alphas[i] = 0;

      const c = Math.random() > 0.5 ? magenta : cyan;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      this._blipData.push({
        angle, radius,
        fadeTime: Math.random() * 3 + 1,
        phase: Math.random() * Math.PI * 2
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
          float alpha = exp(-dist * 5.0) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.blips = new THREE.Points(geo, mat);
    this.group.add(this.blips);
  }

  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  update(elapsed) {
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Scan rotation — faster on hover
    const scanSpeed = 0.8 + this.hover * 2.0;
    this.scanLine.rotation.z = elapsed * scanSpeed;

    // Center dot pulse
    const dotPulse = Math.sin(elapsed * 3) * 0.3 + 0.7;
    this.centerDot.scale.setScalar(1 + dotPulse * 0.3);
    this.centerDot.material.opacity = 0.6 + dotPulse * 0.4;

    // Ring pulse outward on hover
    this.rings.forEach((ring, i) => {
      const pulse = Math.sin(elapsed * 2 - i * 0.5) * 0.02;
      const expand = this.hover * i * 0.08;
      ring.scale.setScalar(1 + pulse + expand);
      ring.material.opacity = (0.3 - i * 0.04) + this.hover * 0.15;
    });

    // Blip detection effects — blips light up when scan line passes
    if (this.blips) {
      const scanAngle = (elapsed * scanSpeed) % (Math.PI * 2);
      const alphas = this.blips.geometry.attributes.aAlpha.array;

      for (let i = 0; i < this._blipData.length; i++) {
        const b = this._blipData[i];
        let angleDiff = Math.abs(scanAngle - b.angle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

        // Light up when scan passes
        const triggered = angleDiff < 0.4;
        const fadeTarget = triggered ? 0.8 : 0;
        alphas[i] += (fadeTarget - alphas[i]) * 0.1;
      }
      this.blips.geometry.attributes.aAlpha.needsUpdate = true;
    }

    // Slight tilt on hover
    this.group.rotation.x = this.hover * 0.2;
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
