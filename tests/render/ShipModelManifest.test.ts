import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createHull, HULL_CLASSES } from '../../src/data/hulls.js';
import { SHIP_MODEL_CONFIGS, prepareLoadedShipModel } from '../../src/render/ShipModelManifest.js';

describe('ShipModelManifest', () => {
  it('provides a local GLB asset config for every supported hull class', () => {
    for (const hullClass of HULL_CLASSES) {
      const config = SHIP_MODEL_CONFIGS[hullClass];
      expect(config).toBeDefined();
      expect(config.path.startsWith('/assets/models/ships/')).toBe(true);
      expect(config.path.endsWith('.glb')).toBe(true);
    }
  });

  it('centers and scales loaded ship geometry to match the target hull length', () => {
    const hull = createHull('fighter');
    const raw = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 1, 4),
      new THREE.MeshStandardMaterial(),
    );
    mesh.position.set(5, 2, 10);
    raw.add(mesh);

    const prepared = prepareLoadedShipModel(raw, hull, SHIP_MODEL_CONFIGS.fighter);
    prepared.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(prepared);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    expect(center.x).toBeCloseTo(0, 5);
    expect(center.y).toBeCloseTo(0, 5);
    expect(center.z).toBeCloseTo(0, 5);
    expect(size.z).toBeCloseTo(hull.dimensions.length, 5);
  });
});
