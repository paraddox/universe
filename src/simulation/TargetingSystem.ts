import type { Hardpoint } from './Hardpoint.js';
import type { ShipHull } from './ShipHull.js';
import { applyRotation } from './RotationMath.js';
import type { CombatTarget } from './CombatTarget.js';
import type { Vec3 } from './WeaponModule.js';

const DEFAULT_FORWARD_WEAPON_RANGE = 100;
const DEFAULT_FORWARD_WEAPON_PROJECTILE_SPEED = 240;
const FORWARD_WEAPON_DOT_THRESHOLD = 0.95;
const FIXED_GUN_MAX_DEFLECTION_RADIANS = Math.PI / 12;

export interface AimSolution {
  aimPoint: Vec3;
  targetPoint: Vec3 | null;
  aimDistance: number;
  targetDistance: number;
  selectedTargetId: string | null;
  interceptTime: number | null;
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

function add(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

function scale(v: Vec3, amount: number): Vec3 {
  return {
    x: v.x * amount,
    y: v.y * amount,
    z: v.z * amount,
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

function solveInterceptTime(relativePosition: Vec3, relativeVelocity: Vec3, projectileSpeed: number): number | null {
  const a = dot(relativeVelocity, relativeVelocity) - (projectileSpeed * projectileSpeed);
  const b = 2 * dot(relativePosition, relativeVelocity);
  const c = dot(relativePosition, relativePosition);

  if (Math.abs(a) < 1e-6) {
    if (Math.abs(b) < 1e-6) {
      return projectileSpeed > 0 ? Math.sqrt(c) / projectileSpeed : null;
    }

    const t = -c / b;
    return t > 0 ? t : null;
  }

  const discriminant = (b * b) - (4 * a * c);
  if (discriminant < 0) {
    return null;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDiscriminant) / (2 * a);
  const t2 = (-b + sqrtDiscriminant) / (2 * a);
  const positiveTimes = [t1, t2].filter((value) => value > 0);

  if (positiveTimes.length === 0) {
    return null;
  }

  return Math.min(...positiveTimes);
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

function getForwardWeapons(hull: ShipHull): Array<{ range: number; projectileSpeed: number }> {
  const shipForward = getShipForward(hull);
  return hull.hardpoints.flatMap((hardpoint) => {
    if (!hardpoint.isOccupied()) {
      return [];
    }

    const worldDirection = getHardpointBaseWorldDirection(hull, hardpoint);
    if (dot(worldDirection, shipForward) < FORWARD_WEAPON_DOT_THRESHOLD) {
      return [];
    }

    return [{
      range: hardpoint.mountedModule!.range,
      projectileSpeed: hardpoint.mountedModule!.projectileSpeed,
    }];
  });
}

export function getForwardWeaponAimDistance(
  hull: ShipHull,
  fallbackRange: number = DEFAULT_FORWARD_WEAPON_RANGE,
): number {
  const forwardWeapons = getForwardWeapons(hull);
  if (forwardWeapons.length === 0) {
    return fallbackRange;
  }

  return Math.min(...forwardWeapons.map((weapon) => weapon.range));
}

export function getForwardWeaponProjectileSpeed(
  hull: ShipHull,
  fallbackProjectileSpeed: number = DEFAULT_FORWARD_WEAPON_PROJECTILE_SPEED,
): number {
  const forwardWeapons = getForwardWeapons(hull);
  if (forwardWeapons.length === 0) {
    return fallbackProjectileSpeed;
  }

  return Math.min(...forwardWeapons.map((weapon) => weapon.projectileSpeed));
}

export function getAimSolution(
  hull: ShipHull,
  selectedTarget: CombatTarget | null = null,
  fallbackRange: number = DEFAULT_FORWARD_WEAPON_RANGE,
): AimSolution {
  if (selectedTarget?.isActive()) {
    const targetPoint = { ...selectedTarget.position };
    const targetDistance = length(subtract(targetPoint, hull.position));
    const projectileSpeed = getForwardWeaponProjectileSpeed(hull);
    const relativePosition = subtract(targetPoint, hull.position);
    const relativeVelocity = subtract(selectedTarget.getVelocity(), hull.velocity);
    const interceptTime = solveInterceptTime(relativePosition, relativeVelocity, projectileSpeed);
    const aimPoint = interceptTime === null
      ? targetPoint
      : add(targetPoint, scale(selectedTarget.getVelocity(), interceptTime));

    return {
      aimPoint,
      targetPoint,
      aimDistance: length(subtract(aimPoint, hull.position)),
      targetDistance,
      selectedTargetId: selectedTarget.id,
      interceptTime,
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
    targetPoint: null,
    aimDistance,
    targetDistance: aimDistance,
    selectedTargetId: null,
    interceptTime: null,
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
