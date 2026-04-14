import { describe, it, expect } from 'vitest';
import { Hardpoint } from '../../src/simulation/Hardpoint.js';
import { ShipHull } from '../../src/simulation/ShipHull.js';
import type { WeaponModule } from '../../src/simulation/WeaponModule.js';

// Helper: create a plain-object mock weapon satisfying WeaponModule
function createMockWeapon(overrides: Partial<WeaponModule> = {}): WeaponModule {
  return {
    type: 'laser',
    damage: 10,
    range: 500,
    projectileSpeed: 1000,
    cooldown: 0.5,
    canFire: () => true,
    update: () => {},
    fire: () => [],
    ...overrides,
  };
}

// ─── Hardpoint tests ────────────────────────────────────────────────
describe('Hardpoint', () => {
  it('is not occupied after creation', () => {
    const hp = new Hardpoint('hp-1', { x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'weapon');
    expect(hp.id).toBe('hp-1');
    expect(hp.position).toEqual({ x: 1, y: 0, z: 0 });
    expect(hp.orientation).toEqual({ x: 0, y: 0, z: 0 });
    expect(hp.slotType).toBe('weapon');
    expect(hp.mountedModule).toBeNull();
    expect(hp.isOccupied()).toBe(false);
  });

  it('mounts a weapon module', () => {
    const hp = new Hardpoint('hp-2', { x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: 0 }, 'weapon');
    const weapon = createMockWeapon();
    hp.mount(weapon);
    expect(hp.isOccupied()).toBe(true);
    expect(hp.mountedModule).toBe(weapon);
  });

  it('throws when mounting to an already-occupied hardpoint', () => {
    const hp = new Hardpoint('hp-3', { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'weapon');
    hp.mount(createMockWeapon());
    expect(() => hp.mount(createMockWeapon())).toThrow();
  });

  it('unmounts and returns the previously mounted weapon', () => {
    const hp = new Hardpoint('hp-4', { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'utility');
    const weapon = createMockWeapon({ type: 'missile' });
    hp.mount(weapon);
    const unmounted = hp.unmount();
    expect(unmounted).toBe(weapon);
    expect(hp.isOccupied()).toBe(false);
    expect(hp.mountedModule).toBeNull();
  });

  it('returns null when unmounting an empty hardpoint', () => {
    const hp = new Hardpoint('hp-5', { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 'engine');
    expect(hp.unmount()).toBeNull();
  });
});

// ─── ShipHull tests ─────────────────────────────────────────────────
describe('ShipHull', () => {
  function createFighterHull(): ShipHull {
    return new ShipHull({
      id: 'hull-1',
      hullClass: 'fighter',
      name: 'Viper',
      dimensions: { length: 12, width: 8, height: 3 },
      mass: 5000,
      maxSpeed: 200,
      turnRate: 2.5,
    });
  }

  it('creates a hull with correct defaults', () => {
    const hull = createFighterHull();
    expect(hull.id).toBe('hull-1');
    expect(hull.hullClass).toBe('fighter');
    expect(hull.name).toBe('Viper');
    expect(hull.dimensions).toEqual({ length: 12, width: 8, height: 3 });
    expect(hull.mass).toBe(5000);
    expect(hull.maxSpeed).toBe(200);
    expect(hull.turnRate).toBe(2.5);
    expect(hull.hardpoints).toEqual([]);
    expect(hull.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(hull.velocity).toEqual({ x: 0, y: 0, z: 0 });
    expect(hull.orientation.x).toBeCloseTo(0, 5);
    expect(hull.orientation.y).toBeCloseTo(0, 5);
    expect(hull.orientation.z).toBeCloseTo(0, 5);
    expect(hull.orientation.w).toBeCloseTo(1, 5);
  });

  it('adds hardpoints and retrieves them by id', () => {
    const hull = createFighterHull();
    const hp1 = new Hardpoint('nose', { x: 0, y: 0, z: 6 }, { x: 0, y: 0, z: 0 }, 'weapon');
    const hp2 = new Hardpoint('wing-l', { x: -4, y: 0, z: 2 }, { x: 0, y: -0.1, z: 0 }, 'weapon');
    hull.addHardpoint(hp1);
    hull.addHardpoint(hp2);
    expect(hull.hardpoints).toHaveLength(2);
    expect(hull.getHardpoint('nose')).toBe(hp1);
    expect(hull.getHardpoint('wing-l')).toBe(hp2);
    expect(hull.getHardpoint('nonexistent')).toBeUndefined();
  });

  it('mounts and unmounts weapons via convenience methods', () => {
    const hull = createFighterHull();
    const hp = new Hardpoint('nose', { x: 0, y: 0, z: 6 }, { x: 0, y: 0, z: 0 }, 'weapon');
    hull.addHardpoint(hp);
    const weapon = createMockWeapon({ damage: 25 });
    hull.mountWeapon('nose', weapon);
    expect(hp.isOccupied()).toBe(true);
    expect(hp.mountedModule!.damage).toBe(25);

    const unmounted = hull.unmountWeapon('nose');
    expect(unmounted).toBe(weapon);
    expect(hp.isOccupied()).toBe(false);
  });

  it('throws when mounting to nonexistent hardpoint', () => {
    const hull = createFighterHull();
    expect(() => hull.mountWeapon('ghost', createMockWeapon())).toThrow();
  });

  it('returns null when unmounting from nonexistent hardpoint', () => {
    const hull = createFighterHull();
    expect(hull.unmountWeapon('ghost')).toBeNull();
  });

  it('updates position based on velocity over dt', () => {
    const hull = createFighterHull();
    hull.velocity = { x: 10, y: 0, z: 20 };
    hull.update(0.5);
    expect(hull.position.x).toBeCloseTo(5);
    expect(hull.position.y).toBeCloseTo(0);
    expect(hull.position.z).toBeCloseTo(10);
  });

  it('accumulates position over multiple updates', () => {
    const hull = createFighterHull();
    hull.velocity = { x: 0, y: 0, z: 100 };
    hull.update(0.1); // z = 10
    hull.update(0.1); // z = 20
    hull.update(0.1); // z = 30
    expect(hull.position.z).toBeCloseTo(30);
    expect(hull.position.x).toBeCloseTo(0);
    expect(hull.position.y).toBeCloseTo(0);
  });
});
