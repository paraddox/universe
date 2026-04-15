import { describe, it, expect } from 'vitest';
import { createHull } from '../../src/data/hulls.js';
import { EnemyShipAI } from '../../src/simulation/EnemyShipAI.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';
import { Projectile } from '../../src/simulation/Projectile.js';
import { ProjectileSystem } from '../../src/simulation/ProjectileSystem.js';
import { ShipCombatant } from '../../src/simulation/ShipCombatant.js';
import type { CombatTarget } from '../../src/simulation/CombatTarget.js';

function makePlayer(): ShipCombatant {
  const hull = createHull('fighter');
  return new ShipCombatant({
    id: 'player',
    hull,
    radius: 5,
    maxHealth: 100,
    teamId: 'player',
    respawnDelay: 3,
    spawnProtectionDuration: 5,
  });
}

function makeEnemy(id: string, hullClass: 'fighter' | 'corvette', position: { x: number; y: number; z: number }) {
  const hull = createHull(hullClass);
  hull.id = id;
  hull.position = { ...position };
  if (hullClass === 'fighter') {
    hull.mountWeapon('wp-left-nose', new KineticCannon('light', 'enemy'));
    hull.mountWeapon('wp-right-nose', new KineticCannon('light', 'enemy'));
  } else {
    hull.mountWeapon('wp-nose-left', new KineticCannon('light', 'enemy'));
    hull.mountWeapon('wp-nose-right', new KineticCannon('light', 'enemy'));
  }
  const ship = new ShipCombatant({
    id,
    hull,
    radius: hullClass === 'fighter' ? 5 : 10,
    maxHealth: hullClass === 'fighter' ? 80 : 160,
    teamId: 'enemy',
  });
  const ai = new EnemyShipAI(ship, {
    patrolCenter: { ...position },
    patrolRadius: hullClass === 'fighter' ? 18 : 28,
    aggroRange: hullClass === 'fighter' ? 170 : 210,
    preferredRange: hullClass === 'fighter' ? 85 : 130,
    fireRange: hullClass === 'fighter' ? 120 : 170,
    breakawayRange: hullClass === 'fighter' ? 22 : 40,
  });
  return { ship, ai };
}

describe('combat startup regression', () => {
  it('keeps the player alive through the opening combat window so thrust remains usable', () => {
    const player = makePlayer();
    const enemy1 = makeEnemy('enemy-fighter-1', 'fighter', { x: 28, y: 4, z: 145 });
    const enemy2 = makeEnemy('enemy-corvette-1', 'corvette', { x: -42, y: -10, z: 190 });
    const projectileSystem = new ProjectileSystem();
    const targets: CombatTarget[] = [player, enemy1.ship, enemy2.ship];

    for (let i = 0; i < 40; i++) {
      const dt = 0.05;
      const spawned = [
        ...enemy1.ai.update(dt, player.position).projectiles,
        ...enemy2.ai.update(dt, player.position).projectiles,
      ];
      for (const p of spawned) {
        projectileSystem.add(new Projectile(p));
      }
      player.update(dt);
      projectileSystem.update(dt, targets);
    }

    expect(player.isActive()).toBe(true);
    expect(player.health).toBe(100);
  });
});
