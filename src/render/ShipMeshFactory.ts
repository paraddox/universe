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

function createHardpointName(id: string): string {
  return `hardpoint:${id}`;
}

export class ShipMeshFactory {
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();

  createShipMesh(hull: ShipHull): THREE.Group {
    const group = new THREE.Group();
    const { length, width, height } = hull.dimensions;

    const bodyGeo = new THREE.BoxGeometry(width * 0.6, height * 0.5, length);
    const bodyMat = this.getMaterial(hull.hullClass);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.name = 'ship-body';
    group.add(body);

    const noseGeo = new THREE.ConeGeometry(
      Math.max(0.01, Math.min(width, height) * 0.3),
      length * 0.35,
      4,
    );
    const noseMat = this.getMaterial(hull.hullClass);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.name = 'ship-nose';
    nose.rotation.x = Math.PI / 2;
    nose.position.z = length * 0.62;
    group.add(nose);

    const cockpitGeo = new THREE.BoxGeometry(width * 0.18, height * 0.22, length * 0.18);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0xcce6ff,
      emissive: 0x336699,
      emissiveIntensity: 0.45,
      metalness: 0.25,
      roughness: 0.2,
    });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.name = 'ship-cockpit';
    cockpit.position.set(0, height * 0.2, length * 0.28);
    group.add(cockpit);

    const spineGeo = new THREE.BoxGeometry(width * 0.08, height * 0.4, length * 0.24);
    const spineMat = this.getMaterial(hull.hullClass);
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.name = 'ship-spine';
    spine.position.set(0, height * 0.28, -length * 0.08);
    group.add(spine);

    const engineGeo = new THREE.BoxGeometry(width * 0.4, height * 0.3, length * 0.15);
    const engineMat = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      emissive: 0x0033aa,
      emissiveIntensity: 0.75,
    });
    const engine = new THREE.Mesh(engineGeo, engineMat);
    engine.name = 'ship-engine-core';
    engine.position.z = -length * 0.5;
    group.add(engine);

    const exhaustGeo = new THREE.BoxGeometry(width * 0.22, height * 0.12, length * 0.08);
    const exhaustMat = new THREE.MeshStandardMaterial({
      color: 0x66ccff,
      emissive: 0x2299ff,
      emissiveIntensity: 0.95,
      roughness: 0.15,
      metalness: 0.1,
    });

    const exhaustLeft = new THREE.Mesh(exhaustGeo, exhaustMat.clone());
    exhaustLeft.name = 'ship-engine-left';
    exhaustLeft.position.set(-width * 0.14, 0, -length * 0.61);
    group.add(exhaustLeft);

    const exhaustRight = new THREE.Mesh(exhaustGeo, exhaustMat.clone());
    exhaustRight.name = 'ship-engine-right';
    exhaustRight.position.set(width * 0.14, 0, -length * 0.61);
    group.add(exhaustRight);

    for (const hp of hull.hardpoints) {
      const hpGeo = new THREE.BoxGeometry(0.3, 0.3, 0.6);
      const hpMat = new THREE.MeshStandardMaterial({
        color: hp.isOccupied() ? 0xff6600 : 0x333333,
        emissive: hp.isOccupied() ? 0xff3300 : 0x000000,
        emissiveIntensity: hp.isOccupied() ? 0.3 : 0,
      });
      const hpMesh = new THREE.Mesh(hpGeo, hpMat);
      hpMesh.name = createHardpointName(hp.id);
      hpMesh.position.set(hp.position.x, hp.position.y, hp.position.z);
      group.add(hpMesh);
    }

    return group;
  }

  updateHardpointVisuals(group: THREE.Group, hull: ShipHull): void {
    for (const hp of hull.hardpoints) {
      const mesh = group.getObjectByName(createHardpointName(hp.id)) as THREE.Mesh | undefined;
      if (!mesh) continue;
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
