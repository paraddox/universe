import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../../src/render/CameraController.js';

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 8;

function createExpectedMountRotation(): THREE.Quaternion {
  const yaw180 = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI,
  );
  const pitchDown = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.atan2(CAMERA_HEIGHT, CAMERA_DISTANCE),
  );

  return yaw180.multiply(pitchDown);
}

describe('CameraController', () => {
  it('keeps a fixed camera orientation relative to the ship during full pitch rotation', () => {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const controller = new CameraController(camera);
    const shipPosition = new THREE.Vector3(0, 0, 0);

    controller.reset(shipPosition, new THREE.Quaternion());

    const shipQuaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI,
    );

    controller.update(shipPosition, shipQuaternion);

    const expectedCameraQuaternion = shipQuaternion
      .clone()
      .multiply(createExpectedMountRotation());

    expect(Math.abs(camera.quaternion.dot(expectedCameraQuaternion))).toBeGreaterThan(0.9999);
  });

  it('keeps a fixed camera position relative to the ship with no smoothing lag', () => {
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const controller = new CameraController(camera);
    const initialShipPosition = new THREE.Vector3(0, 0, 0);
    controller.reset(initialShipPosition, new THREE.Quaternion());

    const shipPosition = new THREE.Vector3(10, 0, 0);
    const shipQuaternion = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2,
    );

    controller.update(shipPosition, shipQuaternion);

    const expectedPosition = shipPosition.clone().add(
      new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE).applyQuaternion(shipQuaternion),
    );

    expect(camera.position.x).toBeCloseTo(expectedPosition.x, 10);
    expect(camera.position.y).toBeCloseTo(expectedPosition.y, 10);
    expect(camera.position.z).toBeCloseTo(expectedPosition.z, 10);
  });
});
