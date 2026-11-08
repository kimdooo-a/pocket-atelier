// Lux3D 결과(GLB·원본 이미지)를 받아 웹용으로 줄인다.
//   node tools/pull-assets.mjs <results.json>
// results.json = { "<key>": { "glb": "<url>", "img": "<url>", "prompt": "<text>" }, ... }
// 원본 GLB는 RAW_DIR(기본: 건 폴더 _work/lux3d-raw)에 그대로 두고, 웹용은 assets/models/<key>.glb(meshopt + webp 1024).
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const results = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const RAW = process.env.RAW_DIR;
if (!RAW) { console.error('RAW_DIR 환경변수가 필요하다'); process.exit(1); }
for (const d of [RAW, 'assets/models', 'assets/src']) mkdirSync(d, { recursive: true });

const log = [];
for (const [key, r] of Object.entries(results)) {
  const raw = join(RAW, `${key}.glb`);
  const web = join('assets/models', `${key}.glb`);
  const src = join('assets/src', `${key}.jpg`);
  if (r.glb && !existsSync(raw)) {
    const res = await fetch(r.glb); if (!res.ok) { log.push(`${key} glb HTTP ${res.status}`); continue; }
    writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  }
  if (r.img && !existsSync(src)) {
    const res = await fetch(r.img); if (res.ok) {
      const full = join(RAW, `${key}.jpg`);
      writeFileSync(full, Buffer.from(await res.arrayBuffer()));
      execFileSync('python', ['-c', `from PIL import Image;im=Image.open(r'${full}').convert('RGB');im.thumbnail((512,512));im.save(r'${src}',quality=85)`]);
    }
  }
  if (existsSync(raw) && !existsSync(web)) {
    execFileSync('npx', ['-y', '@gltf-transform/cli@4', 'optimize', `"${raw}"`, `"${web}"`,'--texture-compress', 'webp', '--texture-size', '1024', '--compress', 'meshopt', '--simplify', 'false'], { stdio: 'ignore', shell: true });
  }
  log.push(`${key} raw ${existsSync(raw) ? (statSync(raw).size / 1e6).toFixed(1) + 'MB' : '-'} web ${existsSync(web) ? (statSync(web).size / 1e6).toFixed(2) + 'MB' : '-'}`);
}
console.log(log.join('\n'));
