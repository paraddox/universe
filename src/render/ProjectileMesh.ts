import * as THREE from 'three';

const MAX_PROJECTILES = 500;

type ProjectileVisualProfile = {
  coreRadius: number;
  coreLength: number;
  trailRadius: number;
  trailLength: number;
  trailOffset: number;
};

const LIGHT_PROJECTILE_VISUAL: ProjectileVisualProfile = {
  coreRadius: 0.08,
  coreLength: 0.8,
  trailRadius: 0.15,
  trailLength: 1.8,
  trailOffset: -0.35,
};

const HEAVY_PROJECTILE_VISUAL: ProjectileVisualProfile = {
  coreRadius: 0.12,
  coreLength: 1.4,
  trailRadius: 0.22,
  trailLength: 3,
  trailOffset: -0.8,
};

function getProjectileVisualProfile(damage: number): ProjectileVisualProfile {
  return damage >= 10 ? HEAVY_PROJECTILE_VISUAL : LIGHT_PROJECTILE_VISUAL;
}

function createProjectileVisual(
  coreGeometry: THREE.CylinderGeometry,
  trailGeometry: THREE.CylinderGeometry,
  coreMaterial: THREE.MeshBasicMaterial,
  trailMaterial: THREE.MeshBasicMaterial,
): THREE.Group {
  const group = new THREE.Group();
  group.visible = false;

  const trail = new THREE.Mesh(trailGeometry, trailMaterial);
  trail.name = 'projectile-trail';
  trail.renderOrder = 2;
  group.add(trail);

  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.name = 'projectile-core';
  core.renderOrder = 3;
  group.add(core);

  return group;
}

export class ProjectileMesh {
  private scene: THREE.Scene;
  private pool: THREE.Group[] = [];
  private active: Map<number, THREE.Group> = new Map();
  private coreGeometry: THREE.CylinderGeometry;
  private trailGeometry: THREE.CylinderGeometry;
  private coreMaterial: THREE.MeshBasicMaterial;
  private trailMaterial: THREE.MeshBasicMaterial;
  private nextId = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.coreGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
    this.coreGeometry.rotateX(Math.PI / 2);

    this.trailGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
    this.trailGeometry.rotateX(Math.PI / 2);

    this.coreMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff0cc,
    });

    this.trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xff9955,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (let i = 0; i < MAX_PROJECTILES; i++) {
      const visual = createProjectileVisual(
        this.coreGeometry,
        this.trailGeometry,
        this.coreMaterial,
        this.trailMaterial,
      );
      this.scene.add(visual);
      this.pool.push(visual);
    }
  }

  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, damage: number = 5): number {
    const visual = this.pool.pop();
    if (!visual) return -1;

    const id = this.nextId++;
    visual.position.set(x, y, z);

    if (vx !== 0 || vy !== 0 || vz !== 0) {
      visual.lookAt(x + vx, y + vy, z + vz);
    }

    const profile = getProjectileVisualProfile(damage);
    const core = visual.getObjectByName('projectile-core');
    const trail = visual.getObjectByName('projectile-trail');

    if (core instanceof THREE.Mesh) {
      core.scale.set(profile.coreRadius, profile.coreRadius, profile.coreLength);
      core.position.set(0, 0, 0);
    }

    if (trail instanceof THREE.Mesh) {
      trail.scale.set(profile.trailRadius, profile.trailRadius, profile.trailLength);
      trail.position.set(0, 0, profile.trailOffset);
    }

    visual.visible = true;
    this.active.set(id, visual);
    return id;
  }

  update(id: number, x: number, y: number, z: number): void {
    const visual = this.active.get(id);
    if (!visual) return;
    visual.position.set(x, y, z);
  }

  destroy(id: number): void {
    const visual = this.active.get(id);
    if (!visual) return;
    visual.visible = false;
    this.active.delete(id);
    this.pool.push(visual);
  }

  destroyAll(): void {
    this.active.forEach((visual) => {
      visual.visible = false;
      this.pool.push(visual);
    });
    this.active.clear();
  }

  dispose(): void {
    this.destroyAll();
    for (const visual of this.pool) {
      this.scene.remove(visual);
    }
    this.coreGeometry.dispose();
    this.trailGeometry.dispose();
    this.coreMaterial.dispose();
    this.trailMaterial.dispose();
    this.pool = [];
  }
}
