import {
  Vector3,
  Quaternion as ThreeQuat,
  type Mesh,
  type Object3D,
  type Material,
  LineBasicMaterial,
  BufferGeometry,
  Line,
  Float32BufferAttribute,
  Color,
} from 'three';
import { GameRenderer } from '../render/GameRenderer.js';
import { InputManager } from '../input/InputManager.js';
import { ShipController } from '../simulation/ShipController.js';
import { ProjectileSystem } from '../simulation/ProjectileSystem.js';
import { Projectile } from '../simulation/Projectile.js';
import { Target } from '../simulation/Target.js';
import { createHull } from '../data/hulls.js';
import { KineticCannon } from '../simulation/KineticCannon.js';
import { createTargetMesh, updateTargetMesh } from '../render/TargetMesh.js';
import { createEnemyShipTargetMesh, updateEnemyShipTargetMesh } from '../render/EnemyShipTargetMesh.js';

interface ProjectileVisual {
  meshId: number;
  projectile: Projectile;
}

interface TargetVisual {
  object: Object3D;
  kind: 'dummy' | 'ship';
}

function disposeObject3D(object: Object3D): void {
  object.traverse((child) => {
    const mesh = child as Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const material = mesh.material as Material | Material[] | undefined;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else {
      material?.dispose();
    }
  });
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
  private targets: Target[] = [];
  private targetVisuals: Map<string, TargetVisual> = new Map();

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
    this.input.setKeyboardTurnResponse(hull.keyboardTurnResponse);

    this.spawnPlayerMesh();
    this.spawnCombatTargets();
  }

  private spawnPlayerMesh(): void {
    this.playerMesh = this.renderer.shipMeshFactory.createShipMesh(
      this.playerController.hull,
    );

    // Add forward direction indicator (bright green line pointing forward)
    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute('position', new Float32BufferAttribute([
      0, 0, 2,
      0, 0, 12,
    ], 3));
    const lineMat = new LineBasicMaterial({ color: new Color(0x00ff44) });
    const line = new Line(lineGeo, lineMat);
    this.playerMesh.add(line);

    this.renderer.scene.add(this.playerMesh);

    const pos = new Vector3(
      this.playerController.hull.position.x,
      this.playerController.hull.position.y,
      this.playerController.hull.position.z,
    );
    const quat = this.syncQuaternion();
    this.renderer.cameraController.reset(pos, quat);
  }

  private syncQuaternion(): ThreeQuat {
    const o = this.playerController.hull.orientation;
    return new ThreeQuat(o.x, o.y, o.z, o.w);
  }

  private spawnCombatTargets(): void {
    this.addTarget(new Target({
      id: 'range-dummy-1',
      position: { x: 0, y: 0, z: 80 },
      radius: 6,
      maxHealth: 60,
      kind: 'dummy',
      respawnDelay: 4,
    }));

    this.addTarget(new Target({
      id: 'range-dummy-2',
      position: { x: -26, y: 8, z: 120 },
      radius: 5,
      maxHealth: 45,
      kind: 'dummy',
      respawnDelay: 5,
    }));

    this.addTarget(new Target({
      id: 'enemy-fighter-1',
      position: { x: 28, y: 4, z: 145 },
      radius: 5,
      maxHealth: 80,
      kind: 'ship',
      hullClass: 'fighter',
      respawnDelay: 7,
    }));

    this.addTarget(new Target({
      id: 'enemy-corvette-1',
      position: { x: -42, y: -10, z: 190 },
      radius: 10,
      maxHealth: 160,
      kind: 'ship',
      hullClass: 'corvette',
      respawnDelay: 10,
    }));
  }

  private addTarget(target: Target): void {
    this.targets.push(target);

    const object = target.kind === 'ship'
      ? createEnemyShipTargetMesh(target, this.renderer.shipMeshFactory)
      : createTargetMesh(target);

    this.targetVisuals.set(target.id, { object, kind: target.kind });
    this.renderer.scene.add(object);
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
    this.input.update(dt);
    const state = this.input.getState();
    this.playerController.setThrust(state.thrust);
    this.playerController.setStrafe(state.strafe);
    this.playerController.setVerticalStrafe(state.verticalStrafe);
    this.playerController.setYaw(state.yaw);
    this.playerController.setPitch(state.pitch);
    this.playerController.setRoll(state.roll);
    this.playerController.setFiring(state.firing);
    this.thrustLevel = state.thrust;
    this.input.resetMouseDelta();

    for (const target of this.targets) {
      target.update(dt);
    }

    // Simulation
    const result = this.playerController.update(dt);

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

    // Update projectiles + resolve target hits
    this.projectileSystem.update(dt, this.targets);

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

    // Sync player mesh position + orientation
    const hull = this.playerController.hull;
    this.playerMesh.position.set(hull.position.x, hull.position.y, hull.position.z);
    const q = this.syncQuaternion();
    this.playerMesh.quaternion.copy(q);

    // Sync target visuals
    for (const target of this.targets) {
      const visual = this.targetVisuals.get(target.id);
      if (!visual) continue;

      if (visual.kind === 'ship') {
        updateEnemyShipTargetMesh(visual.object as import('three').Group, target);
      } else {
        updateTargetMesh(visual.object as Mesh, target);
      }
    }

    // Camera
    this.renderer.cameraController.update(
      this.playerMesh.position,
      q,
    );

    this.updateDebugHUD();
    this.renderer.render();
  }

  private debugEl: HTMLDivElement | null = null;
  private thrustLevel: number = 0;

  private getThrustPercent(): number {
    return Math.round(this.thrustLevel * 100);
  }

  private renderTargetStatus(): string {
    return this.targets.map((target) => {
      const label = target.kind === 'ship'
        ? `${target.hullClass}:${target.id}`
        : target.id;
      const status = target.isActive()
        ? `${Math.round(target.health)}/${target.maxHealth}`
        : 'reforming';
      const damage = target.getRecentDamageAmount() > 0
        ? ` (-${target.getRecentDamageAmount()})`
        : '';

      return `<div>${label}: ${status}${damage}</div>`;
    }).join('');
  }

  private updateDebugHUD(): void {
    if (!this.debugEl) {
      this.debugEl = document.createElement('div');
      this.debugEl.style.cssText = 'position:fixed;top:10px;right:10px;color:#0f0;font-family:monospace;font-size:12px;pointer-events:none;z-index:999;background:rgba(0,0,0,0.7);padding:8px;border-radius:4px;max-width:320px;';
      document.body.appendChild(this.debugEl);
    }
    const fwd = this.playerController.getForward();
    this.debugEl.innerHTML = `
      <div>Ship: ${this.playerController.hull.hullClass}</div>
      <div>Forward: (${fwd.x.toFixed(2)}, ${fwd.y.toFixed(2)}, ${fwd.z.toFixed(2)})</div>
      <div>Thrust: ${this.getThrustPercent()}%</div>
      <div>Projectiles: ${this.projectileVisuals.size}</div>
      <div>Targets:</div>
      ${this.renderTargetStatus()}
    `;
  }

  dispose(): void {
    this.stop();
    this.input.detach();

    this.targetVisuals.forEach((visual) => {
      this.renderer.scene.remove(visual.object);
      disposeObject3D(visual.object);
    });
    this.targetVisuals.clear();

    this.renderer.dispose();
  }
}
