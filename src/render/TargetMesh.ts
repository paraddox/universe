import * as THREE from 'three';
import type { Target } from '../simulation/Target.js';

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
  updateTargetMesh(mesh, target);
  return mesh;
}

export function updateTargetMesh(mesh: THREE.Mesh, target: Target): void {
  mesh.position.set(target.position.x, target.position.y, target.position.z);
  mesh.visible = target.isActive();

  const material = mesh.material as THREE.MeshStandardMaterial;
  const ratio = target.getHealthRatio();
  const color = new THREE.Color(1 - ratio, 0.25 + ratio * 0.75, 0.2);
  material.color.copy(color);
  material.emissive.copy(color).multiplyScalar(0.35);
}
