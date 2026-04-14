import type { ProjectileData } from './WeaponModule.js';

export class Projectile {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  damage: number;
  ownerId: string;
  age: number;
  maxAge: number;
  active: boolean;

  constructor(data: ProjectileData) {
    this.position = { ...data.position };
    this.velocity = { ...data.velocity };
    this.damage = data.damage;
    this.ownerId = data.ownerId;
    this.age = 0;
    this.maxAge = data.maxAge;
    this.active = true;
  }

  update(dt: number): void {
    this.age += dt;
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;
    if (this.age >= this.maxAge) {
      this.active = false;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  destroy(): void {
    this.active = false;
  }
}
