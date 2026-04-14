import * as THREE from 'three';

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 8;
const CAMERA_SMOOTHING = 5;

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private offset: THREE.Vector3;
  private currentOffset: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
    this.currentOffset = this.offset.clone();
  }

  update(shipPosition: THREE.Vector3, shipRotation: THREE.Euler, dt: number): void {
    // Rotate offset by ship yaw (so camera follows behind the ship)
    const yaw = shipRotation.y;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const rotatedOffset = new THREE.Vector3(
      this.offset.x * cosY + this.offset.z * sinY,
      this.offset.y,
      -this.offset.x * sinY + this.offset.z * cosY,
    );

    const alpha = Math.min(1, CAMERA_SMOOTHING * dt);
    this.currentOffset.lerp(rotatedOffset, alpha);

    const targetPos = shipPosition.clone().add(this.currentOffset);
    this.camera.position.lerp(targetPos, alpha);
    this.camera.lookAt(shipPosition);
  }

  reset(shipPosition: THREE.Vector3, shipRotation: THREE.Euler): void {
    const yaw = shipRotation.y;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    this.currentOffset.set(
      this.offset.x * cosY + this.offset.z * sinY,
      this.offset.y,
      -this.offset.x * sinY + this.offset.z * cosY,
    );
    this.camera.position.copy(shipPosition.clone().add(this.currentOffset));
    this.camera.lookAt(shipPosition);
  }
}
