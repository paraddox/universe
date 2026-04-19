import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ShipHull } from '../simulation/ShipHull.js';
import { SHIP_MODEL_CONFIGS, prepareLoadedShipModel } from './ShipModelManifest.js';

const VISUAL_ROOT_NAME = 'ship-visual-root';
const THRUSTER_CORE_NAME = 'ship-thruster-core';
const THRUSTER_PLUME_NAME = 'ship-thruster-plume';

interface ThrusterVisualState {
  core: THREE.Mesh;
  coreMaterial: THREE.MeshBasicMaterial;
  plume: THREE.Mesh;
  plumeMaterial: THREE.MeshBasicMaterial;
  baseCoreScale: number;
  basePlumeScale: THREE.Vector3;
}

function createHardpointName(id: string): string {
  return `hardpoint:${id}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
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
    this.addThrusterVisuals(group, hull);

    const fallback = this.createProceduralShipVisual(hull);
    visualRoot.add(fallback);

    if (typeof window !== 'undefined') {
      void this.populateImportedVisual(visualRoot, hull).catch((error) => {
        console.warn(`Failed to load ship model for ${hull.hullClass}:`, error);
      });
    }

    this.updateThrusterVisuals(group, 0, 0);
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

  updateThrusterVisuals(group: THREE.Group, thrustLevel: number, elapsedTime: number): void {
    const thrusterState = group.userData.thrusterVisuals as ThrusterVisualState | undefined;
    if (!thrusterState) {
      return;
    }

    const thrust = clamp(thrustLevel, 0, 1);
    const drive = lerp(0.16, 1, thrust);
    const flicker = thrust > 0
      ? 0.94 + Math.sin(elapsedTime * 27) * 0.04 + Math.sin(elapsedTime * 41) * 0.02
      : 1;
    const intensity = clamp(drive * flicker, 0, 1.1);

    thrusterState.coreMaterial.opacity = lerp(0.22, 0.92, intensity);
    thrusterState.plumeMaterial.opacity = lerp(0.08, 0.58, intensity);

    thrusterState.coreMaterial.color.setRGB(
      lerp(0.35, 0.95, intensity),
      lerp(0.7, 0.98, intensity),
      1,
    );
    thrusterState.plumeMaterial.color.setRGB(
      lerp(0.22, 0.7, intensity),
      lerp(0.45, 0.88, intensity),
      1,
    );

    const coreScale = thrusterState.baseCoreScale * lerp(0.82, 1.28, intensity);
    thrusterState.core.scale.setScalar(coreScale);
    thrusterState.plume.scale.set(
      thrusterState.basePlumeScale.x * lerp(0.7, 1.15, intensity),
      thrusterState.basePlumeScale.y * lerp(0.7, 1.15, intensity),
      thrusterState.basePlumeScale.z * lerp(0.55, 2.4, intensity),
    );
    thrusterState.plume.rotation.z = elapsedTime * lerp(0.8, 8.5, intensity);
    thrusterState.plume.rotation.x = elapsedTime * lerp(0.4, 2.2, intensity);
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

  private addThrusterVisuals(group: THREE.Group, hull: ShipHull): void {
    const { length, width, height } = hull.dimensions;
    const coreRadius = Math.max(0.16, Math.min(width, height) * 0.12);
    const plumeRadius = Math.max(0.22, Math.min(width, height) * 0.18);
    const basePlumeScale = new THREE.Vector3(
      plumeRadius,
      plumeRadius,
      Math.max(0.7, length * 0.16),
    );

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x7fd4ff,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), coreMaterial);
    core.name = THRUSTER_CORE_NAME;
    core.position.set(0, 0, -length * 0.53);
    core.scale.setScalar(coreRadius);
    group.add(core);

    const plumeMaterial = new THREE.MeshBasicMaterial({
      color: 0x4ca6ff,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const plume = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), plumeMaterial);
    plume.name = THRUSTER_PLUME_NAME;
    plume.position.set(0, 0, -length * 0.68);
    plume.scale.copy(basePlumeScale);
    group.add(plume);

    group.userData.thrusterVisuals = {
      core,
      coreMaterial,
      plume,
      plumeMaterial,
      baseCoreScale: coreRadius,
      basePlumeScale,
    } satisfies ThrusterVisualState;
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

    const ownerGroup = root.parent;
    const onVisualRootReplaced = ownerGroup?.userData.onVisualRootReplaced as (() => void) | undefined;
    onVisualRootReplaced?.();
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
