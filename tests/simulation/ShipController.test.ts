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

function addWeaponHardpoints(hull: ShipHull): void {
  hull.addHardpoint(new Hardpoint(
    'wp-left', { x: -1, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 'weapon',
  ));
  hull.addHardpoint(new Hardpoint(
    'wp-right', { x: 1, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 'weapon',
  ));
}

describe('ShipController', () => {
  it('creates controller with a hull', () => {
    const hull = makeFighterHull();
    const ctrl = new ShipController(hull);
    expect(ctrl.hull).toBe(hull);
    expect(ctrl.thrust).toBe(0);
  });

  it('thrust applies forward acceleration', () => {
    const hull = makeFighterHull();
    const ctrl = new ShipController(hull);
    ctrl.setThrust(1);
    ctrl.update(0.1);
    // Ship should be moving forward (+z)
    expect(hull.velocity.z).toBeGreaterThan(0);
  });

  it('strafe applies lateral movement', () => {
    const hull = makeFighterHull();
    const ctrl = new ShipController(hull);
    ctrl.setStrafe(1);
    ctrl.update(0.1);
    expect(hull.velocity.x).toBeGreaterThan(0);
  });

  it('no thrust with damping slows ship down', () => {
    const hull = makeFighterHull();
    const ctrl = new ShipController(hull);
    ctrl.setThrust(1);
    ctrl.update(0.1);
    const speedAfterThrust = Math.sqrt(
      hull.velocity.x ** 2 + hull.velocity.y ** 2 + hull.velocity.z ** 2,
    );
    ctrl.setThrust(0);
    ctrl.update(0.1);
    const speedAfterDamping = Math.sqrt(
      hull.velocity.x ** 2 + hull.velocity.y ** 2 + hull.velocity.z ** 2,
    );
    expect(speedAfterDamping).toBeLessThan(speedAfterThrust);
  });

  it('yaw input rotates the ship', () => {
    const hull = makeFighterHull();
    const ctrl = new ShipController(hull);
    ctrl.setYaw(1);
    ctrl.update(0.1);
    // After yaw, forward should have a positive X component
    const fwd = ctrl.getForward();
    expect(fwd.x).toBeGreaterThan(0);
  });

  it('pitch input rotates the ship', () => {
    const hull = makeFighterHull();
    const ctrl = new ShipController(hull);
    ctrl.setPitch(1);
    ctrl.update(0.1);
    // After pitch, forward should have a negative Y component (nose down)
    const fwd = ctrl.getForward();
    expect(fwd.y).toBeLessThan(0);
  });

  it('firing with mounted weapons produces projectiles', () => {
    const hull = makeFighterHull();
    addWeaponHardpoints(hull);
    hull.mountWeapon('wp-left', new KineticCannon('light', 'player'));
    hull.mountWeapon('wp-right', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.1);
    expect(result.projectiles.length).toBe(2);
    expect(result.projectiles[0].damage).toBe(5);
  });

  it('firing with no weapons produces no projectiles', () => {
    const hull = makeFighterHull();
    addWeaponHardpoints(hull);
    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.1);
    expect(result.projectiles.length).toBe(0);
  });

  it('thrust is clamped 0-1', () => {
    const hull = makeFighterHull();
    const ctrl = new ShipController(hull);
    ctrl.setThrust(5);
    expect(ctrl.thrust).toBe(1);
    ctrl.setThrust(-2);
    expect(ctrl.thrust).toBe(0);
  });

  it('strafe is clamped -1 to 1', () => {
    const hull = makeFighterHull();
    const ctrl = new ShipController(hull);
    ctrl.setStrafe(3);
    expect(ctrl.strafe).toBe(1);
    ctrl.setStrafe(-5);
    expect(ctrl.strafe).toBe(-1);
  });

  it('cooldown prevents repeated firing within same frame', () => {
    const hull = makeFighterHull();
    addWeaponHardpoints(hull);
    hull.mountWeapon('wp-left', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result1 = ctrl.update(0.01);
    expect(result1.projectiles.length).toBe(1);

    // Fire again immediately — cooldown not expired
    const result2 = ctrl.update(0.01);
    expect(result2.projectiles.length).toBe(0);

    // Stop firing, let cooldown expire via update
    ctrl.setFiring(false);
    ctrl.update(0.2);

    // Fire again — cooldown should be expired
    ctrl.setFiring(true);
    const result3 = ctrl.update(0.01);
    expect(result3.projectiles.length).toBe(1);
  });
});
