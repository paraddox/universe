import { describe, it, expect, vi, afterEach } from 'vitest';
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

afterEach(() => {
  vi.restoreAllMocks();
});

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

  it('treats the first wheel direction from zero as increasing thrust so devices do not start inverted', () => {
    const input = new InputManager();

    triggerWheel(input, 1);
    const afterFirst = input.getState().thrust;
    expect(afterFirst).toBeGreaterThan(0);

    triggerWheel(input, 20);
    expect(input.getState().thrust).toBeGreaterThan(afterFirst);

    triggerWheel(input, -10);
    expect(input.getState().thrust).toBeLessThan(afterFirst + 0.02);
  });

  it('does not let an opposite-sign bounce immediately cancel the first escape from zero thrust', () => {
    const input = new InputManager();

    triggerWheel(input, 1);
    expect(input.getState().thrust).toBeGreaterThan(0);

    triggerWheel(input, -1);
    const afterProtectedBounce = input.getState().thrust;
    expect(afterProtectedBounce).toBeGreaterThan(0);

    triggerWheel(input, -20);
    expect(input.getState().thrust).toBe(0);
  });

  it('still scales larger wheel thrust changes proportionally', () => {
    const input = new InputManager();

    triggerWheel(input, -90);
    expect(input.getState().thrust).toBeCloseTo(0.09, 10);

    triggerWheel(input, 30);
    expect(input.getState().thrust).toBeCloseTo(0.06, 10);
  });

  it('keeps low-magnitude wheel input proportional after thrust has already escaped zero', () => {
    const input = new InputManager();

    triggerWheel(input, 1);
    expect(input.getState().thrust).toBeCloseTo(0.01, 10);

    triggerWheel(input, 1);
    expect(input.getState().thrust).toBeCloseTo(0.011, 10);
  });

  it('does not let tiny opposite bounce cancel a larger low-magnitude increase at mid thrust', () => {
    const input = new InputManager();

    triggerWheel(input, 300);
    triggerWheel(input, 300);
    const baseline = input.getState().thrust;
    expect(baseline).toBeCloseTo(0.6, 10);

    triggerWheel(input, 9);
    triggerWheel(input, -1);

    expect(input.getState().thrust).toBeGreaterThan(baseline);
  });

  it('lets tiny wheel motion escape from 100% thrust', () => {
    const input = new InputManager();

    triggerWheel(input, -1000);
    expect(input.getState().thrust).toBe(1);

    triggerWheel(input, 1);
    expect(input.getState().thrust).toBeLessThan(1);
  });

  it('makes the canvas focusable and focuses it on click before requesting pointer lock', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const documentStub = {
      addEventListener,
      removeEventListener,
      activeElement: null,
      pointerLockElement: null,
    };
    vi.stubGlobal('document', documentStub);

    let clickHandler: (() => void) | undefined;
    const canvas = {
      tabIndex: -1,
      addEventListener: vi.fn((type: string, handler: () => void) => {
        if (type === 'click') {
          clickHandler = handler;
        }
      }),
      focus: vi.fn(),
      requestPointerLock: vi.fn(),
    } as unknown as HTMLCanvasElement;

    const input = new InputManager();
    input.attach(canvas);

    expect(canvas.tabIndex).toBe(0);
    expect(clickHandler).toBeTypeOf('function');

    clickHandler?.();

    expect(canvas.focus).toHaveBeenCalled();
    expect(canvas.requestPointerLock).toHaveBeenCalled();
  });

  it('still focuses the canvas on click even when pointer lock is already active', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const documentStub = {
      addEventListener,
      removeEventListener,
      activeElement: null,
      pointerLockElement: null,
    };
    vi.stubGlobal('document', documentStub);

    let clickHandler: (() => void) | undefined;
    const canvas = {
      tabIndex: -1,
      addEventListener: vi.fn((type: string, handler: () => void) => {
        if (type === 'click') {
          clickHandler = handler;
        }
      }),
      focus: vi.fn(),
      requestPointerLock: vi.fn(),
    } as unknown as HTMLCanvasElement;

    const input = new InputManager();
    input.attach(canvas);
    (input as unknown as { pointerLocked: boolean }).pointerLocked = true;

    clickHandler?.();

    expect(canvas.focus).toHaveBeenCalled();
    expect(canvas.requestPointerLock).not.toHaveBeenCalled();
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

  it('latches KeyT as a one-shot target lock request', () => {
    const input = new InputManager();
    const onKeyDown = (input as unknown as { onKeyDown: (e: { code: string; repeat?: boolean }) => void }).onKeyDown;

    onKeyDown.call(input, { code: 'KeyT', repeat: false });

    expect(input.consumeTargetLockRequest()).toBe(true);
    expect(input.consumeTargetLockRequest()).toBe(false);
  });
});
