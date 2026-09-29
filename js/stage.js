/* ============================================================
   STAGE — renderer, camera and light shared by the hands and the
   globe. The canvas is transparent: the cream page shows through.
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  scene.fog = new THREE.Fog(0xf6f1e8, 1, 2);          // the back of the globe recedes into the page; the hands opt out

  const camera = new THREE.PerspectiveCamera(26, 1, 0.01, 20);

  /* soft studio light that sits well on the cream page */
  scene.add(new THREE.HemisphereLight(0xfff6ec, 0xd9cdb9, 1.15));
  const key = new THREE.DirectionalLight(0xfff0e0, 2.2);
  key.position.set(-0.45, 1.25, 0.75);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -0.42, right: 0.42, top: 0.42, bottom: -0.42, near: 0.4, far: 3.2 });
  key.shadow.bias = -0.0003; key.shadow.normalBias = 0.0012;
  key.shadow.radius = 4;
  const rim = new THREE.DirectionalLight(0xffe4cc, 0.9);
  rim.position.set(0.6, 0.45, -0.8);
  // warm light inside the closed hands, leaking out between the fingers
  const inner = new THREE.PointLight(0xffc38f, 0, 0.12, 2);
  scene.add(key, key.target, rim, inner);

  function resize(w, h) {
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return { renderer, scene, camera, key, inner, resize };
}
