export interface InputState {
  thrust: number;
  strafe: number;
  verticalStrafe: number;
  yaw: number;
  pitch: number;
  roll: number;
  firing: boolean;
}

const THRUST_SCROLL_SENSITIVITY = 0.001;
const MIN_THRUST_SCROLL_STEP = 0.01;
const MAX_THRUST = 1;
const DEFAULT_KEYBOARD_TURN_RESPONSE = 8;

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) {
    return Math.min(current + maxDelta, target);
  }

  if (current > target) {
    return Math.max(current - maxDelta, target);
  }

  return current;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseDown: boolean = false;
  private thrustLevel: number = 0;
  private keyboardYaw: number = 0;
  private keyboardPitch: number = 0;
  private keyboardTurnResponse: number = DEFAULT_KEYBOARD_TURN_RESPONSE;
  private thrustIncreaseScrollSign: number | null = null;
  private protectInitialZeroEscape: boolean = false;
  private canvas: HTMLCanvasElement | null = null;
  private pointerLocked: boolean = false;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: () => void;
  private boundMouseUp: () => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundPointerLockChange: () => void;
  private boundCanvasClick: () => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);
    this.boundPointerLockChange = this.onPointerLockChange.bind(this);
    this.boundCanvasClick = this.onCanvasClick.bind(this);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    if (canvas.tabIndex < 0) {
      canvas.tabIndex = 0;
    }
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('wheel', this.boundWheel, { passive: false });
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);

    canvas.addEventListener('click', this.boundCanvasClick);
  }

  detach(): void {
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mousedown', this.boundMouseDown);
    document.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('wheel', this.boundWheel);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    this.canvas?.removeEventListener('click', this.boundCanvasClick);
  }

  setKeyboardTurnResponse(value: number): void {
    this.keyboardTurnResponse = Math.max(0.1, value);
  }

  update(dt: number): void {
    const shiftHeld = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const targetKeyYaw = shiftHeld ? 0 : (this.keys.has('KeyA') ? 1 : 0) - (this.keys.has('KeyD') ? 1 : 0);
    const targetKeyPitch = shiftHeld ? 0 : (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0);
    const maxDelta = this.keyboardTurnResponse * dt;

    this.keyboardYaw = approach(this.keyboardYaw, targetKeyYaw, maxDelta);
    this.keyboardPitch = approach(this.keyboardPitch, targetKeyPitch, maxDelta);
  }

  getState(): InputState {
    const thrust = this.thrustLevel;
    const shiftHeld = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    const strafe = shiftHeld
      ? (this.keys.has('KeyA') ? 1 : 0) - (this.keys.has('KeyD') ? 1 : 0)
      : 0;
    const verticalStrafe = shiftHeld
      ? (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0)
      : 0;

    const mouseYaw = Math.max(-1, Math.min(1, -this.mouseX * 0.003));
    const yaw = Math.max(-1, Math.min(1, mouseYaw + this.keyboardYaw));

    const mousePitch = Math.max(-1, Math.min(1, this.mouseY * 0.003));
    const pitch = Math.max(-1, Math.min(1, this.keyboardPitch + mousePitch));

    const roll = (this.keys.has('KeyE') ? 1 : 0) - (this.keys.has('KeyQ') ? 1 : 0);
    const firing = this.mouseDown;

    return { thrust, strafe, verticalStrafe, yaw, pitch, roll, firing };
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.pointerLocked) {
      this.mouseX += e.movementX;
      this.mouseY += e.movementY;
    }
  }

  private onMouseDown(): void {
    this.mouseDown = true;
  }

  private onMouseUp(): void {
    this.mouseDown = false;
  }

  private onCanvasClick(): void {
    this.canvas?.focus();
    if (!this.pointerLocked) {
      this.canvas?.requestPointerLock();
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    if (e.deltaY === 0) {
      return;
    }

    const scrollSign = Math.sign(e.deltaY);
    const wasAtZero = this.thrustLevel === 0;
    if (this.thrustIncreaseScrollSign === null && wasAtZero) {
      this.thrustIncreaseScrollSign = scrollSign;
    }

    const increaseScrollSign = this.thrustIncreaseScrollSign ?? -1;
    const increasesThrust = scrollSign === increaseScrollSign;
    const rawThrustStep = Math.abs(e.deltaY) * THRUST_SCROLL_SENSITIVITY;
    const shouldForceMinimumEscape = rawThrustStep < MIN_THRUST_SCROLL_STEP && (
      (this.thrustLevel === 0 && increasesThrust) ||
      (this.thrustLevel === MAX_THRUST && !increasesThrust)
    );

    // Preserve true proportional wheel scaling once thrust has left the edge,
    // but still let tiny wheel/trackpad motion escape 0% or 100%.
    const thrustStep = shouldForceMinimumEscape
      ? MIN_THRUST_SCROLL_STEP
      : rawThrustStep;
    const signedStep = increasesThrust ? thrustStep : -thrustStep;
    const nextThrust = Math.max(0, Math.min(MAX_THRUST, this.thrustLevel + signedStep));

    if (this.protectInitialZeroEscape && signedStep < 0 && nextThrust === 0) {
      this.protectInitialZeroEscape = false;
      return;
    }

    this.thrustLevel = nextThrust;

    if (wasAtZero && this.thrustLevel > 0) {
      this.protectInitialZeroEscape = true;
    } else if (this.protectInitialZeroEscape) {
      this.protectInitialZeroEscape = false;
    }
  }

  private onPointerLockChange(): void {
    this.pointerLocked = document.pointerLockElement === this.canvas;
    if (!this.pointerLocked) {
      this.mouseX = 0;
      this.mouseY = 0;
    }
  }

  resetMouseDelta(): void {
    this.mouseX = 0;
    this.mouseY = 0;
  }
}
