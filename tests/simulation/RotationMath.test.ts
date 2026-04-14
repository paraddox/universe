import { describe, it, expect } from 'vitest';
import { applyRotation } from '../../src/simulation/RotationMath.js';

// Verification values from Three.js Matrix4.makeRotationFromEuler 'XYZ' source:
// a=cos(x), b=sin(x), c=cos(y), d=sin(y), e=cos(z), f=sin(z)
// Column 0 (right): (c*e, af+be*d, bf-ae*d)
// Column 1 (up):    (-c*f, ae-bf*d, be+af*d)
// Column 2 (fwd):   (d, -b*c, a*c)
function threeJSMatrix(x: number, y: number, z: number) {
  const a = Math.cos(x), b = Math.sin(x);
  const c = Math.cos(y), d = Math.sin(y);
  const e = Math.cos(z), f = Math.sin(z);
  return {
    right:  { x: c * e,         y: a * f + b * e * d,   z: b * f - a * e * d },
    up:     { x: -c * f,        y: a * e - b * f * d,    z: b * e + a * f * d },
    forward:{ x: d,             y: -b * c,               z: a * c },
  };
}

describe('applyRotation matches Three.js Euler XYZ', () => {
  it('forward (0,0,1) at identity rotation', () => {
    const result = applyRotation({ x: 0, y: 0, z: 1 }, 0, 0, 0);
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(0, 10);
    expect(result.z).toBeCloseTo(1, 10);
  });

  it('forward at yaw=π/2, no pitch/roll', () => {
    const result = applyRotation({ x: 0, y: 0, z: 1 }, 0, Math.PI / 2, 0);
    const expected = threeJSMatrix(0, Math.PI / 2, 0).forward;
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });

  it('forward is roll-independent (pure yaw+pitch)', () => {
    const r1 = applyRotation({ x: 0, y: 0, z: 1 }, 0.5, 0.7, 0);
    const r2 = applyRotation({ x: 0, y: 0, z: 1 }, 0.5, 0.7, 1.5);
    expect(r1.x).toBeCloseTo(r2.x, 10);
    expect(r1.y).toBeCloseTo(r2.y, 10);
    expect(r1.z).toBeCloseTo(r2.z, 10);
  });

  it('right (1,0,0) at arbitrary rotation', () => {
    const px = 0.3, py = 0.7, rz = 1.2;
    const result = applyRotation({ x: 1, y: 0, z: 0 }, px, py, rz);
    const expected = threeJSMatrix(px, py, rz).right;
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });

  it('up (0,1,0) at arbitrary rotation', () => {
    const px = 0.3, py = 0.7, rz = 1.2;
    const result = applyRotation({ x: 0, y: 1, z: 0 }, px, py, rz);
    const expected = threeJSMatrix(px, py, rz).up;
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });

  it('arbitrary vector at arbitrary rotation', () => {
    const px = 0.3, py = 0.7, rz = 1.2;
    const v = { x: 2, y: -3, z: 4 };
    const result = applyRotation(v, px, py, rz);
    // Manually compute: M * v using Three.js matrix columns
    const basis = threeJSMatrix(px, py, rz);
    const expected = {
      x: basis.right.x * v.x + basis.up.x * v.y + basis.forward.x * v.z,
      y: basis.right.y * v.x + basis.up.y * v.y + basis.forward.y * v.z,
      z: basis.right.z * v.x + basis.up.z * v.y + basis.forward.z * v.z,
    };
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });

  // The critical combined case: yaw + roll simultaneously
  it('hardpoint at (2, 0, 5) with yaw + roll', () => {
    const yaw = Math.PI / 4;
    const roll = Math.PI / 3;
    const result = applyRotation({ x: 2, y: 0, z: 5 }, 0, yaw, roll);
    const basis = threeJSMatrix(0, yaw, roll);
    const expected = {
      x: basis.right.x * 2 + basis.forward.x * 5,
      y: basis.right.y * 2 + basis.forward.y * 5,
      z: basis.right.z * 2 + basis.forward.z * 5,
    };
    expect(result.x).toBeCloseTo(expected.x, 10);
    expect(result.y).toBeCloseTo(expected.y, 10);
    expect(result.z).toBeCloseTo(expected.z, 10);
  });
});
