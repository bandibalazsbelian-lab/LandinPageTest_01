import * as THREE from 'three';

const PILLAR_DATA = [
  {
    key: 'colab', name: 'CoLabMűhely', color: 0x00E5FF,
    desc: 'Együttműködő műhelyek, ahol a cross-funkcionális csapatok közösen oldják meg a holnap kihívásait.',
    position: new THREE.Vector3(-6, -7, -4)
  },
  {
    key: 'challenge', name: 'InnoChallenge', color: 0xFFD700,
    desc: 'Versenyszerű innovációs sprintek, amelyek az ambiciózus ötleteket kézzelfogható prototípusokká alakítják.',
    position: new THREE.Vector3(6, -6, -2)
  },
  {
    key: 'lab', name: 'InnoLab', color: 0x00FF88,
    desc: 'A kísérleti játszóterünk, ahol az új technológiákat teszteljük, fejlesztjük és tökéletesítjük.',
    position: new THREE.Vector3(-4, -9, -6)
  },
  {
    key: 'future', name: 'FutureWatch', color: 0xFF00AA,
    desc: 'A horizont pásztázása trendek, technológiák és lehetőségek után, amelyek az iparágunkat formálják.',
    position: new THREE.Vector3(5, -10, -3)
  }
];

class Asteroid {
  constructor(data) {
    this.data = data;
    this.group = new THREE.Group();
    this.group.position.copy(data.position);
    this.hover = 0;
    this.targetHover = 0;
    this.isOpen = false;
    this.openProgress = 0;

    this._rotAxis = new THREE.Vector3(
      Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5
    ).normalize();
    this._rotSpeed = 0.02 + Math.random() * 0.03;
    this._bobPhase = Math.random() * Math.PI * 2;
    this._bobSpeed = 0.15 + Math.random() * 0.1;
    this._bobAmp = 0.5;
    this._baseY = data.position.y;

    this._buildMesh();
    this._buildDebris();
    this._buildGlow();
  }

  _buildMesh() {
    // Low-poly asteroid with vertex displacement
    const geo = new THREE.IcosahedronGeometry(1.8, 1);
    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const len = Math.sqrt(x * x + y * y + z * z);
      const disp = 1 + (Math.random() - 0.5) * 0.3;
      posAttr.setXYZ(i, x / len * 1.8 * disp, y / len * 1.8 * disp, z / len * 1.8 * disp);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x333344,
      roughness: 0.9,
      metalness: 0.1,
      emissive: new THREE.Color(this.data.color),
      emissiveIntensity: 0.05
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.group.add(this.mesh);
  }

  _buildDebris() {
    const debrisCount = 35;
    this.debris = [];
    for (let i = 0; i < debrisCount; i++) {
      const size = 0.05 + Math.random() * 0.25;
      const geo = new THREE.IcosahedronGeometry(size, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x444455,
        roughness: 0.9,
        emissive: new THREE.Color(this.data.color),
        emissiveIntensity: 0.02
      });
      const mesh = new THREE.Mesh(geo, mat);

      const orbitRadius = 2.5 + Math.random() * 2;
      const orbitSpeed = 0.1 + Math.random() * 0.3;
      const orbitTilt = (Math.random() - 0.5) * 0.8;
      const orbitPhase = Math.random() * Math.PI * 2;

      this.debris.push({ mesh, orbitRadius, orbitSpeed, orbitTilt, orbitPhase });
      this.group.add(mesh);
    }
  }

  _buildGlow() {
    const glowGeo = new THREE.SphereGeometry(2.2, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: this.data.color,
      transparent: true,
      opacity: 0.03,
      side: THREE.BackSide
    });
    this.glow = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.glow);
  }

  update(elapsed) {
    this.hover += (this.targetHover - this.hover) * 0.08;

    // Rotation
    const quat = new THREE.Quaternion().setFromAxisAngle(this._rotAxis, this._rotSpeed * elapsed);
    this.mesh.quaternion.copy(quat);

    // Bobbing
    const bob = Math.sin(elapsed * this._bobSpeed + this._bobPhase) * this._bobAmp;
    this.group.position.y = this._baseY + bob;

    // Hover: come closer
    const hoverZ = this.hover * 2;
    this.group.position.z = this.data.position.z + hoverZ;

    // Glow intensity on hover
    this.glow.material.opacity = 0.03 + this.hover * 0.08;

    // Emissive on hover
    this.mesh.material.emissiveIntensity = 0.05 + this.hover * 0.15;

    // Debris orbit
    const debrisSpeedMul = 1 + this.hover * 2;
    for (const d of this.debris) {
      const angle = elapsed * d.orbitSpeed * debrisSpeedMul + d.orbitPhase;
      d.mesh.position.x = Math.cos(angle) * d.orbitRadius;
      d.mesh.position.y = Math.sin(angle) * d.orbitRadius * Math.cos(d.orbitTilt);
      d.mesh.position.z = Math.sin(angle) * d.orbitRadius * Math.sin(d.orbitTilt);
    }
  }

  setHover(value) { this.targetHover = value ? 1 : 0; }

  dispose() {
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }
}

export class AsteroidSystem {
  constructor() {
    this.group = new THREE.Group();
    this.asteroids = [];
    this._raycaster = new THREE.Raycaster();
    this._mouse = new THREE.Vector2();
    this._openAsteroid = null;

    for (const data of PILLAR_DATA) {
      const asteroid = new Asteroid(data);
      this.asteroids.push(asteroid);
      this.group.add(asteroid.group);
    }
  }

  // Returns pillar data if an asteroid is clicked
  raycast(ndcX, ndcY, camera) {
    this._mouse.set(ndcX, ndcY);
    this._raycaster.setFromCamera(this._mouse, camera);

    for (const asteroid of this.asteroids) {
      const hits = this._raycaster.intersectObject(asteroid.mesh);
      if (hits.length > 0) {
        return asteroid.data;
      }
    }
    return null;
  }

  // Check hover by raycasting
  checkHover(ndcX, ndcY, camera) {
    this._mouse.set(ndcX, ndcY);
    this._raycaster.setFromCamera(this._mouse, camera);

    let hoveredKey = null;
    for (const asteroid of this.asteroids) {
      const hits = this._raycaster.intersectObject(asteroid.mesh);
      if (hits.length > 0) {
        asteroid.setHover(true);
        hoveredKey = asteroid.data.key;
      } else {
        asteroid.setHover(false);
      }
    }
    return hoveredKey;
  }

  update(elapsed) {
    for (const asteroid of this.asteroids) {
      asteroid.update(elapsed);
    }
  }

  getAsteroidByKey(key) {
    return this.asteroids.find(a => a.data.key === key);
  }

  dispose() {
    for (const asteroid of this.asteroids) {
      asteroid.dispose();
    }
  }
}

export { PILLAR_DATA };
