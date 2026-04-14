import * as THREE from 'three';

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 8;
const POSITION_SMOOTHING = 8;

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private offset: THREE.Vector3;
  private smoothedPosition: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    this.smoothedPosition = new THREE.Vector3();
  }

  update(shipPosition: THREE.Vector3, shipQuaternion: THREE.Quaternion, dt: number): void {
    // Camera offset rotated by ship orientation — position follows rotation instantly
    const rotatedOffset = this.offset.clone().applyQuaternion(shipQuaternion);
    const targetPos = shipPosition.clone().add(rotatedOffset);

    // Smooth position follow only
    const alpha = Math.min(1, POSITION_SMOOTHING * dt);
    this.smoothedPosition.lerp(targetPos, alpha);
    this.camera.position.copy(this.smoothedPosition);

    // Always look at the ship
    this.camera.lookAt(shipPosition);
  }

  reset(shipPosition: THREE.Vector3, shipQuaternion: THREE.Quaternion): void {
    const rotatedOffset = this.offset.clone().applyQuaternion(shipQuaternion);
    this.smoothedPosition.copy(shipPosition.clone().add(rotatedOffset));
    this.camera.position.copy(this.smoothedPosition);
    this.camera.lookAt(shipPosition);
  }
}
