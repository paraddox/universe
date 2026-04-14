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
  it('positive roll input rotates ship around Z axis', () => {
    const hull = makeHull();
    const ctrl = new ShipController(hull);
    ctrl.setRoll(1);
    ctrl.update(0.1);
    expect(hull.rotation.z).toBeGreaterThan(0);
  });

  it('negative roll input rotates ship around Z axis in opposite direction', () => {
    const hull = makeHull();
    const ctrl = new ShipController(hull);
    ctrl.setRoll(-1);
    ctrl.update(0.1);
    expect(hull.rotation.z).toBeLessThan(0);
  });

  it('no roll input keeps rotation.z at zero', () => {
    const hull = makeHull();
    const ctrl = new ShipController(hull);
    ctrl.update(0.1);
    expect(hull.rotation.z).toBeCloseTo(0, 5);
  });
});
