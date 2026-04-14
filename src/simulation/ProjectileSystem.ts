import { Projectile } from './Projectile.js';

export class ProjectileSystem {
  projectiles: Projectile[];

  constructor() {
    this.projectiles = [];
  }

  add(projectile: Projectile): void {
    this.projectiles.push(projectile);
  }

  update(dt: number): void {
    for (const p of this.projectiles) {
      p.update(dt);
    }
    this.projectiles = this.projectiles.filter(p => p.isActive());
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
