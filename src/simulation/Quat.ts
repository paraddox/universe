// Minimal quaternion matching Three.js Quaternion behavior.
// Used for ship orientation — avoids Euler angle gimbal/axis problems.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export class Quat {
  x: number;
  y: number;
  z: number;
  w: number;

  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  static identity(): Quat {
    return new Quat(0, 0, 0, 1);
  }

  static fromAxisAngle(axis: Vec3, angle: number): Quat {
    const half = angle / 2;
    const s = Math.sin(half);
    return new Quat(
      axis.x * s,
      axis.y * s,
      axis.z * s,
      Math.cos(half),
    );
  }

  multiply(q: Quat): Quat {
    // this * q
    return new Quat(
      this.w * q.x + this.x * q.w + this.y * q.z - this.z * q.y,
      this.w * q.y - this.x * q.z + this.y * q.w + this.z * q.x,
      this.w * q.z + this.x * q.y - this.y * q.x + this.z * q.w,
      this.w * q.w - this.x * q.x - this.y * q.y - this.z * q.z,
    );
  }

  normalize(): void {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (len > 0) {
      this.x /= len;
      this.y /= len;
      this.z /= len;
      this.w /= len;
    }
  }

  rotateVector(v: Vec3): Vec3 {
    // q * v * q^-1 optimized
    const qx = this.x, qy = this.y, qz = this.z, qw = this.w;
    // t = 2 * cross(q, v)
    const tx = 2 * (qy * v.z - qz * v.y);
    const ty = 2 * (qz * v.x - qx * v.z);
    const tz = 2 * (qx * v.y - qy * v.x);
    // result = v + qw * t + cross(q, t)
    return {
      x: v.x + qw * tx + qy * tz - qz * ty,
      y: v.y + qw * ty + qz * tx - qx * tz,
      z: v.z + qw * tz + qx * ty - qy * tx,
    };
  }

  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w);
  }

  copy(q: Quat): void {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
  }
}
