import { describe, it, expect } from 'vitest';
import { ShipController } from '../../src/simulation/ShipController.js';
import { ShipHull } from '../../src/simulation/ShipHull.js';
import { Hardpoint } from '../../src/simulation/Hardpoint.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';

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
  // Hardpoint at (1, 0, 4) — right wing tip
  hull.addHardpoint(new Hardpoint('wp-right', { x: 1, y: 0, z: 4 }, { x: 0, y: 0, z: 0 }, 'weapon'));
  hull.mountWeapon('wp-right', new KineticCannon('light', 'player'));
  return hull;
}

describe('Hardpoint spawn position with roll', () => {
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

  it('roll π/2: hardpoint at (1,0,4) should move to (0,1,4)', () => {
    const hull = makeArmedHull();
    hull.rotation.z = Math.PI / 2;
    hull.position = { x: 10, y: 0, z: 0 };
    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);
    expect(result.projectiles.length).toBe(1);
    // Rz(π/2) * (1,0,4) = (0, 1, 4)
    expect(result.projectiles[0].position.x).toBeCloseTo(10, 2); // ship.x + 0
    expect(result.projectiles[0].position.y).toBeCloseTo(1, 2);  // ship.y + 1
    expect(result.projectiles[0].position.z).toBeCloseTo(4, 2);  // ship.z + 4
  });

  it('roll π: hardpoint at (1,0,4) should move to (-1,0,4)', () => {
    const hull = makeArmedHull();
    hull.rotation.z = Math.PI;
    hull.position = { x: 0, y: 0, z: 0 };
    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);
    expect(result.projectiles.length).toBe(1);
    // Rz(π) * (1,0,4) = (-1, 0, 4)
    expect(result.projectiles[0].position.x).toBeCloseTo(-1, 2);
    expect(result.projectiles[0].position.y).toBeCloseTo(0, 2);
    expect(result.projectiles[0].position.z).toBeCloseTo(4, 2);
  });

  it('arbitrary rotation matches full Rz*Ry*Rx matrix', () => {
    const hull = makeArmedHull();
    hull.rotation.x = 0.3;
    hull.rotation.y = 0.7;
    hull.rotation.z = 1.2;
    hull.position = { x: 5, y: -2, z: 3 };
    const ctrl = new ShipController(hull);
    ctrl.setFiring(true);
    const result = ctrl.update(0.01);
    expect(result.projectiles.length).toBe(1);

    // Compute expected: Rz(1.2) * Ry(0.7) * Rx(0.3) * (1, 0, 4) + (5, -2, 3)
    const cx = Math.cos(0.3), sx = Math.sin(0.3);
    const cy = Math.cos(0.7), sy = Math.sin(0.7);
    const cz = Math.cos(1.2), sz = Math.sin(1.2);

    // Rx * (1, 0, 4)
    const rx_x = 1, rx_y = -4 * sx, rx_z = 4 * cx;
    // Ry * (rx)
    const ry_x = sy * rx_z + cy * rx_x;
    const ry_y = rx_y;
    const ry_z = cy * rx_z - sy * rx_x;
    // Rz * (ry)
    const ex = cz * ry_x - sz * ry_y + 5;
    const ey = sz * ry_x + cz * ry_y - 2;
    const ez = ry_z + 3;

    expect(result.projectiles[0].position.x).toBeCloseTo(ex, 2);
    expect(result.projectiles[0].position.y).toBeCloseTo(ey, 2);
    expect(result.projectiles[0].position.z).toBeCloseTo(ez, 2);
  });
});
