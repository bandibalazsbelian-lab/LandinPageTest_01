import * as THREE from 'three';

// Holographic Cube with internal data streams
export class PillarLab {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this._build();
  }

  _build() {
    // Outer cube — wireframe with edges
    const cubeGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const edgesGeo = new THREE.EdgesGeometry(cubeGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6
    });
    this.edges = new THREE.LineSegments(edgesGeo, edgesMat);
    this.group.add(this.edges);

    // Semi-transparent faces
    const faceMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide
    });
    this.faces = new THREE.Mesh(cubeGeo, faceMat);
    this.group.add(this.faces);

    // Internal data stream particles
    this._buildDataStream();

    // Inner smaller cube
    const innerGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const innerEdges = new THREE.EdgesGeometry(innerGeo);
    const innerMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.4
    });
    this.innerCube = new THREE.LineSegments(innerEdges, innerMat);
    this.group.add(this.innerCube);

    this.group.scale.setScalar(1.0);
  }

  _buildDataStream() {
    const count = 300;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const green = new THREE.Color(0x00ff88);
    const cyan = new THREE.Color(0x00e5ff);

    this._streamData = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.4;

      sizes[i] = Math.random() * 2 + 0.5;
      alphas[i] = Math.random() * 0.4 + 0.1;

      const c = Math.random() > 0.4 ? green : cyan;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      this._streamData.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02 - 0.005, // Slight downward bias
          (Math.random() - 0.5) * 0.02
        ),
        origin: new THREE.Vector3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        )
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
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * vAlpha;
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

    this.dataStream = new THREE.Points(geo, mat);
    this.group.add(this.dataStream);
  }

  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  update(elapsed) {
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Slow rotation
    this.edges.rotation.y = elapsed * 0.2;
    this.edges.rotation.x = elapsed * 0.15;
    this.faces.rotation.copy(this.edges.rotation);

    // Inner cube counter-rotation
    this.innerCube.rotation.y = -elapsed * 0.4;
    this.innerCube.rotation.z = elapsed * 0.3;

    // Hover: faces separate slightly
    const separation = this.hover * 0.15;
    this.edges.material.opacity = 0.6 + this.hover * 0.3;
    this.faces.material.opacity = 0.03 + this.hover * 0.05;

    // Scale on hover
    const targetScale = 1.0 + this.hover * 0.15;
    this.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);

    // Update data stream
    if (this.dataStream) {
      const positions = this.dataStream.geometry.attributes.position.array;
      const alphas = this.dataStream.geometry.attributes.aAlpha.array;
      const bound = 0.7;

      for (let i = 0; i < this._streamData.length; i++) {
        const s = this._streamData[i];
        const i3 = i * 3;

        positions[i3] += s.velocity.x * (1 + this.hover);
        positions[i3 + 1] += s.velocity.y * (1 + this.hover);
        positions[i3 + 2] += s.velocity.z * (1 + this.hover);

        // Wrap around inside cube
        if (Math.abs(positions[i3]) > bound) positions[i3] = -Math.sign(positions[i3]) * bound;
        if (Math.abs(positions[i3 + 1]) > bound) positions[i3 + 1] = Math.sign(positions[i3 + 1]) * -bound;
        if (Math.abs(positions[i3 + 2]) > bound) positions[i3 + 2] = -Math.sign(positions[i3 + 2]) * bound;

        // Pulse alpha
        alphas[i] = (0.1 + Math.sin(elapsed * 3 + i) * 0.15) * (1 + this.hover * 1.5);
      }

      this.dataStream.geometry.attributes.position.needsUpdate = true;
      this.dataStream.geometry.attributes.aAlpha.needsUpdate = true;
    }
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
