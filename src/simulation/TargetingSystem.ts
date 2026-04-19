import type { Hardpoint } from './Hardpoint.js';
import type { ShipHull } from './ShipHull.js';
import { applyRotation } from './RotationMath.js';
import type { CombatTarget } from './CombatTarget.js';
import type { Vec3 } from './WeaponModule.js';

const DEFAULT_FORWARD_WEAPON_RANGE = 100;
const FORWARD_WEAPON_DOT_THRESHOLD = 0.95;
const FIXED_GUN_MAX_DEFLECTION_RADIANS = Math.PI / 12;

export interface AimSolution {
  aimPoint: Vec3;
  aimDistance: number;
  selectedTargetId: string | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

function length(v: Vec3): number {
  return Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
}

function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len === 0) {
    return { x: 0, y: 0, z: 1 };
  }

  return {
    x: v.x / len,
    y: v.y / len,
    z: v.z / len,
  };
}

function dot(a: Vec3, b: Vec3): number {
  return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
}

export function getShipForward(hull: ShipHull): Vec3 {
  return hull.orientation.rotateVector({ x: 0, y: 0, z: 1 });
}

export function getHardpointWorldOrigin(hull: ShipHull, hardpoint: Hardpoint): Vec3 {
  const worldOffset = hull.orientation.rotateVector(hardpoint.position);
  return {
    x: hull.position.x + worldOffset.x,
    y: hull.position.y + worldOffset.y,
    z: hull.position.z + worldOffset.z,
  };
}

export function getHardpointBaseWorldDirection(hull: ShipHull, hardpoint: Hardpoint): Vec3 {
  const localDirection = applyRotation(
    { x: 0, y: 0, z: 1 },
    hardpoint.orientation.x,
    hardpoint.orientation.y,
    hardpoint.orientation.z,
  );
  return normalize(hull.orientation.rotateVector(localDirection));
}

function getForwardWeaponRanges(hull: ShipHull): number[] {
  const shipForward = getShipForward(hull);
  return hull.hardpoints.flatMap((hardpoint) => {
    if (!hardpoint.isOccupied()) {
      return [];
    }

    const worldDirection = getHardpointBaseWorldDirection(hull, hardpoint);
    if (dot(worldDirection, shipForward) < FORWARD_WEAPON_DOT_THRESHOLD) {
      return [];
    }

    return [hardpoint.mountedModule!.range];
  });
}

export function getForwardWeaponAimDistance(
  hull: ShipHull,
  fallbackRange: number = DEFAULT_FORWARD_WEAPON_RANGE,
): number {
  const forwardWeaponRanges = getForwardWeaponRanges(hull);
  if (forwardWeaponRanges.length === 0) {
    return fallbackRange;
  }

  return Math.min(...forwardWeaponRanges);
}

export function getAimSolution(
  hull: ShipHull,
  selectedTarget: CombatTarget | null = null,
  fallbackRange: number = DEFAULT_FORWARD_WEAPON_RANGE,
): AimSolution {
  if (selectedTarget?.isActive()) {
    const aimPoint = { ...selectedTarget.position };
    return {
      aimPoint,
      aimDistance: length(subtract(aimPoint, hull.position)),
      selectedTargetId: selectedTarget.id,
    };
  }

  const shipForward = getShipForward(hull);
  const aimDistance = getForwardWeaponAimDistance(hull, fallbackRange);
  return {
    aimPoint: {
      x: hull.position.x + (shipForward.x * aimDistance),
      y: hull.position.y + (shipForward.y * aimDistance),
      z: hull.position.z + (shipForward.z * aimDistance),
    },
    aimDistance,
    selectedTargetId: null,
  };
}

export function getFixedWeaponFireDirection(
  hull: ShipHull,
  hardpoint: Hardpoint,
  aimPoint: Vec3,
  maxDeflectionRadians: number = FIXED_GUN_MAX_DEFLECTION_RADIANS,
): Vec3 {
  const baseDirection = getHardpointBaseWorldDirection(hull, hardpoint);
  const origin = getHardpointWorldOrigin(hull, hardpoint);
  const desiredDirection = normalize(subtract(aimPoint, origin));
  const alignment = clamp(dot(baseDirection, desiredDirection), -1, 1);

  if (alignment <= 0) {
    return baseDirection;
  }

  const deflection = Math.acos(alignment);
  if (deflection > maxDeflectionRadians) {
    return baseDirection;
  }

  return desiredDirection;
}
