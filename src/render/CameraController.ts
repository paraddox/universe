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

  update(shipPosition: THREE.Vector3, shipQuaternion: THREE.Quaternion, dt: number): void {
    const rotatedOffset = this.offset.clone().applyQuaternion(shipQuaternion);

    const alpha = Math.min(1, CAMERA_SMOOTHING * dt);
    this.currentOffset.lerp(rotatedOffset, alpha);

    const targetPos = shipPosition.clone().add(this.currentOffset);
    this.camera.position.lerp(targetPos, alpha);
    this.camera.lookAt(shipPosition);
  }

  reset(shipPosition: THREE.Vector3, shipQuaternion: THREE.Quaternion): void {
    this.currentOffset.copy(this.offset.clone().applyQuaternion(shipQuaternion));
    this.camera.position.copy(shipPosition.clone().add(this.currentOffset));
    this.camera.lookAt(shipPosition);
  }
}
