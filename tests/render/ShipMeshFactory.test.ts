import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ShipMeshFactory } from '../../src/render/ShipMeshFactory.js';
import { createHull } from '../../src/data/hulls.js';

function findChild(group: THREE.Group, name: string): THREE.Object3D {
  const child = group.getObjectByName(name);
  if (!child) {
    throw new Error(`Expected child '${name}' to exist`);
  }
  return child;
}

describe('ShipMeshFactory', () => {
  it('creates explicit forward and rear visual cues', () => {
    const factory = new ShipMeshFactory();
    const hull = createHull('fighter');

    const group = factory.createShipMesh(hull);

    const cockpit = findChild(group, 'ship-cockpit');
    const engine = findChild(group, 'ship-engine-core');

    expect(cockpit.position.z).toBeGreaterThan(0);
    expect(engine.position.z).toBeLessThan(0);
  });

  it('creates thruster visuals behind the rear engine marker', () => {
    const factory = new ShipMeshFactory();
    const hull = createHull('fighter');

    const group = factory.createShipMesh(hull);

    const engine = findChild(group, 'ship-engine-core');
    const thrusterCore = findChild(group, 'ship-thruster-core');
    const thrusterPlume = findChild(group, 'ship-thruster-plume');

    expect(thrusterCore.position.z).toBeLessThan(engine.position.z);
    expect(thrusterPlume.position.z).toBeLessThan(thrusterCore.position.z);
  });

  it('scales thruster plume and glow intensity with thrust level', () => {
    const factory = new ShipMeshFactory();
    const hull = createHull('fighter');

    const group = factory.createShipMesh(hull);
    const thrusterCore = findChild(group, 'ship-thruster-core') as THREE.Mesh;
    const thrusterPlume = findChild(group, 'ship-thruster-plume') as THREE.Mesh;
    const coreMaterial = thrusterCore.material as THREE.MeshBasicMaterial;
    const plumeMaterial = thrusterPlume.material as THREE.MeshBasicMaterial;

    factory.updateThrusterVisuals(group, 0, 0);
    const idleCoreOpacity = coreMaterial.opacity;
    const idlePlumeOpacity = plumeMaterial.opacity;
    const idlePlumeLength = thrusterPlume.scale.z;

    factory.updateThrusterVisuals(group, 1, 1.25);

    expect(coreMaterial.opacity).toBeGreaterThan(idleCoreOpacity);
    expect(plumeMaterial.opacity).toBeGreaterThan(idlePlumeOpacity);
    expect(thrusterPlume.scale.z).toBeGreaterThan(idlePlumeLength);
  });

  it('keeps cockpit and engine cues aligned with simulation forward after arbitrary rotation', () => {
    const factory = new ShipMeshFactory();
    const hull = createHull('fighter');
    const group = factory.createShipMesh(hull);

    const cockpit = findChild(group, 'ship-cockpit');
    const engine = findChild(group, 'ship-engine-core');

    const orientation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0.7, 1.1, 0.9, 'XYZ'),
    );
    group.quaternion.copy(orientation);
    group.updateMatrixWorld(true);

    const origin = new THREE.Vector3().setFromMatrixPosition(group.matrixWorld);
    const cockpitWorld = new THREE.Vector3().setFromMatrixPosition(cockpit.matrixWorld);
    const engineWorld = new THREE.Vector3().setFromMatrixPosition(engine.matrixWorld);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(orientation).normalize();

    const cockpitDirection = cockpitWorld.sub(origin).normalize();
    const engineDirection = engineWorld.sub(origin).normalize();

    expect(cockpitDirection.dot(forward)).toBeGreaterThan(0.9);
    expect(engineDirection.dot(forward)).toBeLessThan(-0.9);
  });
});
