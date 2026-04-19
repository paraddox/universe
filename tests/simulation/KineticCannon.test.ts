import { describe, it, expect } from 'vitest';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';
import type { Vec3 } from '../../src/simulation/WeaponModule.js';

/** Helper: normalise a Vec3 */
function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

describe('KineticCannon', () => {
  // ── 1. Light cannon stats ──────────────────────────────────────────
  it('light variant has correct stats', () => {
    const cannon = new KineticCannon('light', 'player-1');
    expect(cannon.type).toBe('KineticCannon');
    expect(cannon.damage).toBe(5);
    expect(cannon.range).toBe(600);
    expect(cannon.projectileSpeed).toBe(240);
    expect(cannon.cooldown).toBe(0.15);
  });

  // ── 2. Heavy cannon stats ──────────────────────────────────────────
  it('heavy variant has correct stats', () => {
    const cannon = new KineticCannon('heavy', 'player-2');
    expect(cannon.damage).toBe(15);
    expect(cannon.range).toBe(900);
    expect(cannon.projectileSpeed).toBe(180);
    expect(cannon.cooldown).toBe(0.4);
  });

  // ── 3. Can fire initially ──────────────────────────────────────────
  it('can fire initially (cooldownTimer starts at 0)', () => {
    const cannon = new KineticCannon('light', 'player-1');
    expect(cannon.canFire()).toBe(true);
  });

  // ── 4. Fire produces a correct projectile ──────────────────────────
  it('fire() returns a projectile with correct position, velocity direction, and extended lifetime', () => {
    const cannon = new KineticCannon('light', 'player-1');
    const origin: Vec3 = { x: 1, y: 2, z: 3 };
    const direction: Vec3 = { x: 0, y: 0, z: 5 }; // not unit length

    const projectiles = cannon.fire(origin, direction);

    expect(projectiles).toHaveLength(1);

    const p = projectiles[0];
    // ownerId
    expect(p.ownerId).toBe('player-1');
    // damage
    expect(p.damage).toBe(5);
    // position is a copy of origin
    expect(p.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(p.position).not.toBe(origin); // must be a copy
    // kinetic slugs travel far, but still use a finite simulation lifetime
    expect(p.maxAge).toBeCloseTo(600 / 240, 10);
    // velocity = normalize(direction) * projectileSpeed
    const n = normalize(direction);
    expect(p.velocity.x).toBeCloseTo(n.x * 240, 10);
    expect(p.velocity.y).toBeCloseTo(n.y * 240, 10);
    expect(p.velocity.z).toBeCloseTo(n.z * 240, 10);
  });

  // ── 5. After firing, canFire() returns false until cooldown expires ─
  it('after firing, canFire() returns false', () => {
    const cannon = new KineticCannon('light', 'player-1');
    cannon.fire({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    expect(cannon.canFire()).toBe(false);
  });

  // ── 6. update(dt) reduces cooldown timer ───────────────────────────
  it('update(dt) reduces cooldown timer', () => {
    const cannon = new KineticCannon('light', 'player-1');
    cannon.fire({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    // cooldown is 0.15; advance 0.1
    cannon.update(0.1);
    expect(cannon.canFire()).toBe(false);
  });

  // ── 7. After enough update time, canFire() returns true ───────────
  it('after enough update time passes, canFire() returns true again', () => {
    const cannon = new KineticCannon('light', 'player-1');
    cannon.fire({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    // cooldown is 0.15
    cannon.update(0.1);
    expect(cannon.canFire()).toBe(false);
    cannon.update(0.06); // total 0.16 > 0.15
    expect(cannon.canFire()).toBe(true);
  });

  // ── 8. Fire while on cooldown returns empty array ──────────────────
  it('fire() while on cooldown returns empty array', () => {
    const cannon = new KineticCannon('light', 'player-1');
    cannon.fire({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    // now on cooldown
    const result = cannon.fire({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 });
    expect(result).toHaveLength(0);
  });
});
