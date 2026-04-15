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

function collectMaterialStates(group: THREE.Group): MaterialState[] {
  const states: MaterialState[] = [];

  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (!(material instanceof THREE.MeshStandardMaterial)) continue;

      const hostileColor = material.color.clone().lerp(new THREE.Color(0xff6666), 0.35);
      const hostileEmissive = material.emissive.clone().lerp(new THREE.Color(0xaa2211), 0.5);
      material.color.copy(hostileColor);
      material.emissive.copy(hostileEmissive);

      states.push({
        material,
        baseColor: hostileColor.clone(),
        baseEmissive: hostileEmissive.clone(),
        baseEmissiveIntensity: material.emissiveIntensity,
      });
    }
  });

  return states;
}

export function createEnemyShipTargetMesh(target: CombatTarget, shipMeshFactory: ShipMeshFactory): THREE.Group {
  if (target.kind !== 'ship' || !target.hullClass) {
    throw new Error('Enemy ship target mesh requires a ship target with hullClass');
  }

  const hull = createHull(target.hullClass);
  const group = shipMeshFactory.createShipMesh(hull);
  group.userData.materialStates = collectMaterialStates(group);
  updateEnemyShipTargetMesh(group, target);
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

  for (const state of materialStates) {
    const damageColor = state.baseColor.clone().lerp(new THREE.Color(0x220808), 1 - ratio);
    damageColor.lerp(new THREE.Color(0xffffff), flash * 0.7);
    state.material.color.copy(damageColor);

    const emissive = state.baseEmissive.clone().lerp(new THREE.Color(0xffffff), flash * 0.6);
    state.material.emissive.copy(emissive);
    state.material.emissiveIntensity = state.baseEmissiveIntensity + flash * 1.1;
  }

  const pulseScale = 1 + flash * 0.08;
  group.scale.setScalar(pulseScale);
}
