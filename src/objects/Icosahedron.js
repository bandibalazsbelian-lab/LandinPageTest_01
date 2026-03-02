import * as THREE from 'three';

export class Icosahedron {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this.mouseNDC = new THREE.Vector2(0, 0);
    this.fragmentProgress = 0; // 0 = intact, 1 = fully fragmented
    this.fragmentTargets = [];
    this._build();
  }

  _build() {
    this._buildParticleIcosahedron();
    this._buildWireframe();
  }

  _buildParticleIcosahedron() {
    // Create icosahedron geometry and sample ~3000 points on its surface
    const icoGeo = new THREE.IcosahedronGeometry(8, 3);
    const posAttr = icoGeo.attributes.position;
    const count = posAttr.count;

    // Use all vertices from the subdivided icosahedron
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const randoms = new Float32Array(count);
    // Store face index for fragmentation
    const faceIndices = new Float32Array(count);

    // The icosahedron has 20 faces. Subdivided detail=3 gives many triangles
    // but original 20 faces can be identified by grouping
    const faceCount = 20;

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      sizes[i] = 1.5 + Math.random() * 2.0;
      alphas[i] = 0.5 + Math.random() * 0.4;
      randoms[i] = Math.random();

      // Assign to one of 20 faces based on position
      const dir = new THREE.Vector3(x, y, z).normalize();
      faceIndices[i] = this._assignFace(dir);
    }

    // Pre-calculate fragment explosion targets for each face
    this._calcFragmentTargets(faceCount);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    geo.setAttribute('aFaceIndex', new THREE.BufferAttribute(faceIndices, 1));

    // Build fragment offset buffer (where each face's particles fly to)
    const fragOffsets = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const fi = Math.floor(faceIndices[i]);
      const target = this.fragmentTargets[fi] || { x: 0, y: 0, z: 0 };
      fragOffsets[i * 3]     = target.x + (Math.random() - 0.5) * 3;
      fragOffsets[i * 3 + 1] = target.y + (Math.random() - 0.5) * 3;
      fragOffsets[i * 3 + 2] = target.z + (Math.random() - 0.5) * 3;
    }
    geo.setAttribute('aFragOffset', new THREE.BufferAttribute(fragOffsets, 3));

    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float aSize;
        attribute float aAlpha;
        attribute float aRandom;
        attribute float aFaceIndex;
        attribute vec3 aFragOffset;

        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uFragment; // 0 = intact, 1 = fragmented
        uniform float uHover;
        uniform vec2 uMouse;

        varying float vAlpha;
        varying float vGlow;

        void main() {
          vec3 pos = position;

          // Fragment explosion
          if (uFragment > 0.0) {
            float t = uFragment;
            // Elastic ease-out
            float c4 = (2.0 * 3.14159) / 3.0;
            float eased = t == 0.0 ? 0.0 : t == 1.0 ? 1.0 :
              pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * c4) + 1.0;

            pos = mix(position, aFragOffset, eased);

            // Dissolve alpha
            vAlpha = aAlpha * max(0.0, 1.0 - t * 0.8);
          } else {
            vAlpha = aAlpha;
          }

          // Breathing pulse
          float breath = 1.0 + sin(uTime * 0.7 + aRandom * 6.28) * (0.02 + uHover * 0.01);
          pos *= breath;

          // Mouse parallax tilt
          float tiltX = uMouse.y * 0.2;
          float tiltY = uMouse.x * 0.2;
          float cosX = cos(tiltX), sinX = sin(tiltX);
          float cosY = cos(tiltY), sinY = sin(tiltY);
          vec3 rotated = pos;
          rotated.yz = mat2(cosX, -sinX, sinX, cosX) * pos.yz;
          rotated.xz = mat2(cosY, -sinY, sinY, cosY) * rotated.xz;
          pos = rotated;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 0.5);
          gl_Position = projectionMatrix * mvPosition;

          vGlow = 1.0 - uFragment;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vGlow;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float core = 1.0 - smoothstep(0.0, 0.15, dist);
          float soft = 1.0 - smoothstep(0.0, 0.5, dist);
          float alpha = (soft * 0.6 + core * 0.4 * vGlow) * vAlpha;
          vec3 color = vec3(0.0, 0.55, 0.55) * (1.0 + core * 1.5 * vGlow);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uFragment: { value: 0 },
        uHover: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geo, mat);
    this.group.add(this.points);
    icoGeo.dispose();
  }

  _buildWireframe() {
    const wireGeo = new THREE.IcosahedronGeometry(8, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x008C8C,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    this.wireframe = new THREE.Mesh(wireGeo, wireMat);
    this.group.add(this.wireframe);
  }

  _assignFace(dir) {
    // Map direction vector to one of 20 icosahedron faces
    // Use golden ratio based icosahedron face normals
    if (!this._faceNormals) {
      this._faceNormals = [];
      const phi = (1 + Math.sqrt(5)) / 2;
      const icoVerts = [
        [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
        [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
        [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
      ].map(v => new THREE.Vector3(...v).normalize());

      const faces = [
        [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
        [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
        [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
        [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
      ];

      for (const [a, b, c] of faces) {
        const n = new THREE.Vector3()
          .addVectors(icoVerts[a], icoVerts[b])
          .add(icoVerts[c])
          .normalize();
        this._faceNormals.push(n);
      }
    }

    let bestFace = 0;
    let bestDot = -2;
    for (let f = 0; f < this._faceNormals.length; f++) {
      const d = dir.dot(this._faceNormals[f]);
      if (d > bestDot) { bestDot = d; bestFace = f; }
    }
    return bestFace;
  }

  _calcFragmentTargets(count) {
    this.fragmentTargets = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const elevation = (Math.random() - 0.5) * Math.PI;
      const dist = 15 + Math.random() * 20;
      this.fragmentTargets.push({
        x: Math.cos(angle) * Math.cos(elevation) * dist,
        y: Math.sin(elevation) * dist,
        z: Math.sin(angle) * Math.cos(elevation) * dist
      });
    }
  }

  setHover(value) { this.targetHover = value ? 1 : 0; }
  setMouse(ndc) { this.mouseNDC.copy(ndc); }
  setFragmentProgress(value) { this.fragmentProgress = Math.max(0, Math.min(1, value)); }

  update(elapsed, delta) {
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Rotation
    this.group.rotation.y = elapsed * 0.03;
    this.group.rotation.x = Math.sin(elapsed * 0.02) * 0.1;

    // Wireframe counter-rotation + match fragmentation
    if (this.wireframe) {
      this.wireframe.rotation.y = -elapsed * 0.02;
      this.wireframe.material.opacity = 0.08 * (1 - this.fragmentProgress);
      this.wireframe.scale.setScalar(1 + this.fragmentProgress * 2);
    }

    // Update uniforms
    const u = this.points.material.uniforms;
    u.uTime.value = elapsed;
    u.uFragment.value = this.fragmentProgress;
    u.uHover.value = this.hover;
    u.uMouse.value.copy(this.mouseNDC);
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
