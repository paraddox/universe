import * as THREE from 'three';
import type { AimSolution } from '../simulation/TargetingSystem.js';
import type { Vec3 } from '../simulation/WeaponModule.js';

export interface ScreenProjection {
  x: number;
  y: number;
  visible: boolean;
}

export function projectWorldPoint(
  camera: THREE.PerspectiveCamera,
  point: THREE.Vector3,
  viewportWidth: number,
  viewportHeight: number,
): ScreenProjection {
  const projected = point.clone().project(camera);
  const visible = Number.isFinite(projected.x)
    && Number.isFinite(projected.y)
    && Number.isFinite(projected.z)
    && projected.z >= -1
    && projected.z <= 1;

  return {
    x: ((projected.x + 1) * 0.5) * viewportWidth,
    y: ((1 - projected.y) * 0.5) * viewportHeight,
    visible,
  };
}

export function projectAimPointCrosshair(
  camera: THREE.PerspectiveCamera,
  point: Vec3,
  viewportWidth: number,
  viewportHeight: number,
): ScreenProjection {
  return projectWorldPoint(
    camera,
    new THREE.Vector3(point.x, point.y, point.z),
    viewportWidth,
    viewportHeight,
  );
}

function positionElement(element: HTMLElement, x: number, y: number): void {
  element.style.left = `${x}px`;
  element.style.top = `${y}px`;
}

export class TargetingCrosshairOverlay {
  readonly element: HTMLDivElement;
  readonly targetMarker: HTMLDivElement;
  readonly leadLine: HTMLDivElement;
  readonly rangeLabel: HTMLDivElement;

  constructor(doc: Document = document) {
    const root = doc.createElement('div');
    root.id = 'targeting-crosshair';
    root.style.cssText = [
      'position: fixed',
      'left: 50%',
      'top: 50%',
      'width: 22px',
      'height: 22px',
      'transform: translate(-50%, -50%)',
      'pointer-events: none',
      'user-select: none',
      'z-index: 980',
      'opacity: 0',
      'transition: opacity 80ms linear',
      'filter: drop-shadow(0 0 8px rgba(170, 204, 255, 0.35))',
    ].join(';');

    const ring = doc.createElement('div');
    ring.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'width: 14px',
      'height: 14px',
      'transform: translate(-50%, -50%)',
      'border: 1px solid rgba(170, 204, 255, 0.9)',
      'border-radius: 999px',
    ].join(';');

