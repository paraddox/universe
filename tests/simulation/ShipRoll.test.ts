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

describe('Ship roll', () => {
  it('positive roll input tilts the ship clockwise', () => {
    const hull = makeHull();
    const ctrl = new ShipController(hull);
    ctrl.setRoll(1);
    ctrl.update(0.1);
    // After roll, the right vector should have a positive Y component
    const right = ctrl.getRight();
    expect(right.y).toBeGreaterThan(0);
  });

  it('negative roll input tilts the ship counter-clockwise', () => {
    const hull = makeHull();
    const ctrl = new ShipController(hull);
    ctrl.setRoll(-1);
    ctrl.update(0.1);
    const right = ctrl.getRight();
    expect(right.y).toBeLessThan(0);
  });

  it('no roll input keeps orientation unchanged', () => {
    const hull = makeHull();
    const ctrl = new ShipController(hull);
    ctrl.update(0.1);
    const fwd = ctrl.getForward();
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(0, 5);
    expect(fwd.z).toBeCloseTo(1, 5);
  });
});
