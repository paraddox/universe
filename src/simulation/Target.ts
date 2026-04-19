import type { CombatTarget, CollisionSphere } from './CombatTarget.js';
import type { Vec3 } from './WeaponModule.js';

export interface TargetConfig {
  id: string;
  position: Vec3;
  radius: number;
  maxHealth: number;
  kind?: 'dummy' | 'ship';
  hullClass?: string;
  respawnDelay?: number;
  teamId?: string;
}

const HIT_FLASH_DURATION = 0.2;
const DAMAGE_FEEDBACK_DURATION = 0.75;

export class Target implements CombatTarget {
  id: string;
  position: Vec3;
  spawnPosition: Vec3;
  radius: number;
  maxHealth: number;
  health: number;
  active: boolean;
  kind: 'dummy' | 'ship';
  hullClass?: string;
  teamId: string;
  respawnDelay: number;

  private hitFlashTimer: number;
  private damageFeedbackTimer: number;
  private recentDamageAmount: number;
  private respawnTimer: number;

  constructor(config: TargetConfig) {
    this.id = config.id;
    this.position = { ...config.position };
    this.spawnPosition = { ...config.position };
    this.radius = config.radius;
    this.maxHealth = config.maxHealth;
    this.health = config.maxHealth;
    this.active = true;
    this.kind = config.kind ?? 'dummy';
    this.hullClass = config.hullClass;
    this.teamId = config.teamId ?? 'neutral';
    this.respawnDelay = config.respawnDelay ?? 0;
    this.hitFlashTimer = 0;
    this.damageFeedbackTimer = 0;
    this.recentDamageAmount = 0;
    this.respawnTimer = 0;
  }

  isActive(): boolean {
    return this.active;
  }

  takeDamage(amount: number): void {
    if (!this.active || amount <= 0) return;

    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = HIT_FLASH_DURATION;
    this.damageFeedbackTimer = DAMAGE_FEEDBACK_DURATION;
    this.recentDamageAmount = amount;

    if (this.health === 0) {
      this.active = false;
      this.respawnTimer = this.respawnDelay;
    }
  }

  update(dt: number): void {
    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.damageFeedbackTimer = Math.max(0, this.damageFeedbackTimer - dt);

    if (this.damageFeedbackTimer === 0) {
      this.recentDamageAmount = 0;
    }

    if (!this.active && this.respawnDelay > 0) {
      this.respawnTimer = Math.max(0, this.respawnTimer - dt);
      if (this.respawnTimer === 0) {
        this.respawn();
      }
    }
  }

  respawn(): void {
    this.position = { ...this.spawnPosition };
    this.health = this.maxHealth;
    this.active = true;
    this.hitFlashTimer = 0;
    this.damageFeedbackTimer = 0;
    this.recentDamageAmount = 0;
    this.respawnTimer = 0;
  }

  getHealthRatio(): number {
    if (this.maxHealth <= 0) return 0;
    return this.health / this.maxHealth;
  }

  getHitFlashRatio(): number {
    return this.hitFlashTimer / HIT_FLASH_DURATION;
  }

  getRecentDamageAmount(): number {
    return this.recentDamageAmount;
  }

  getHitSpheres(): CollisionSphere[] {
    return [{
      center: { ...this.position },
      radius: this.radius,
    }];
  }

  getVelocity(): Vec3 {
    return { x: 0, y: 0, z: 0 };
  }
}
