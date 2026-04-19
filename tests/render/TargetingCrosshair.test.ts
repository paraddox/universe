import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../../src/render/CameraController.js';
import { createHull } from '../../src/data/hulls.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';
import { Quat } from '../../src/simulation/Quat.js';
import { Target } from '../../src/simulation/Target.js';
import { getAimSolution } from '../../src/simulation/TargetingSystem.js';
import {
  TargetingCrosshairOverlay,
  projectAimPointCrosshair,
} from '../../src/render/TargetingCrosshair.js';

function mountPlayerWeapons(): ReturnType<typeof createHull> {
  const hull = createHull('fighter');
  hull.mountWeapon('wp-left-wing', new KineticCannon('light', 'player'));
  hull.mountWeapon('wp-right-wing', new KineticCannon('light', 'player'));
  hull.mountWeapon('wp-left-nose', new KineticCannon('light', 'player'));
  hull.mountWeapon('wp-right-nose', new KineticCannon('light', 'player'));
  return hull;
}

function syncCameraToHull(camera: THREE.PerspectiveCamera, hull: ReturnType<typeof createHull>): void {
  const controller = new CameraController(camera);
  const shipPosition = new THREE.Vector3(hull.position.x, hull.position.y, hull.position.z);
  const shipQuaternion = new THREE.Quaternion(
    hull.orientation.x,
    hull.orientation.y,
    hull.orientation.z,
    hull.orientation.w,
  );
  controller.update(shipPosition, shipQuaternion);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
}

function createMockElement() {
  return {
    style: {} as Record<string, string>,
    children: [] as unknown[],
    appendChild(child: unknown) {
      this.children.push(child);
      return child;
    },
    remove: vi.fn(),
  };
}

function createMockDocument() {
  const body = {
    children: [] as unknown[],
    appendChild: vi.fn((child: unknown) => {
      body.children.push(child);
      return child;
    }),
  };

  return {
    body,
    createElement: vi.fn(() => createMockElement()),
  };
}

describe('TargetingCrosshair', () => {
  it('projects the default fighter convergence point near the horizontal center of the screen', () => {
    const hull = mountPlayerWeapons();
    const camera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);

    syncCameraToHull(camera, hull);

    const solution = getAimSolution(hull);
    const projected = projectAimPointCrosshair(camera, solution.aimPoint, 1600, 900);

    expect(projected.visible).toBe(true);
    expect(projected.x).toBeCloseTo(800, 1);
    expect(projected.y).toBeLessThan(225);
  });

  it('moves the crosshair toward the ship when a closer locked target becomes the convergence point', () => {
    const hull = mountPlayerWeapons();
    const camera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);

    syncCameraToHull(camera, hull);

    const defaultProjected = projectAimPointCrosshair(camera, getAimSolution(hull).aimPoint, 1600, 900);
    const lockedTarget = new Target({
      id: 'range-dummy',
      position: { x: 0, y: 0, z: 80 },
      radius: 6,
      maxHealth: 60,
    });
    const targetedProjected = projectAimPointCrosshair(camera, getAimSolution(hull, lockedTarget).aimPoint, 1600, 900);

    expect(targetedProjected.visible).toBe(true);
    expect(targetedProjected.x).toBeCloseTo(defaultProjected.x, 4);
    expect(targetedProjected.y).toBeGreaterThan(defaultProjected.y);
  });

  it('keeps the convergence crosshair stable under yaw because the chase camera is rigidly mounted to the ship', () => {
    const baseHull = mountPlayerWeapons();
    const yawedHull = mountPlayerWeapons();

    yawedHull.orientation = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 6);

    const baseCamera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);
    const yawedCamera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);

    syncCameraToHull(baseCamera, baseHull);
    syncCameraToHull(yawedCamera, yawedHull);

    const baseProjected = projectAimPointCrosshair(baseCamera, getAimSolution(baseHull).aimPoint, 1600, 900);
    const yawedProjected = projectAimPointCrosshair(yawedCamera, getAimSolution(yawedHull).aimPoint, 1600, 900);

    expect(yawedProjected.visible).toBe(true);
    expect(yawedProjected.x).toBeCloseTo(baseProjected.x, 4);
    expect(yawedProjected.y).toBeCloseTo(baseProjected.y, 4);
  });

  it('shows selected-target highlighting plus range and lead indicators when a target is locked', () => {
    const mockDocument = createMockDocument();
    const hull = mountPlayerWeapons();
    const camera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);
    syncCameraToHull(camera, hull);

    const movingTarget = new Target({
      id: 'enemy',
      position: { x: 0, y: 0, z: 120 },
      radius: 6,
      maxHealth: 60,
    });
    movingTarget.position = { x: 0, y: 0, z: 120 };
    (movingTarget as unknown as { getVelocity: () => { x: number; y: number; z: number } }).getVelocity = () => ({ x: 25, y: 0, z: 0 });

    const overlay = new TargetingCrosshairOverlay(mockDocument as unknown as Document);
    overlay.update(camera, getAimSolution(hull, movingTarget), 1600, 900);

    expect(mockDocument.body.appendChild).toHaveBeenCalled();
    expect(overlay.element.style.left).toMatch(/px$/);
    expect(overlay.element.style.top).toMatch(/px$/);
    expect(overlay.element.style.opacity).toBe('1');
    expect(overlay.rangeLabel.textContent).toBe('120m');
    expect(overlay.rangeLabel.style.opacity).toBe('1');
    expect(overlay.targetMarker.style.opacity).toBe('1');
    expect(overlay.leadLine.style.opacity).toBe('1');
  });

  it('hides target-specific indicators when no target is locked', () => {
    const mockDocument = createMockDocument();
    const hull = mountPlayerWeapons();
    const camera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);
    syncCameraToHull(camera, hull);

    const overlay = new TargetingCrosshairOverlay(mockDocument as unknown as Document);
    overlay.update(camera, getAimSolution(hull), 1600, 900);

    expect(overlay.rangeLabel.style.opacity).toBe('0');
    expect(overlay.targetMarker.style.opacity).toBe('0');
    expect(overlay.leadLine.style.opacity).toBe('0');
  });
});
