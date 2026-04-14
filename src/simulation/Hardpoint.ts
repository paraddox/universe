import type { WeaponModule } from './WeaponModule.js';

export type SlotType = 'weapon' | 'utility' | 'engine';

export class Hardpoint {
  id: string;
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number };
  slotType: SlotType;
  mountedModule: WeaponModule | null;

  constructor(
    id: string,
    position: { x: number; y: number; z: number },
    orientation: { x: number; y: number; z: number },
    slotType: SlotType,
  ) {
    this.id = id;
    this.position = { ...position };
    this.orientation = { ...orientation };
    this.slotType = slotType;
    this.mountedModule = null;
  }

  isOccupied(): boolean {
    return this.mountedModule !== null;
  }

  mount(module: WeaponModule): void {
    if (this.isOccupied()) {
      throw new Error(`Hardpoint '${this.id}' is already occupied`);
    }
    this.mountedModule = module;
  }

  unmount(): WeaponModule | null {
    const mod = this.mountedModule;
    this.mountedModule = null;
    return mod;
  }
}
