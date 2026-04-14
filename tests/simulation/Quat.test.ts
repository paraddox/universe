import { describe, it, expect } from 'vitest';
import { Quat } from '../../src/simulation/Quat.js';

describe('Quat', () => {
  it('identity rotates (0,0,1) to (0,0,1)', () => {
    const q = Quat.identity();
    const v = q.rotateVector({ x: 0, y: 0, z: 1 });
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(1, 5);
  });

  it('identity rotates (1,0,0) to (1,0,0)', () => {
    const q = Quat.identity();
    const v = q.rotateVector({ x: 1, y: 0, z: 0 });
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it('90° yaw (Y axis) rotates +Z to +X', () => {
    const q = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
    const v = q.rotateVector({ x: 0, y: 0, z: 1 });
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it('90° pitch (X axis) rotates +Z to -Y', () => {
    const q = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 2);
    const v = q.rotateVector({ x: 0, y: 0, z: 1 });
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(-1, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it('90° roll (Z axis) rotates +X to +Y', () => {
    const q = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
    const v = q.rotateVector({ x: 1, y: 0, z: 0 });
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(1, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it('roll does NOT affect forward direction', () => {
    const q = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 3);
    const v = q.rotateVector({ x: 0, y: 0, z: 1 });
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(1, 5);
  });

  it('multiply: yaw then pitch = correct local pitch after yaw', () => {
    // First yaw 90° right, then pitch 90° down in LOCAL space
    const yaw = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
    const pitch = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 2);
    // orientation = yaw * pitch (local pitch after yaw)
    const q = yaw.multiply(pitch);
    // Forward should now point in -Y (nose pointing down after turning right)
    const fwd = q.rotateVector({ x: 0, y: 0, z: 1 });
    expect(fwd.x).toBeCloseTo(0, 4);
    expect(fwd.y).toBeCloseTo(-1, 4);
    expect(fwd.z).toBeCloseTo(0, 4);
  });

  it('multiply order matters: pitch then yaw != yaw then pitch', () => {
    const yaw = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
    const pitch = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 2);
    const qp = pitch.multiply(yaw);
    const qy = yaw.multiply(pitch);
    const fp = qp.rotateVector({ x: 0, y: 0, z: 1 });
    const fy = qy.rotateVector({ x: 0, y: 0, z: 1 });
    // They should differ
    expect(Math.abs(fp.x - fy.x) + Math.abs(fp.y - fy.y) + Math.abs(fp.z - fy.z)).toBeGreaterThan(0.1);
  });

  it('accumulating local rotations works for combined yaw+pitch+roll', () => {
    // Simulate: yaw 45°, then pitch 30° in local space, then roll 20° in local space
    let orientation = Quat.identity();
    orientation = orientation.multiply(Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 4));
    orientation = orientation.multiply(Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 6));
    orientation = orientation.multiply(Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 9));
    orientation.normalize();

    // Forward should have components from yaw and pitch, NOT from roll
    const fwd = orientation.rotateVector({ x: 0, y: 0, z: 1 });
    expect(fwd.z).toBeGreaterThan(0); // still somewhat forward
    expect(fwd.x).toBeGreaterThan(0); // yawed right
    expect(fwd.y).toBeLessThan(0);    // pitched down
  });
});
