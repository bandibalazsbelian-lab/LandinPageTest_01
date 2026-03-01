import * as THREE from 'three';

// Neural Network mesh — interconnected nodes and edges
export class PillarCoLab {
  constructor() {
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this.nodes = [];
    this.edges = [];
    this._build();
  }

  _build() {
    const nodeCount = 24;
    const color = new THREE.Color(0x00e5ff);

    // Create nodes as instanced spheres
    const nodeMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.9
    });
    const nodeGeo = new THREE.SphereGeometry(0.08, 8, 8);

    for (let i = 0; i < nodeCount; i++) {
      const node = new THREE.Mesh(nodeGeo, nodeMat.clone());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.0 + Math.random() * 0.8;

      node.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      node.userData.origin = node.position.clone();
      node.userData.pulseOffset = Math.random() * Math.PI * 2;
      node.userData.pulseSpeed = 1 + Math.random() * 2;

      this.group.add(node);
      this.nodes.push(node);
    }

    // Create edges between nearby nodes
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.3
    });

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = this.nodes[i].position.distanceTo(this.nodes[j].position);
        if (dist < 1.2) {
          const geo = new THREE.BufferGeometry().setFromPoints([
            this.nodes[i].position,
            this.nodes[j].position
          ]);
          const line = new THREE.Line(geo, edgeMat.clone());
          line.userData.nodeA = i;
          line.userData.nodeB = j;
          this.group.add(line);
          this.edges.push(line);
        }
      }
    }

    // Add glowing points for nodes
    const glowPositions = new Float32Array(nodeCount * 3);
    const glowSizes = new Float32Array(nodeCount);
    const glowAlphas = new Float32Array(nodeCount);
    const glowColors = new Float32Array(nodeCount * 3);

    for (let i = 0; i < nodeCount; i++) {
      const n = this.nodes[i];
      glowPositions[i * 3] = n.position.x;
      glowPositions[i * 3 + 1] = n.position.y;
      glowPositions[i * 3 + 2] = n.position.z;
      glowSizes[i] = 6;
      glowAlphas[i] = 0.6;
      glowColors[i * 3] = color.r;
      glowColors[i * 3 + 1] = color.g;
      glowColors[i * 3 + 2] = color.b;
    }

    const glowGeo = new THREE.BufferGeometry();
    glowGeo.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    glowGeo.setAttribute('aSize', new THREE.BufferAttribute(glowSizes, 1));
    glowGeo.setAttribute('aAlpha', new THREE.BufferAttribute(glowAlphas, 1));
    glowGeo.setAttribute('aColor', new THREE.BufferAttribute(glowColors, 3));

    const glowMat = new THREE.ShaderMaterial({
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

    this.glowPoints = new THREE.Points(glowGeo, glowMat);
    this.group.add(this.glowPoints);

    this.group.scale.setScalar(1.2);
  }

  setHover(value) {
    this.targetHover = value ? 1 : 0;
  }

  update(elapsed) {
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Rotate
    this.group.rotation.y = elapsed * 0.3;
    this.group.rotation.x = Math.sin(elapsed * 0.2) * 0.1;

    // Pulse nodes
    this.nodes.forEach((node, i) => {
      const pulse = Math.sin(elapsed * node.userData.pulseSpeed + node.userData.pulseOffset);
      const scale = 1 + pulse * 0.3 + this.hover * 0.5;
      node.scale.setScalar(scale);
      node.material.opacity = 0.6 + pulse * 0.3 + this.hover * 0.3;
    });

    // Update edge positions and opacity
    this.edges.forEach(edge => {
      const a = this.nodes[edge.userData.nodeA];
      const b = this.nodes[edge.userData.nodeB];
      edge.material.opacity = 0.2 + this.hover * 0.3;
    });

    // Expand on hover
    const targetScale = 1.2 + this.hover * 0.3;
    this.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);

    // Update glow points
    if (this.glowPoints) {
      const pos = this.glowPoints.geometry.attributes.position.array;
      const alphas = this.glowPoints.geometry.attributes.aAlpha.array;
      this.nodes.forEach((node, i) => {
        pos[i * 3] = node.position.x;
        pos[i * 3 + 1] = node.position.y;
        pos[i * 3 + 2] = node.position.z;
        alphas[i] = 0.4 + Math.sin(elapsed * node.userData.pulseSpeed + node.userData.pulseOffset) * 0.3;
      });
      this.glowPoints.geometry.attributes.position.needsUpdate = true;
      this.glowPoints.geometry.attributes.aAlpha.needsUpdate = true;
    }
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}
