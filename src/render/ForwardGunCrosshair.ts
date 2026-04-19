import * as THREE from 'three';
import type { ShipHull } from '../simulation/ShipHull.js';
import { applyRotation } from '../simulation/RotationMath.js';

const DEFAULT_FORWARD_GUN_RANGE = 100;
const FORWARD_GUN_DOT_THRESHOLD = 0.95;

export interface ScreenProjection {
  x: number;
  y: number;
  visible: boolean;
}

function dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
  return (a.x * b.x) + (a.y * b.y) + (a.z * b.z);
}

function getShipForward(hull: ShipHull): { x: number; y: number; z: number } {
  return hull.orientation.rotateVector({ x: 0, y: 0, z: 1 });
}

export function getForwardGunAimDistance(
  hull: ShipHull,
  fallbackRange: number = DEFAULT_FORWARD_GUN_RANGE,
): number {
  const shipForward = getShipForward(hull);
  const forwardWeaponRanges = hull.hardpoints.flatMap((hp) => {
    if (!hp.isOccupied()) {
      return [];
    }

    const localDirection = applyRotation(
      { x: 0, y: 0, z: 1 },
      hp.orientation.x,
      hp.orientation.y,
      hp.orientation.z,
    );
    const worldDirection = hull.orientation.rotateVector(localDirection);

    if (dot(worldDirection, shipForward) < FORWARD_GUN_DOT_THRESHOLD) {
      return [];
    }

    return [hp.mountedModule!.range];
  });

  if (forwardWeaponRanges.length === 0) {
    return fallbackRange;
  }

  return Math.min(...forwardWeaponRanges);
}

export function projectWorldPoint(
  camera: THREE.PerspectiveCamera,
  point: THREE.Vector3,
  viewportWidth: number,
  viewportHeight: number,
): ScreenProjection {
  const projected = point.clone().project(camera);
  const visible = Number.isFinite(projected.x)
    && Number.isFinite(projected.y)
    && Number.isFinite(projected.z)
    && projected.z >= -1
    && projected.z <= 1;

  return {
    x: ((projected.x + 1) * 0.5) * viewportWidth,
    y: ((1 - projected.y) * 0.5) * viewportHeight,
    visible,
  };
}

export function projectForwardGunCrosshair(
  camera: THREE.PerspectiveCamera,
  hull: ShipHull,
  viewportWidth: number,
  viewportHeight: number,
  fallbackRange: number = DEFAULT_FORWARD_GUN_RANGE,
): ScreenProjection {
  const shipForward = getShipForward(hull);
  const aimDistance = getForwardGunAimDistance(hull, fallbackRange);
  const aimPoint = new THREE.Vector3(
    hull.position.x + (shipForward.x * aimDistance),
    hull.position.y + (shipForward.y * aimDistance),
    hull.position.z + (shipForward.z * aimDistance),
  );

  return projectWorldPoint(camera, aimPoint, viewportWidth, viewportHeight);
}

export class ForwardGunCrosshairOverlay {
  readonly element: HTMLDivElement;

  constructor(doc: Document = document) {
    const root = doc.createElement('div');
    root.id = 'forward-gun-crosshair';
    root.style.cssText = [
      'position: fixed',
      'left: 50%',
      'top: 50%',
      'width: 22px',
      'height: 22px',
      'transform: translate(-50%, -50%)',
      'pointer-events: none',
      'user-select: none',
      'z-index: 980',
      'opacity: 0',
      'transition: opacity 80ms linear',
      'filter: drop-shadow(0 0 8px rgba(170, 204, 255, 0.35))',
    ].join(';');

    const ring = doc.createElement('div');
    ring.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'width: 14px',
      'height: 14px',
      'transform: translate(-50%, -50%)',
      'border: 1px solid rgba(170, 204, 255, 0.9)',
      'border-radius: 999px',
    ].join(';');

    const hBar = doc.createElement('div');
    hBar.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'width: 18px',
      'height: 2px',
      'transform: translate(-50%, -50%)',
      'background: rgba(170, 204, 255, 0.95)',
      'border-radius: 999px',
    ].join(';');

    const vBar = doc.createElement('div');
    vBar.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'width: 2px',
      'height: 18px',
      'transform: translate(-50%, -50%)',
      'background: rgba(170, 204, 255, 0.95)',
      'border-radius: 999px',
    ].join(';');

    root.appendChild(ring);
    root.appendChild(hBar);
    root.appendChild(vBar);
    doc.body.appendChild(root);

    this.element = root;
  }

  update(
    camera: THREE.PerspectiveCamera,
    hull: ShipHull,
    viewportWidth: number = window.innerWidth,
    viewportHeight: number = window.innerHeight,
  ): void {
    const projected = projectForwardGunCrosshair(
      camera,
      hull,
      viewportWidth,
      viewportHeight,
    );

    if (!projected.visible) {
      this.hide();
      return;
    }

    this.element.style.opacity = '1';
    this.element.style.left = `${projected.x}px`;
    this.element.style.top = `${projected.y}px`;
  }

  hide(): void {
    this.element.style.opacity = '0';
  }

  dispose(): void {
    this.element.remove();
  }
}
