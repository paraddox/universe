import { describe, it, expect } from 'vitest';
import { ShipController } from '../../src/simulation/ShipController.js';
import { createHull } from '../../src/data/hulls.js';
import { Quat } from '../../src/simulation/Quat.js';

describe('Auto-stabilization', () => {
  it('gradually returns to level from 90° pitch when no input', () => {
    const hull = createHull('fighter');
    const ctrl = new ShipController(hull);

    // Pitch ship 90° nose-down
    hull.orientation = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 2);
    ctrl.setPitch(0);
    ctrl.setRoll(0);
    ctrl.setYaw(0);

    // Run 120 frames (2 seconds) with no input
    for (let i = 0; i < 120; i++) {
      ctrl.update(1 / 60);
    }

    // Ship should be mostly level — forward direction should be mostly horizontal
    const fwd = ctrl.getForward();
    expect(Math.abs(fwd.y)).toBeLessThan(0.15);
  });

  it('gradually returns to level from 90° roll when no input', () => {
    const hull = createHull('fighter');
    const ctrl = new ShipController(hull);

    // Roll 90°
    hull.orientation = Quat.fromAxisAngle({ x: 0, y: 0, z: 1 }, Math.PI / 2);
    ctrl.setPitch(0);
    ctrl.setRoll(0);
    ctrl.setYaw(0);

    for (let i = 0; i < 120; i++) {
      ctrl.update(1 / 60);
    }

    // Local up should align with world up
    const localUp = hull.orientation.rotateVector({ x: 0, y: 1, z: 0 });
    expect(localUp.y).toBeGreaterThan(0.85);
  });

  it('does NOT auto-stabilize while pitch input is active', () => {
    const hull = createHull('fighter');
    const ctrl = new ShipController(hull);

    // Pitch 45°
    hull.orientation = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 4);
    ctrl.setPitch(1); // still pitching
    ctrl.setRoll(0);
    ctrl.setYaw(0);

    for (let i = 0; i < 60; i++) {
      ctrl.update(1 / 60);
    }

    // Ship should NOT have leveled — it was pitching the whole time
    const fwd = ctrl.getForward();
    expect(Math.abs(fwd.y)).toBeGreaterThan(0.5);
  });

  it('preserves yaw heading while stabilizing pitch and roll', () => {
    const hull = createHull('fighter');
    const ctrl = new ShipController(hull);

    // Yaw 90° then pitch 45°
    const yawQ = Quat.fromAxisAngle({ x: 0, y: 1, z: 0 }, Math.PI / 2);
    const pitchQ = Quat.fromAxisAngle({ x: 1, y: 0, z: 0 }, Math.PI / 4);
    hull.orientation = yawQ.multiply(pitchQ);

    ctrl.setPitch(0);
    ctrl.setRoll(0);
    ctrl.setYaw(0);

    for (let i = 0; i < 120; i++) {
      ctrl.update(1 / 60);
    }

    // Yaw heading should be preserved — forward should be roughly along world X
    const fwd = ctrl.getForward();
    expect(Math.abs(fwd.x)).toBeGreaterThan(0.8);
    expect(Math.abs(fwd.y)).toBeLessThan(0.15); // leveled out
  });
});
