import type { ProjectileData, Vec3 } from './WeaponModule.js';
import type { ShipCombatant } from './ShipCombatant.js';

export type EnemyShipAIState = 'patrol' | 'attack-run' | 'breakaway';

export interface EnemyShipAIConfig {
  patrolCenter: Vec3;
  patrolRadius?: number;
  aggroRange?: number;
  preferredRange?: number;
  fireRange?: number;
  breakawayRange?: number;
}

const DEFAULT_PATROL_RADIUS = 24;
const DEFAULT_AGGRO_RANGE = 150;
const DEFAULT_PREFERRED_RANGE = 80;
const DEFAULT_FIRE_RANGE = 120;
const DEFAULT_BREAKAWAY_RANGE = 25;
const BREAKAWAY_DURATION = 1.2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function scale(v: Vec3, amount: number): Vec3 {
  return { x: v.x * amount, y: v.y * amount, z: v.z * amount };
}

function length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len === 0) {
    return { x: 0, y: 0, z: 1 };
  }
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export class EnemyShipAI {
  ship: ShipCombatant;
  state: EnemyShipAIState = 'patrol';

  private patrolCenter: Vec3;
  private patrolRadius: number;
  private aggroRange: number;
  private preferredRange: number;
  private fireRange: number;
  private breakawayRange: number;
  private patrolWaypointIndex = 0;
  private breakawayTimer = 0;

  constructor(ship: ShipCombatant, config: EnemyShipAIConfig) {
    this.ship = ship;
    this.patrolCenter = { ...config.patrolCenter };
    this.patrolRadius = config.patrolRadius ?? DEFAULT_PATROL_RADIUS;
    this.aggroRange = config.aggroRange ?? DEFAULT_AGGRO_RANGE;
    this.preferredRange = config.preferredRange ?? DEFAULT_PREFERRED_RANGE;
    this.fireRange = config.fireRange ?? DEFAULT_FIRE_RANGE;
    this.breakawayRange = config.breakawayRange ?? DEFAULT_BREAKAWAY_RANGE;
  }

  update(dt: number, playerPosition: Vec3): { projectiles: ProjectileData[] } {
    if (!this.ship.isActive()) {
      this.ship.update(dt);
      return { projectiles: [] };
    }

    const toPlayer = subtract(playerPosition, this.ship.position);
    const playerDistance = length(toPlayer);

    if (playerDistance <= this.breakawayRange) {
      this.state = 'breakaway';
      this.breakawayTimer = BREAKAWAY_DURATION;
    } else if (this.breakawayTimer > 0) {
      this.state = 'breakaway';
    } else if (playerDistance <= this.aggroRange) {
      this.state = 'attack-run';
    } else {
      this.state = 'patrol';
    }

    if (this.state === 'patrol') {
      this.applyPatrolBehavior();
    } else if (this.state === 'attack-run') {
      this.applyAttackRunBehavior(playerPosition, playerDistance);
    } else {
      this.applyBreakawayBehavior(playerPosition);
      this.breakawayTimer = Math.max(0, this.breakawayTimer - dt);
      if (this.breakawayTimer === 0 && playerDistance > this.preferredRange) {
        this.state = 'attack-run';
      }
    }

    const result = this.ship.controller.update(dt);
    this.ship.update(dt);
    return result;
  }

  private applyPatrolBehavior(): void {
    const offset = this.patrolWaypointIndex === 0
      ? { x: this.patrolRadius, y: 0, z: 0 }
      : { x: -this.patrolRadius, y: 0, z: 0 };
    const target = add(this.patrolCenter, offset);
    const delta = subtract(target, this.ship.position);
    if (length(delta) < 4) {
      this.patrolWaypointIndex = this.patrolWaypointIndex === 0 ? 1 : 0;
    }

    this.steerToward(target);
    this.ship.controller.setThrust(0.6);
    this.ship.controller.setStrafe(0);
    this.ship.controller.setVerticalStrafe(0);
    this.ship.controller.setRoll(0);
    this.ship.controller.setFiring(false);
  }

  private applyAttackRunBehavior(playerPosition: Vec3, playerDistance: number): void {
    this.steerToward(playerPosition);
    this.ship.controller.setStrafe(0);
    this.ship.controller.setVerticalStrafe(0);
    this.ship.controller.setRoll(0);

    const targetInfo = this.getLocalTargetInfo(playerPosition);
    const aligned = targetInfo.forward > 0.86 && Math.abs(targetInfo.right) < 0.35 && Math.abs(targetInfo.up) < 0.35;
    const thrust = playerDistance > this.preferredRange * 1.15
      ? 1
      : playerDistance > this.preferredRange * 0.85
        ? 0.45
        : 0.12;
    this.ship.controller.setThrust(thrust);
    this.ship.controller.setFiring(aligned && playerDistance <= this.fireRange);
  }

  private applyBreakawayBehavior(playerPosition: Vec3): void {
    const away = normalize(subtract(this.ship.position, playerPosition));
    const target = add(this.ship.position, scale(away, this.preferredRange));
    this.steerToward(target);
    this.ship.controller.setThrust(1);
    this.ship.controller.setStrafe(0);
    this.ship.controller.setVerticalStrafe(0);
    this.ship.controller.setRoll(0);
    this.ship.controller.setFiring(false);
  }

  private steerToward(targetPosition: Vec3): void {
    const info = this.getLocalTargetInfo(targetPosition);
    let yaw = clamp(info.right * 3, -1, 1);
    let pitch = clamp(-info.up * 3, -1, 1);

    if (info.forward < -0.1) {
      yaw = info.right >= 0 ? 1 : -1;
      if (Math.abs(info.right) < 0.15) {
        pitch = info.up >= 0 ? -1 : 1;
      }
    }

    this.ship.controller.setYaw(yaw);
    this.ship.controller.setPitch(pitch);
  }

  private getLocalTargetInfo(targetPosition: Vec3): { right: number; up: number; forward: number } {
    const direction = normalize(subtract(targetPosition, this.ship.position));
    const right = this.ship.controller.getRight();
    const up = this.ship.controller.getUp();
    const forward = this.ship.controller.getForward();

    return {
      right: dot(direction, right),
      up: dot(direction, up),
      forward: dot(direction, forward),
    };
  }
}
