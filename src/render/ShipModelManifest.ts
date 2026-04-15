import * as THREE from 'three';
import type { ShipHull } from '../simulation/ShipHull.js';

export interface ShipModelConfig {
  path: string;
  sourcePage: string;
  title: string;
  author: string;
  license: string;
  rotation?: { x: number; y: number; z: number };
  scale?: number;
}

export const SHIP_MODEL_CONFIGS: Record<string, ShipModelConfig> = {
  shuttle: {
    path: '/assets/models/ships/shuttle-small-ship.glb',
    sourcePage: 'https://poly.pizza/m/W2vMzztgIi',
    title: 'Small Ship',
    author: 'Quaternius',
    license: 'CC0',
  },
  fighter: {
    path: '/assets/models/ships/fighter-quaternius-a.glb',
    sourcePage: 'https://poly.pizza/m/uCeLfsdmNP',
    title: 'Spaceship',
    author: 'Quaternius',
    license: 'CC0',
  },
  corvette: {
    path: '/assets/models/ships/corvette-quaternius-b.glb',
    sourcePage: 'https://poly.pizza/m/xNbtFQwirO',
    title: 'Spaceship',
    author: 'Quaternius',
    license: 'CC0',
  },
  destroyer: {
    path: '/assets/models/ships/destroyer-quaternius-c.glb',
    sourcePage: 'https://poly.pizza/m/htfBk9vPfw',
    title: 'Spaceship',
    author: 'Quaternius',
    license: 'CC0',
  },
  cruiser: {
    path: '/assets/models/ships/cruiser-quaternius-d.glb',
    sourcePage: 'https://poly.pizza/m/PQzePrvBCD',
    title: 'Spaceship',
    author: 'Quaternius',
    license: 'CC0',
  },
  battlecruiser: {
    path: '/assets/models/ships/battlecruiser-quaternius-e.glb',
    sourcePage: 'https://poly.pizza/m/Jqfed124pQ',
    title: 'Spaceship',
    author: 'Quaternius',
    license: 'CC0',
  },
};

export function prepareLoadedShipModel(
  object: THREE.Object3D,
  hull: ShipHull,
  config: ShipModelConfig,
): THREE.Group {
  const prepared = new THREE.Group();
  const working = object.clone(true);
  prepared.add(working);

  if (config.rotation) {
    working.rotation.set(config.rotation.x, config.rotation.y, config.rotation.z);
  }

  prepared.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(prepared);
  const initialCenter = initialBox.getCenter(new THREE.Vector3());
  working.position.sub(initialCenter);

  prepared.updateMatrixWorld(true);
  const centeredBox = new THREE.Box3().setFromObject(prepared);
  const size = centeredBox.getSize(new THREE.Vector3());
  const length = size.z > 0 ? size.z : Math.max(size.x, size.y, size.z, 1);
  const scale = (hull.dimensions.length / length) * (config.scale ?? 1);
  prepared.scale.setScalar(scale);

  prepared.updateMatrixWorld(true);
  prepared.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          if ('flatShading' in material) {
            material.flatShading = false;
          }
        });
      } else if (child.material && 'flatShading' in child.material) {
        child.material.flatShading = false;
      }
    }
  });

  return prepared;
}
