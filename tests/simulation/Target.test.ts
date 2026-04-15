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
    expect(target.kind).toBe('dummy');
    expect(target.isActive()).toBe(true);
  });

  it('takes damage, records hit feedback, and deactivates at zero health', () => {
    const target = new Target({
      id: 'dummy',
      position: { x: 0, y: 0, z: 50 },
      radius: 3,
      maxHealth: 10,
    });

    target.takeDamage(4);
    expect(target.health).toBe(6);
    expect(target.isActive()).toBe(true);
    expect(target.getHitFlashRatio()).toBe(1);
    expect(target.getRecentDamageAmount()).toBe(4);

    target.takeDamage(10);
    expect(target.health).toBe(0);
    expect(target.isActive()).toBe(false);
  });

  it('decays hit flash and clears recent damage feedback over time', () => {
    const target = new Target({
      id: 'dummy',
      position: { x: 0, y: 0, z: 50 },
      radius: 3,
      maxHealth: 20,
    });

    target.takeDamage(5);
    target.update(0.1);
    expect(target.getHitFlashRatio()).toBeGreaterThan(0);
    expect(target.getHitFlashRatio()).toBeLessThan(1);
    expect(target.getRecentDamageAmount()).toBe(5);

    target.update(1);
    expect(target.getHitFlashRatio()).toBe(0);
    expect(target.getRecentDamageAmount()).toBe(0);
  });

  it('respawns after the configured delay at its spawn position with full health', () => {
    const target = new Target({
      id: 'respawn-dummy',
      position: { x: 10, y: 5, z: 50 },
      radius: 3,
      maxHealth: 12,
      respawnDelay: 2,
    });

    target.position = { x: 40, y: 0, z: 90 };
    target.takeDamage(999);
    expect(target.isActive()).toBe(false);

    target.update(1.5);
    expect(target.isActive()).toBe(false);

    target.update(0.6);
    expect(target.isActive()).toBe(true);
    expect(target.health).toBe(12);
    expect(target.position).toEqual({ x: 10, y: 5, z: 50 });
  });

  it('supports ship targets with hull metadata', () => {
    const target = new Target({
      id: 'enemy-fighter',
      position: { x: 0, y: 0, z: 120 },
      radius: 5,
      maxHealth: 40,
      kind: 'ship',
      hullClass: 'fighter',
    });

    expect(target.kind).toBe('ship');
    expect(target.hullClass).toBe('fighter');
  });
});

describe('ProjectileSystem target collisions', () => {
  it('damages a target, reports a hit event, and removes the projectile on direct hit', () => {
    const target = new Target({
      id: 'dummy',
      position: { x: 0, y: 0, z: 10 },
      radius: 2,
      maxHealth: 20,
    });

    const system = new ProjectileSystem();
    system.add(new Projectile(makeProjectileData()));

    const hits = system.update(1, [target]);

    expect(target.health).toBe(15);
    expect(system.count()).toBe(0);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      targetId: 'dummy',
      damage: 5,
      destroyed: false,
    });
    expect(hits[0]?.position.z).toBeCloseTo(8, 5);
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

    const hits = system.update(1, [target]);

    expect(target.health).toBe(15);
    expect(system.count()).toBe(0);
    expect(hits).toHaveLength(1);
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

    const hits = system.update(1, [farTarget, nearTarget]);

    expect(nearTarget.health).toBe(15);
    expect(farTarget.health).toBe(20);
    expect(system.count()).toBe(0);
    expect(hits[0]?.targetId).toBe('near');
  });

  it('marks hit events as destroyed when the target is killed', () => {
    const target = new Target({
      id: 'fragile',
      position: { x: 0, y: 0, z: 10 },
      radius: 2,
      maxHealth: 5,
    });

    const system = new ProjectileSystem();
    system.add(new Projectile(makeProjectileData({ damage: 5 })));

    const hits = system.update(1, [target]);

    expect(target.isActive()).toBe(false);
    expect(hits[0]?.destroyed).toBe(true);
  });
});
