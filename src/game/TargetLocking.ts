import * as THREE from 'three';
import type { CombatTarget } from '../simulation/CombatTarget.js';

function raySphereIntersectionDistance(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  center: { x: number; y: number; z: number },
  radius: number,
): number | null {
  const offset = new THREE.Vector3(
    origin.x - center.x,
    origin.y - center.y,
    origin.z - center.z,
  );

  const b = offset.dot(direction);
  const c = offset.lengthSq() - (radius * radius);
  const discriminant = (b * b) - c;
  if (discriminant < 0) {
    return null;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const near = -b - sqrtDiscriminant;
  const far = -b + sqrtDiscriminant;

  if (near >= 0) {
    return near;
  }
  if (far >= 0) {
    return far;
  }

  return null;
}

export function selectTargetUnderCrosshair(
  camera: THREE.PerspectiveCamera,
  targets: CombatTarget[],
  screenX: number,
  screenY: number,
  viewportWidth: number,
  viewportHeight: number,
): CombatTarget | null {
  const ndcX = (screenX / viewportWidth) * 2 - 1;
  const ndcY = 1 - (screenY / viewportHeight) * 2;

  const origin = new THREE.Vector3();
  origin.setFromMatrixPosition(camera.matrixWorld);

  const direction = new THREE.Vector3(ndcX, ndcY, 1)
    .unproject(camera)
    .sub(origin)
    .normalize();

  let closestTarget: CombatTarget | null = null;
  let closestDistance = Infinity;

  for (const target of targets) {
    if (!target.isActive()) {
      continue;
    }

    for (const sphere of target.getHitSpheres()) {
      const hitDistance = raySphereIntersectionDistance(origin, direction, sphere.center, sphere.radius);
      if (hitDistance === null || hitDistance >= closestDistance) {
        continue;
      }

      closestDistance = hitDistance;
      closestTarget = target;
    }
  }

  return closestTarget;
}
