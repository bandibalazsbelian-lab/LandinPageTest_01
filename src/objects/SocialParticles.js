import * as THREE from 'three';

// Particle-based social icons — Twitch, Discord, X
// More alive: constant breathing, hover pulse wave, z-depth motion
export class SocialParticles {
  constructor() {
    this.group = new THREE.Group();
    this.icons = {};
    this.assembled = false;
    this._build();
  }

  _build() {
    const shapes = {
      twitch: this._getTwitchShape(),
      discord: this._getDiscordShape(),
      x: this._getXShape()
    };

    const colors = {
      twitch: { default: new THREE.Color(0x008C8C), hover: new THREE.Color(0x00D4D4) },
      discord: { default: new THREE.Color(0x008C8C), hover: new THREE.Color(0x00D4D4) },
      x: { default: new THREE.Color(0x008C8C), hover: new THREE.Color(0x00D4D4) }
    };

    const spacing = 5;
    const platforms = ['twitch', 'discord', 'x'];

    platforms.forEach((platform, pIndex) => {
      const shape = shapes[platform];
      const count = shape.length;
      const offset = (pIndex - 1) * spacing;

      const positions = new Float32Array(count * 3);
      const targetPositions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const baseSizes = new Float32Array(count);
      const alphas = new Float32Array(count);
      const baseAlphas = new Float32Array(count);
      const colorArr = new Float32Array(count * 3);
      const defaultColor = colors[platform].default;

      for (let i = 0; i < count; i++) {
        targetPositions[i * 3] = shape[i].x * 0.08 + offset;
        targetPositions[i * 3 + 1] = shape[i].y * 0.08;
        targetPositions[i * 3 + 2] = 0;

        // Start scattered
        positions[i * 3] = (Math.random() - 0.5) * 20 + offset;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

        const s = Math.random() * 2.5 + 1.5;
        sizes[i] = s;
        baseSizes[i] = s;
        const a = Math.random() * 0.45 + 0.3;
        alphas[i] = a;
        baseAlphas[i] = a;
        colorArr[i * 3] = defaultColor.r;
        colorArr[i * 3 + 1] = defaultColor.g;
        colorArr[i * 3 + 2] = defaultColor.b;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
      geo.setAttribute('aColor', new THREE.BufferAttribute(colorArr, 3));

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
            gl_PointSize = aSize * uPixelRatio * (120.0 / -mvPosition.z);
            gl_PointSize = max(gl_PointSize, 1.0);
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
            float glow = exp(-dist * 4.0) * 0.5;
            gl_FragColor = vec4(vColor + vColor * glow, alpha);
          }
        `,
        uniforms: {
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const points = new THREE.Points(geo, mat);
      this.group.add(points);

      this.icons[platform] = {
        points,
        targetPositions,
        defaultColor: colors[platform].default,
        hoverColor: colors[platform].hover,
        hover: 0,
        targetHover: 0,
        count,
        baseSizes,
        baseAlphas,
        velocities: new Float32Array(count * 3),
        breathPhases: new Float32Array(count).map(() => Math.random() * Math.PI * 2)
      };
    });
  }

  // Larger grid shapes for more particles
  _getTwitchShape() {
    const points = [];
    const size = 14;
    for (let y = -size; y <= size; y++) {
      for (let x = -size; x <= size; x++) {
        const inBody = Math.abs(x) < size * 0.7 && y > -size * 0.6 && y < size * 0.7;
        const inTop = Math.abs(x) < size * 0.7 - Math.max(0, y - size * 0.5) * 2 && y >= size * 0.5 && y < size * 0.9;
        const inTail = x > size * 0.1 && x < size * 0.5 && y >= -size * 0.9 && y < -size * 0.5;
        const isEye = (Math.abs(x - size * 0.15) < 1.5 || Math.abs(x + size * 0.2) < 1.5) &&
                      y > -size * 0.1 && y < size * 0.35;

        if ((inBody || inTop || inTail) && !isEye) {
          points.push({ x: x + (Math.random() - 0.5) * 0.4, y: y + (Math.random() - 0.5) * 0.4 });
        }
      }
    }
    return points;
  }

  _getDiscordShape() {
    const points = [];
    const size = 14;
    for (let y = -size; y <= size; y++) {
      for (let x = -size; x <= size; x++) {
        const headDist = Math.sqrt(x * x + (y - size * 0.2) * (y - size * 0.2));
        const inHead = headDist < size * 0.8;
        const leftEar = Math.sqrt((x + size * 0.45) ** 2 + (y - size * 0.65) ** 2) < size * 0.3;
        const rightEar = Math.sqrt((x - size * 0.45) ** 2 + (y - size * 0.65) ** 2) < size * 0.3;
        const leftEye = Math.sqrt((x + size * 0.25) ** 2 + (y - size * 0.15) ** 2) < size * 0.15;
        const rightEye = Math.sqrt((x - size * 0.25) ** 2 + (y - size * 0.15) ** 2) < size * 0.15;
        const inBody = Math.abs(x) < size * 0.65 && y > -size * 0.7 && y < -size * 0.1;

        if ((inHead || leftEar || rightEar || inBody) && !leftEye && !rightEye) {
          points.push({ x: x + (Math.random() - 0.5) * 0.4, y: y + (Math.random() - 0.5) * 0.4 });
        }
      }
    }
    return points;
  }

  _getXShape() {
    const points = [];
    const size = 12;
    for (let t = -size; t <= size; t += 0.25) {
      const thickness = 2.8;
      for (let w = -thickness; w <= thickness; w += 0.7) {
        points.push({
          x: t + (Math.random() - 0.5) * 0.4,
          y: t + w + (Math.random() - 0.5) * 0.4
        });
        points.push({
          x: t + (Math.random() - 0.5) * 0.4,
          y: -t + w + (Math.random() - 0.5) * 0.4
        });
      }
    }
    return points;
  }

  setHover(platform, value) {
    if (this.icons[platform]) {
      this.icons[platform].targetHover = value ? 1 : 0;
    }
    Object.keys(this.icons).forEach(key => {
      if (key !== platform && value) {
        this.icons[key].targetHover = -0.3;
      } else if (!value) {
        this.icons[key].targetHover = 0;
      }
    });
  }

  assemble(duration = 2.5) {
    this.assembled = true;
    this._assembleStart = performance.now();
    this._assembleDuration = duration * 1000;
  }

  update(elapsed, delta) {
    Object.keys(this.icons).forEach(platform => {
      const icon = this.icons[platform];
      icon.hover += (icon.targetHover - icon.hover) * 0.06;

      const positions = icon.points.geometry.attributes.position.array;
      const colorArr = icon.points.geometry.attributes.aColor.array;
      const alphas = icon.points.geometry.attributes.aAlpha.array;
      const sizes = icon.points.geometry.attributes.aSize.array;
      const targets = icon.targetPositions;

      // Assembly progress
      let assembleT = 1;
      if (this.assembled && this._assembleStart) {
        const elapsedMs = performance.now() - this._assembleStart;
        assembleT = Math.min(elapsedMs / this._assembleDuration, 1);
        assembleT = assembleT === 1 ? 1 : 1 - Math.pow(2, -10 * assembleT) * Math.cos((assembleT * 10 - 0.75) * (2 * Math.PI / 3));
      } else if (!this.assembled) {
        assembleT = 0;
      }

      // Color interpolation
      const hoverAmt = Math.max(0, icon.hover);
      const r = icon.defaultColor.r + (icon.hoverColor.r - icon.defaultColor.r) * hoverAmt;
      const g = icon.defaultColor.g + (icon.hoverColor.g - icon.defaultColor.g) * hoverAmt;
      const b = icon.defaultColor.b + (icon.hoverColor.b - icon.defaultColor.b) * hoverAmt;

      for (let i = 0; i < icon.count; i++) {
        const i3 = i * 3;

        if (assembleT < 1) {
          positions[i3] += (targets[i3] - positions[i3]) * assembleT * 0.05;
          positions[i3 + 1] += (targets[i3 + 1] - positions[i3 + 1]) * assembleT * 0.05;
          positions[i3 + 2] += (targets[i3 + 2] - positions[i3 + 2]) * assembleT * 0.05;
        } else {
          // Brownian motion + breathing
          const breathPhase = icon.breathPhases[i];
          const breathX = Math.sin(elapsed * 0.8 + breathPhase) * 0.008;
          const breathY = Math.cos(elapsed * 0.6 + breathPhase * 1.3) * 0.006;
          const breathZ = Math.sin(elapsed * 0.5 + breathPhase * 0.7) * 0.015;

          icon.velocities[i3] += (Math.random() - 0.5) * 0.004 + breathX;
          icon.velocities[i3 + 1] += (Math.random() - 0.5) * 0.004 + breathY;
          icon.velocities[i3 + 2] += (Math.random() - 0.5) * 0.002 + breathZ;

          // Spring back to target (stronger spring on hover)
          const springK = 0.02 + hoverAmt * 0.03;
          icon.velocities[i3] += (targets[i3] - positions[i3]) * springK;
          icon.velocities[i3 + 1] += (targets[i3 + 1] - positions[i3 + 1]) * springK;
          icon.velocities[i3 + 2] += (targets[i3 + 2] - positions[i3 + 2]) * springK;

          // Hover: pulse outward then snap back
          if (hoverAmt > 0.5) {
            const pulseWave = Math.sin(elapsed * 4 + i * 0.1) * hoverAmt * 0.01;
            const dx = positions[i3] - targets[i3];
            const dy = positions[i3 + 1] - targets[i3 + 1];
            const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
            icon.velocities[i3] += (dx / dist) * pulseWave;
            icon.velocities[i3 + 1] += (dy / dist) * pulseWave;
          }

          // Z depth breathing on hover
          icon.velocities[i3 + 2] += Math.sin(elapsed * 3 + breathPhase) * hoverAmt * 0.005;

          // Damping
          icon.velocities[i3] *= 0.94;
          icon.velocities[i3 + 1] *= 0.94;
          icon.velocities[i3 + 2] *= 0.94;

          positions[i3] += icon.velocities[i3];
          positions[i3 + 1] += icon.velocities[i3 + 1];
          positions[i3 + 2] += icon.velocities[i3 + 2];
        }

        // Color
        colorArr[i3] = r;
        colorArr[i3 + 1] = g;
        colorArr[i3 + 2] = b;

        // Alpha with breathing
        const breathAlpha = Math.sin(elapsed * 1.2 + icon.breathPhases[i]) * 0.08;
        alphas[i] = Math.max(0.1, icon.baseAlphas[i] + icon.hover * 0.25 + breathAlpha);

        // Size breathing
        sizes[i] = icon.baseSizes[i] * (1 + Math.sin(elapsed * 0.9 + icon.breathPhases[i]) * 0.1 + hoverAmt * 0.15);
      }

      icon.points.geometry.attributes.position.needsUpdate = true;
      icon.points.geometry.attributes.aColor.needsUpdate = true;
      icon.points.geometry.attributes.aAlpha.needsUpdate = true;
      icon.points.geometry.attributes.aSize.needsUpdate = true;
    });
  }

  dispose() {
    Object.values(this.icons).forEach(icon => {
      icon.points.geometry.dispose();
      icon.points.material.dispose();
    });
  }
}
