import { describe, it, expect } from 'vitest';
import { ShipController } from '../../src/simulation/ShipController.js';
import { ShipHull } from '../../src/simulation/ShipHull.js';
import { Quat } from '../../src/simulation/Quat.js';

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

describe('getForward via quaternion', () => {
  it('at identity orientation, forward is +Z', () => {
    const ctrl = new ShipController(makeHull());
    const fwd = ctrl.getForward();
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(0, 5);
    expect(fwd.z).toBeCloseTo(1, 5);
  });

  it('at yaw=π/2, forward is +X', () => {
    const hull = makeHull();
    hull.orientation = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
    const ctrl = new ShipController(hull);
    const fwd = ctrl.getForward();
    expect(fwd.x).toBeCloseTo(1, 5);
    expect(fwd.y).toBeCloseTo(0, 5);
    expect(fwd.z).toBeCloseTo(0, 5);
  });

  it('at yaw=-π/2, forward is -X', () => {
    const hull = makeHull();
    hull.orientation = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, -Math.PI / 2);
    const ctrl = new ShipController(hull);
    const fwd = ctrl.getForward();
    expect(fwd.x).toBeCloseTo(-1, 5);
    expect(fwd.z).toBeCloseTo(0, 5);
  });

  it('at pitch=π/4, forward has -Y component', () => {
    const hull = makeHull();
    hull.orientation = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 4);
    const ctrl = new ShipController(hull);
    const fwd = ctrl.getForward();
    expect(fwd.y).toBeCloseTo(-Math.sin(Math.PI / 4), 5);
    expect(fwd.z).toBeCloseTo(Math.cos(Math.PI / 4), 5);
  });

  it('getRight at identity is +X', () => {
    const ctrl = new ShipController(makeHull());
    const right = ctrl.getRight();
    expect(right.x).toBeCloseTo(1, 5);
    expect(right.z).toBeCloseTo(0, 5);
  });

  it('getRight at yaw=π/2 is -Z', () => {
    const hull = makeHull();
    hull.orientation = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
    const ctrl = new ShipController(hull);
    const right = ctrl.getRight();
    expect(right.x).toBeCloseTo(0, 5);
    expect(right.z).toBeCloseTo(-1, 5);
  });
});
