// Rotation math matching Three.js Euler 'XYZ' order.
// Three.js intrinsic XYZ means: M = Rx(pitch) * Ry(yaw) * Rz(roll)
// Applied right-to-left: first Rz, then Ry, then Rx.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Apply Three.js Euler 'XYZ' rotation to a vector.
 * Matrix: M = Rx(pitch) * Ry(yaw) * Rz(roll)
 *
 * Matches Matrix4.makeRotationFromEuler exactly.
 */
export function applyRotation(v: Vec3, pitch: number, yaw: number, roll: number): Vec3 {
  // Step 1: Rz(roll)
  const cz = Math.cos(roll), sz = Math.sin(roll);
  const rz_x = v.x * cz - v.y * sz;
  const rz_y = v.x * sz + v.y * cz;
  const rz_z = v.z;

  // Step 2: Ry(yaw)
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const ry_x = rz_x * cy + rz_z * sy;
  const ry_y = rz_y;
  const ry_z = -rz_x * sy + rz_z * cy;

  // Step 3: Rx(pitch)
  const cx = Math.cos(pitch), sx = Math.sin(pitch);
  return {
    x: ry_x,
    y: ry_y * cx - ry_z * sx,
    z: ry_y * sx + ry_z * cx,
  };
}
