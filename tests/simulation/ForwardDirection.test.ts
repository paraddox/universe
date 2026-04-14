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

describe('getForward matches Three.js Euler XYZ', () => {
  it('at yaw=0, forward is +Z', () => {
    const ctrl = new ShipController(makeHull());
    const fwd = (ctrl as any).getForward();
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(0, 5);
    expect(fwd.z).toBeCloseTo(1, 5);
  });

  it('at yaw=π/2, forward is +X (Three.js Ry convention)', () => {
    const hull = makeHull();
    hull.rotation.y = Math.PI / 2;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();
    expect(fwd.x).toBeCloseTo(1, 5);
    expect(fwd.y).toBeCloseTo(0, 5);
    expect(fwd.z).toBeCloseTo(0, 5);
  });

  it('at yaw=-π/2, forward is -X', () => {
    const hull = makeHull();
    hull.rotation.y = -Math.PI / 2;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();
    expect(fwd.x).toBeCloseTo(-1, 5);
    expect(fwd.z).toBeCloseTo(0, 5);
  });

  it('at pitch=π/4, forward has -Y component (nose pitches down)', () => {
    const hull = makeHull();
    hull.rotation.x = Math.PI / 4;
    const ctrl = new ShipController(hull);
    const fwd = (ctrl as any).getForward();
    expect(fwd.y).toBeCloseTo(-Math.sin(Math.PI / 4), 5);
    expect(fwd.z).toBeCloseTo(Math.cos(Math.PI / 4), 5);
  });

  it('getRight at yaw=0 is +X', () => {
    const ctrl = new ShipController(makeHull());
    const right = (ctrl as any).getRight();
    expect(right.x).toBeCloseTo(1, 5);
    expect(right.z).toBeCloseTo(0, 5);
  });

  it('getRight at yaw=π/2 is -Z', () => {
    const hull = makeHull();
    hull.rotation.y = Math.PI / 2;
    const ctrl = new ShipController(hull);
    const right = (ctrl as any).getRight();
    expect(right.x).toBeCloseTo(0, 5);
    expect(right.z).toBeCloseTo(-1, 5);
  });
});
