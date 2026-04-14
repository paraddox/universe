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

describe('getForward with roll (Three.js Euler XYZ: Rx*Ry*Rz)', () => {
  it('at roll=π/2 (no yaw/pitch), forward should still be +Z', () => {
    const hull = makeHull();
    hull.rotation.z = Math.PI / 2;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();
    // Forward is roll-independent in correct Euler XYZ
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
    // Forward is roll-independent
    expect(fwd.x).toBeCloseTo(1, 5);
    expect(fwd.y).toBeCloseTo(0, 5);
    expect(fwd.z).toBeCloseTo(0, 5);
  });

  it('at pitch=π/4 with roll=π, forward should be same as pitch=π/4 with roll=0', () => {
    const hull = makeHull();
    hull.rotation.x = Math.PI / 4;
    hull.rotation.z = Math.PI;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();
    // Forward is roll-independent
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(-Math.sin(Math.PI / 4), 5);
    expect(fwd.z).toBeCloseTo(Math.cos(Math.PI / 4), 5);
  });

  it('getForward matches Three.js Euler XYZ for arbitrary rotation', () => {
    const hull = makeHull();
    hull.rotation.x = 0.3;
    hull.rotation.y = 0.7;
    hull.rotation.z = 1.2;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();
    // Three.js Euler XYZ forward: (sin(yaw), -sin(pitch)*cos(yaw), cos(pitch)*cos(yaw))
    const expected = {
      x: Math.sin(0.7),
      y: -Math.sin(0.3) * Math.cos(0.7),
      z: Math.cos(0.3) * Math.cos(0.7),
    };
    expect(fwd.x).toBeCloseTo(expected.x, 5);
    expect(fwd.y).toBeCloseTo(expected.y, 5);
    expect(fwd.z).toBeCloseTo(expected.z, 5);
  });
});
