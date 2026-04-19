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
import { ProjectileSystem } from '../simulation/ProjectileSystem.js';
import { Projectile } from '../simulation/Projectile.js';
import type { CombatTarget } from '../simulation/CombatTarget.js';
import { Target } from '../simulation/Target.js';
import { ShipCombatant } from '../simulation/ShipCombatant.js';
import { EnemyShipAI } from '../simulation/EnemyShipAI.js';
import { createHull } from '../data/hulls.js';
import { KineticCannon } from '../simulation/KineticCannon.js';
import { createTargetMesh, updateTargetMesh } from '../render/TargetMesh.js';
import { createEnemyShipTargetMesh, updateEnemyShipTargetMesh } from '../render/EnemyShipTargetMesh.js';
import { TargetingCrosshairOverlay, projectAimPointCrosshair } from '../render/TargetingCrosshair.js';
import { shouldRenderProjectileVisual } from '../render/ProjectileVisibility.js';
import { getAimSolution } from '../simulation/TargetingSystem.js';
import { selectTargetUnderCrosshair } from './TargetLocking.js';

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

  private playerShip: ShipCombatant;
  private playerMesh!: import('three').Group;
  private projectileSystem: ProjectileSystem;
  private projectileVisuals: Map<number, ProjectileVisual> = new Map();
  private nextVisualId = 0;
  private targets: Target[] = [];
  private enemyShips: ShipCombatant[] = [];
  private enemyAIs: EnemyShipAI[] = [];
  private targetVisuals: Map<string, TargetVisual> = new Map();
  private crosshair: TargetingCrosshairOverlay;
  private selectedTarget: CombatTarget | null = null;

  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new GameRenderer(canvas);
    this.input = new InputManager();
    this.input.attach(canvas);
    this.crosshair = new TargetingCrosshairOverlay();

    // Create player ship — Fighter with 4 light kinetic cannons
    const hull = createHull('fighter');
    hull.mountWeapon('wp-left-wing', new KineticCannon('light', 'player'));
    hull.mountWeapon('wp-right-wing', new KineticCannon('light', 'player'));
    hull.mountWeapon('wp-left-nose', new KineticCannon('light', 'player'));
    hull.mountWeapon('wp-right-nose', new KineticCannon('light', 'player'));

    this.playerShip = new ShipCombatant({
      id: 'player',
      hull,
      radius: 5,
      maxHealth: 100,
      teamId: 'player',
      respawnDelay: 3,
      spawnProtectionDuration: 5,
    });
    this.projectileSystem = new ProjectileSystem();
    this.input.setKeyboardTurnResponse(hull.keyboardTurnResponse);

    this.spawnPlayerMesh();
    this.spawnCombatTargets();
  }

  private spawnPlayerMesh(): void {
    this.playerMesh = this.renderer.shipMeshFactory.createShipMesh(
      this.playerShip.hull,
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
      this.playerShip.hull.position.x,
      this.playerShip.hull.position.y,
      this.playerShip.hull.position.z,
    );
    const quat = this.syncQuaternion();
    this.renderer.cameraController.reset(pos, quat);
  }

  private syncQuaternion(): ThreeQuat {
    const o = this.playerShip.hull.orientation;
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

    this.addEnemyShip({
      id: 'enemy-fighter-1',
      hullClass: 'fighter',
      position: { x: 28, y: 4, z: 145 },
      radius: 5,
      maxHealth: 80,
      respawnDelay: 7,
      weaponHardpointIds: ['wp-left-nose', 'wp-right-nose'],
      patrolRadius: 18,
      aggroRange: 170,
      preferredRange: 85,
      fireRange: 120,
      breakawayRange: 22,
    });

    this.addEnemyShip({
      id: 'enemy-corvette-1',
      hullClass: 'corvette',
      position: { x: -42, y: -10, z: 190 },
      radius: 10,
      maxHealth: 160,
      respawnDelay: 10,
      weaponHardpointIds: ['wp-nose-left', 'wp-nose-right'],
      patrolRadius: 28,
      aggroRange: 210,
      preferredRange: 130,
      fireRange: 170,
      breakawayRange: 40,
    });
  }

  private addEnemyShip(config: {
    id: string;
    hullClass: string;
    position: { x: number; y: number; z: number };
    radius: number;
    maxHealth: number;
    respawnDelay: number;
    weaponHardpointIds: string[];
    patrolRadius: number;
    aggroRange: number;
    preferredRange: number;
    fireRange: number;
    breakawayRange: number;
  }): void {
    const hull = createHull(config.hullClass);
    hull.id = config.id;
    hull.position = { ...config.position };
    for (const hardpointId of config.weaponHardpointIds) {
      hull.mountWeapon(hardpointId, new KineticCannon('light', 'enemy'));
    }

    const ship = new ShipCombatant({
      id: config.id,
      hull,
      radius: config.radius,
      maxHealth: config.maxHealth,
      teamId: 'enemy',
      respawnDelay: config.respawnDelay,
    });
    const ai = new EnemyShipAI(ship, {
      patrolCenter: { ...config.position },
      patrolRadius: config.patrolRadius,
      aggroRange: config.aggroRange,
      preferredRange: config.preferredRange,
      fireRange: config.fireRange,
      breakawayRange: config.breakawayRange,
    });

    this.enemyShips.push(ship);
    this.enemyAIs.push(ai);

    const object = createEnemyShipTargetMesh(ship, this.renderer.shipMeshFactory);
    this.targetVisuals.set(ship.id, { object, kind: 'ship' });
    this.renderer.scene.add(object);
  }


  private addTarget(target: Target): void {
    this.targets.push(target);

    const object = target.kind === 'ship'
      ? createEnemyShipTargetMesh(target, this.renderer.shipMeshFactory)
      : createTargetMesh(target);

    this.targetVisuals.set(target.id, { object, kind: target.kind });
    this.renderer.scene.add(object);
  }

  private getTargetableObjects(): CombatTarget[] {
    return [...this.enemyShips, ...this.targets];
  }

  private getAimSolution() {
    return getAimSolution(this.playerShip.hull, this.selectedTarget);
  }

  private updateSelectedTarget(): void {
    if (this.selectedTarget && !this.selectedTarget.isActive()) {
      this.selectedTarget = null;
    }
  }

  private handleTargetLockRequest(): void {
    const aimSolution = this.getAimSolution();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const projected = projectAimPointCrosshair(
      this.renderer.camera,
      aimSolution.aimPoint,
      viewportWidth,
      viewportHeight,
    );

    if (!projected.visible) {
      this.selectedTarget = null;
      return;
    }

    const target = selectTargetUnderCrosshair(
      this.renderer.camera,
      this.getTargetableObjects(),
      projected.x,
      projected.y,
      viewportWidth,
      viewportHeight,
    );

    if (target && this.selectedTarget?.id === target.id) {
      this.selectedTarget = null;
      return;
    }

    this.selectedTarget = target;
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
    const elapsedTime = now / 1000;
    this.lastTime = now;

    // Input
    this.input.update(dt);
    this.updateSelectedTarget();
    if (this.input.consumeTargetLockRequest()) {
      this.handleTargetLockRequest();
    }

    const state = this.input.getState();
    const selectedTarget = this.selectedTarget?.isActive() ? this.selectedTarget : null;
    this.playerShip.controller.setSelectedTarget(selectedTarget);
    if (this.playerShip.isActive()) {
      this.playerShip.controller.setThrust(state.thrust);
      this.playerShip.controller.setStrafe(state.strafe);
      this.playerShip.controller.setVerticalStrafe(state.verticalStrafe);
      this.playerShip.controller.setYaw(state.yaw);
      this.playerShip.controller.setPitch(state.pitch);
      this.playerShip.controller.setRoll(state.roll);
      this.playerShip.controller.setFiring(state.firing);
      this.thrustLevel = state.thrust;
    } else {
      this.playerShip.controller.setSelectedTarget(null);
      this.playerShip.controller.setThrust(0);
      this.playerShip.controller.setStrafe(0);
      this.playerShip.controller.setVerticalStrafe(0);
      this.playerShip.controller.setYaw(0);
      this.playerShip.controller.setPitch(0);
      this.playerShip.controller.setRoll(0);
      this.playerShip.controller.setFiring(false);
      this.thrustLevel = 0;
    }
    this.input.resetMouseDelta();

    for (const target of this.targets) {
      target.update(dt);
    }

    const spawnedProjectiles: import('../simulation/WeaponModule.js').ProjectileData[] = [];

    // Player simulation
    if (this.playerShip.isActive()) {
      const result = this.playerShip.controller.update(dt);
      spawnedProjectiles.push(...result.projectiles);
      this.playerShip.update(dt);
    } else {
      this.playerShip.update(dt);
    }

    // Enemy simulation + AI
    for (const ai of this.enemyAIs) {
      const result = ai.update(dt, this.playerShip.position);
      spawnedProjectiles.push(...result.projectiles);
    }

    for (const pData of spawnedProjectiles) {
      const proj = new Projectile(pData);
      this.projectileSystem.add(proj);

      if (!shouldRenderProjectileVisual(proj.position, this.playerShip.position)) {
        continue;
      }

      const meshId = this.renderer.projectileMesh.spawn(
        pData.position.x, pData.position.y, pData.position.z,
        pData.velocity.x, pData.velocity.y, pData.velocity.z,
        pData.damage,
      );
      if (meshId >= 0) {
        this.projectileVisuals.set(this.nextVisualId, { meshId, projectile: proj });
        this.nextVisualId++;
      }
    }

    // Update projectiles + resolve target hits
    const combatTargets: CombatTarget[] = [this.playerShip, ...this.enemyShips, ...this.targets];
    this.projectileSystem.update(dt, combatTargets);
    this.updateSelectedTarget();

    // Sync projectile visuals
    const toRemove: number[] = [];
    this.projectileVisuals.forEach((visual, id) => {
      if (!visual.projectile.isActive()) {
        this.renderer.projectileMesh.destroy(visual.meshId);
        toRemove.push(id);
      } else if (!shouldRenderProjectileVisual(visual.projectile.position, this.playerShip.position)) {
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
    const hull = this.playerShip.hull;
    this.playerMesh.position.set(hull.position.x, hull.position.y, hull.position.z);
    const q = this.syncQuaternion();
    this.playerMesh.quaternion.copy(q);
    this.playerMesh.visible = this.playerShip.isActive();
    this.renderer.shipMeshFactory.updateThrusterVisuals(
      this.playerMesh,
      this.playerShip.isActive() ? this.thrustLevel : 0,
      elapsedTime,
    );

    // Sync target visuals
    for (const target of this.targets) {
      const visual = this.targetVisuals.get(target.id);
      if (!visual) continue;
      updateTargetMesh(visual.object as Mesh, target);
    }

    for (const ship of this.enemyShips) {
      const visual = this.targetVisuals.get(ship.id);
      if (!visual) continue;
      const shipGroup = visual.object as import('three').Group;
      updateEnemyShipTargetMesh(shipGroup, ship);
      this.renderer.shipMeshFactory.updateThrusterVisuals(
        shipGroup,
        ship.isActive() ? ship.controller.thrust : 0,
        elapsedTime,
      );
    }

    // Camera
    this.renderer.cameraController.update(
      this.playerMesh.position,
      q,
    );

    if (this.playerShip.isActive()) {
      this.crosshair.update(this.renderer.camera, this.getAimSolution());
    } else {
      this.crosshair.hide();
    }

    this.updateDebugHUD();
    this.renderer.render();
  }

  private debugEl: HTMLDivElement | null = null;
  private thrustLevel: number = 0;

  private getThrustPercent(): number {
    return Math.round(this.thrustLevel * 100);
  }

  private renderTargetStatus(): string {
    const dummyStatus = this.targets.map((target) => {
      const status = target.isActive()
        ? `${Math.round(target.health)}/${target.maxHealth}`
        : 'reforming';
      const damage = target.getRecentDamageAmount() > 0
        ? ` (-${target.getRecentDamageAmount()})`
        : '';

      return `<div>${target.id}: ${status}${damage}</div>`;
    });

    const enemyStatus = this.enemyShips.map((ship, index) => {
      const ai = this.enemyAIs[index];
      const status = ship.isActive()
        ? `${Math.round(ship.health)}/${ship.maxHealth}`
        : 'reforming';
      const damage = ship.getRecentDamageAmount() > 0
        ? ` (-${ship.getRecentDamageAmount()})`
        : '';
      return `<div>${ship.hullClass}:${ship.id}: ${status}${damage} [${ai?.state ?? 'patrol'}]</div>`;
    });

    return [...dummyStatus, ...enemyStatus].join('');
  }

  private updateDebugHUD(): void {
    if (!this.debugEl) {
      this.debugEl = document.createElement('div');
      this.debugEl.style.cssText = 'position:fixed;top:10px;right:10px;color:#0f0;font-family:monospace;font-size:12px;pointer-events:none;z-index:999;background:rgba(0,0,0,0.7);padding:8px;border-radius:4px;max-width:360px;';
      document.body.appendChild(this.debugEl);
    }
    const fwd = this.playerShip.controller.getForward();
    const aimSolution = this.getAimSolution();
    const playerStatus = this.playerShip.isActive()
      ? `${Math.round(this.playerShip.health)}/${this.playerShip.maxHealth}`
      : 'reforming';
    const targetLockStatus = this.selectedTarget
      ? `${this.selectedTarget.id} @ ${Math.round(aimSolution.aimDistance)}`
      : `none (${Math.round(aimSolution.aimDistance)} convergence)`;
    this.debugEl.innerHTML = `
      <div>Ship: ${this.playerShip.hull.hullClass}</div>
      <div>Hull: ${playerStatus}</div>
      <div>Forward: (${fwd.x.toFixed(2)}, ${fwd.y.toFixed(2)}, ${fwd.z.toFixed(2)})</div>
      <div>Thrust: ${this.getThrustPercent()}%</div>
      <div>Target Lock: ${targetLockStatus}</div>
      <div>Projectiles: ${this.projectileVisuals.size}</div>
      <div>Targets:</div>
      ${this.renderTargetStatus()}
    `;
  }

  dispose(): void {
    this.stop();
    this.input.detach();
    this.crosshair.dispose();

    this.targetVisuals.forEach((visual) => {
      this.renderer.scene.remove(visual.object);
      disposeObject3D(visual.object);
    });
    this.targetVisuals.clear();

    this.renderer.dispose();
  }
}
