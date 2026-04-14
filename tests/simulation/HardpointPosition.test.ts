import { describe, it, expect } from 'vitest';
import { ShipController } from '../../src/simulation/ShipController.js';
import { ShipHull } from '../../src/simulation/ShipHull.js';
import { Hardpoint } from '../../src/simulation/Hardpoint.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';
import { Quat } from '../../src/simulation/Quat.js';

function makeArmedHull(): ShipHull {
  const hull = new ShipHull({
    id: 'test',
    hullClass: 'fighter',
    name: 'Test',
    dimensions: { length: 8, width: 6, height: 2 },
    mass: 3,
    maxSpeed: 50,
    turnRate: 3.0,
  });
  hull.addHardpoint(new Hardpoint('wp-right', { x: 1, y: 0, z: 4 }, { x: 0, y: 0, z: 0 }, 'weapon'));
  hull.mountWeapon('wp-right', new KineticCannon('light', 'player'));
  return hull;
}

describe('Hardpoint spawn position with rotation', () => {
  it('no rotation: hardpoint at (1,0,4) spawns at ship pos + (1,0,4)', () => {
    const hull = makeArmedHull();
    hull.position = { x: 10, y: 0, z: 0 };
    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);
    expect(result.projectiles.length).toBe(1);
    expect(result.projectiles[0].position.x).toBeCloseTo(11, 2);
    expect(result.projectiles[0].position.y).toBeCloseTo(0, 2);
    expect(result.projectiles[0].position.z).toBeCloseTo(4, 2);
  });

  it('roll π/2: uses quaternion rotation', () => {
    const hull = makeArmedHull();
    hull.orientation = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
    hull.position = { x: 10, y: 0, z: 0 };
    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);
    expect(result.projectiles.length).toBe(1);
    const expected = hull.orientation.rotateVector({ x: 1, y: 0, z: 4 });
    expect(result.projectiles[0].position.x).toBeCloseTo(10 + expected.x, 2);
    expect(result.projectiles[0].position.y).toBeCloseTo(expected.y, 2);
    expect(result.projectiles[0].position.z).toBeCloseTo(expected.z, 2);
  });

  it('arbitrary rotation matches quaternion rotateVector', () => {
    const hull = makeArmedHull();
    const yaw = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, 0.7);
    const pitch = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, 0.3);
    const roll = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, 1.2);
    hull.orientation = yaw.multiply(pitch).multiply(roll);
    hull.position = { x: 5, y: -2, z: 3 };
    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);
    expect(result.projectiles.length).toBe(1);
    const expected = hull.orientation.rotateVector({ x: 1, y: 0, z: 4 });
    expect(result.projectiles[0].position.x).toBeCloseTo(5 + expected.x, 2);
    expect(result.projectiles[0].position.y).toBeCloseTo(-2 + expected.y, 2);
    expect(result.projectiles[0].position.z).toBeCloseTo(3 + expected.z, 2);
  });
});
