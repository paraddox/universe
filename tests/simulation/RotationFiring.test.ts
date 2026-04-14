import { describe, it, expect } from 'vitest';
import { ShipController } from '../../src/simulation/ShipController.js';
import { ShipHull } from '../../src/simulation/ShipHull.js';
import { Hardpoint } from '../../src/simulation/Hardpoint.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';

function makeArmedFighter(): { hull: ShipHull; ctrl: ShipController } {
  const hull = new ShipHull({
    id: 'test-fighter',
    hullClass: 'fighter',
    name: 'Test Fighter',
    dimensions: { length: 8, width: 6, height: 2 },
    mass: 3,
    maxSpeed: 50,
    turnRate: 3.0,
  });
  hull.addHardpoint(new Hardpoint('wp', { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 'weapon'));
  hull.mountWeapon('wp', new KineticCannon('light', 'player'));
  const ctrl = new ShipController(hull);
  return { hull, ctrl };
}

describe('Simultaneous rotation and firing', () => {
  it('projectiles fired while rotating change direction each frame', () => {
    const { ctrl } = makeArmedFighter();
    const directions: { x: number; y: number; z: number }[] = [];

    // Fire multiple frames while rotating
    ctrl.setFiring(true);
    ctrl.setYaw(1);

    for (let i = 0; i < 5; i++) {
      const result = ctrl.update(0.2);
      if (result.projectiles.length > 0) {
        const v = result.projectiles[0].velocity;
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        directions.push({
          x: v.x / len,
          y: v.y / len,
          z: v.z / len,
        });
      }
    }

    // We should have fired multiple shots in different directions
    expect(directions.length).toBeGreaterThanOrEqual(2);

    // First and last directions should differ significantly
    const first = directions[0];
    const last = directions[directions.length - 1];
    const dot = first.x * last.x + first.y * last.y + first.z * last.z;

    // If directions are the same, dot ≈ 1. After rotation, should be noticeably different.
    expect(dot).toBeLessThan(0.95);
  });

  it('each successive shot rotates further from initial direction', () => {
    const { ctrl } = makeArmedFighter();
    const zComponents: number[] = [];

    ctrl.setFiring(true);
    ctrl.setYaw(1);

    for (let i = 0; i < 10; i++) {
      const result = ctrl.update(0.15);
      if (result.projectiles.length > 0) {
        const v = result.projectiles[0].velocity;
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        zComponents.push(v.z / len);
      }
    }

    // As ship rotates right (positive yaw), forward Z component should decrease
    // First shot should have z close to 1, later shots less
    expect(zComponents.length).toBeGreaterThanOrEqual(3);
    expect(zComponents[0]).toBeGreaterThan(zComponents[zComponents.length - 1]);
  });
});
