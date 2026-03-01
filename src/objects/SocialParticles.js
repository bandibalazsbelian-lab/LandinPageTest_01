import * as THREE from 'three';

// Particle-based social icons — Twitch, Discord, X
// Particles form the shape of each icon and react to cursor
export class SocialParticles {
  constructor() {
    this.group = new THREE.Group();
    this.icons = {};
    this.assembled = false;
    this._build();
  }

  _build() {
    // Define icon shapes as simple pixel grids (16x16 approximate)
    const shapes = {
      twitch: this._getTwitchShape(),
      discord: this._getDiscordShape(),
      x: this._getXShape()
    };

    const colors = {
      twitch: { default: new THREE.Color(0x00ff88), hover: new THREE.Color(0x9146ff) },
      discord: { default: new THREE.Color(0x00ff88), hover: new THREE.Color(0x5865f2) },
      x: { default: new THREE.Color(0x00ff88), hover: new THREE.Color(0xe8eaf0) }
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
      const alphas = new Float32Array(count);
      const colorArr = new Float32Array(count * 3);
      const defaultColor = colors[platform].default;

      for (let i = 0; i < count; i++) {
        // Target position (icon shape)
        targetPositions[i * 3] = shape[i].x * 0.08 + offset;
        targetPositions[i * 3 + 1] = shape[i].y * 0.08;
        targetPositions[i * 3 + 2] = 0;

        // Start scattered
        positions[i * 3] = (Math.random() - 0.5) * 20 + offset;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

        sizes[i] = Math.random() * 2 + 1.5;
        alphas[i] = Math.random() * 0.5 + 0.3;
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
            float alpha = (1.0 - smoothstep(0.1, 0.5, dist)) * vAlpha;
            float glow = exp(-dist * 4.0) * 0.4;
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
        velocities: new Float32Array(count * 3) // for Brownian motion
      };
    });
  }

  // Generate icon shapes as point clouds
  _getTwitchShape() {
    const points = [];
    // Simplified Twitch logo — speech bubble shape
    const size = 12;
    for (let y = -size; y <= size; y++) {
      for (let x = -size; x <= size; x++) {
        // Rounded rectangle body
        const inBody = Math.abs(x) < size * 0.7 && y > -size * 0.6 && y < size * 0.7;
        // Top rounded
        const inTop = Math.abs(x) < size * 0.7 - Math.max(0, y - size * 0.5) * 2 && y >= size * 0.5 && y < size * 0.9;
        // Bottom notch (speech bubble tail)
        const inTail = x > size * 0.1 && x < size * 0.5 && y >= -size * 0.9 && y < -size * 0.5;
        // Eyes (two vertical bars)
        const isEye = (Math.abs(x - size * 0.15) < 1.5 || Math.abs(x + size * 0.2) < 1.5) &&
                      y > -size * 0.1 && y < size * 0.35;

        if ((inBody || inTop || inTail) && !isEye) {
          points.push({ x: x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.3 });
        }
      }
    }
    return points;
  }

  _getDiscordShape() {
    const points = [];
    const size = 12;
    for (let y = -size; y <= size; y++) {
      for (let x = -size; x <= size; x++) {
        // Controller/gamepad-like shape (Discord logo simplified)
        const headDist = Math.sqrt(x * x + (y - size * 0.2) * (y - size * 0.2));
        const inHead = headDist < size * 0.8;
        // Two bumps on top (ears)
        const leftEar = Math.sqrt((x + size * 0.45) ** 2 + (y - size * 0.65) ** 2) < size * 0.3;
        const rightEar = Math.sqrt((x - size * 0.45) ** 2 + (y - size * 0.65) ** 2) < size * 0.3;
        // Eyes
        const leftEye = Math.sqrt((x + size * 0.25) ** 2 + (y - size * 0.15) ** 2) < size * 0.15;
        const rightEye = Math.sqrt((x - size * 0.25) ** 2 + (y - size * 0.15) ** 2) < size * 0.15;
        // Body
        const inBody = Math.abs(x) < size * 0.65 && y > -size * 0.7 && y < -size * 0.1;

        if ((inHead || leftEar || rightEar || inBody) && !leftEye && !rightEye) {
          points.push({ x: x + (Math.random() - 0.5) * 0.3, y: y + (Math.random() - 0.5) * 0.3 });
        }
      }
    }
    return points;
  }

  _getXShape() {
    const points = [];
    const size = 10;
    // X shape — two crossing lines
    for (let t = -size; t <= size; t += 0.3) {
      const thickness = 2.5;
      for (let w = -thickness; w <= thickness; w += 0.8) {
        // Line 1: top-left to bottom-right
        points.push({
          x: t + (Math.random() - 0.5) * 0.3,
          y: t + w + (Math.random() - 0.5) * 0.3
        });
        // Line 2: top-right to bottom-left
        points.push({
          x: t + (Math.random() - 0.5) * 0.3,
          y: -t + w + (Math.random() - 0.5) * 0.3
        });
      }
    }
    return points;
  }

  setHover(platform, value) {
    if (this.icons[platform]) {
      this.icons[platform].targetHover = value ? 1 : 0;
    }
    // Dim others
    Object.keys(this.icons).forEach(key => {
      if (key !== platform && value) {
        this.icons[key].targetHover = -0.3; // Dim
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
      const targets = icon.targetPositions;

      // Assembly progress
      let assembleT = 1;
      if (this.assembled && this._assembleStart) {
        const elapsed = performance.now() - this._assembleStart;
        assembleT = Math.min(elapsed / this._assembleDuration, 1);
        // Ease out elastic
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
          // Lerp toward target
          positions[i3] += (targets[i3] - positions[i3]) * assembleT * 0.05;
          positions[i3 + 1] += (targets[i3 + 1] - positions[i3 + 1]) * assembleT * 0.05;
          positions[i3 + 2] += (targets[i3 + 2] - positions[i3 + 2]) * assembleT * 0.05;
        } else {
          // Brownian motion around target
          icon.velocities[i3] += (Math.random() - 0.5) * 0.003;
          icon.velocities[i3 + 1] += (Math.random() - 0.5) * 0.003;
          icon.velocities[i3 + 2] += (Math.random() - 0.5) * 0.001;

          // Spring back to target
          icon.velocities[i3] += (targets[i3] - positions[i3]) * 0.02;
          icon.velocities[i3 + 1] += (targets[i3 + 1] - positions[i3 + 1]) * 0.02;
          icon.velocities[i3 + 2] += (targets[i3 + 2] - positions[i3 + 2]) * 0.02;

          // Damping
          icon.velocities[i3] *= 0.95;
          icon.velocities[i3 + 1] *= 0.95;
          icon.velocities[i3 + 2] *= 0.95;

          positions[i3] += icon.velocities[i3];
          positions[i3 + 1] += icon.velocities[i3 + 1];
          positions[i3 + 2] += icon.velocities[i3 + 2];
        }

        // Color
        colorArr[i3] = r;
        colorArr[i3 + 1] = g;
        colorArr[i3 + 2] = b;

        // Alpha — dim if hover < 0
        alphas[i] = Math.max(0.1, 0.5 + icon.hover * 0.3);
      }

      icon.points.geometry.attributes.position.needsUpdate = true;
      icon.points.geometry.attributes.aColor.needsUpdate = true;
      icon.points.geometry.attributes.aAlpha.needsUpdate = true;
    });
  }

  dispose() {
    Object.values(this.icons).forEach(icon => {
      icon.points.geometry.dispose();
      icon.points.material.dispose();
    });
  }
}
