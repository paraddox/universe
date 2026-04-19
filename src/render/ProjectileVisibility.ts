import type { Vec3 } from '../simulation/WeaponModule.js';

export const DEFAULT_PROJECTILE_VISUAL_RANGE = 600;

export function shouldRenderProjectileVisual(
  projectilePosition: Vec3,
  observerPosition: Vec3,
  maxDistance: number = DEFAULT_PROJECTILE_VISUAL_RANGE,
): boolean {
  const dx = projectilePosition.x - observerPosition.x;
  const dy = projectilePosition.y - observerPosition.y;
  const dz = projectilePosition.z - observerPosition.z;
  return (dx * dx) + (dy * dy) + (dz * dz) <= maxDistance * maxDistance;
}
