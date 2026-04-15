import * as THREE from 'three';

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 8;
const POSITION_SMOOTHING = 8;

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private offset: THREE.Vector3;
  private smoothedPosition: THREE.Vector3;
  private mountRotation: THREE.Quaternion;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    this.smoothedPosition = new THREE.Vector3();

    const yaw180 = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI,
    );
    const pitchDown = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      -Math.atan2(CAMERA_HEIGHT, CAMERA_DISTANCE),
    );
    this.mountRotation = yaw180.multiply(pitchDown);
  }

  update(shipPosition: THREE.Vector3, shipQuaternion: THREE.Quaternion, dt: number): void {
    const rotatedOffset = this.offset.clone().applyQuaternion(shipQuaternion);
    const targetPos = shipPosition.clone().add(rotatedOffset);

    const alpha = Math.min(1, POSITION_SMOOTHING * dt);
    this.smoothedPosition.lerp(targetPos, alpha);
    this.camera.position.copy(this.smoothedPosition);

    // Camera is rigidly mounted relative to the ship orientation.
    this.camera.quaternion.copy(shipQuaternion).multiply(this.mountRotation);
  }

  reset(shipPosition: THREE.Vector3, shipQuaternion: THREE.Quaternion): void {
    const rotatedOffset = this.offset.clone().applyQuaternion(shipQuaternion);
    this.smoothedPosition.copy(shipPosition.clone().add(rotatedOffset));
    this.camera.position.copy(this.smoothedPosition);
    this.camera.quaternion.copy(shipQuaternion).multiply(this.mountRotation);
  }
}
