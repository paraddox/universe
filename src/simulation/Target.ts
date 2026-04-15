import type { Vec3 } from './WeaponModule.js';

export interface TargetConfig {
  id: string;
  position: Vec3;
  radius: number;
  maxHealth: number;
}

export class Target {
  id: string;
  position: Vec3;
  radius: number;
  maxHealth: number;
  health: number;
  active: boolean;

  constructor(config: TargetConfig) {
    this.id = config.id;
    this.position = { ...config.position };
    this.radius = config.radius;
    this.maxHealth = config.maxHealth;
    this.health = config.maxHealth;
    this.active = true;
  }

  isActive(): boolean {
    return this.active;
  }

  takeDamage(amount: number): void {
    if (!this.active) return;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) {
      this.active = false;
    }
  }

  getHealthRatio(): number {
    if (this.maxHealth <= 0) return 0;
    return this.health / this.maxHealth;
  }
}
