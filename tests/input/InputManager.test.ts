import { describe, it, expect } from 'vitest';
import { InputManager } from '../../src/input/InputManager.js';

describe('InputManager roll mapping', () => {
  it('maps Q to roll left and E to roll right', () => {
    const input = new InputManager();
    const keys = (input as unknown as { keys: Set<string> }).keys;

    keys.add('KeyQ');
    expect(input.getState().roll).toBe(-1);

    keys.delete('KeyQ');
    keys.add('KeyE');
    expect(input.getState().roll).toBe(1);
  });
});
