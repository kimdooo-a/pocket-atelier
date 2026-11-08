// Pocket Atelier — 작은 방을 고쳐 밝히는 브라우저 디오라마 게임
// 소품·방 바탕은 전부 Aholo Lux3D가 만든 GLB다(assets/manifest.json).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const $ = (id) => document.getElementById(id);
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#1d1a24');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
camera.position.set(0.4, 2.3, 3.6);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.55, 0.2);
controls.enableDamping = true;
controls.minDistance = 2.2; controls.maxDistance = 7;
controls.maxPolarAngle = Math.PI * 0.47;
controls.enablePan = false;

const hemi = new THREE.HemisphereLight('#c9d4ff', '#3a2a20', 0.35);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1dc', 0.6);
sun.position.set(3, 5, 2); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);
const warm = new THREE.PointLight('#ffb36b', 0, 6, 1.6);
warm.position.set(0, 1.6, 0.4);
scene.add(warm);

const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: '#2a2532', roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; ground.receiveShadow = true;
scene.add(ground);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
function loadGLB(url) {
  if (!cache.has(url)) cache.set(url, new Promise((res, rej) => loader.load(url, (g) => res(g.scene), undefined, rej)));
  return cache.get(url).then((s) => s.clone(true));
}
// 모델 크기를 목표 높이로 맞추고 바닥에 앉힌다(Lux3D 출력은 단위가 제각각이다)
function fit(obj, height) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const s = height / Math.max(size.y, 1e-6);
  obj.scale.multiplyScalar(s);
  const b2 = new THREE.Box3().setFromObject(obj);
  const c = b2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
  obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return obj;
}

let manifest, roomIndex = 0, room = null;
const props = []; // { id, name, story, group, broken, fixed, repaired }
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// ?view=<모델키> — 소품 하나만 띄워 천천히 돌린다(보고서·영상용 컷)
const VIEW = new URLSearchParams(location.search).get('view');
async function viewOne(key) {
  document.querySelectorAll('#hud,#rooms,#hint,#logBtn').forEach((e) => (e.hidden = true));
  const m = fit(await loadGLB(`assets/models/${key}.glb`), 1);
  const spin = new THREE.Group(); spin.add(m); scene.add(spin);
  warm.intensity = 2; sun.intensity = 1; hemi.intensity = 0.5;
  camera.position.set(1.6, 1.0, 1.6); controls.target.set(0, 0.45, 0);
  controls.autoRotate = true; controls.autoRotateSpeed = 2.5;
  $('loading').remove();
}

// ?shots=1 — 보고서용 컷을 한 번에 찍어 로컬 서버에 저장한다(개발용)
async function shootAll() {
  document.querySelectorAll('#hud,#rooms,#hint,#logBtn').forEach((e) => (e.hidden = true));
  $('loading').remove();
  const man = await (await fetch('assets/manifest.json')).json();
  const keys = man.rooms.flatMap((r) => r.props.flatMap((p) => [p.id + '-broken', p.id + '-fixed']));
  renderer.setSize(900, 900, false); camera.aspect = 1; camera.updateProjectionMatrix();
  warm.intensity = 2; sun.intensity = 1; hemi.intensity = 0.5;
  const log = [];
  for (const k of keys) {
    const m = fit(await loadGLB(`assets/models/${k}.glb`), 1);
    scene.add(m);
    camera.position.set(1.75, 1.2, 1.75); controls.target.set(0, 0.48, 0);
    log.push(k + ' ' + (await window.__shot(k + '.png')));
    scene.remove(m);
  }
  return log;
}

async function init() {
  if (VIEW) return viewOne(VIEW);
  if (new URLSearchParams(location.search).get('shots')) { window.__shotsDone = await shootAll(); return; }
  manifest = await (await fetch('assets/manifest.json')).json();
  buildRoomNav();
  buildLog();
  await enterRoom(0);
  $('loading').style.opacity = 0; setTimeout(() => $('loading').remove(), 500);
}

function buildRoomNav() {
  const nav = $('rooms'); nav.innerHTML = '';
  manifest.rooms.forEach((r, i) => {
    const b = document.createElement('button');
    b.textContent = r.name; b.onclick = () => enterRoom(i);
    nav.appendChild(b);
  });
}
function markNav() { [...$('rooms').children].forEach((b, i) => b.classList.toggle('on', i === roomIndex)); }

async function enterRoom(i) {
  roomIndex = i; markNav();
  $('done').hidden = true; $('card').hidden = true;
  if (room) scene.remove(room);
  props.length = 0;
  const r = manifest.rooms[i];
  $('roomName').textContent = r.name;
  room = new THREE.Group(); scene.add(room);
  let holder = null;
  if (r.base) {
    const base = fit(await loadGLB(r.base), r.baseHeight || 1.4);
    holder = new THREE.Group(); holder.add(base); holder.rotation.y = r.baseRotY || 0; holder.position.z = 0.1; room.add(holder);
    holder.updateMatrixWorld(true);
  }
  const down = new THREE.Raycaster();
  for (const p of r.props) {
    const g = new THREE.Group();
    // 방 바닥 높이를 그 자리에서 잰다(방마다 받침 두께가 다르다)
    let y = p.pos[1] || 0;
    if (holder) {
      down.set(new THREE.Vector3(p.pos[0], r.rayY || 0.95, p.pos[2]), new THREE.Vector3(0, -1, 0));
      const hit = down.intersectObject(holder, true)[0];
      if (hit) y = hit.point.y;
    }
    g.position.set(p.pos[0], y, p.pos[2]);
    g.rotation.y = p.rotY || 0;
    const broken = fit(await loadGLB(p.broken), p.h);
    const fixed = fit(await loadGLB(p.fixed), p.h);
    fixed.visible = false;
    g.add(broken, fixed);
    g.userData.prop = { ...p, group: g, broken, fixed, repaired: false };
    props.push(g.userData.prop);
    room.add(g);
  }
  applyMood(); updateHud();
}

