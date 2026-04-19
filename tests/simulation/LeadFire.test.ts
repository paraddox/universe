import { describe, it, expect } from 'vitest';
import { createHull } from '../../src/data/hulls.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';
import { ShipCombatant } from '../../src/simulation/ShipCombatant.js';
import { Projectile } from '../../src/simulation/Projectile.js';
import { ProjectileSystem } from '../../src/simulation/ProjectileSystem.js';

function makePlayer(): ShipCombatant {
  const hull = createHull('fighter');
  hull.mountWeapon('wp-left-nose', new KineticCannon('light', 'player'));
  hull.mountWeapon('wp-right-nose', new KineticCannon('light', 'player'));

  return new ShipCombatant({
    id: 'player',
    hull,
    radius: 5,
    maxHealth: 100,
    teamId: 'player',
  });
}

function makeMovingEnemy(): ShipCombatant {
  const hull = createHull('fighter');
  hull.position = { x: 0, y: 0, z: 120 };
  hull.velocity = { x: 80, y: 0, z: 0 };

  return new ShipCombatant({
    id: 'enemy',
    hull,
    radius: 5,
    maxHealth: 80,
    teamId: 'enemy',
  });
}

describe('Lead-based firing against moving locked targets', () => {
  it('fires at the lead/intercept solution strongly enough to hit a fast lateral target', () => {
    const player = makePlayer();
    const enemy = makeMovingEnemy();
    const projectileSystem = new ProjectileSystem();

    player.controller.setSelectedTarget(enemy);
    player.controller.setFiring(true);
    const spawned = player.controller.update(0.01).projectiles;

    expect(spawned.length).toBeGreaterThan(0);
    for (const shot of spawned) {
      projectileSystem.add(new Projectile(shot));
    }

    let hitEnemy = false;
    for (let i = 0; i < 80; i++) {
      enemy.hull.update(0.02);
      const hits = projectileSystem.update(0.02, [enemy]);
      if (hits.some((hit) => hit.targetId === enemy.id)) {
        hitEnemy = true;
        break;
      }
    }

    expect(hitEnemy).toBe(true);
  });
});
