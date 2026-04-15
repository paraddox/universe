import { describe, it, expect } from 'vitest';
import { Target } from '../../src/simulation/Target.js';
import { Projectile } from '../../src/simulation/Projectile.js';
import { ProjectileSystem } from '../../src/simulation/ProjectileSystem.js';
import type { ProjectileData } from '../../src/simulation/WeaponModule.js';

function makeProjectileData(overrides: Partial<ProjectileData> = {}): ProjectileData {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 10 },
    damage: 5,
    ownerId: 'player1',
    maxAge: 10,
    ...overrides,
  };
}

describe('Target', () => {
  it('creates with full health and active state', () => {
    const target = new Target({
      id: 'dummy',
      position: { x: 0, y: 0, z: 50 },
      radius: 3,
      maxHealth: 100,
    });

    expect(target.id).toBe('dummy');
    expect(target.position).toEqual({ x: 0, y: 0, z: 50 });
    expect(target.radius).toBe(3);
    expect(target.maxHealth).toBe(100);
    expect(target.health).toBe(100);
    expect(target.isActive()).toBe(true);
  });

  it('takes damage and deactivates at zero health', () => {
    const target = new Target({
      id: 'dummy',
      position: { x: 0, y: 0, z: 50 },
      radius: 3,
      maxHealth: 10,
    });

    target.takeDamage(4);
    expect(target.health).toBe(6);
    expect(target.isActive()).toBe(true);

    target.takeDamage(10);
    expect(target.health).toBe(0);
    expect(target.isActive()).toBe(false);
  });
});

describe('ProjectileSystem target collisions', () => {
  it('damages a target and removes the projectile on direct hit', () => {
    const target = new Target({
      id: 'dummy',
      position: { x: 0, y: 0, z: 10 },
      radius: 2,
      maxHealth: 20,
    });

    const system = new ProjectileSystem();
    system.add(new Projectile(makeProjectileData()));

    system.update(1, [target]);

    expect(target.health).toBe(15);
    expect(system.count()).toBe(0);
  });

  it('detects a hit even when the projectile crosses the target between frames', () => {
    const target = new Target({
      id: 'dummy',
      position: { x: 0, y: 0, z: 5 },
      radius: 1,
      maxHealth: 20,
    });

    const system = new ProjectileSystem();
    system.add(new Projectile(makeProjectileData({
      velocity: { x: 0, y: 0, z: 20 },
    })));

    system.update(1, [target]);

    expect(target.health).toBe(15);
    expect(system.count()).toBe(0);
  });

  it('damages the nearest target along the projectile path', () => {
    const nearTarget = new Target({
      id: 'near',
      position: { x: 0, y: 0, z: 5 },
      radius: 1,
      maxHealth: 20,
    });
    const farTarget = new Target({
      id: 'far',
      position: { x: 0, y: 0, z: 10 },
      radius: 1,
      maxHealth: 20,
    });

    const system = new ProjectileSystem();
    system.add(new Projectile(makeProjectileData({
      velocity: { x: 0, y: 0, z: 20 },
    })));

    system.update(1, [farTarget, nearTarget]);

    expect(nearTarget.health).toBe(15);
    expect(farTarget.health).toBe(20);
    expect(system.count()).toBe(0);
  });
});
