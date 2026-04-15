import type { Quat } from './Quat.js';
import type { Vec3 } from './WeaponModule.js';

export interface CombatTarget {
  id: string;
  position: Vec3;
  radius: number;
  teamId: string;
  kind: 'dummy' | 'ship';
  hullClass?: string;
  orientation?: Quat;

  isActive(): boolean;
  takeDamage(amount: number): void;
  getHealthRatio(): number;
  getHitFlashRatio(): number;
  getRecentDamageAmount(): number;
}
