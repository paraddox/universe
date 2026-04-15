import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ShipHull } from '../simulation/ShipHull.js';
import { SHIP_MODEL_CONFIGS, prepareLoadedShipModel } from './ShipModelManifest.js';

const VISUAL_ROOT_NAME = 'ship-visual-root';

function createHardpointName(id: string): string {
  return `hardpoint:${id}`;
}

function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material?.dispose();
    }
  });
}

export class ShipMeshFactory {
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private loader = new GLTFLoader();
  private modelCache: Map<string, Promise<THREE.Group>> = new Map();

  createShipMesh(hull: ShipHull): THREE.Group {
    const group = new THREE.Group();
    const visualRoot = new THREE.Group();
    visualRoot.name = VISUAL_ROOT_NAME;
    group.add(visualRoot);

    this.addDirectionMarkers(group, hull);

    const fallback = this.createProceduralShipVisual(hull);
    visualRoot.add(fallback);

    if (typeof window !== 'undefined') {
      void this.populateImportedVisual(visualRoot, hull).catch((error) => {
        console.warn(`Failed to load ship model for ${hull.hullClass}:`, error);
      });
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

  dispose(): void {
    this.materialCache.forEach((mat) => mat.dispose());
    this.materialCache.clear();
    this.modelCache.clear();
  }

  private addDirectionMarkers(group: THREE.Group, hull: ShipHull): void {
    const { length, width, height } = hull.dimensions;

    const cockpitMarker = new THREE.Object3D();
    cockpitMarker.name = 'ship-cockpit';
    cockpitMarker.position.set(0, height * 0.2, length * 0.45);
    group.add(cockpitMarker);

    const engineMarker = new THREE.Object3D();
    engineMarker.name = 'ship-engine-core';
    engineMarker.position.set(0, 0, -length * 0.45);
    group.add(engineMarker);

    for (const hp of hull.hardpoints) {
      const hpGeo = new THREE.BoxGeometry(Math.max(0.2, width * 0.02), Math.max(0.2, height * 0.08), Math.max(0.4, length * 0.05));
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
  }

  private async populateImportedVisual(root: THREE.Group, hull: ShipHull): Promise<void> {
    const config = SHIP_MODEL_CONFIGS[hull.hullClass];
    if (!config) {
      return;
    }

    const template = await this.loadPreparedModel(hull);
    const clone = template.clone(true);

    for (const child of [...root.children]) {
      root.remove(child);
      disposeObject3D(child);
    }
    root.add(clone);
  }

  private loadPreparedModel(hull: ShipHull): Promise<THREE.Group> {
    const config = SHIP_MODEL_CONFIGS[hull.hullClass];
    if (!config) {
      return Promise.resolve(this.createProceduralShipVisual(hull));
    }

    if (!this.modelCache.has(hull.hullClass)) {
      this.modelCache.set(
        hull.hullClass,
        this.loader.loadAsync(config.path).then((gltf) => prepareLoadedShipModel(gltf.scene, hull, config)),
      );
    }

    return this.modelCache.get(hull.hullClass)!;
  }

  private createProceduralShipVisual(hull: ShipHull): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ship-procedural-fallback';
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

    const spineGeo = new THREE.BoxGeometry(width * 0.08, height * 0.4, length * 0.24);
    const spineMat = this.getMaterial(hull.hullClass);
    const spine = new THREE.Mesh(spineGeo, spineMat);
    spine.name = 'ship-spine';
    spine.position.set(0, height * 0.28, -length * 0.08);
    group.add(spine);

    return group;
  }

  private getMaterial(hullClass: string): THREE.MeshStandardMaterial {
    if (!this.materialCache.has(hullClass)) {
      const hullColors: Record<string, number> = {
        shuttle: 0x4488aa,
        fighter: 0x44aa88,
        corvette: 0x88aa44,
        destroyer: 0xaa8844,
        cruiser: 0xaa4488,
        battlecruiser: 0xaa4444,
      };
      this.materialCache.set(hullClass, new THREE.MeshStandardMaterial({
        color: hullColors[hullClass] ?? 0x888888,
        metalness: 0.6,
        roughness: 0.4,
      }));
    }
    return this.materialCache.get(hullClass)!.clone();
  }
}
