import * as THREE from 'three';

const PLATFORM_DATA = [
  {
    key: 'twitch', name: 'Twitch', color: 0x9146FF, url: 'https://twitch.tv',
    orbitRadius: 6, orbitSpeed: 0.785, orbitTilt: 0.26
  },
  {
    key: 'discord', name: 'Discord', color: 0x5865F2, url: 'https://discord.gg',
    orbitRadius: 7, orbitSpeed: 0.571, orbitTilt: -0.4
  },
  {
    key: 'x', name: 'X', color: 0xFFFFFF, url: 'https://x.com',
    orbitRadius: 8, orbitSpeed: 0.449, orbitTilt: 0.52
  }
];

class Satellite {
  constructor(data, index) {
    this.data = data;
    this.group = new THREE.Group();
    this.hover = 0;
    this.targetHover = 0;
    this._phase = index * Math.PI * 2 / 3;
    this._baseOrbitSpeed = data.orbitSpeed;

    this._buildMesh();
    this._buildGlow();
    this._buildOrbitLine();
  }

  _buildMesh() {
    // Simple satellite: box body + 2 solar panels
    const bodyGeo = new THREE.BoxGeometry(0.4, 0.3, 0.3);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x666677,
      roughness: 0.6,
      metalness: 0.4,
      emissive: new THREE.Color(this.data.color),
      emissiveIntensity: 0.2
    });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.group.add(this.body);

    // Solar panels
    const panelGeo = new THREE.BoxGeometry(0.6, 0.02, 0.3);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x334466,
      roughness: 0.3,
      metalness: 0.7,
      emissive: new THREE.Color(this.data.color),
      emissiveIntensity: 0.1
    });

    const panelL = new THREE.Mesh(panelGeo, panelMat);
    panelL.position.set(-0.5, 0, 0);
    this.group.add(panelL);

    const panelR = new THREE.Mesh(panelGeo, panelMat);
    panelR.position.set(0.5, 0, 0);
    this.group.add(panelR);

    // Label (HTML-based, created separately)
    this.labelVisible = false;
  }

  _buildGlow() {
    const glowGeo = new THREE.SphereGeometry(0.6, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.data.color,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.glow);
  }

  _buildOrbitLine() {
    const segments = 64;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * this.data.orbitRadius;
      const y = Math.sin(angle) * this.data.orbitRadius * 0.4;
      const z = Math.sin(angle) * this.data.orbitRadius * Math.sin(this.data.orbitTilt);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0x008C8C,
      transparent: true,
      opacity: 0.03,
      dashSize: 0.3,
      gapSize: 0.2
    });

    this.orbitLine = new THREE.Line(geo, mat);
    this.orbitLine.computeLineDistances();
  }

  setHover(value) { this.targetHover = value ? 1 : 0; }

  update(elapsed) {
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Orbit motion — slows on hover
    const speedMul = 1 - this.hover * 0.7;
    const angle = elapsed * this._baseOrbitSpeed * speedMul + this._phase;
    const r = this.data.orbitRadius;

    this.group.position.x = Math.cos(angle) * r;
    this.group.position.y = Math.sin(angle) * r * 0.4;
    this.group.position.z = Math.sin(angle) * r * Math.sin(this.data.orbitTilt);

    // Hover: come closer
    this.group.position.z += this.hover * 3;

    // Glow on hover
    this.glow.material.opacity = 0.05 + this.hover * 0.15;
    this.body.material.emissiveIntensity = 0.2 + this.hover * 0.5;

    // Face camera direction
    this.body.rotation.y = elapsed * 0.5;

    this.labelVisible = this.hover > 0.5;
  }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}

export class SatelliteSystem {
  constructor() {
    this.group = new THREE.Group();
    this.satellites = [];
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();

    // Orbit center positioned at social section
    this.group.position.set(0, -15, 0);

    for (let i = 0; i < PLATFORM_DATA.length; i++) {
      const sat = new Satellite(PLATFORM_DATA[i], i);
      this.satellites.push(sat);
      this.group.add(sat.group);
      this.group.add(sat.orbitLine);
    }
  }

  checkHover(ndcX, ndcY, camera) {
    this._mouse.set(ndcX, ndcY);
    this._raycaster.setFromCamera(this._mouse, camera);

    let hoveredKey = null;
    for (const sat of this.satellites) {
      const hits = this._raycaster.intersectObject(sat.body);
      if (hits.length > 0) {
        sat.setHover(true);
        hoveredKey = sat.data.key;
      } else {
        sat.setHover(false);
      }
    }
    return hoveredKey;
  }

  raycast(ndcX, ndcY, camera) {
    this._mouse.set(ndcX, ndcY);
    this._raycaster.setFromCamera(this._mouse, camera);

    for (const sat of this.satellites) {
      const hits = this._raycaster.intersectObject(sat.body);
      if (hits.length > 0) return sat.data;
    }
    return null;
  }

  update(elapsed) {
    for (const sat of this.satellites) {
      sat.update(elapsed);
    }
  }

  dispose() {
    for (const sat of this.satellites) {
      sat.dispose();
    }
  }
}

export { PLATFORM_DATA };
