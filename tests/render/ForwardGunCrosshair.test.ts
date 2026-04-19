import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../../src/render/CameraController.js';
import { createHull } from '../../src/data/hulls.js';
import { KineticCannon } from '../../src/simulation/KineticCannon.js';
import { Quat } from '../../src/simulation/Quat.js';
import {
  ForwardGunCrosshairOverlay,
  getForwardGunAimDistance,
  projectForwardGunCrosshair,
} from '../../src/render/ForwardGunCrosshair.js';

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

describe('ForwardGunCrosshair', () => {
  it('projects the default fighter forward guns near the horizontal center of the screen', () => {
    const hull = mountPlayerWeapons();
    const camera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);

    syncCameraToHull(camera, hull);

    const projected = projectForwardGunCrosshair(camera, hull, 1600, 900);

    expect(projected.visible).toBe(true);
    expect(projected.x).toBeCloseTo(800, 1);
    expect(projected.y).toBeLessThan(225);
  });

  it('keeps the crosshair stable under yaw because the chase camera is rigidly mounted to the ship', () => {
    const baseHull = mountPlayerWeapons();
    const yawedHull = mountPlayerWeapons();

    yawedHull.orientation = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 6);

    const baseCamera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);
    const yawedCamera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);

    syncCameraToHull(baseCamera, baseHull);
    syncCameraToHull(yawedCamera, yawedHull);

    const baseProjected = projectForwardGunCrosshair(baseCamera, baseHull, 1600, 900);
    const yawedProjected = projectForwardGunCrosshair(yawedCamera, yawedHull, 1600, 900);

    expect(yawedProjected.visible).toBe(true);
    expect(yawedProjected.x).toBeCloseTo(baseProjected.x, 4);
    expect(yawedProjected.y).toBeCloseTo(baseProjected.y, 4);
  });

  it('keeps the crosshair stable under pure roll because forward direction is roll-independent', () => {
    const baseHull = mountPlayerWeapons();
    const rolledHull = mountPlayerWeapons();

    rolledHull.orientation = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);

    const baseCamera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);
    const rolledCamera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);

    syncCameraToHull(baseCamera, baseHull);
    syncCameraToHull(rolledCamera, rolledHull);

    const baseProjected = projectForwardGunCrosshair(baseCamera, baseHull, 1600, 900);
    const rolledProjected = projectForwardGunCrosshair(rolledCamera, rolledHull, 1600, 900);

    expect(rolledProjected.visible).toBe(true);
    expect(rolledProjected.x).toBeCloseTo(baseProjected.x, 4);
    expect(rolledProjected.y).toBeCloseTo(baseProjected.y, 4);
  });

  it('uses the shortest range among forward-pointing mounted guns', () => {
    const hull = createHull('fighter');
    hull.mountWeapon('wp-left-wing', new KineticCannon('heavy', 'player'));
    hull.mountWeapon('wp-right-wing', new KineticCannon('light', 'player'));

    const leftWing = hull.getHardpoint('wp-left-wing');
    if (!leftWing) {
      throw new Error('Expected wp-left-wing hardpoint');
    }
    leftWing.orientation.y = Math.PI / 2;

    expect(getForwardGunAimDistance(hull)).toBe(100);
  });

  it('updates a DOM overlay element with the projected crosshair position', () => {
    const mockDocument = createMockDocument();
    const hull = mountPlayerWeapons();
    const camera = new THREE.PerspectiveCamera(60, 1600 / 900, 0.1, 2000);
    syncCameraToHull(camera, hull);

    const overlay = new ForwardGunCrosshairOverlay(mockDocument as unknown as Document);
    overlay.update(camera, hull, 1600, 900);

    expect(mockDocument.body.appendChild).toHaveBeenCalledTimes(1);
    expect(overlay.element.style.left).toMatch(/px$/);
    expect(overlay.element.style.top).toMatch(/px$/);
    expect(overlay.element.style.opacity).toBe('1');
  });
});
