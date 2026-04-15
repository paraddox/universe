// Rotation math matching the ship runtime convention: local-axis quaternion composition.
// Starting from identity, yaw is applied around local +Y, then pitch around local +X,
// then roll around local +Z — exactly the same order used by ShipController.

import { Quat } from './Quat.js';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Apply the same local-axis quaternion rotation sequence used by ShipController.
 *
 * orientation = I * qYaw(y) * qPitch(x) * qRoll(z)
 */
export function applyRotation(v: Vec3, pitch: number, yaw: number, roll: number): Vec3 {
  const orientation = Quat.identity()
    .multiply(Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, yaw))
    .multiply(Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, pitch))
    .multiply(Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, roll));

  return orientation.rotateVector(v);
}
