import { describe, it, expect } from 'vitest';
import { createHull } from '../../src/data/hulls.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';
import { Target } from '../../src/simulation/Target.js';
import {
  getAimSolution,
  getFixedWeaponFireDirection,
  getForwardWeaponAimDistance,
} from '../../src/simulation/TargetingSystem.js';

describe('TargetingSystem', () => {
  it('uses the shortest range among forward-pointing mounted guns for untargeted convergence', () => {
    const hull = createHull('fighter');
    hull.mountWeapon('wp-left-wing', new KineticCannon('heavy', 'player'));
    hull.mountWeapon('wp-right-wing', new KineticCannon('light', 'player'));

    const leftWing = hull.getHardpoint('wp-left-wing');
    if (!leftWing) {
      throw new Error('Expected wp-left-wing hardpoint');
    }
    leftWing.orientation.y = Math.PI / 2;

    const solution = getAimSolution(hull);

    expect(getForwardWeaponAimDistance(hull)).toBe(600);
    expect(solution.selectedTargetId).toBeNull();
    expect(solution.aimDistance).toBe(600);
    expect(solution.aimPoint).toEqual({ x: 0, y: 0, z: 600 });
  });

  it('uses the selected target position as the aim point when a live target is locked', () => {
    const hull = createHull('fighter');
    hull.mountWeapon('wp-left-wing', new KineticCannon('light', 'player'));
    hull.mountWeapon('wp-right-wing', new KineticCannon('light', 'player'));

    const target = new Target({
      id: 'range-dummy',
      position: { x: 10, y: 4, z: 80 },
      radius: 6,
      maxHealth: 60,
    });

    const solution = getAimSolution(hull, target);

    expect(solution.selectedTargetId).toBe('range-dummy');
    expect(solution.aimPoint).toEqual(target.position);
    expect(solution.aimDistance).toBeCloseTo(Math.sqrt((10 ** 2) + (4 ** 2) + (80 ** 2)), 10);
  });

  it('falls back to untargeted convergence when the selected target is inactive', () => {
    const hull = createHull('fighter');
    hull.mountWeapon('wp-left-wing', new KineticCannon('light', 'player'));
    hull.mountWeapon('wp-right-wing', new KineticCannon('light', 'player'));

    const target = new Target({
      id: 'destroyed-dummy',
      position: { x: 0, y: 0, z: 80 },
      radius: 6,
      maxHealth: 1,
    });
    target.takeDamage(1);

    const solution = getAimSolution(hull, target);

    expect(solution.selectedTargetId).toBeNull();
    expect(solution.aimPoint).toEqual({ x: 0, y: 0, z: 600 });
  });

  it('allows fixed guns to deflect a little toward the current aim point', () => {
    const hull = createHull('fighter');
    hull.mountWeapon('wp-left-wing', new KineticCannon('light', 'player'));

    const hardpoint = hull.getHardpoint('wp-left-wing');
    if (!hardpoint) {
      throw new Error('Expected wp-left-wing hardpoint');
    }

    const direction = getFixedWeaponFireDirection(hull, hardpoint, { x: 0, y: 0, z: 80 });

    expect(direction.x).toBeGreaterThan(0);
    expect(direction.z).toBeGreaterThan(0.9);
  });

  it('does not let fixed guns over-deflect toward targets far off boresight', () => {
    const hull = createHull('fighter');
    hull.mountWeapon('wp-left-wing', new KineticCannon('light', 'player'));

    const hardpoint = hull.getHardpoint('wp-left-wing');
    if (!hardpoint) {
      throw new Error('Expected wp-left-wing hardpoint');
    }

    const direction = getFixedWeaponFireDirection(hull, hardpoint, { x: 200, y: 0, z: 15 });

    expect(direction.x).toBeLessThan(0.3);
    expect(direction.z).toBeGreaterThan(0.9);
  });
});
