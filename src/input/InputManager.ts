export interface InputState {
  thrust: number;
  strafe: number;
  verticalStrafe: number;
  yaw: number;
  pitch: number;
  firing: boolean;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseDown: boolean = false;
  private canvas: HTMLCanvasElement | null = null;
  private pointerLocked: boolean = false;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: () => void;
  private boundMouseUp: () => void;
  private boundPointerLockChange: () => void;

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseDown = this.onMouseDown.bind(this);
    this.boundMouseUp = this.onMouseUp.bind(this);
    this.boundPointerLockChange = this.onPointerLockChange.bind(this);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('mousedown', this.boundMouseDown);
    document.addEventListener('mouseup', this.boundMouseUp);
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
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
  }

  getState(): InputState {
    const thrust = this.keys.has('KeyW') ? 1 : 0;
    const strafe = (this.keys.has('KeyA') ? 1 : 0) - (this.keys.has('KeyD') ? 1 : 0);
    const verticalStrafe = (this.keys.has('Space') ? 1 : 0) - (this.keys.has('ShiftLeft') ? 1 : 0);
    const yaw = Math.max(-1, Math.min(1, -this.mouseX * 0.003));
    const pitch = Math.max(-1, Math.min(1, this.mouseY * 0.003));
    const firing = this.mouseDown || this.keys.has('Space');

    return { thrust, strafe, verticalStrafe, yaw, pitch, firing };
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
