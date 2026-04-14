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
    // Forward is +Z, so velocity.z should be dominant and positive
    expect(vel.z).toBeGreaterThan(70);
    expect(Math.abs(vel.x)).toBeLessThan(1);
  });

  it('fires in rotated direction after yaw rotation', () => {
    const hull = makeFighterHull();
    hull.addHardpoint(new Hardpoint('wp', { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    hull.mountWeapon('wp', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);

    // Rotate the ship 90 degrees right (positive yaw)
    // With turnRate=3.0, we need enough time: yaw=1, dt=1.0 → rotation = 3.0 rad ≈ 172°
    ctrl.setYaw(1);
    ctrl.update(1.0);

    // Now fire (stop rotating first for clean test)
    ctrl.setYaw(0);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);

    expect(result.projectiles.length).toBe(1);
    const vel = result.projectiles[0].velocity;
    // After ~172° yaw, forward should be roughly -Z, not +Z
    expect(vel.z).toBeLessThan(0);
    // And significant X component
    expect(Math.abs(vel.x)).toBeGreaterThan(10);
  });

  it('fires in different direction after incremental rotation', () => {
    const hull = makeFighterHull();
    hull.addHardpoint(new Hardpoint('wp', { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, 'weapon'));
    hull.mountWeapon('wp', new KineticCannon('light', 'player'));

    const ctrl = new ShipController(hull);

    // Fire in default direction
    ctrl.setFiring(true);
    const result1 = ctrl.update(0.01);
    const vel1 = result1.projectiles[0].velocity;

    // Wait for cooldown
    ctrl.setFiring(false);
    ctrl.update(0.2);

    // Rotate
    ctrl.setYaw(1);
    ctrl.update(0.5);
    ctrl.setYaw(0);

    // Fire again
    ctrl.setFiring(true);
    const result2 = ctrl.update(0.01);
    const vel2 = result2.projectiles[0].velocity;

    // Directions should differ
    const dot = vel1.x * vel2.x + vel1.y * vel2.y + vel1.z * vel2.z;
    // If directions are the same, dot product ≈ 80*80 = 6400
    // After rotation, dot should be much less
    expect(dot).toBeLessThan(6000);
  });

  it('getForward returns correct direction at 90 degree yaw', () => {
    const hull = makeFighterHull();
    const ctrl = new ShipController(hull);

    // Manually set rotation to 90 degrees (π/2 radians)
    hull.rotation.y = Math.PI / 2;
    const fwd = (ctrl as any).getForward();

    // At yaw=π/2: forward should be (-1, 0, 0) in XZ plane
    expect(fwd.x).toBeCloseTo(-1, 2);
    expect(fwd.y).toBeCloseTo(0, 2);
    expect(fwd.z).toBeCloseTo(0, 2);
  });
});
