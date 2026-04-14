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
    // Rotate offset by ship yaw
    const yaw = shipRotation.y;
    const rotatedOffset = new THREE.Vector3(
      this.offset.x * Math.cos(yaw) + this.offset.z * Math.sin(yaw),
      this.offset.y,
      -this.offset.x * Math.sin(yaw) + this.offset.z * Math.cos(yaw),
    );

    // Smooth follow
    const alpha = Math.min(1, CAMERA_SMOOTHING * dt);
    this.currentOffset.lerp(rotatedOffset, alpha);

    const targetPos = shipPosition.clone().add(this.currentOffset);
    this.camera.position.lerp(targetPos, alpha);

    // Look at ship
    this.camera.lookAt(shipPosition);
  }

  reset(shipPosition: THREE.Vector3, shipRotation: THREE.Euler): void {
    const yaw = shipRotation.y;
    this.currentOffset.set(
      this.offset.x * Math.cos(yaw) + this.offset.z * Math.sin(yaw),
      this.offset.y,
      -this.offset.x * Math.sin(yaw) + this.offset.z * Math.cos(yaw),
    );
    this.camera.position.copy(shipPosition.clone().add(this.currentOffset));
    this.camera.lookAt(shipPosition);
  }
}
