import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Target } from '../../src/simulation/Target.js';
import { ShipCombatant } from '../../src/simulation/ShipCombatant.js';
import { Quat } from '../../src/simulation/Quat.js';
import { createHull } from '../../src/data/hulls.js';
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
    const visualRoot = group.getObjectByName('ship-visual-root') as THREE.Group | undefined;
    if (!visualRoot) {
      throw new Error('Expected ship visual root to exist');
    }

    const visualMesh = visualRoot.getObjectByName('ship-body') as THREE.Mesh | undefined;
    if (!(visualMesh instanceof THREE.Mesh)) {
      throw new Error('Expected fallback ship body mesh to exist');
    }
    const overlay = visualMesh.children.find((child) => child instanceof THREE.Mesh && child.userData.isDamageOverlay) as THREE.Mesh | undefined;
    const overlayMaterial = overlay?.material as THREE.MeshBasicMaterial | undefined;
    const initialOverlayOpacity = overlayMaterial?.opacity ?? 0;

    target.takeDamage(5);
    updateEnemyShipTargetMesh(group, target);

    expect(group.visible).toBe(true);
    expect(overlayMaterial?.opacity ?? 0).toBeGreaterThan(initialOverlayOpacity);

    target.takeDamage(100);
    updateEnemyShipTargetMesh(group, target);
    expect(group.visible).toBe(false);
  });

  it('preserves imported ship base colors when visuals replace the fallback mesh', () => {
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
    const visualRoot = group.getObjectByName('ship-visual-root') as THREE.Group | undefined;
    if (!visualRoot) {
      throw new Error('Expected ship visual root to exist');
    }

    visualRoot.clear();
    const importedMaterial = new THREE.MeshStandardMaterial({
      color: 0x334455,
      emissive: 0x000000,
      emissiveIntensity: 0.1,
    });
    const importedMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), importedMaterial);
    const importedGroup = new THREE.Group();
    importedGroup.add(importedMesh);
    visualRoot.add(importedGroup);

    const onVisualRootReplaced = group.userData.onVisualRootReplaced as (() => void) | undefined;
    expect(onVisualRootReplaced).toBeTypeOf('function');
    onVisualRootReplaced?.();

    expect(importedMaterial.color.getHex()).toBe(0x334455);
  });

  it('layers hit feedback on a transparent damage overlay instead of repainting the base ship material', () => {
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
    const visualRoot = group.getObjectByName('ship-visual-root') as THREE.Group | undefined;
    if (!visualRoot) {
      throw new Error('Expected ship visual root to exist');
    }

    visualRoot.clear();
    const importedMaterial = new THREE.MeshStandardMaterial({
      color: 0x334455,
      emissive: 0x000000,
      emissiveIntensity: 0.1,
    });
    const importedMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), importedMaterial);
    const importedGroup = new THREE.Group();
    importedGroup.add(importedMesh);
    visualRoot.add(importedGroup);

    const onVisualRootReplaced = group.userData.onVisualRootReplaced as (() => void) | undefined;
    onVisualRootReplaced?.();

    const overlay = importedMesh.children.find((child) => child instanceof THREE.Mesh && child.userData.isDamageOverlay) as THREE.Mesh | undefined;
    expect(overlay).toBeDefined();
    const overlayMaterial = overlay?.material as THREE.MeshBasicMaterial | undefined;
    expect(overlayMaterial?.opacity ?? 0).toBe(0);

    target.takeDamage(5);
    updateEnemyShipTargetMesh(group, target);

    expect(importedMaterial.color.getHex()).toBe(0x334455);
    expect(overlayMaterial?.opacity ?? 0).toBeGreaterThan(0);
  });

  it('copies ship combatant orientation onto the rendered enemy ship mesh', () => {
    const hull = createHull('fighter');
    hull.position = { x: 1, y: 2, z: 3 };
    hull.orientation = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 4);

    const ship = new ShipCombatant({
      id: 'enemy-fighter',
      hull,
      radius: 5,
      maxHealth: 40,
      teamId: 'enemy',
    });

    const factory = new ShipMeshFactory();
    const group = createEnemyShipTargetMesh(ship, factory);
    updateEnemyShipTargetMesh(group, ship);

    expect(group.quaternion.y).toBeCloseTo(ship.orientation.y, 10);
    expect(group.quaternion.w).toBeCloseTo(ship.orientation.w, 10);
  });
});
