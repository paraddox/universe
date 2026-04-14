import { Hardpoint } from './Hardpoint.js';
import type { WeaponModule, Vec3 } from './WeaponModule.js';

export interface ShipHullConfig {
  id: string;
  hullClass: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  mass: number;
  maxSpeed: number;
  turnRate: number;
}

export class ShipHull {
  id: string;
  hullClass: string;
  name: string;
  dimensions: { length: number; width: number; height: number };
  mass: number;
  maxSpeed: number;
  turnRate: number;
  hardpoints: Hardpoint[];
  position: Vec3;
  velocity: Vec3;
  rotation: Vec3;

  constructor(config: ShipHullConfig) {
    this.id = config.id;
    this.hullClass = config.hullClass;
    this.name = config.name;
    this.dimensions = { ...config.dimensions };
    this.mass = config.mass;
    this.maxSpeed = config.maxSpeed;
    this.turnRate = config.turnRate;
    this.hardpoints = [];
    this.position = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
  }

  addHardpoint(hardpoint: Hardpoint): void {
    this.hardpoints.push(hardpoint);
  }

  getHardpoint(id: string): Hardpoint | undefined {
    return this.hardpoints.find((hp) => hp.id === id);
  }

  mountWeapon(hardpointId: string, weapon: WeaponModule): void {
    const hp = this.getHardpoint(hardpointId);
    if (!hp) {
      throw new Error(`Hardpoint '${hardpointId}' not found on hull '${this.id}'`);
    }
    hp.mount(weapon);
  }

  unmountWeapon(hardpointId: string): WeaponModule | null {
    const hp = this.getHardpoint(hardpointId);
    if (!hp) {
      return null;
    }
    return hp.unmount();
  }

  update(dt: number): void {
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;
  }
}