    const hBar = doc.createElement('div');
    hBar.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'width: 18px',
      'height: 2px',
      'transform: translate(-50%, -50%)',
      'background: rgba(170, 204, 255, 0.95)',
      'border-radius: 999px',
    ].join(';');

    const vBar = doc.createElement('div');
    vBar.style.cssText = [
      'position: absolute',
      'left: 50%',
      'top: 50%',
      'width: 2px',
      'height: 18px',
      'transform: translate(-50%, -50%)',
      'background: rgba(170, 204, 255, 0.95)',
      'border-radius: 999px',
    ].join(';');

    const targetMarker = doc.createElement('div');
    targetMarker.id = 'targeting-target-marker';
    targetMarker.style.cssText = [
      'position: fixed',
      'width: 30px',
      'height: 30px',
      'transform: translate(-50%, -50%)',
      'pointer-events: none',
      'z-index: 978',
      'opacity: 0',
      'box-sizing: border-box',
      'border: 1px solid rgba(255, 196, 120, 0.95)',
      'border-radius: 6px',
      'box-shadow: 0 0 10px rgba(255, 180, 90, 0.35)',
      'background: rgba(255, 180, 90, 0.04)',
    ].join(';');

    const leadLine = doc.createElement('div');
    leadLine.id = 'targeting-lead-line';
    leadLine.style.cssText = [
      'position: fixed',
      'left: 0',
      'top: 0',
      'height: 2px',
      'width: 0',
      'transform-origin: 0 50%',
      'pointer-events: none',
      'z-index: 977',
      'opacity: 0',
      'background: linear-gradient(90deg, rgba(255,196,120,0.9), rgba(170,204,255,0.75))',
      'box-shadow: 0 0 10px rgba(170, 204, 255, 0.2)',
    ].join(';');

    const rangeLabel = doc.createElement('div');
    rangeLabel.id = 'targeting-range-label';
    rangeLabel.style.cssText = [
      'position: fixed',
      'left: 0',
      'top: 0',
      'transform: translate(-50%, 10px)',
      'pointer-events: none',
      'z-index: 979',
      'opacity: 0',
      'padding: 2px 6px',
      'border-radius: 999px',
      'font-family: monospace',
      'font-size: 11px',
      'letter-spacing: 0.04em',
      'color: rgba(255, 231, 200, 0.96)',
      'background: rgba(10, 18, 28, 0.72)',
      'border: 1px solid rgba(255, 196, 120, 0.28)',
      'box-shadow: 0 0 10px rgba(255, 180, 90, 0.14)',
    ].join(';');

    root.appendChild(ring);
    root.appendChild(hBar);
    root.appendChild(vBar);
    doc.body.appendChild(leadLine);
    doc.body.appendChild(targetMarker);
    doc.body.appendChild(rangeLabel);
    doc.body.appendChild(root);

    this.element = root;
    this.targetMarker = targetMarker;
    this.leadLine = leadLine;
    this.rangeLabel = rangeLabel;
  }

  update(
    camera: THREE.PerspectiveCamera,
    aimSolution: AimSolution,
    viewportWidth: number = window.innerWidth,
    viewportHeight: number = window.innerHeight,
  ): void {
    const aimProjection = projectAimPointCrosshair(
      camera,
      aimSolution.aimPoint,
      viewportWidth,
      viewportHeight,
    );

    if (!aimProjection.visible) {
      this.hide();
      return;
    }

    this.element.style.opacity = '1';
    positionElement(this.element, aimProjection.x, aimProjection.y);

    if (!aimSolution.targetPoint) {
      this.hideTargetIndicators();
      return;
    }

    const targetProjection = projectAimPointCrosshair(
      camera,
      aimSolution.targetPoint,
      viewportWidth,
      viewportHeight,
    );

    if (!targetProjection.visible) {
      this.hideTargetIndicators();
      return;
    }

    this.targetMarker.style.opacity = '1';
    positionElement(this.targetMarker, targetProjection.x, targetProjection.y);

    this.rangeLabel.textContent = `${Math.round(aimSolution.targetDistance)}m`;
    this.rangeLabel.style.opacity = '1';
    positionElement(this.rangeLabel, targetProjection.x, targetProjection.y + 22);

    const dx = aimProjection.x - targetProjection.x;
    const dy = aimProjection.y - targetProjection.y;
    const lineLength = Math.sqrt((dx * dx) + (dy * dy));
    if (lineLength > 4) {
      this.leadLine.style.opacity = '1';
      this.leadLine.style.width = `${lineLength}px`;
      this.leadLine.style.left = `${targetProjection.x}px`;
      this.leadLine.style.top = `${targetProjection.y}px`;
      this.leadLine.style.transform = `translateY(-50%) rotate(${Math.atan2(dy, dx)}rad)`;
    } else {
      this.leadLine.style.opacity = '0';
      this.leadLine.style.width = '0';
    }
  }

  private hideTargetIndicators(): void {
    this.targetMarker.style.opacity = '0';
    this.rangeLabel.style.opacity = '0';
    this.leadLine.style.opacity = '0';
    this.leadLine.style.width = '0';
  }

  hide(): void {
    this.element.style.opacity = '0';
    this.hideTargetIndicators();
  }

  dispose(): void {
    this.element.remove();
    this.targetMarker.remove();
    this.leadLine.remove();
    this.rangeLabel.remove();
  }
}
