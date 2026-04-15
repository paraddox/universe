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

describe('InputManager control mapping', () => {
  it('maps plain W/S to pitch only', () => {
    const input = new InputManager();
    const keys = getKeys(input);

    keys.add('KeyW');
    let state = input.getState();
    expect(state.pitch).toBe(-1);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);

    keys.clear();
    keys.add('KeyS');
    state = input.getState();
    expect(state.pitch).toBe(1);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);
  });

  it('maps plain A/D to yaw only with A left and D right on screen', () => {
    const input = new InputManager();
    const keys = getKeys(input);

    keys.add('KeyA');
    let state = input.getState();
    expect(state.yaw).toBe(1);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);

    keys.clear();
    keys.add('KeyD');
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
    let state = input.getState();
    expect(state.verticalStrafe).toBe(1);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.strafe).toBeCloseTo(0, 10);

    keys.clear();
    keys.add('ShiftLeft');
    keys.add('KeyS');
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
    let state = input.getState();
    expect(state.strafe).toBe(1);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);

    keys.clear();
    keys.add('ShiftLeft');
    keys.add('KeyD');
    state = input.getState();
    expect(state.strafe).toBe(-1);
    expect(state.yaw).toBeCloseTo(0, 10);
    expect(state.pitch).toBeCloseTo(0, 10);
    expect(state.verticalStrafe).toBeCloseTo(0, 10);
  });

  it('applies wheel thrust proportionally to scroll magnitude', () => {
    const input = new InputManager();

    triggerWheel(input, -1);
    expect(input.getState().thrust).toBeCloseTo(0.001, 10);

    triggerWheel(input, -9);
    expect(input.getState().thrust).toBeCloseTo(0.01, 10);

    triggerWheel(input, -90);
    expect(input.getState().thrust).toBeCloseTo(0.1, 10);
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
