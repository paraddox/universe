import { describe, it, expect } from 'vitest';
import { ShipController } from '../../src/simulation/ShipController.js';
import { ShipHull } from '../../src/simulation/ShipHull.js';
import { Hardpoint } from '../../src/simulation/Hardpoint.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';
import { Target } from '../../src/simulation/Target.js';

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

  it('converges fixed wing guns more strongly when a closer target is selected', () => {
    const untargetedHull = makeFighterHull();
    untargetedHull.addHardpoint(new Hardpoint('left', { x: -3, y: 0, z: 2 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    untargetedHull.addHardpoint(new Hardpoint('right', { x: 3, y: 0, z: 2 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    untargetedHull.mountWeapon('left', new KineticCannon('light', 'player'));
    untargetedHull.mountWeapon('right', new KineticCannon('light', 'player'));

    const targetedHull = makeFighterHull();
    targetedHull.addHardpoint(new Hardpoint('left', { x: -3, y: 0, z: 2 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    targetedHull.addHardpoint(new Hardpoint('right', { x: 3, y: 0, z: 2 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    targetedHull.mountWeapon('left', new KineticCannon('light', 'player'));
    targetedHull.mountWeapon('right', new KineticCannon('light', 'player'));

    const untargetedCtrl = new ShipController(untargetedHull);
    untargetedCtrl.setFiring(true);
    const untargetedShots = untargetedCtrl.update(0.01).projectiles;

    const targetedCtrl = new ShipController(targetedHull);
    targetedCtrl.setSelectedTarget(new Target({
      id: 'close-dummy',
      position: { x: 0, y: 0, z: 80 },
      radius: 6,
      maxHealth: 60,
    }));
    targetedCtrl.setFiring(true);
    const targetedShots = targetedCtrl.update(0.01).projectiles;

    const untargetedLeft = untargetedShots.find((shot) => shot.position.x < 0);
    const untargetedRight = untargetedShots.find((shot) => shot.position.x > 0);
    const targetedLeft = targetedShots.find((shot) => shot.position.x < 0);
    const targetedRight = targetedShots.find((shot) => shot.position.x > 0);

    expect(untargetedLeft).toBeDefined();
    expect(untargetedRight).toBeDefined();
    expect(targetedLeft).toBeDefined();
    expect(targetedRight).toBeDefined();

    expect(targetedLeft!.velocity.x).toBeGreaterThan(untargetedLeft!.velocity.x);
    expect(targetedRight!.velocity.x).toBeLessThan(untargetedRight!.velocity.x);
  });

  it('does not let a selected target behind the ship pull fixed guns backward', () => {
    const hull = makeFighterHull();
    hull.addHardpoint(new Hardpoint('wp', { x: -3, y: 0, z: 2 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    hull.mountWeapon('wp', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);
    ctrl.setSelectedTarget(new Target({
      id: 'rear-target',
      position: { x: 0, y: 0, z: -80 },
      radius: 6,
      maxHealth: 60,
    }));
    ctrl.setFiring(true);

    const result = ctrl.update(0.01);

    expect(result.projectiles.length).toBe(1);
    expect(result.projectiles[0].velocity.z).toBeGreaterThan(0);
  });
});
