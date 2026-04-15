import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { applyRotation } from '../../src/simulation/RotationMath.js';

function localQuaternion(pitch: number, yaw: number, roll: number): THREE.Quaternion {
  const q = new THREE.Quaternion();
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll));
  return q.normalize();
}

function rotateWithThree(v: { x: number; y: number; z: number }, pitch: number, yaw: number, roll: number) {
  const result = new THREE.Vector3(v.x, v.y, v.z).applyQuaternion(localQuaternion(pitch, yaw, roll));
  return { x: result.x, y: result.y, z: result.z };
}

describe('applyRotation matches ship local-axis quaternion composition', () => {
  it('forward (0,0,1) at identity rotation', () => {
    const result = applyRotation({ x: 0, y: 0, z: 1 }, 0, 0, 0);
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(1, 10);
  });

  it('forward at yaw=π/2, no pitch/roll', () => {
    const result = applyRotation({ x: 0, y: 0, z: 1 }, 0, Math.PI / 2, 0);
    const expected = rotateWithThree({ x: 0, y: 0, z: 1 }, 0, Math.PI / 2, 0);
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });

  it('forward is roll-independent under local-axis composition', () => {
    const r1 = applyRotation({ x: 0, y: 0, z: 1 }, 0.5, 0.7, 0);
    const r2 = applyRotation({ x: 0, y: 0, z: 1 }, 0.5, 0.7, 1.5);
    expect(r1.x).toBeCloseTo(r2.x, 10);
    expect(r1.y).toBeCloseTo(r2.y, 10);
    expect(r1.z).toBeCloseTo(r2.z, 10);
  });

  it('right (1,0,0) at arbitrary rotation', () => {
    const px = 0.3, py = 0.7, rz = 1.2;
    const result = applyRotation({ x: 1, y: 0, z: 0 }, px, py, rz);
    const expected = rotateWithThree({ x: 1, y: 0, z: 0 }, px, py, rz);
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });

  it('up (0,1,0) at arbitrary rotation', () => {
    const px = 0.3, py = 0.7, rz = 1.2;
    const result = applyRotation({ x: 0, y: 1, z: 0 }, px, py, rz);
    const expected = rotateWithThree({ x: 0, y: 1, z: 0 }, px, py, rz);
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });

  it('arbitrary vector at arbitrary rotation', () => {
    const px = 0.3, py = 0.7, rz = 1.2;
    const v = { x: 2, y: -3, z: 4 };
    const result = applyRotation(v, px, py, rz);
    const expected = rotateWithThree(v, px, py, rz);
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });

  it('hardpoint at (2, 0, 5) with yaw + roll', () => {
    const yaw = Math.PI / 4;
    const roll = Math.PI / 3;
    const result = applyRotation({ x: 2, y: 0, z: 5 }, 0, yaw, roll);
    const expected = rotateWithThree({ x: 2, y: 0, z: 5 }, 0, yaw, roll);
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });
});
