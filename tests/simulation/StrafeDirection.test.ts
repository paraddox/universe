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

describe('Strafe direction', () => {
  it('positive strafe moves ship along ship-local right (+X at identity)', () => {
    const hull = makeHull();
    const ctrl = new ShipController(hull);
    ctrl.setStrafe(1);
    ctrl.update(0.1);
    expect(hull.position.x).toBeGreaterThan(0);
  });

  it('negative strafe moves ship along ship-local left (-X at identity)', () => {
    const hull = makeHull();
    const ctrl = new ShipController(hull);
    ctrl.setStrafe(-1);
    ctrl.update(0.1);
    expect(hull.position.x).toBeLessThan(0);
  });
});
