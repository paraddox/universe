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

describe('getForward with roll (quaternion)', () => {
  it('pure roll does not change forward direction', () => {
    const hull = makeHull();
    hull.orientation = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
    const ctrl = new ShipController(hull);
    const fwd = ctrl.getForward();
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(0, 5);
    expect(fwd.z).toBeCloseTo(1, 5);
  });

  it('yaw + roll: forward same as yaw alone', () => {
    const hull = makeHull();
    const yaw = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
    const roll = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
    hull.orientation = yaw.multiply(roll);
    const ctrl = new ShipController(hull);
    const fwd = ctrl.getForward();
    expect(fwd.x).toBeCloseTo(1, 5);
    expect(fwd.y).toBeCloseTo(0, 5);
    expect(fwd.z).toBeCloseTo(0, 5);
  });

  it('pitch + roll: forward same as pitch alone', () => {
    const hull = makeHull();
    const pitch = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 4);
    const roll = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI);
    hull.orientation = pitch.multiply(roll);
    const ctrl = new ShipController(hull);
    const fwd = ctrl.getForward();
    expect(fwd.x).toBeCloseTo(0, 5);
    expect(fwd.y).toBeCloseTo(-Math.sin(Math.PI / 4), 5);
    expect(fwd.z).toBeCloseTo(Math.cos(Math.PI / 4), 5);
  });

  it('combined yaw+pitch+roll via local rotation composition', () => {
    const hull = makeHull();
    // Yaw 0.7 rad, then local pitch 0.3 rad, then local roll 1.2 rad
    const yaw = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, 0.7);
    const pitch = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, 0.3);
    const roll = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, 1.2);
    hull.orientation = yaw.multiply(pitch).multiply(roll);
    const ctrl = new ShipController(hull);
    const fwd = ctrl.getForward();
    // Forward should have x>0 (yawed right), y<0 (pitched down), z>0
    expect(fwd.x).toBeGreaterThan(0);
    expect(fwd.y).toBeLessThan(0);
    expect(fwd.z).toBeGreaterThan(0);
  });
});
