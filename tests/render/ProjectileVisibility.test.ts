import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROJECTILE_VISUAL_RANGE,
  shouldRenderProjectileVisual,
} from '../../src/render/ProjectileVisibility.js';

describe('ProjectileVisibility', () => {
  it('renders projectiles that are within the default local combat bubble', () => {
    expect(shouldRenderProjectileVisual(
      { x: 0, y: 0, z: DEFAULT_PROJECTILE_VISUAL_RANGE },
      { x: 0, y: 0, z: 0 },
    )).toBe(true);
  });

  it('culls projectiles that have traveled beyond the default local combat bubble', () => {
    expect(shouldRenderProjectileVisual(
      { x: 0, y: 0, z: DEFAULT_PROJECTILE_VISUAL_RANGE + 1 },
      { x: 0, y: 0, z: 0 },
    )).toBe(false);
  });

  it('supports a custom visual range override', () => {
    expect(shouldRenderProjectileVisual(
      { x: 0, y: 0, z: 250 },
      { x: 0, y: 0, z: 0 },
      300,
    )).toBe(true);
    expect(shouldRenderProjectileVisual(
      { x: 0, y: 0, z: 301 },
      { x: 0, y: 0, z: 0 },
      300,
    )).toBe(false);
  });
});
