import * as THREE from 'three';
import type { ShipHull } from '../simulation/ShipHull.js';

const HULL_COLORS: Record<string, number> = {
  shuttle: 0x4488aa,
  fighter: 0x44aa88,
  corvette: 0x88aa44,
  destroyer: 0xaa8844,
  cruiser: 0xaa4488,
  battlecruiser: 0xaa4444,
};

export class ShipMeshFactory {
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  createShipMesh(hull: ShipHull): THREE.Group {
    const group = new THREE.Group();
    const { length, width, height } = hull.dimensions;

    // Main hull body — elongated hexagonal prism approximated with a box
    const bodyGeo = new THREE.BoxGeometry(width * 0.6, height * 0.5, length);
    const bodyMat = this.getMaterial(hull.hullClass);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Nose taper — pyramid/cone at front
    const noseGeo = new THREE.ConeGeometry(
      Math.max(0.01, Math.min(width, height) * 0.25),
      length * 0.2,
      4,
    );
    const noseMat = this.getMaterial(hull.hullClass);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.z = length * 0.6;
    group.add(nose);

    // Engine glow at back
    const engineGeo = new THREE.BoxGeometry(width * 0.4, height * 0.3, length * 0.15);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      emissive: 0x0033aa,
      emissiveIntensity: 0.5,
    });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.position.z = -length * 0.5;
    group.add(engine);

    // Hardpoint indicators
    for (const hp of hull.hardpoints) {
      const hpGeo = new THREE.BoxGeometry(0.3, 0.3, 0.6);
      const hpMat = new THREE.MeshStandardMaterial({
        color: hp.isOccupied() ? 0xff6600 : 0x333333,
        emissive: hp.isOccupied() ? 0xff3300 : 0x000000,
        emissiveIntensity: hp.isOccupied() ? 0.3 : 0,
      });
      const hpMesh = new THREE.Mesh(hpGeo, hpMat);
      hpMesh.position.set(hp.position.x, hp.position.y, hp.position.z);
      group.add(hpMesh);
    }

    return group;
  }

  updateHardpointVisuals(group: THREE.Group, hull: ShipHull): void {
    // Hardpoint meshes are after body, nose, engine (indices 0-2)
    const offset = 3;
    for (let i = 0; i < hull.hardpoints.length; i++) {
      const mesh = group.children[offset + i] as THREE.Mesh;
      if (!mesh) continue;
      const hp = hull.hardpoints[i];
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (hp.isOccupied()) {
        mat.color.setHex(0xff6600);
        mat.emissive.setHex(0xff3300);
        mat.emissiveIntensity = 0.3;
      } else {
        mat.color.setHex(0x333333);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    }
  }

  private getMaterial(hullClass: string): THREE.MeshStandardMaterial {
    if (!this.materialCache.has(hullClass)) {
      this.materialCache.set(hullClass, new THREE.MeshStandardMaterial({
        color: HULL_COLORS[hullClass] ?? 0x888888,
        metalness: 0.6,
        roughness: 0.4,
      }));
    }
    return this.materialCache.get(hullClass)!.clone();
  }

  dispose(): void {
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
  }
}
