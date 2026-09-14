import * as THREE from "three";
import { MotionController } from "./motion.js";

const container = document.getElementById("app");
const video = document.getElementById("webcam");
const statusEl = document.getElementById("status");
const fallbackBtn = document.getElementById("fallback-btn");

// 정책서 4장: 유아 멀미 방지를 위해 FOV 75~80도 고정, 급격한 시점 변화 금지
const CAMERA_FOV = 78;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfe3ff); // 파스텔톤 하늘

const camera = new THREE.PerspectiveCamera(
  CAMERA_FOV,
  container.clientWidth / container.clientHeight,
  0.1,
  100,
);
camera.position.set(0, 1.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x445566, 1.2);
scene.add(hemiLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshStandardMaterial({ color: 0x9be38a }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// 자리표시용 캐릭터 큐브 (추후 돼지 모델로 교체)
const placeholder = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 0.6, 0.6),
  new THREE.MeshStandardMaterial({ color: 0xf8b4c0 }),
);
placeholder.position.set(0, 0.3, -3);
scene.add(placeholder);

let forwardBoost = 0;

function handleSignal({ source }) {
  forwardBoost = 0.15;
  statusEl.textContent = `달리기 신호 수신 (${source})`;
}

const motion = new MotionController({
  onSignal: handleSignal,
  onError: (err) => {
    statusEl.textContent = "카메라를 사용할 수 없어요. 탭 버튼으로 진행해주세요.";
    console.warn("motion controller error", err);
  },
});

motion.start(video);
fallbackBtn.addEventListener("click", () => motion.triggerFallback());

// 정책서 2장: 세션(탭) 종료 시 스트림 해제
window.addEventListener("beforeunload", () => motion.stop());

window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});

function animate() {
  if (forwardBoost > 0) {
    camera.position.z -= forwardBoost;
    forwardBoost = Math.max(0, forwardBoost - 0.01);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
