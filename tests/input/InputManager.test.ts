import { describe, it, expect } from 'vitest';
import { InputManager } from '../../src/input/InputManager.js';

function getKeys(input: InputManager): Set<string> {
  return (input as unknown as { keys: Set<string> }).keys;
}

function triggerWheel(input: InputManager, deltaY: number): void {
  const onWheel = (input as unknown as { onWheel: (e: { deltaY: number; preventDefault: () => void }) => void }).onWheel;
  onWheel.call(input, {
    deltaY,
    preventDefault: () => {},
  });
}

function advanceInput(input: InputManager, seconds: number): void {
  input.update(seconds);
}

describe('InputManager control mapping', () => {
  it('maps plain W/S to pitch only', () => {
    const input = new InputManager();
    const keys = getKeys(input);

    keys.add('KeyW');
    advanceInput(input, 1);
    let state = input.getState();
    expect(state.pitch).toBe(-1);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);

    keys.clear();
    keys.add('KeyS');
    advanceInput(input, 1);
    state = input.getState();
    expect(state.pitch).toBe(1);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);
  });

  it('ramps keyboard pitch smoothly instead of jumping to full strength on the first frame', () => {
    const input = new InputManager();
    const keys = getKeys(input);

    keys.add('KeyW');

    advanceInput(input, 1 / 60);
    const firstFramePitch = input.getState().pitch;
    expect(firstFramePitch).toBeLessThan(0);
    expect(firstFramePitch).toBeGreaterThan(-1);

    advanceInput(input, 9 / 60);
    const laterPitch = input.getState().pitch;
    expect(laterPitch).toBeLessThan(firstFramePitch);
    expect(laterPitch).toBeLessThan(-0.5);
  });

  it('maps plain A/D to yaw only with A left and D right on screen', () => {
    const input = new InputManager();
    const keys = getKeys(input);

    keys.add('KeyA');
    advanceInput(input, 1);
    let state = input.getState();
    expect(state.yaw).toBe(1);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);

    keys.clear();
    keys.add('KeyD');
    advanceInput(input, 1);
    state = input.getState();
    expect(state.yaw).toBe(-1);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);
  });

  it('maps Shift+W/S to vertical strafe only', () => {
    const input = new InputManager();
    const keys = getKeys(input);

    keys.add('ShiftLeft');
    keys.add('KeyW');
    advanceInput(input, 1);
    let state = input.getState();
    expect(state.verticalStrafe).toBe(1);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);

    keys.clear();
    keys.add('ShiftLeft');
    keys.add('KeyS');
    advanceInput(input, 1);
    state = input.getState();
    expect(state.verticalStrafe).toBe(-1);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);
  });

  it('maps Shift+A/D to lateral strafe only', () => {
    const input = new InputManager();
    const keys = getKeys(input);

    keys.add('ShiftLeft');
    keys.add('KeyA');
    advanceInput(input, 1);
    let state = input.getState();
    expect(state.strafe).toBe(1);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);

    keys.clear();
    keys.add('ShiftLeft');
    keys.add('KeyD');
    advanceInput(input, 1);
    state = input.getState();
    expect(state.strafe).toBe(-1);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);
  });

  it('supports per-ship keyboard turn response tuning', () => {
    const slowInput = new InputManager();
    slowInput.setKeyboardTurnResponse(2);
    getKeys(slowInput).add('KeyW');
    advanceInput(slowInput, 1 / 60);

    const fastInput = new InputManager();
    fastInput.setKeyboardTurnResponse(14);
    getKeys(fastInput).add('KeyW');
    advanceInput(fastInput, 1 / 60);

    expect(Math.abs(fastInput.getState().pitch)).toBeGreaterThan(Math.abs(slowInput.getState().pitch));
  });

  it('escapes zero thrust on tiny upward wheel input so scroll does not feel locked at 0', () => {
    const input = new InputManager();

    triggerWheel(input, -1);

    expect(Math.round(input.getState().thrust * 100)).toBeGreaterThan(0);
  });

  it('still scales larger wheel thrust changes proportionally', () => {
    const input = new InputManager();

    triggerWheel(input, -90);
    expect(input.getState().thrust).toBeCloseTo(0.09, 10);

    triggerWheel(input, 30);
    expect(input.getState().thrust).toBeCloseTo(0.06, 10);
  });

  it('maps Q to roll left and E to roll right', () => {
    const input = new InputManager();
    const keys = getKeys(input);

    keys.add('KeyQ');
    expect(input.getState().roll).toBe(-1);

    keys.delete('KeyQ');
    keys.add('KeyE');
    expect(input.getState().roll).toBe(1);
  });
});
