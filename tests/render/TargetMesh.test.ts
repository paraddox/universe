import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Target } from '../../src/simulation/Target.js';
import { createTargetMesh, updateTargetMesh } from '../../src/render/TargetMesh.js';

describe('TargetMesh', () => {
  it('creates a mesh at the target position', () => {
    const target = new Target({
      id: 'dummy',
      position: { x: 1, y: 2, z: 3 },
      radius: 4,
      maxHealth: 100,
    });

    const mesh = createTargetMesh(target);

    expect(mesh.position.x).toBe(1);
    expect(mesh.position.y).toBe(2);
    expect(mesh.position.z).toBe(3);
    expect(mesh.visible).toBe(true);
  });

  it('updates visibility, color, and hit flash based on target state', () => {
    const target = new Target({
      id: 'dummy',
      position: { x: 1, y: 2, z: 3 },
      radius: 4,
      maxHealth: 100,
    });
    const mesh = createTargetMesh(target);
    const material = mesh.material as THREE.MeshStandardMaterial;
    const initialColor = material.color.getHex();
    const initialScale = mesh.scale.x;

    target.takeDamage(50);
    target.position = { x: 5, y: 6, z: 7 };
    updateTargetMesh(mesh, target);

    expect(mesh.position.x).toBe(5);
    expect(mesh.position.y).toBe(6);
    expect(mesh.position.z).toBe(7);
    expect(mesh.visible).toBe(true);
    expect(material.color.getHex()).not.toBe(initialColor);
    expect(material.emissiveIntensity).toBeGreaterThan(0.35);
    expect(mesh.scale.x).toBeGreaterThan(initialScale);

    target.takeDamage(100);
    updateTargetMesh(mesh, target);
    expect(mesh.visible).toBe(false);
  });
});
