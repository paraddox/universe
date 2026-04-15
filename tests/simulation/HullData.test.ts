import { describe, it, expect } from 'vitest';
import { createHull, HULL_CLASSES, HULL_DEFINITIONS } from '../../src/data/hulls.js';

describe('HullData', () => {
  it('HULL_CLASSES contains all 6 classes', () => {
    expect(HULL_CLASSES).toEqual([
      'shuttle',
      'fighter',
      'corvette',
      'destroyer',
      'cruiser',
      'battlecruiser',
    ]);
  });

  it('createHull(shuttle) returns correct hull stats', () => {
    const hull = createHull('shuttle');
    expect(hull.hullClass).toBe('shuttle');
    expect(hull.dimensions).toEqual({ length: 4, width: 2, height: 1.5 });
    expect(hull.mass).toBe(1);
    expect(hull.maxSpeed).toBe(30);
    expect(hull.turnRate).toBe(2.5);
  });

  it('shuttle has 2 weapon hardpoints', () => {
    const hull = createHull('shuttle');
    expect(hull.hardpoints).toHaveLength(2);
    expect(hull.hardpoints.every((hp) => hp.slotType === 'weapon')).toBe(true);
  });

  it('fighter has 4 weapon hardpoints', () => {
    const hull = createHull('fighter');
    expect(hull.hardpoints).toHaveLength(4);
  });

  it('corvette has 6 weapon hardpoints', () => {
    const hull = createHull('corvette');
    expect(hull.hardpoints).toHaveLength(6);
  });

  it('destroyer has 10 weapon hardpoints', () => {
    const hull = createHull('destroyer');
    expect(hull.hardpoints).toHaveLength(10);
  });

  it('cruiser has 14 weapon hardpoints', () => {
    const hull = createHull('cruiser');
    expect(hull.hardpoints).toHaveLength(14);
  });

  it('battlecruiser has 20 weapon hardpoints', () => {
    const hull = createHull('battlecruiser');
    expect(hull.hardpoints).toHaveLength(20);
  });

  it('createHull with unknown class throws error', () => {
    expect(() => createHull('dreadnought')).toThrow();
  });

  it('all hardpoint IDs are unique within a hull', () => {
    for (const hullClass of HULL_CLASSES) {
      const hull = createHull(hullClass);
      const ids = hull.hardpoints.map((hp) => hp.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('HULL_DEFINITIONS has entry for each class', () => {
    for (const hullClass of HULL_CLASSES) {
      expect(HULL_DEFINITIONS[hullClass]).toBeDefined();
      expect(HULL_DEFINITIONS[hullClass].dimensions).toBeDefined();
    }
  });

  it('assigns snappier keyboard turn response to small ships than capital ships', () => {
    const fighter = createHull('fighter');
    const corvette = createHull('corvette');
    const battlecruiser = createHull('battlecruiser');

    expect(fighter.keyboardTurnResponse).toBeGreaterThan(corvette.keyboardTurnResponse);
    expect(corvette.keyboardTurnResponse).toBeGreaterThan(battlecruiser.keyboardTurnResponse);
  });
});
