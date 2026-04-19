import { describe, it, expect } from 'vitest';
import { ShipController } from '../../src/simulation/ShipController.js';
import { ShipHull } from '../../src/simulation/ShipHull.js';
import { Hardpoint } from '../../src/simulation/Hardpoint.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';

function makeFighterHull(): ShipHull {
  const hull = new ShipHull({
    id: 'test-fighter',
    hullClass: 'fighter',
    name: 'Test Fighter',
    dimensions: { length: 8, width: 6, height: 2 },
    mass: 3,
    maxSpeed: 50,
    turnRate: 3.0,
  });
  return hull;
}

describe('ShipController firing direction', () => {
  it('fires in default forward direction (+Z) with no rotation', () => {
    const hull = makeFighterHull();
    hull.addHardpoint(new Hardpoint('wp', { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    hull.mountWeapon('wp', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);

    expect(result.projectiles.length).toBe(1);
    const vel = result.projectiles[0].velocity;
    expect(vel.z).toBeGreaterThan(70);
    expect(Math.abs(vel.x)).toBeLessThan(1);
  });

  it('fires in rotated direction after yaw rotation', () => {
    const hull = makeFighterHull();
    hull.addHardpoint(new Hardpoint('wp', { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    hull.mountWeapon('wp', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);
    // Rotate ~172° right
    ctrl.setYaw(1);
    ctrl.update(1.0);

    ctrl.setYaw(0);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);

    expect(result.projectiles.length).toBe(1);
    const vel = result.projectiles[0].velocity;
    expect(vel.z).toBeLessThan(0);
    expect(Math.abs(vel.x)).toBeGreaterThan(10);
  });

  it('fires in different direction after incremental rotation', () => {
    const hull = makeFighterHull();
    hull.addHardpoint(new Hardpoint('wp', { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    hull.mountWeapon('wp', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result1 = ctrl.update(0.01);
    const vel1 = result1.projectiles[0].velocity;

    ctrl.setFiring(false);
    ctrl.update(0.2);

    ctrl.setYaw(1);
    ctrl.update(0.5);
    ctrl.setYaw(0);

    ctrl.setFiring(true);
    const result2 = ctrl.update(0.01);
    const vel2 = result2.projectiles[0].velocity;

    const dot = vel1.x * vel2.x + vel1.y * vel2.y + vel1.z * vel2.z;
    expect(dot).toBeLessThan(6000);
  });

  it('getForward at 90 degree yaw matches quaternion', () => {
    const hull = makeFighterHull();
    // Rotate 90° right via controller
    const ctrl = new ShipController(hull);
    ctrl.setYaw(1);
    // turnRate=3.0, need ~0.5236s for π/2
    ctrl.update(Math.PI / 2 / 3.0);

    const fwd = ctrl.getForward();
    expect(fwd.x).toBeCloseTo(1, 2);
    expect(fwd.y).toBeCloseTo(0, 2);
    expect(fwd.z).toBeCloseTo(0, 2);
  });

  it('applies hardpoint local orientation to projectile direction', () => {
    const hull = makeFighterHull();
    hull.addHardpoint(new Hardpoint(
      'wp',
      { x: 0, y: 0, z: 1 },
      { x: 0, y: Math.PI / 2, z: 0 },
      'weapon',
    ));
    hull.mountWeapon('wp', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);

    expect(result.projectiles.length).toBe(1);
    const vel = result.projectiles[0].velocity;
    expect(vel.x).toBeGreaterThan(70);
    expect(Math.abs(vel.y)).toBeLessThan(1);
    expect(Math.abs(vel.z)).toBeLessThan(1);
  });

  it('inherits ship lateral velocity when firing forward', () => {
    const hull = makeFighterHull();
    hull.velocity = { x: 15, y: 0, z: 0 };
    hull.addHardpoint(new Hardpoint('wp', { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    hull.mountWeapon('wp', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);

    expect(result.projectiles.length).toBe(1);
    const vel = result.projectiles[0].velocity;
    expect(vel.x).toBeCloseTo(15, 10);
    expect(vel.z).toBeGreaterThan(70);
  });

  it('inherits ship forward velocity when firing sideways from an angled hardpoint', () => {
    const hull = makeFighterHull();
    hull.velocity = { x: 0, y: 0, z: 20 };
    hull.addHardpoint(new Hardpoint(
      'wp',
      { x: 0, y: 0, z: 1 },
      { x: 0, y: Math.PI / 2, z: 0 },
      'weapon',
    ));
    hull.mountWeapon('wp', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);

    expect(result.projectiles.length).toBe(1);
    const vel = result.projectiles[0].velocity;
    expect(vel.x).toBeGreaterThan(70);
    expect(vel.z).toBeCloseTo(20, 10);
  });
});
