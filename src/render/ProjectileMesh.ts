import * as THREE from 'three';

const MAX_PROJECTILES = 500;
const PROJECTILE_LENGTH = 0.5;
const PROJECTILE_RADIUS = 0.08;

export class ProjectileMesh {
  private scene: THREE.Scene;
  private pool: THREE.Mesh[] = [];
  private active: Map<number, THREE.Mesh> = new Map();
  private geometry: THREE.CylinderGeometry;
  private material: THREE.MeshBasicMaterial;
  private nextId = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.geometry = new THREE.CylinderGeometry(
      Math.max(0.01, PROJECTILE_RADIUS),
      Math.max(0.01, PROJECTILE_RADIUS),
      PROJECTILE_LENGTH,
      4,
    );
    // Rotate so cylinder points along Z (forward)
    this.geometry.rotateX(Math.PI / 2);

    this.material = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
    });

    // Pre-allocate pool
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.visible = false;
      this.scene.add(mesh);
      this.pool.push(mesh);
    }
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number): number {
    const mesh = this.pool.pop();
    if (!mesh) return -1;

    const id = this.nextId++;
    mesh.position.set(x, y, z);

    // Orient along velocity
    if (vx !== 0 || vy !== 0 || vz !== 0) {
      mesh.lookAt(x + vx, y + vy, z + vz);
    }

    mesh.visible = true;
    this.active.set(id, mesh);
    return id;
  }

  update(id: number, x: number, y: number, z: number): void {
    const mesh = this.active.get(id);
    if (!mesh) return;
    mesh.position.set(x, y, z);
  }

  destroy(id: number): void {
    const mesh = this.active.get(id);
    if (!mesh) return;
    mesh.visible = false;
    this.active.delete(id);
    this.pool.push(mesh);
  }

  destroyAll(): void {
    this.active.forEach((mesh) => {
      mesh.visible = false;
      this.pool.push(mesh);
    });
    this.active.clear();
  }

  dispose(): void {
    this.destroyAll();
    for (const mesh of this.pool) {
      this.scene.remove(mesh);
    }
    this.geometry.dispose();
    this.material.dispose();
    this.pool = [];
  }
}
