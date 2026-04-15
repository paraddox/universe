import { describe, it, expect } from 'vitest';
import { createHull } from '../../src/data/hulls.js';
import { Quat } from '../../src/simulation/Quat.js';
import { ShipCombatant } from '../../src/simulation/ShipCombatant.js';
import { Projectile } from '../../src/simulation/Projectile.js';
import { ProjectileSystem } from '../../src/simulation/ProjectileSystem.js';
import { Target } from '../../src/simulation/Target.js';

function makeEnemyShip(): ShipCombatant {
  const hull = createHull('fighter');
  hull.id = 'enemy-hull';
  hull.position = { x: 10, y: 5, z: 90 };
  hull.orientation = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, 0.4);

  return new ShipCombatant({
    id: 'enemy-1',
    hull,
    radius: 5,
    maxHealth: 40,
    teamId: 'enemy',
    respawnDelay: 2,
  });
}

describe('ShipCombatant', () => {
  it('tracks health on top of a ship hull and respawns to its original transform', () => {
    const ship = makeEnemyShip();
    const spawnOrientation = ship.orientation.clone();

    ship.hull.position = { x: 40, y: -2, z: 30 };
    ship.hull.velocity = { x: 4, y: 1, z: -3 };
    ship.hull.orientation = Quat.identity();
    ship.takeDamage(999);

    expect(ship.isActive()).toBe(false);
    expect(ship.health).toBe(0);

    ship.update(1.5);
    expect(ship.isActive()).toBe(false);

    ship.update(0.6);
    expect(ship.isActive()).toBe(true);
    expect(ship.health).toBe(40);
    expect(ship.position).toEqual({ x: 10, y: 5, z: 90 });
    expect(ship.hull.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(ship.orientation.x).toBeCloseTo(spawnOrientation.x, 10);
    expect(ship.orientation.y).toBeCloseTo(spawnOrientation.y, 10);
    expect(ship.orientation.z).toBeCloseTo(spawnOrientation.z, 10);
    expect(ship.orientation.w).toBeCloseTo(spawnOrientation.w, 10);
  });

  it('exposes hit feedback ratios like other combat targets', () => {
    const ship = makeEnemyShip();

    ship.takeDamage(5);
    expect(ship.getHealthRatio()).toBeCloseTo(35 / 40, 10);
    expect(ship.getHitFlashRatio()).toBe(1);
    expect(ship.getRecentDamageAmount()).toBe(5);

    ship.update(1);
    expect(ship.getHitFlashRatio()).toBe(0);
    expect(ship.getRecentDamageAmount()).toBe(0);
  });
});

describe('ProjectileSystem ship combatant collisions', () => {
  it('ignores friendly ships that share the projectile owner team and damages hostile ships instead', () => {
    const friendly = makeEnemyShip();
    friendly.hull.position = { x: 0, y: 0, z: 5 };

    const hostileHull = createHull('fighter');
    hostileHull.id = 'player-hull';
    hostileHull.position = { x: 0, y: 0, z: 10 };
    const hostile = new ShipCombatant({
      id: 'player',
      hull: hostileHull,
      radius: 5,
      maxHealth: 50,
      teamId: 'player',
    });

    const dummy = new Target({
      id: 'dummy',
      position: { x: 20, y: 0, z: 20 },
      radius: 3,
      maxHealth: 10,
    });

    const projectile = new Projectile({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 20 },
      damage: 5,
      ownerId: 'enemy',
      maxAge: 10,
    });

    const system = new ProjectileSystem();
    system.add(projectile);
    const hits = system.update(1, [friendly, hostile, dummy]);

    expect(friendly.health).toBe(40);
    expect(hostile.health).toBe(45);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.targetId).toBe('player');
  });
});
