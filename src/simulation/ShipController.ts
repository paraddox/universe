import type { ShipHull } from './ShipHull.js';
import type { ProjectileData, Vec3 } from './WeaponModule.js';

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

  private getForward(): Vec3 {
    const yaw = this.hull.rotation.y;
    const pitch = this.hull.rotation.x;
    const roll = this.hull.rotation.z;
    // Full Euler XYZ rotation: Rz(roll) * Ry(yaw) * Rx(pitch) * (0,0,1)
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    // Rx(pitch) * (0,0,1) = (0, -sp, cp)
    const rx_y = -sp, rx_z = cp;
    // Ry(yaw) * (rx)
    const ry_x = sy * rx_z, ry_y = rx_y, ry_z = cy * rx_z;
    // Rz(roll) * (ry)
    return {
      x: cr * ry_x - sr * ry_y,
      y: sr * ry_x + cr * ry_y,
      z: ry_z,
    };
  }

  private getRight(): Vec3 {
    const yaw = this.hull.rotation.y;
    const roll = this.hull.rotation.z;
    // Rz(roll) * Ry(yaw) * (1,0,0)
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cr = Math.cos(roll), sr = Math.sin(roll);
    // Ry(yaw) * (1,0,0) = (cy, 0, -sy)
    const ry_x = cy, ry_y = 0, ry_z = -sy;
    // Rz(roll) * (ry)
    return {
      x: cr * ry_x - sr * ry_y,
      y: sr * ry_x + cr * ry_y,
      z: ry_z,
    };
  }

  update(dt: number): { projectiles: ProjectileData[] } {
    // Rotation
    this.hull.rotation.y += this.yawInput * this.hull.turnRate * dt;
    this.hull.rotation.x += this.pitchInput * this.hull.turnRate * dt;
    this.hull.rotation.z += this.rollInput * this.hull.turnRate * dt;

    // Acceleration
    const forward = this.getForward();
    const right = this.getRight();
    const acceleration = this.hull.maxSpeed / this.hull.mass;

    this.hull.velocity.x += (forward.x * this.thrust + right.x * this.strafe) * acceleration * dt;
    this.hull.velocity.y += (forward.y * this.thrust + this.verticalStrafe) * acceleration * dt;
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
          // Rotate hardpoint position by full Euler XYZ: Rz(roll) * Ry(yaw) * Rx(pitch)
          const cp = Math.cos(this.hull.rotation.x), sp = Math.sin(this.hull.rotation.x);
          const cy = Math.cos(this.hull.rotation.y), sy = Math.sin(this.hull.rotation.y);
          const cr = Math.cos(this.hull.rotation.z), sr = Math.sin(this.hull.rotation.z);
          const lx = hp.position.x;
          const ly = hp.position.y;
          const lz = hp.position.z;
          // Rx * (lx, ly, lz)
          const rx_x = lx;
          const rx_y = ly * cp - lz * sp;
          const rx_z = ly * sp + lz * cp;
          // Ry * (rx)
          const ry_x = sy * rx_z + cy * rx_x;
          const ry_y = rx_y;
          const ry_z = cy * rx_z - sy * rx_x;
          // Rz * (ry)
          const origin: Vec3 = {
            x: this.hull.position.x + cr * ry_x - sr * ry_y,
            y: this.hull.position.y + sr * ry_x + cr * ry_y,
            z: this.hull.position.z + ry_z,
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
