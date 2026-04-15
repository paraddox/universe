import * as THREE from 'three';
import type { Target } from '../simulation/Target.js';

interface TargetMaterialState {
  baseColor: number;
  baseEmissive: number;
}

function getTargetMaterialState(mesh: THREE.Mesh): TargetMaterialState {
  if (!mesh.userData.targetMaterialState) {
    const material = mesh.material as THREE.MeshStandardMaterial;
    mesh.userData.targetMaterialState = {
      baseColor: material.color.getHex(),
      baseEmissive: material.emissive.getHex(),
    } satisfies TargetMaterialState;
  }

  return mesh.userData.targetMaterialState as TargetMaterialState;
}

export function createTargetMesh(target: Target): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(target.radius, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x44ff88,
    emissive: 0x116633,
    emissiveIntensity: 0.35,
    roughness: 0.45,
    metalness: 0.2,
  });

  const mesh = new THREE.Mesh(geometry, material);
  getTargetMaterialState(mesh);
  updateTargetMesh(mesh, target);
  return mesh;
}

export function updateTargetMesh(mesh: THREE.Mesh, target: Target): void {
  mesh.position.set(target.position.x, target.position.y, target.position.z);
  mesh.visible = target.isActive();

  const material = mesh.material as THREE.MeshStandardMaterial;
  const ratio = target.getHealthRatio();
  const flash = target.getHitFlashRatio();
  const color = new THREE.Color(1 - ratio, 0.25 + ratio * 0.75, 0.2);
  color.lerp(new THREE.Color(1, 1, 1), flash * 0.7);

  material.color.copy(color);
  material.emissive.copy(color).multiplyScalar(0.35 + flash * 0.55);
  material.emissiveIntensity = 0.35 + flash * 0.9;

  const pulseScale = 1 + flash * 0.12;
  mesh.scale.setScalar(pulseScale);
}
