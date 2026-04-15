import { describe, it, expect } from 'vitest';
import { createHull } from '../../src/data/hulls.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';
import { EnemyShipAI } from '../../src/simulation/EnemyShipAI.js';
import { ShipCombatant } from '../../src/simulation/ShipCombatant.js';

function makeEnemyAIShip(): ShipCombatant {
  const hull = createHull('fighter');
  hull.id = 'enemy-hull';
  hull.position = { x: 0, y: 0, z: 0 };
  hull.mountWeapon('wp-left-nose', new KineticCannon('light', 'enemy'));

  return new ShipCombatant({
    id: 'enemy-1',
    hull,
    radius: 5,
    maxHealth: 40,
    teamId: 'enemy',
  });
}

describe('EnemyShipAI', () => {
  it('patrols around its patrol center while the player is outside aggro range', () => {
    const ship = makeEnemyAIShip();
    const ai = new EnemyShipAI(ship, {
      patrolCenter: { x: 0, y: 0, z: 0 },
      patrolRadius: 20,
      aggroRange: 120,
    });

    const start = { ...ship.position };
    const result = ai.update(1, { x: 400, y: 0, z: 400 });

    expect(ai.state).toBe('patrol');
    expect(result.projectiles).toHaveLength(0);
    expect(ship.position.x !== start.x || ship.position.z !== start.z).toBe(true);
  });

  it('switches into an attack run and fires when the player is in front and within range', () => {
    const ship = makeEnemyAIShip();
    const ai = new EnemyShipAI(ship, {
      patrolCenter: { x: 0, y: 0, z: 0 },
      aggroRange: 150,
      fireRange: 120,
      preferredRange: 80,
    });

    const result = ai.update(0.2, { x: 0, y: 0, z: 90 });

    expect(ai.state).toBe('attack-run');
    expect(result.projectiles.length).toBeGreaterThan(0);
    expect(result.projectiles[0]?.ownerId).toBe('enemy');
    expect(ship.controller.firing).toBe(true);
    expect(ship.controller.thrust).toBeGreaterThan(0);
  });

  it('breaks away instead of firing when the player is too close', () => {
    const ship = makeEnemyAIShip();
    const ai = new EnemyShipAI(ship, {
      patrolCenter: { x: 0, y: 0, z: 0 },
      aggroRange: 150,
      breakawayRange: 25,
      fireRange: 120,
      preferredRange: 80,
    });

    ai.update(0.1, { x: 0, y: 0, z: 10 });

    expect(ai.state).toBe('breakaway');
    expect(ship.controller.firing).toBe(false);
    expect(ship.controller.thrust).toBeGreaterThan(0);
  });
});
