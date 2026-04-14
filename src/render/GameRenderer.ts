import * as THREE from 'three';
import { CameraController } from './CameraController.js';
import { ShipMeshFactory } from './ShipMeshFactory.js';
import { ProjectileMesh } from './ProjectileMesh.js';

export class GameRenderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  cameraController: CameraController;
  shipMeshFactory: ShipMeshFactory;
  projectileMesh: ProjectileMesh;

  constructor(canvas: HTMLCanvasElement) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020208);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambient = new THREE.AmbientLight(0x334466, 1.0);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 50, 50);
    this.scene.add(dirLight);

    // Starfield
    this.createStarfield();

    // Grid reference plane
    this.createGrid();

    // Subsystems
    this.cameraController = new CameraController(this.camera);
    this.shipMeshFactory = new ShipMeshFactory();
    this.projectileMesh = new ProjectileMesh(this.scene);

    // Resize handler
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createStarfield(): void {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true });
    const stars = new THREE.Points(geo, mat);
    this.scene.add(stars);
  }

  private createGrid(): void {
    const gridHelper = new THREE.GridHelper(200, 40, 0x112233, 0x0a0a15);
    gridHelper.position.y = -10;
    this.scene.add(gridHelper);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose(): void {
    this.renderer.dispose();
    this.shipMeshFactory.dispose();
    this.projectileMesh.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