// 고칠수록 방이 따뜻해진다
function applyMood() {
  const done = props.filter((p) => p.repaired).length, all = props.length || 1;
  const t = done / all;
  warm.intensity = 0.2 + 3.2 * t;
  sun.intensity = 0.45 + 0.7 * t;
  hemi.intensity = 0.25 + 0.35 * t;
  scene.background.set(new THREE.Color('#1d1a24').lerp(new THREE.Color('#3b2f3f'), t));
}
function updateHud() {
  const done = props.filter((p) => p.repaired).length;
  $('count').textContent = `${done} / ${props.length} repaired`;
  $('bar').style.width = `${(100 * done) / (props.length || 1)}%`;
}

// 누르고 있으면 고쳐진다(0.9초)
let holding = null, holdT = 0, holdTimer = 0;
function finishHold() {
  const p = holding; holding = null; $('holdRing').hidden = true; controls.enabled = true;
  p.group.rotation.z = 0; repair(p);
}
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(props.filter((p) => !p.repaired).map((p) => p.group), true);
  if (!hits.length) return null;
  let o = hits[0].object; while (o && !o.userData.prop) o = o.parent;
  return o ? o.userData.prop : null;
}
canvas.addEventListener('pointerdown', (ev) => {
  const p = pick(ev);
  if (!p) return;
  controls.enabled = false;
  holding = p; holdT = 0;
  clearTimeout(holdTimer);
  holdTimer = setTimeout(() => { if (holding === p) finishHold(); }, 900);
  const ring = $('holdRing'); ring.hidden = false; ring.style.left = ev.clientX + 'px'; ring.style.top = ev.clientY + 'px';
  showCard(p.name, p.brokenNote);
});
addEventListener('pointerup', () => { if (holding) holding.group.rotation.z = 0; clearTimeout(holdTimer); holding = null; $('holdRing').hidden = true; controls.enabled = true; });
canvas.addEventListener('pointermove', (ev) => {
  if (holding) return;
  canvas.style.cursor = pick(ev) ? 'pointer' : 'grab';
});

function showCard(t, b) { $('cardTitle').textContent = t; $('cardBody').textContent = b; $('card').hidden = false; }

const sparks = [];
function burst(at) {
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffd27a' : '#ffffff' }));
    m.position.copy(at);
    m.userData.v = new THREE.Vector3((Math.random() - 0.5) * 1.6, Math.random() * 1.8 + 0.4, (Math.random() - 0.5) * 1.6);
    m.userData.life = 0.9;
    scene.add(m); sparks.push(m);
  }
}

function repair(p) {
  p.repaired = true;
  p.broken.visible = false; p.fixed.visible = true;
  p.base = p.fixed.scale.x; p.fixed.scale.setScalar(p.base * 0.6); p.popT = 0;
  const at = new THREE.Box3().setFromObject(p.group).getCenter(new THREE.Vector3());
  burst(at);
  showCard(p.name + ' — repaired', p.fixedNote);
  applyMood(); updateHud();
  if (props.every((q) => q.repaired)) setTimeout(roomDone, 900);
}
function roomDone() {
  const r = manifest.rooms[roomIndex];
  $('doneBody').textContent = r.doneText;
  $('done').hidden = false;
  $('nextRoom').textContent = roomIndex < manifest.rooms.length - 1 ? 'Next room →' : 'Play again';
}
$('nextRoom').onclick = () => enterRoom((roomIndex + 1) % manifest.rooms.length);

function buildLog() {
  const list = $('logList'); list.innerHTML = '';
  for (const r of manifest.rooms) for (const p of r.props) {
    const d = document.createElement('div'); d.className = 'logItem';
    d.innerHTML = `<img src="${p.srcBroken}" alt=""><img src="${p.srcFixed}" alt=""><div><b>${p.name}</b>${r.name} · Lux3D image → 3D (broken / repaired)</div>`;
    list.appendChild(d);
  }
}
$('logBtn').onclick = () => { $('log').hidden = !$('log').hidden; };
$('logClose').onclick = () => { $('log').hidden = true; };

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (holding) {
    holdT += dt / 0.9;
    $('ringFg').style.strokeDashoffset = 113.1 * (1 - Math.min(holdT, 1));
    holding.group.rotation.z = Math.sin(performance.now() / 40) * 0.03;
  }
  for (const p of props) if (p.popT !== undefined) {
    p.popT = Math.min(1, p.popT + dt * 2.2);
    const t = p.popT, c = 1.70158; // easeOutBack
    const e = 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    p.fixed.scale.setScalar(p.base * (0.6 + 0.4 * e));
    if (t >= 1) delete p.popT;
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]; s.userData.life -= dt;
    s.userData.v.y -= 3.2 * dt; s.position.addScaledVector(s.userData.v, dt);
    if (s.userData.life <= 0) { scene.remove(s); sparks.splice(i, 1); }
  }
  controls.update();
  renderer.render(scene, camera);
});

// 개발용: 현재 화면을 로컬 서버(tools/serve.mjs)에 PNG로 저장한다
window.__shot = async (name) => {
  controls.update(); renderer.render(scene, camera);
  const data = canvas.toDataURL('image/png');
  return (await fetch('/save?name=' + encodeURIComponent(name), { method: 'POST', body: data })).text();
};
window.__game = { THREE, scene, room: () => room, enterRoom, props, repair: (id) => { const p = props.find((q) => q.id === id); if (p && !p.repaired) repair(p); }, camera, controls };

init().catch((e) => { $('loading').textContent = 'Could not load the room: ' + e.message; console.error(e); });
