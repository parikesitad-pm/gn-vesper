import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function createVessel(invalidate: () => void) {
  const scene = new THREE.Scene();
  const assembly = new THREE.Group();
  const orbit = new THREE.Group();
  const core = new THREE.Group();
  scene.add(assembly);
  assembly.add(orbit, core);
  assembly.rotation.set(-0.22, -0.25, -0.2);

  const metal = new THREE.MeshStandardMaterial({ color: "#554047", metalness: 0.8, roughness: 0.28 });
  const accent = new THREE.MeshStandardMaterial({ color: "#ff5555", metalness: 0.75, roughness: 0.25, emissive: "#ff5555", emissiveIntensity: 0.12 });
  const ember = new THREE.MeshBasicMaterial({ color: "#ff3038" });
  const mint = new THREE.MeshBasicMaterial({ color: "#50fa7b" });
  const line = new THREE.MeshBasicMaterial({ color: "#96717b", transparent: true, opacity: 0.6 });

  const outer = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.11, 12, 128), accent);
  outer.rotation.set(0.72, 0.28, 0);
  orbit.add(outer);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(1.98, 0.035, 8, 100), ember);
  inner.rotation.set(-0.58, 0.55, 0.35);
  orbit.add(inner);
  const guide = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.009, 4, 128), line);
  guide.rotation.set(0.72, 0.28, 0);
  orbit.add(guide);

  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.09, 0.025), metal, 72);
  const placement = new THREE.Object3D();
  for (let i = 0; i < 72; i++) {
    const angle = i / 72 * Math.PI * 2;
    placement.position.set(Math.cos(angle) * 2.65, Math.sin(angle) * 2.65, 0);
    placement.rotation.z = angle - Math.PI / 2;
    placement.scale.y = i % 6 === 0 ? 2 : 1;
    placement.updateMatrix();
    ticks.setMatrixAt(i, placement.matrix);
  }
  ticks.rotation.copy(outer.rotation);
  orbit.add(ticks);

  const shell = new THREE.Mesh(new RoundedBoxGeometry(2.5, 1.5, 0.62, 4, 0.24), metal);
  const front = new THREE.Mesh(new RoundedBoxGeometry(2.36, 1.36, 0.12, 4, 0.2), new THREE.MeshStandardMaterial({ color: "#160e11", roughness: 0.4, metalness: 0.35 }));
  front.position.z = 0.32;
  core.add(shell, front);
  core.rotation.set(0.08, 0.1, 0.1);

  const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new RoundedBoxGeometry(2.5, 1.5, 0.62, 3, 0.24), 35), new THREE.LineBasicMaterial({ color: "#ff5555", transparent: true, opacity: 0.4 }));
  core.add(rim);
  const faceMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 1.14), faceMaterial);
  face.position.z = 0.46;
  core.add(face);
  const texture = new THREE.TextureLoader().load("/vesper/vesper.svg", () => { faceMaterial.needsUpdate = true; invalidate(); });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  faceMaterial.map = texture;
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mint);
  led.position.set(0.98, -0.46, 0.4);
  core.add(led);

  const satellite = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), mint);
  satellite.position.set(2.35, 0, 0);
  orbit.add(satellite);
  const satellite2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), ember);
  satellite2.position.set(-1.5, 1.45, -0.15);
  orbit.add(satellite2);

  const stars = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i++) {
    stars[i * 3] = Math.sin(i * 127.1) * 4.6;
    stars[i * 3 + 1] = Math.cos(i * 311.7) * 3.7;
    stars[i * 3 + 2] = Math.sin(i * 74.7) * 2 - 2;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  const particles = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: "#ff5555", size: 0.035, transparent: true, opacity: 0.65 }));
  scene.add(particles);
  scene.add(new THREE.HemisphereLight("#f8f8f2", "#211b1d", 2));
  const key = new THREE.DirectionalLight("#ff5555", 5);
  key.position.set(-3, 5, 5);
  const fill = new THREE.DirectionalLight("#ff3038", 4);
  fill.position.set(4, -2, 3);
  const back = new THREE.DirectionalLight("#8be9fd", 3);
  back.position.set(1, 4, -3);
  scene.add(key, fill, back);

  const dispose = () => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Points) {
        geometries.add(object.geometry);
        const values = Array.isArray(object.material) ? object.material : [object.material];
        values.forEach((material) => materials.add(material));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    texture.dispose();
  };
  return { particles, scene, assembly, orbit, core, accent, ember, mint, dispose };
}
