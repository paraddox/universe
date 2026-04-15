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
  private canvas: HTMLCanvasElement | null = null;
  private pointerLocked: boolean = false;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: () => void;
  private boundMouseUp: () => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundPointerLockChange: () => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundWheel = this.onWheel.bind(this);
    this.boundPointerLockChange = this.onPointerLockChange.bind(this);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mouseup', this.boundMouseUp);
    document.addEventListener('wheel', this.boundWheel, { passive: false });
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);

    canvas.addEventListener('click', () => {
      if (!this.pointerLocked) {
        canvas.requestPointerLock();
      }
    });
  }

  detach(): void {
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('mousedown', this.boundMouseDown);
    document.removeEventListener('mouseup', this.boundMouseUp);
    document.removeEventListener('wheel', this.boundWheel);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
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

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    if (e.deltaY === 0) {
      return;
    }

    // Scale thrust by actual scroll magnitude, but ensure tiny wheel/trackpad motion can still escape 0%/100%.
    const thrustDelta = Math.max(Math.abs(e.deltaY) * THRUST_SCROLL_SENSITIVITY, MIN_THRUST_SCROLL_STEP);
    this.thrustLevel -= Math.sign(e.deltaY) * thrustDelta;
    this.thrustLevel = Math.max(0, Math.min(MAX_THRUST, this.thrustLevel));
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
