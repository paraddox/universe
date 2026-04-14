import { ShipHull } from '../simulation/ShipHull.js';
import { Hardpoint } from '../simulation/Hardpoint.js';

export interface HullDefinition {
  hullClass: string;
  dimensions: { length: number; width: number; height: number };
  mass: number;
  maxSpeed: number;
  turnRate: number;
  hardpoints: {
    id: string;
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number };
    slotType: 'weapon' | 'utility' | 'engine';
  }[];
}

export const HULL_CLASSES = [
  'shuttle',
  'fighter',
  'corvette',
  'destroyer',
  'cruiser',
  'battlecruiser',
] as const;

export const HULL_DEFINITIONS: Record<string, HullDefinition> = {
  shuttle: {
    hullClass: 'shuttle',
    dimensions: { length: 4, width: 2, height: 1.5 },
    mass: 1,
    maxSpeed: 30,
    turnRate: 2.5,
    hardpoints: [
      { id: 'wp-left', position: { x: -1, y: 0, z: 1 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-right', position: { x: 1, y: 0, z: 1 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
    ],
  },
  fighter: {
    hullClass: 'fighter',
    dimensions: { length: 8, width: 6, height: 2 },
    mass: 3,
    maxSpeed: 50,
    turnRate: 3.0,
    hardpoints: [
      { id: 'wp-left-wing', position: { x: -3, y: 0, z: 2 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-right-wing', position: { x: 3, y: 0, z: 2 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-left-nose', position: { x: -1, y: -0.5, z: 4 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-right-nose', position: { x: 1, y: -0.5, z: 4 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
    ],
  },
  corvette: {
    hullClass: 'corvette',
    dimensions: { length: 16, width: 10, height: 4 },
    mass: 10,
    maxSpeed: 25,
    turnRate: 1.5,
    hardpoints: [
      { id: 'wp-nose-left', position: { x: -2, y: 0, z: 8 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-nose-right', position: { x: 2, y: 0, z: 8 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-mid-left-top', position: { x: -5, y: 1, z: 2 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-mid-left-bottom', position: { x: -5, y: -1, z: 2 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-mid-right-top', position: { x: 5, y: 1, z: 2 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-mid-right-bottom', position: { x: 5, y: -1, z: 2 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
    ],
  },
  destroyer: {
    hullClass: 'destroyer',
    dimensions: { length: 32, width: 16, height: 8 },
    mass: 40,
    maxSpeed: 15,
    turnRate: 0.8,
    hardpoints: [
      { id: 'wp-fwd-1', position: { x: -3, y: 0, z: 16 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-2', position: { x: -1, y: 0, z: 16 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-3', position: { x: 1, y: 0, z: 16 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-4', position: { x: 3, y: 0, z: 16 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-1', position: { x: -8, y: 0, z: 8 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-2', position: { x: -8, y: 0, z: 4 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-3', position: { x: -8, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-1', position: { x: 8, y: 0, z: 8 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-2', position: { x: 8, y: 0, z: 4 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-3', position: { x: 8, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
    ],
  },
  cruiser: {
    hullClass: 'cruiser',
    dimensions: { length: 48, width: 22, height: 10 },
    mass: 80,
    maxSpeed: 12,
    turnRate: 0.5,
    hardpoints: [
      { id: 'wp-fwd-1', position: { x: -4, y: 0, z: 24 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-2', position: { x: -1.5, y: 0, z: 24 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-3', position: { x: 1.5, y: 0, z: 24 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-4', position: { x: 4, y: 0, z: 24 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-top', position: { x: 0, y: 2, z: 24 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-bottom', position: { x: 0, y: -2, z: 24 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-1', position: { x: -11, y: 0, z: 16 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-2', position: { x: -11, y: 0, z: 8 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-3', position: { x: -11, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-4', position: { x: -11, y: 0, z: -8 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-1', position: { x: 11, y: 0, z: 16 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-2', position: { x: 11, y: 0, z: 8 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-3', position: { x: 11, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-4', position: { x: 11, y: 0, z: -8 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
    ],
  },
  battlecruiser: {
    hullClass: 'battlecruiser',
    dimensions: { length: 64, width: 28, height: 14 },
    mass: 160,
    maxSpeed: 8,
    turnRate: 0.3,
    hardpoints: [
      // 8 forward
      { id: 'wp-fwd-1', position: { x: -6, y: 0, z: 32 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-2', position: { x: -3.5, y: 0, z: 32 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-3', position: { x: -1, y: 0, z: 32 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-4', position: { x: 1, y: 0, z: 32 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-5', position: { x: 3.5, y: 0, z: 32 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-6', position: { x: 6, y: 0, z: 32 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-top', position: { x: 0, y: 3, z: 32 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-fwd-bottom', position: { x: 0, y: -3, z: 32 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      // 6 port
      { id: 'wp-port-1', position: { x: -14, y: 0, z: 20 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-2', position: { x: -14, y: 0, z: 12 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-3', position: { x: -14, y: 0, z: 4 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-4', position: { x: -14, y: 0, z: -4 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-5', position: { x: -14, y: 0, z: -12 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-port-6', position: { x: -14, y: 0, z: -20 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      // 6 starboard
      { id: 'wp-starboard-1', position: { x: 14, y: 0, z: 20 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-2', position: { x: 14, y: 0, z: 12 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-3', position: { x: 14, y: 0, z: 4 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-4', position: { x: 14, y: 0, z: -4 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-5', position: { x: 14, y: 0, z: -12 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
      { id: 'wp-starboard-6', position: { x: 14, y: 0, z: -20 }, orientation: { x: 0, y: 0, z: 0 }, slotType: 'weapon' },
    ],
  },
};

export function createHull(hullClass: string): ShipHull {
  const def = HULL_DEFINITIONS[hullClass];
  if (!def) {
    throw new Error(`Unknown hull class: '${hullClass}'`);
  }

  const hull = new ShipHull({
    id: `${hullClass}-${Math.random().toString(36).slice(2, 8)}`,
    hullClass: def.hullClass,
    name: hullClass.charAt(0).toUpperCase() + hullClass.slice(1),
    dimensions: { ...def.dimensions },
    mass: def.mass,
    maxSpeed: def.maxSpeed,
    turnRate: def.turnRate,
  });

  for (const hpDef of def.hardpoints) {
    hull.addHardpoint(new Hardpoint(
      hpDef.id,
      { ...hpDef.position },
      { ...hpDef.orientation },
      hpDef.slotType,
    ));
  }

  return hull;
}
