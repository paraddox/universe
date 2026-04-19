import type { ShipHull } from './ShipHull.js';
import { ShipController } from './ShipController.js';
import { Quat } from './Quat.js';
import type { CombatTarget, CollisionSphere } from './CombatTarget.js';
import type { Vec3 } from './WeaponModule.js';

export interface ShipCombatantConfig {
  id: string;
  hull: ShipHull;
  radius: number;
  maxHealth: number;
  teamId: string;
  respawnDelay?: number;
  spawnProtectionDuration?: number;
}

const HIT_FLASH_DURATION = 0.2;
const DAMAGE_FEEDBACK_DURATION = 0.75;

export class ShipCombatant implements CombatTarget {
  id: string;
  hull: ShipHull;
  controller: ShipController;
  radius: number;
  maxHealth: number;
  health: number;
  active: boolean;
  kind: 'ship';
  hullClass: string;
  teamId: string;
  respawnDelay: number;
  spawnProtectionDuration: number;

  private spawnPosition: Vec3;
  private spawnOrientation: Quat;
  private hitFlashTimer: number;
  private damageFeedbackTimer: number;
  private recentDamageAmount: number;
  private respawnTimer: number;
  private spawnProtectionTimer: number;

  constructor(config: ShipCombatantConfig) {
    this.id = config.id;
    this.hull = config.hull;
    this.controller = new ShipController(config.hull);
    this.radius = config.radius;
    this.maxHealth = config.maxHealth;
    this.health = config.maxHealth;
    this.active = true;
    this.kind = 'ship';
    this.hullClass = config.hull.hullClass;
    this.teamId = config.teamId;
    this.respawnDelay = config.respawnDelay ?? 0;
    this.spawnProtectionDuration = config.spawnProtectionDuration ?? 0;
    this.spawnPosition = { ...config.hull.position };
    this.spawnOrientation = config.hull.orientation.clone();
    this.hitFlashTimer = 0;
    this.damageFeedbackTimer = 0;
    this.recentDamageAmount = 0;
    this.respawnTimer = 0;
    this.spawnProtectionTimer = this.spawnProtectionDuration;
  }

  get position(): Vec3 {
    return this.hull.position;
  }

  get orientation(): Quat {
    return this.hull.orientation;
  }

  isActive(): boolean {
    return this.active;
  }

  takeDamage(amount: number): void {
    if (!this.active || amount <= 0 || this.spawnProtectionTimer > 0) {
      return;
    }

    this.health = Math.max(0, this.health - amount);
    this.hitFlashTimer = HIT_FLASH_DURATION;
    this.damageFeedbackTimer = DAMAGE_FEEDBACK_DURATION;
    this.recentDamageAmount = amount;

    if (this.health === 0) {
      this.active = false;
      this.respawnTimer = this.respawnDelay;
      this.resetControls();
    }
  }

  update(dt: number): void {
    this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
    this.damageFeedbackTimer = Math.max(0, this.damageFeedbackTimer - dt);

    if (this.active) {
      this.spawnProtectionTimer = Math.max(0, this.spawnProtectionTimer - dt);
    }

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
    this.hull.position = { ...this.spawnPosition };
    this.hull.velocity = { x: 0, y: 0, z: 0 };
    this.hull.orientation = this.spawnOrientation.clone();
    this.health = this.maxHealth;
    this.active = true;
    this.hitFlashTimer = 0;
    this.damageFeedbackTimer = 0;
    this.recentDamageAmount = 0;
    this.respawnTimer = 0;
    this.spawnProtectionTimer = this.spawnProtectionDuration;
    this.resetControls();
  }

  getHealthRatio(): number {
    if (this.maxHealth <= 0) {
      return 0;
    }
    return this.health / this.maxHealth;
  }

  getHitFlashRatio(): number {
    return this.hitFlashTimer / HIT_FLASH_DURATION;
  }

  getRecentDamageAmount(): number {
    return this.recentDamageAmount;
  }

  getHitSpheres(): CollisionSphere[] {
    const { length, width, height } = this.hull.dimensions;
    const fuselageRadius = Math.max(height * 0.55, Math.min(width * 0.2, length * 0.16));
    const noseRadius = Math.max(height * 0.45, width * 0.16);
    const rearRadius = Math.max(height * 0.45, width * 0.14);
    const wingRadius = Math.max(height * 0.45, width * 0.15);

    const localSpheres = [
      { center: { x: 0, y: 0, z: length * 0.32 }, radius: noseRadius },
      { center: { x: 0, y: 0, z: 0 }, radius: fuselageRadius },
      { center: { x: 0, y: 0, z: -length * 0.22 }, radius: rearRadius },
      { center: { x: -width * 0.38, y: 0, z: length * 0.05 }, radius: wingRadius },
      { center: { x: width * 0.38, y: 0, z: length * 0.05 }, radius: wingRadius },
    ];

    return localSpheres.map(({ center, radius }) => {
      const rotatedCenter = this.hull.orientation.rotateVector(center);
      return {
        center: {
          x: this.position.x + rotatedCenter.x,
          y: this.position.y + rotatedCenter.y,
          z: this.position.z + rotatedCenter.z,
        },
        radius,
      };
    });
  }

  private resetControls(): void {
    this.controller.setThrust(0);
    this.controller.setStrafe(0);
    this.controller.setVerticalStrafe(0);
    this.controller.setYaw(0);
    this.controller.setPitch(0);
    this.controller.setRoll(0);
    this.controller.setFiring(false);
  }
}
