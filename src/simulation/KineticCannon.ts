import type { Vec3, ProjectileData, WeaponModule } from './WeaponModule.js';

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

const VARIANTS = {
  light: { damage: 5, range: 100, projectileSpeed: 80, cooldown: 0.15 },
  heavy: { damage: 15, range: 150, projectileSpeed: 60, cooldown: 0.4 },
} as const;

export class KineticCannon implements WeaponModule {
  type = 'KineticCannon' as const;
  damage: number;
  range: number;
  projectileSpeed: number;
  cooldown: number;

  private cooldownTimer: number = 0;
  private _ownerId: string;

  constructor(variant: 'light' | 'heavy', ownerId: string) {
    const config = VARIANTS[variant];
    this.damage = config.damage;
    this.range = config.range;
    this.projectileSpeed = config.projectileSpeed;
    this.cooldown = config.cooldown;
    this._ownerId = ownerId;
  }

  canFire(): boolean {
    return this.cooldownTimer <= 0;
  }

  update(dt: number): void {
    this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
  }

  fire(origin: Vec3, direction: Vec3): ProjectileData[] {
    if (!this.canFire()) return [];

    this.cooldownTimer = this.cooldown;

    const n = normalize(direction);

    return [
      {
        position: { x: origin.x, y: origin.y, z: origin.z },
        velocity: {
          x: n.x * this.projectileSpeed,
          y: n.y * this.projectileSpeed,
          z: n.z * this.projectileSpeed,
        },
        damage: this.damage,
        ownerId: this._ownerId,
        maxAge: this.range / this.projectileSpeed,
      },
    ];
  }
}
