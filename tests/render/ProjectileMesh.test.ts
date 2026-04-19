import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ProjectileMesh } from '../../src/render/ProjectileMesh.js';

function getActiveVisual(projectileMesh: ProjectileMesh, id: number): THREE.Object3D {
  const visual = (projectileMesh as unknown as { active: Map<number, THREE.Object3D> }).active.get(id);
  if (!(visual instanceof THREE.Object3D)) {
    throw new Error(`Expected active projectile visual for id ${id}`);
  }
  return visual;
}

describe('ProjectileMesh', () => {
  it('spawns layered kinetic visuals with a bright core and additive trailing glow', () => {
    const scene = new THREE.Scene();
    const projectileMesh = new ProjectileMesh(scene);

    const id = projectileMesh.spawn(0, 0, 0, 0, 0, 10, 5);
    const visual = getActiveVisual(projectileMesh, id);

    expect(visual).toBeInstanceOf(THREE.Group);

    const core = visual.getObjectByName('projectile-core');
    const trail = visual.getObjectByName('projectile-trail');

    expect(core).toBeInstanceOf(THREE.Mesh);
    expect(trail).toBeInstanceOf(THREE.Mesh);

    const trailMaterial = (trail as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(trailMaterial.transparent).toBe(true);
    expect(trailMaterial.blending).toBe(THREE.AdditiveBlending);
    expect((trail as THREE.Mesh).position.z).toBeLessThan(0);
  });

  it('scales heavy kinetic rounds larger than light rounds', () => {
    const scene = new THREE.Scene();
    const projectileMesh = new ProjectileMesh(scene);

    const lightId = projectileMesh.spawn(0, 0, 0, 0, 0, 10, 5);
    const heavyId = projectileMesh.spawn(0, 0, 0, 0, 0, 10, 15);

    const lightVisual = getActiveVisual(projectileMesh, lightId);
    const heavyVisual = getActiveVisual(projectileMesh, heavyId);

    const lightCore = lightVisual.getObjectByName('projectile-core') as THREE.Mesh;
    const heavyCore = heavyVisual.getObjectByName('projectile-core') as THREE.Mesh;
    const lightTrail = lightVisual.getObjectByName('projectile-trail') as THREE.Mesh;
    const heavyTrail = heavyVisual.getObjectByName('projectile-trail') as THREE.Mesh;

    expect(heavyCore.scale.x).toBeGreaterThan(lightCore.scale.x);
    expect(heavyCore.scale.z).toBeGreaterThan(lightCore.scale.z);
    expect(heavyTrail.scale.z).toBeGreaterThan(lightTrail.scale.z);
  });
});
