import * as THREE from 'three';

const CAMERA_DISTANCE = 15;
const CAMERA_HEIGHT = 8;
const CAMERA_SMOOTHING = 5;

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private offset: THREE.Vector3;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
  }

  update(shipPosition: THREE.Vector3, _shipRotation: THREE.Euler, dt: number): void {
    // Fixed camera: stays behind origin direction, doesn't rotate with ship
    // This makes it easy to see which way projectiles are actually going
    const targetPos = shipPosition.clone().add(this.offset);
    const alpha = Math.min(1, CAMERA_SMOOTHING * dt);
    this.camera.position.lerp(targetPos, alpha);
    this.camera.lookAt(shipPosition);
  }

  reset(shipPosition: THREE.Vector3, _shipRotation: THREE.Euler): void {
    this.camera.position.copy(shipPosition.clone().add(this.offset));
    this.camera.lookAt(shipPosition);
  }
}
