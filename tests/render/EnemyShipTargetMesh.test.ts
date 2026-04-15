import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Target } from '../../src/simulation/Target.js';
import { ShipMeshFactory } from '../../src/render/ShipMeshFactory.js';
import { createEnemyShipTargetMesh, updateEnemyShipTargetMesh } from '../../src/render/EnemyShipTargetMesh.js';

function firstMesh(group: THREE.Group): THREE.Mesh {
  const mesh = group.children.find((child) => child instanceof THREE.Mesh);
  if (!(mesh instanceof THREE.Mesh)) {
    throw new Error('Expected enemy ship mesh to contain at least one mesh child');
  }
  return mesh;
}

describe('EnemyShipTargetMesh', () => {
  it('creates a ship visual for ship targets', () => {
    const target = new Target({
      id: 'enemy-fighter',
      position: { x: 10, y: 2, z: 30 },
      radius: 5,
      maxHealth: 40,
      kind: 'ship',
      hullClass: 'fighter',
    });

    const factory = new ShipMeshFactory();
    const group = createEnemyShipTargetMesh(target, factory);

    expect(group.position.x).toBe(10);
    expect(group.position.y).toBe(2);
    expect(group.position.z).toBe(30);
    expect(group.visible).toBe(true);
    expect(group.children.length).toBeGreaterThan(0);
  });

  it('updates visibility and hit flash for ship targets', () => {
    const target = new Target({
      id: 'enemy-fighter',
      position: { x: 10, y: 2, z: 30 },
      radius: 5,
      maxHealth: 40,
      kind: 'ship',
      hullClass: 'fighter',
    });

    const factory = new ShipMeshFactory();
    const group = createEnemyShipTargetMesh(target, factory);
    const mesh = firstMesh(group);
    const material = mesh.material as THREE.MeshStandardMaterial;
    const initialEmissiveIntensity = material.emissiveIntensity;

    target.takeDamage(5);
    updateEnemyShipTargetMesh(group, target);

    expect(group.visible).toBe(true);
    expect(material.emissiveIntensity).toBeGreaterThan(initialEmissiveIntensity);

    target.takeDamage(100);
    updateEnemyShipTargetMesh(group, target);
    expect(group.visible).toBe(false);
  });
});
