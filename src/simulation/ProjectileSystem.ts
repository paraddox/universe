import { Projectile } from './Projectile.js';
import type { CombatTarget } from './CombatTarget.js';
import type { Vec3 } from './WeaponModule.js';

function segmentSphereHit(start: Vec3, end: Vec3, center: Vec3, radius: number): number | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;

  const fx = start.x - center.x;
  const fy = start.y - center.y;
  const fz = start.z - center.z;

  const a = dx * dx + dy * dy + dz * dz;
  if (a === 0) {
    const distSq = fx * fx + fy * fy + fz * fz;
    return distSq <= radius * radius ? 0 : null;
  }

  const b = 2 * (fx * dx + fy * dy + fz * dz);
  const c = fx * fx + fy * fy + fz * fz - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  if (t1 >= 0 && t1 <= 1) return t1;
  if (t2 >= 0 && t2 <= 1) return t2;
  return null;
}

export interface ProjectileHitEvent {
  targetId: string;
  damage: number;
  destroyed: boolean;
  position: Vec3;
}

export class ProjectileSystem {
  projectiles: Projectile[];

  constructor() {
    this.projectiles = [];
  }

  add(projectile: Projectile): void {
    this.projectiles.push(projectile);
  }

  update(dt: number, targets: CombatTarget[] = []): ProjectileHitEvent[] {
    const remaining: Projectile[] = [];
    const hits: ProjectileHitEvent[] = [];

    for (const p of this.projectiles) {
      if (!p.isActive()) {
        continue;
      }

      const start = { ...p.position };
      p.update(dt);
      const end = p.position;
      const segment = {
        x: end.x - start.x,
        y: end.y - start.y,
        z: end.z - start.z,
      };

      let nearestTarget: CombatTarget | null = null;
      let nearestT = Infinity;

      for (const target of targets) {
        if (!target.isActive() || target.teamId === p.ownerId) continue;
        const hitT = segmentSphereHit(start, end, target.position, target.radius);
        if (hitT !== null && hitT < nearestT) {
          nearestT = hitT;
          nearestTarget = target;
        }
      }

      if (nearestTarget) {
        const hitPosition = {
          x: start.x + segment.x * nearestT,
          y: start.y + segment.y * nearestT,
          z: start.z + segment.z * nearestT,
        };

        nearestTarget.takeDamage(p.damage);
        p.destroy();
        hits.push({
          targetId: nearestTarget.id,
          damage: p.damage,
          destroyed: !nearestTarget.isActive(),
          position: hitPosition,
        });
      }

      if (p.isActive()) {
        remaining.push(p);
      }
    }

    this.projectiles = remaining;
    return hits;
  }

  getActive(): Projectile[] {
    return this.projectiles.filter(p => p.isActive());
  }

  clear(): void {
    for (const p of this.projectiles) {
      p.destroy();
    }
    this.projectiles = [];
  }

  count(): number {
    return this.projectiles.length;
  }
}
