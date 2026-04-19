import * as THREE from 'three';
import { createHull } from '../data/hulls.js';
import type { CombatTarget } from '../simulation/CombatTarget.js';
import { ShipMeshFactory } from './ShipMeshFactory.js';

interface MaterialState {
  material: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  baseEmissive: THREE.Color;
  baseEmissiveIntensity: number;
}

interface DamageOverlayState {
  material: THREE.MeshBasicMaterial;
  overlay: THREE.Mesh;
}

function getVisualRoot(group: THREE.Group): THREE.Object3D {
  return group.getObjectByName('ship-visual-root') ?? group;
}

function collectRenderableMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.userData.isDamageOverlay) return;
    meshes.push(child);
  });
  return meshes;
}

function collectMaterialStates(root: THREE.Object3D): MaterialState[] {
  const states: MaterialState[] = [];

  for (const mesh of collectRenderableMeshes(root)) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;
      states.push({
        material,
        baseColor: material.color.clone(),
        baseEmissive: material.emissive.clone(),
        baseEmissiveIntensity: material.emissiveIntensity,
      });
    }
  }

  return states;
}

function clearDamageOverlays(root: THREE.Object3D): void {
  for (const mesh of collectRenderableMeshes(root)) {
    const overlays = mesh.children.filter((child) => child.userData.isDamageOverlay);
    for (const overlay of overlays) {
      mesh.remove(overlay);
      const overlayMesh = overlay as THREE.Mesh;
      const material = overlayMesh.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material?.dispose();
      }
    }
  }
}

function buildDamageOverlayStates(root: THREE.Object3D): DamageOverlayState[] {
  clearDamageOverlays(root);

  const overlays: DamageOverlayState[] = [];
  for (const mesh of collectRenderableMeshes(root)) {
    const overlayMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5a36,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const overlay = new THREE.Mesh(mesh.geometry, overlayMaterial);
    overlay.name = 'damage-overlay';
    overlay.userData.isDamageOverlay = true;
    overlay.scale.setScalar(1.001);
    overlay.renderOrder = 3;
    mesh.add(overlay);
    overlays.push({ material: overlayMaterial, overlay });
  }

  return overlays;
}

function refreshEnemyShipRenderStates(group: THREE.Group, target: CombatTarget): void {
  const visualRoot = getVisualRoot(group);
  group.userData.materialStates = collectMaterialStates(visualRoot);
  group.userData.damageOverlayStates = buildDamageOverlayStates(visualRoot);
  updateEnemyShipTargetMesh(group, target);
}

export function createEnemyShipTargetMesh(target: CombatTarget, shipMeshFactory: ShipMeshFactory): THREE.Group {
  if (target.kind !== 'ship' || !target.hullClass) {
    throw new Error('Enemy ship target mesh requires a ship target with hullClass');
  }

  const hull = createHull(target.hullClass);
  const group = shipMeshFactory.createShipMesh(hull);
  group.userData.onVisualRootReplaced = () => refreshEnemyShipRenderStates(group, target);
  refreshEnemyShipRenderStates(group, target);
  return group;
}

export function updateEnemyShipTargetMesh(group: THREE.Group, target: CombatTarget): void {
  group.position.set(target.position.x, target.position.y, target.position.z);
  if (target.orientation) {
    group.quaternion.set(target.orientation.x, target.orientation.y, target.orientation.z, target.orientation.w);
  }
  group.visible = target.isActive();

  const flash = target.getHitFlashRatio();
  const ratio = target.getHealthRatio();
  const materialStates = (group.userData.materialStates as MaterialState[] | undefined) ?? [];
  const damageOverlayStates = (group.userData.damageOverlayStates as DamageOverlayState[] | undefined) ?? [];

  for (const state of materialStates) {
    state.material.color.copy(state.baseColor);
    state.material.emissive.copy(
      state.baseEmissive.clone().lerp(new THREE.Color(0xffffff), flash * 0.18),
    );
    state.material.emissiveIntensity = state.baseEmissiveIntensity + flash * 0.35;
  }

  for (const state of damageOverlayStates) {
    const overlayOpacity = THREE.MathUtils.clamp((1 - ratio) * 0.18 + flash * 0.72, 0, 0.85);
    state.material.opacity = overlayOpacity;
    state.material.color.copy(
      new THREE.Color(0xff5a36).lerp(new THREE.Color(0xffffff), flash * 0.55),
    );
    state.overlay.visible = overlayOpacity > 0.001;
  }

  const pulseScale = 1 + flash * 0.08;
  group.scale.setScalar(pulseScale);
}
