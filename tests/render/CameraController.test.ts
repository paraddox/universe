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

    controller.update(shipPosition, shipQuaternion, 1);

    const expectedCameraQuaternion = shipQuaternion
      .clone()
      .multiply(createExpectedMountRotation());

    expect(Math.abs(camera.quaternion.dot(expectedCameraQuaternion))).toBeGreaterThan(0.9999);
  });
});
