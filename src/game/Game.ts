import { Vector3 as Vector3, Euler as Euler } from 'three';
import { GameRenderer } from '../render/GameRenderer.js';
import { InputManager } from '../input/InputManager.js';
import { ShipController } from '../simulation/ShipController.js';
import { ProjectileSystem } from '../simulation/ProjectileSystem.js';
import { Projectile } from '../simulation/Projectile.js';
import { createHull } from '../data/hulls.js';
import { KineticCannon } from '../simulation/KineticCannon.js';

interface ProjectileVisual {
  meshId: number;
  projectile: Projectile;
}

export class Game {
  private renderer: GameRenderer;
  private input: InputManager;
  private lastTime: number = 0;

  private playerController: ShipController;
  private playerMesh!: import('three').Group;
  private projectileSystem: ProjectileSystem;
  private projectileVisuals: Map<number, ProjectileVisual> = new Map();
  private nextVisualId = 0;

  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new GameRenderer(canvas);
    this.input = new InputManager();
    this.input.attach(canvas);

    // Create player ship — Fighter with 4 light kinetic cannons
    const hull = createHull('fighter');
    hull.mountWeapon('wp-left-wing', new KineticCannon('light', 'player'));
    hull.mountWeapon('wp-right-wing', new KineticCannon('light', 'player'));
    hull.mountWeapon('wp-left-nose', new KineticCannon('light', 'player'));
    hull.mountWeapon('wp-right-nose', new KineticCannon('light', 'player'));

    this.playerController = new ShipController(hull);
    this.projectileSystem = new ProjectileSystem();

    this.spawnPlayerMesh();
  }

  private spawnPlayerMesh(): void {
    this.playerMesh = this.renderer.shipMeshFactory.createShipMesh(
      this.playerController.hull,
    );
    this.renderer.scene.add(this.playerMesh);

    // Initialize camera behind ship
    const pos = new Vector3(
      this.playerController.hull.position.x,
      this.playerController.hull.position.y,
      this.playerController.hull.position.z,
    );
    const rot = new Euler(
      this.playerController.hull.rotation.x,
      this.playerController.hull.rotation.y,
      this.playerController.hull.rotation.z,
    );
    this.renderer.cameraController.reset(pos, rot);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private loop(): void {
    if (!this.running) return;
    requestAnimationFrame(() => this.loop());

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    // Input
    const state = this.input.getState();
    this.playerController.setThrust(state.thrust);
    this.playerController.setStrafe(state.strafe);
    this.playerController.setYaw(state.yaw);
    this.playerController.setPitch(state.pitch);
    this.playerController.setFiring(state.firing);
    this.input.resetMouseDelta();

    // Simulation
    const result = this.playerController.update(dt);

    // Spawn projectile visuals
    for (const pData of result.projectiles) {
      const proj = new Projectile(pData);
      this.projectileSystem.add(proj);

      const meshId = this.renderer.projectileMesh.spawn(
        pData.position.x, pData.position.y, pData.position.z,
        pData.velocity.x, pData.velocity.y, pData.velocity.z,
      );
      if (meshId >= 0) {
        this.projectileVisuals.set(this.nextVisualId, { meshId, projectile: proj });
        this.nextVisualId++;
      }
    }

    // Update projectiles
    this.projectileSystem.update(dt);

    // Sync projectile visuals
    const toRemove: number[] = [];
    this.projectileVisuals.forEach((visual, id) => {
      if (!visual.projectile.isActive()) {
        this.renderer.projectileMesh.destroy(visual.meshId);
        toRemove.push(id);
      } else {
        this.renderer.projectileMesh.update(
          visual.meshId,
          visual.projectile.position.x,
          visual.projectile.position.y,
          visual.projectile.position.z,
        );
      }
    });
    for (const id of toRemove) {
      this.projectileVisuals.delete(id);
    }

    // Sync player mesh
    const hull = this.playerController.hull;
    this.playerMesh.position.set(hull.position.x, hull.position.y, hull.position.z);
    this.playerMesh.rotation.set(hull.rotation.x, hull.rotation.y, hull.rotation.z);

    // Camera
    this.renderer.cameraController.update(
      this.playerMesh.position,
      this.playerMesh.rotation,
      dt,
    );

    // Render
    this.renderer.render();
  }

  dispose(): void {
    this.stop();
    this.input.detach();
    this.renderer.dispose();
  }
}
