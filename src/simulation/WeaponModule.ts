export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ProjectileData {
  position: Vec3;
  velocity: Vec3;
  damage: number;
  ownerId: string;
  maxAge: number;
}

export interface WeaponModule {
  type: string;
  damage: number;
  range: number;
  projectileSpeed: number;
  cooldown: number;
  canFire(): boolean;
  update(dt: number): void;
  fire(origin: Vec3, direction: Vec3): ProjectileData[];
}
