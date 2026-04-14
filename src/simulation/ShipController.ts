import type { ShipHull } from './ShipHull.js';
import type { ProjectileData, Vec3 } from './WeaponModule.js';
import { Quat } from './Quat.js';

const DAMPING = 0.98;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class ShipController {
  hull: ShipHull;
  thrust: number = 0;
  strafe: number = 0;
  verticalStrafe: number = 0;
  yawInput: number = 0;
  pitchInput: number = 0;
  rollInput: number = 0;
  firing: boolean = false;

  constructor(hull: ShipHull) {
    this.hull = hull;
  }

  setThrust(value: number): void {
    this.thrust = clamp(value, 0, 1);
  }

  setStrafe(value: number): void {
    this.strafe = clamp(value, -1, 1);
  }

  setVerticalStrafe(value: number): void {
    this.verticalStrafe = clamp(value, -1, 1);
  }

  setYaw(value: number): void {
    this.yawInput = clamp(value, -1, 1);
  }

  setPitch(value: number): void {
    this.pitchInput = clamp(value, -1, 1);
  }

  setRoll(value: number): void {
    this.rollInput = clamp(value, -1, 1);
  }

  setFiring(active: boolean): void {
    this.firing = active;
  }

  getForward(): Vec3 {
    return this.hull.orientation.rotateVector({ x: 0, y: 0, z: 1 });
  }

  getRight(): Vec3 {
    return this.hull.orientation.rotateVector({ x: 1, y: 0, z: 0 });
  }

  update(dt: number): { projectiles: ProjectileData[] } {
    // Apply local-axis rotations via quaternion composition
    const turnDelta = this.hull.turnRate * dt;
    if (this.yawInput !== 0) {
      const q = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, this.yawInput * turnDelta);
      this.hull.orientation = this.hull.orientation.multiply(q);
    }
    if (this.pitchInput !== 0) {
      const q = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, this.pitchInput * turnDelta);
      this.hull.orientation = this.hull.orientation.multiply(q);
    }
    if (this.rollInput !== 0) {
      const q = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, this.rollInput * turnDelta);
      this.hull.orientation = this.hull.orientation.multiply(q);
    }
    this.hull.orientation.normalize();

    // Acceleration
    const forward = this.getForward();
    const right = this.getRight();
    const acceleration = this.hull.maxSpeed / this.hull.mass;

    this.hull.velocity.x += (forward.x * this.thrust + right.x * this.strafe) * acceleration * dt;
    this.hull.velocity.y += (forward.y * this.thrust + right.y * this.strafe) * acceleration * dt;
    this.hull.velocity.z += (forward.z * this.thrust + right.z * this.strafe) * acceleration * dt;

    // Damping when no thrust
    if (this.thrust === 0) {
      this.hull.velocity.x *= DAMPING;
      this.hull.velocity.y *= DAMPING;
      this.hull.velocity.z *= DAMPING;
    }

    // Speed cap
    const speed = Math.sqrt(
      this.hull.velocity.x ** 2 +
      this.hull.velocity.y ** 2 +
      this.hull.velocity.z ** 2,
    );
    if (speed > this.hull.maxSpeed) {
      const scale = this.hull.maxSpeed / speed;
      this.hull.velocity.x *= scale;
      this.hull.velocity.y *= scale;
      this.hull.velocity.z *= scale;
    }

    // Move
    this.hull.update(dt);

    // Fire weapons
    const projectiles: ProjectileData[] = [];
    if (this.firing) {
      const fwd = this.getForward();
      for (const hp of this.hull.hardpoints) {
        if (!hp.isOccupied()) continue;
        const weapon = hp.mountedModule!;
        weapon.update(dt);
        if (weapon.canFire()) {
          // Rotate hardpoint local position to world space using quaternion
          const worldOffset = this.hull.orientation.rotateVector(hp.position);
          const origin: Vec3 = {
            x: this.hull.position.x + worldOffset.x,
            y: this.hull.position.y + worldOffset.y,
            z: this.hull.position.z + worldOffset.z,
          };
          const fired = weapon.fire(origin, fwd);
          projectiles.push(...fired);
        }
      }
    } else {
      // Still update weapon cooldowns
      for (const hp of this.hull.hardpoints) {
        if (hp.isOccupied()) {
          hp.mountedModule!.update(dt);
        }
      }
    }

    return { projectiles };
  }
}
