import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Target } from '../../src/simulation/Target.js';
import { selectTargetUnderCrosshair } from '../../src/game/TargetLocking.js';

function makeForwardCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(60, 4 / 3, 0.1, 2000);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, 1);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

describe('TargetLocking', () => {
  it('selects the nearest active target intersected by the crosshair ray', () => {
    const camera = makeForwardCamera();
    const nearTarget = new Target({
      id: 'near-target',
      position: { x: 0, y: 0, z: 50 },
      radius: 5,
      maxHealth: 40,
    });
    const farTarget = new Target({
      id: 'far-target',
      position: { x: 0, y: 0, z: 120 },
      radius: 8,
      maxHealth: 40,
    });

    const selected = selectTargetUnderCrosshair(camera, [farTarget, nearTarget], 400, 300, 800, 600);

    expect(selected?.id).toBe('near-target');
  });

  it('ignores inactive targets when selecting under the crosshair', () => {
    const camera = makeForwardCamera();
    const inactiveTarget = new Target({
      id: 'inactive-target',
      position: { x: 0, y: 0, z: 50 },
      radius: 5,
      maxHealth: 1,
    });
    inactiveTarget.takeDamage(1);

    const activeTarget = new Target({
      id: 'active-target',
      position: { x: 0, y: 0, z: 120 },
      radius: 8,
      maxHealth: 40,
    });

    const selected = selectTargetUnderCrosshair(camera, [inactiveTarget, activeTarget], 400, 300, 800, 600);

    expect(selected?.id).toBe('active-target');
  });

  it('returns null when nothing intersects the crosshair ray', () => {
    const camera = makeForwardCamera();
    const offAxisTarget = new Target({
      id: 'off-axis-target',
      position: { x: 40, y: 0, z: 120 },
      radius: 5,
      maxHealth: 40,
    });

    const selected = selectTargetUnderCrosshair(camera, [offAxisTarget], 400, 300, 800, 600);

    expect(selected).toBeNull();
  });
});
