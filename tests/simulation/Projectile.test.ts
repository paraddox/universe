import { describe, it, expect } from 'vitest';
import { Projectile } from '../../src/simulation/Projectile.js';
import { ProjectileSystem } from '../../src/simulation/ProjectileSystem.js';
import type { ProjectileData } from '../../src/simulation/WeaponModule.js';

function makeProjectileData(overrides: Partial<ProjectileData> = {}): ProjectileData {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 10, y: 0, z: 0 },
    damage: 25,
    ownerId: 'player1',
    maxAge: 5,
    ...overrides,
  };
}

describe('Projectile', () => {
  it('1. should be created with correct properties', () => {
    const data = makeProjectileData();
    const p = new Projectile(data);

    expect(p.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(p.velocity).toEqual({ x: 10, y: 0, z: 0 });
    expect(p.damage).toBe(25);
    expect(p.ownerId).toBe('player1');
    expect(p.age).toBe(0);
    expect(p.maxAge).toBe(5);
    expect(p.active).toBe(true);
    expect(p.isActive()).toBe(true);
  });

  it('2. update moves position by velocity * dt', () => {
    const p = new Projectile(makeProjectileData({
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 10, y: 5, z: -3 },
    }));

    p.update(2);

    expect(p.position).toEqual({ x: 20, y: 10, z: -6 });
    expect(p.age).toBe(2);
  });

  it('3. becomes inactive after maxAge exceeded', () => {
    const p = new Projectile(makeProjectileData({ maxAge: 3 }));

    p.update(2);
    expect(p.isActive()).toBe(true);

    p.update(1.5); // age = 3.5 > maxAge 3
    expect(p.isActive()).toBe(false);
    expect(p.active).toBe(false);
  });

  it('4. destroy sets active to false', () => {
    const p = new Projectile(makeProjectileData());

    expect(p.isActive()).toBe(true);
    p.destroy();
    expect(p.isActive()).toBe(false);
    expect(p.active).toBe(false);
  });

  it('10. zero velocity stays in place', () => {
    const p = new Projectile(makeProjectileData({
      position: { x: 5, y: 5, z: 5 },
      velocity: { x: 0, y: 0, z: 0 },
      maxAge: 10,
    }));

    p.update(3);

    expect(p.position).toEqual({ x: 5, y: 5, z: 5 });
    expect(p.age).toBe(3);
    expect(p.isActive()).toBe(true);
  });
});

describe('ProjectileSystem', () => {
  it('5. add and count', () => {
    const sys = new ProjectileSystem();
    expect(sys.count()).toBe(0);

    sys.add(new Projectile(makeProjectileData()));
    sys.add(new Projectile(makeProjectileData()));
    expect(sys.count()).toBe(2);
  });

  it('6. update moves all projectiles', () => {
    const sys = new ProjectileSystem();
    const p1 = new Projectile(makeProjectileData({
      velocity: { x: 1, y: 0, z: 0 },
    }));
    const p2 = new Projectile(makeProjectileData({
      velocity: { x: 0, y: 2, z: 0 },
    }));

    sys.add(p1);
    sys.add(p2);
    sys.update(3);

    expect(p1.position).toEqual({ x: 3, y: 0, z: 0 });
    expect(p2.position).toEqual({ x: 0, y: 6, z: 0 });
  });

  it('7. removes expired projectiles after update', () => {
    const sys = new ProjectileSystem();
    const expired = new Projectile(makeProjectileData({ maxAge: 1 }));
    const alive = new Projectile(makeProjectileData({ maxAge: 10 }));

    sys.add(expired);
    sys.add(alive);
    sys.update(2); // expired reaches age 2 > maxAge 1

    expect(sys.count()).toBe(1);
    expect(sys.projectiles).toContain(alive);
  });

  it('8. getActive returns only active projectiles', () => {
    const sys = new ProjectileSystem();
    const p1 = new Projectile(makeProjectileData({ maxAge: 10 }));
    const p2 = new Projectile(makeProjectileData({ maxAge: 10 }));
    const p3 = new Projectile(makeProjectileData({ maxAge: 10 }));

    sys.add(p1);
    sys.add(p2);
    sys.add(p3);

    p2.destroy();

    const active = sys.getActive();
    expect(active).toHaveLength(2);
    expect(active).toContain(p1);
    expect(active).toContain(p3);
    expect(active).not.toContain(p2);
  });

  it('9. clear removes all projectiles', () => {
    const sys = new ProjectileSystem();
    sys.add(new Projectile(makeProjectileData()));
    sys.add(new Projectile(makeProjectileData()));
    sys.add(new Projectile(makeProjectileData()));

    expect(sys.count()).toBe(3);
    sys.clear();
    expect(sys.count()).toBe(0);
  });
});
