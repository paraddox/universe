import { describe, it, expect } from 'vitest';
import { ShipController } from '../../src/simulation/ShipController.js';
import { ShipHull } from '../../src/simulation/ShipHull.js';

function makeHull(): ShipHull {
  return new ShipHull({
    id: 'test',
    hullClass: 'fighter',
    name: 'Test',
    dimensions: { length: 8, width: 6, height: 2 },
    mass: 3,
    maxSpeed: 50,
    turnRate: 3.0,
  });
}

describe('getForward with roll', () => {
  it('at roll=π/2 (no yaw/pitch), forward should be +Y', () => {
    const hull = makeHull();
    hull.rotation.z = Math.PI / 2;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();
    // 90° roll around Z: +Z stays +Z, but actually...
    // Three.js Euler XYZ: Rx(pitch) then Ry(yaw) then Rz(roll)
    // Rz(π/2) applied to (0,0,1) = (0,0,1) — Z is rotation axis, unchanged
    // So forward should still be (0,0,1) for pure roll
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(0, 5);
    expect(fwd.z).toBeCloseTo(1, 5);
  });

  it('at yaw=π/2 with roll=π/2, forward should still be +X', () => {
    const hull = makeHull();
    hull.rotation.y = Math.PI / 2;
    hull.rotation.z = Math.PI / 2;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();
    // Ry(π/2) takes (0,0,1)→(1,0,0). Rz(π/2) doesn't change Z component.
    // With Euler XYZ order: R = Rz * Ry * Rx
    // Rz(π/2) * Ry(π/2) * (0,0,1) = Rz(π/2) * (1,0,0) = (0,1,0)
    // Wait — Euler XYZ means Rx first, then Ry, then Rz
    // Full: v' = Rz(roll) * Ry(yaw) * Rx(pitch) * v
    // Rz(π/2) * Ry(π/2) * (0,0,1)
    // First: Ry(π/2)*(0,0,1) = (sin(π/2), 0, cos(π/2)) = (1, 0, 0)
    // Then: Rz(π/2)*(1,0,0) = (cos(π/2), sin(π/2), 0) = (0, 1, 0)
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(1, 5);
    expect(fwd.z).toBeCloseTo(0, 5);
  });

  it('at pitch=π/4 with roll=π, forward should be -Y component inverted', () => {
    const hull = makeHull();
    hull.rotation.x = Math.PI / 4;
    hull.rotation.z = Math.PI;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();
    // Rx(π/4)*(0,0,1) = (0, -sin(π/4), cos(π/4))
    // Rz(π) * (0, -sin(π/4), cos(π/4)) = (0, sin(π/4), cos(π/4))
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(Math.sin(Math.PI / 4), 5);
    expect(fwd.z).toBeCloseTo(Math.cos(Math.PI / 4), 5);
  });

  it('getForward matches Three.js Euler XYZ for arbitrary rotation', () => {
    const hull = makeHull();
    hull.rotation.x = 0.3;
    hull.rotation.y = 0.7;
    hull.rotation.z = 1.2;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();

    // Compute expected with full rotation matrix: Rz * Ry * Rx * (0,0,1)
    const cx = Math.cos(0.3), sx = Math.sin(0.3);
    const cy = Math.cos(0.7), sy = Math.sin(0.7);
    const cz = Math.cos(1.2), sz = Math.sin(1.2);

    // Rx * (0,0,1) = (0, -sx, cx)
    const rx_x = 0, rx_y = -sx, rx_z = cx;
    // Ry * (rx)
    const ry_x = sy * rx_z, ry_y = rx_y, ry_z = cy * rx_z;
    // Rz * (ry)
    const ex = cz * ry_x - sz * ry_y;
    const ey = sz * ry_x + cz * ry_y;
    const ez = ry_z;

    expect(fwd.x).toBeCloseTo(ex, 5);
    expect(fwd.y).toBeCloseTo(ey, 5);
    expect(fwd.z).toBeCloseTo(ez, 5);
  });
});
