import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createHull, HULL_CLASSES } from '../../src/data/hulls.js';
import {
  getShipModelConfig,
  PLAYER_SHIP_MODEL_CONFIG,
  SHIP_MODEL_CONFIGS,
  prepareLoadedShipModel,
} from '../../src/render/ShipModelManifest.js';

describe('ShipModelManifest', () => {
  it('provides a local GLB asset config for every supported hull class', () => {
    for (const hullClass of HULL_CLASSES) {
      const config = SHIP_MODEL_CONFIGS[hullClass];
      expect(config).toBeDefined();
      expect(config.path.startsWith('/assets/models/ships/')).toBe(true);
      expect(config.path.endsWith('.glb')).toBe(true);
    }
  });

  it('exposes a local GLB override config for the player ship model with the corrective forward-facing rotation', () => {
    expect(PLAYER_SHIP_MODEL_CONFIG.path).toBe('/assets/models/ships/main-fighter.glb');
    expect(PLAYER_SHIP_MODEL_CONFIG.path.endsWith('.glb')).toBe(true);
    expect(PLAYER_SHIP_MODEL_CONFIG.title).toBe('Main Fighter');
    expect(PLAYER_SHIP_MODEL_CONFIG.rotation).toEqual({ x: 0, y: -(Math.PI / 2), z: 0 });
  });

  it('prefers an explicit ship model override over the hull-class default config', () => {
    expect(getShipModelConfig('fighter')).toBe(SHIP_MODEL_CONFIGS.fighter);
    expect(getShipModelConfig('fighter', PLAYER_SHIP_MODEL_CONFIG)).toBe(PLAYER_SHIP_MODEL_CONFIG);
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
