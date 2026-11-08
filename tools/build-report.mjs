// 제출 보고서(HTML → PDF). 데이터는 manifest·lux3d-results·report/renders에서 읽는다(손으로 적은 수치 없음).
//   node tools/build-report.mjs   → report/report.html
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';

const man = JSON.parse(readFileSync('assets/manifest.json', 'utf8'));
const res = JSON.parse(readFileSync('tools/lux3d-results.json', 'utf8'));
const R = (k) => (existsSync(`report/renders/${k}.png`) ? `renders/${k}.png` : null);
const mb = (f) => (existsSync(f) ? (statSync(f).size / 1e6).toFixed(2) : '–');
const RAW = process.env.RAW_DIR;
const rawMb = (k) => (RAW && existsSync(`${RAW}/${k}.glb`) ? (statSync(`${RAW}/${k}.glb`).size / 1e6).toFixed(1) : '–');

const allProps = man.rooms.flatMap((r) => r.props.map((p) => ({ ...p, room: r.name })));
const nModels = readdirSync('assets/models').filter((f) => f.endsWith('.glb')).length;
const totalMb = (readdirSync('assets/models').filter((f) => f.endsWith('.glb')).reduce((a, f) => a + statSync('assets/models/' + f).size, 0) / 1e6).toFixed(1);
const DEMO = 'https://kimdooo-a.github.io/pocket-atelier/';
const REPO = 'https://github.com/kimdooo-a/pocket-atelier';
const VIDEO = process.env.VIDEO_URL || '';
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const short = (s) => esc(String(s || '').replace(/ Stylized miniature diorama.*$/, '').replace(/ Stylized hand-painted miniature.*$/, ''));

const propRows = allProps.map((p) => `
<div class="pair">
  <div class="ph"><b>${esc(p.name)}</b><span>${esc(p.room)}</span></div>
  <div class="grid4">
    <figure><img src="../assets/src/${p.id}-broken.jpg"><figcaption>Lux3D image · broken</figcaption></figure>
    <figure>${R(p.id + '-broken') ? `<img src="${R(p.id + '-broken')}">` : '<div class="na">render</div>'}<figcaption>Lux3D 3D · broken</figcaption></figure>
    <figure><img src="../assets/src/${p.id}-fixed.jpg"><figcaption>Lux3D image · repaired</figcaption></figure>
    <figure>${R(p.id + '-fixed') ? `<img src="${R(p.id + '-fixed')}">` : '<div class="na">render</div>'}<figcaption>Lux3D 3D · repaired</figcaption></figure>
  </div>
  <p class="prompt"><b>Prompt (broken):</b> ${short(res[p.id + '-broken']?.prompt)}<br><b>Prompt (repaired):</b> ${short(res[p.id + '-fixed']?.prompt)}</p>
  <p class="meta">GLB: ${rawMb(p.id + '-broken')} MB → ${mb(`assets/models/${p.id}-broken.glb`)} MB (broken) · ${rawMb(p.id + '-fixed')} MB → ${mb(`assets/models/${p.id}-fixed.glb`)} MB (repaired)</p>
</div>`).join('');

const roomRows = man.rooms.map((r) => `
<div class="room">
  <h3>${esc(r.name)}</h3>
  <div class="grid3">
    ${r.base ? `<figure><img src="../assets/src/room-${r.id}.jpg"><figcaption>Lux3D image · room base</figcaption></figure>` : ''}
    <figure>${R('room-' + r.id + '-before') ? `<img src="${R('room-' + r.id + '-before')}">` : '<div class="na">before</div>'}<figcaption>In game · before repairs</figcaption></figure>
    <figure>${R('room-' + r.id + '-after') ? `<img src="${R('room-' + r.id + '-after')}">` : '<div class="na">after</div>'}<figcaption>In game · all repaired</figcaption></figure>
  </div>
  <p>${r.props.map((p) => esc(p.name)).join(' · ')}</p>
</div>`).join('');

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Pocket Atelier — Project Report</title>
<style>
@page{size:A4;margin:14mm 13mm}
body{font-family:"Segoe UI",Arial,sans-serif;color:#2b2420;font-size:10.5pt;line-height:1.5}
h1{font-size:28pt;margin:0 0 4mm} h2{font-size:15pt;border-bottom:2px solid #e98a3a;padding-bottom:2mm;margin:8mm 0 4mm;page-break-after:avoid}
h3{font-size:12pt;margin:4mm 0 2mm}
.cover{page-break-after:always;padding-top:30mm}
.cover .tag{color:#8a7d72;letter-spacing:.12em;text-transform:uppercase;font-size:9pt}
.cover img{width:100%;border-radius:4mm;margin:6mm 0}
.kv{display:grid;grid-template-columns:38mm 1fr;gap:1.5mm 4mm}
.kv b{color:#8a7d72;font-weight:600}
.pipe{display:flex;gap:2mm;align-items:stretch;margin:4mm 0}
.pipe div{flex:1;background:#fff3e4;border-radius:3mm;padding:3mm;font-size:9pt}
.pipe div b{display:block;font-size:10pt}
.pair{page-break-inside:avoid;border-top:1px solid #eadfcf;padding-top:3mm;margin-top:3mm}
.ph{display:flex;justify-content:space-between}.ph span{color:#8a7d72;font-size:9pt}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:2mm}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm}
figure{margin:0}figure img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:2mm;background:#f4efe8}
.grid3 figure img{aspect-ratio:4/3}
figcaption{font-size:7.5pt;color:#8a7d72;text-align:center}
.na{aspect-ratio:1/1;background:#f4efe8;border-radius:2mm}
.prompt{font-size:8pt;color:#5a4f46;margin:1.5mm 0}.meta{font-size:8pt;color:#8a7d72;margin:0}
.room{page-break-inside:avoid}
table{border-collapse:collapse;width:100%;font-size:9.5pt}td,th{border-bottom:1px solid #eadfcf;padding:1.6mm 2mm;text-align:left;vertical-align:top}
.pb{page-break-before:always}
</style></head><body>

<section class="cover">
  <div class="tag">Manycore Aholo Global 3D AI Hackathon · Project report</div>
  <h1>Pocket Atelier</h1>
  <div style="font-size:14pt">Tiny Rooms, Real 3D — a browser game about fixing things</div>
  ${R('cover') ? `<img src="${R('cover')}">` : ''}
  <div class="kv">
    <b>Team</b><span>Pocket Atelier (solo)</span>
    <b>Play the demo</b><span>${DEMO}</span>
    ${VIDEO ? `<b>Demo video</b><span>${VIDEO}</span>` : ''}
    <b>Source code</b><span>${REPO}</span>
    <b>Lux3D assets</b><span>${nModels} GLB models (${allProps.length} objects × broken / repaired + ${man.rooms.filter((r) => r.base).length} room bases)</span>
  </div>
</section>

<h2>1. Concept</h2>
<p>Pocket Atelier is a short, calm repair game that runs in any browser. Each level is a tiny diorama room — a Seoul alley repair shop, a hanok study, a seaside lab — filled with objects that have seen better days: a desk fan with a snapped blade, a radio with a bent antenna, a celadon teapot with a chipped spout. You click and hold an object to repair it. The broken model is swapped for its restored twin with a little burst of sparks, and the room gets warmer and brighter with every fix. When everything works again, the next room opens.</p>
<p>The idea depends on 3D content that would normally be the most expensive part of a game: every object needs two consistent, textured versions. Aholo Lux3D makes that cheap enough for one person to fill three rooms, so the design leans into it — the "reward" of the game is literally seeing a better 3D model appear.</p>
<p><b>Who it is for:</b> casual players on desktop or mobile who like cozy, low-pressure games; it also works as a small showcase of what image-to-3D can do for indie game art.</p>

<h2>2. Development process</h2>
<div class="pipe">
  <div><b>1 · Prompt</b>One English prompt per object state (broken / repaired), same object description, different condition.</div>
  <div><b>2 · Lux3D image</b>Lux3D image generation, Hand Painted style, 1024×1024, plain background.</div>
  <div><b>3 · Lux3D Image to 3D</b>Aholo Lux3D Standard, mesh, 100K faces, PBR material maps → textured GLB.</div>
  <div><b>4 · Web prep</b>glTF-Transform: meshopt geometry + WebP textures (1024 px).</div>
  <div><b>5 · Game</b>three.js scene, hold-to-repair interaction, mood lighting, Asset log.</div>
</div>
<p>Generation was run in batches from the Lux3D web workspace. The workspace allows only a few concurrent generation tasks, so jobs were queued and retried automatically when the concurrency limit was reached. Each finished task returns a textured GLB (8–12 MB); after compression each model is about 1 MB or less (per-model sizes below), small enough for a page that loads on a phone.</p>
<p>The game itself is a single static page (HTML + JavaScript + three.js from a CDN) hosted on GitHub Pages, so it needs no server and stays online after judging.</p>

<h2>3. Key asset iterations</h2>
<p>For each object, the broken and repaired states were generated from separate prompts so the repair is a real change in shape (blades, antenna, hinges), not only a colour change. Left to right: Lux3D source image and resulting 3D model for the broken state, then the same for the repaired state.</p>
<p><b>What changed along the way.</b> (1) The fan was the first test pair, made by hand in the Lux3D workbench. Even with the Hand Painted style, the repaired fan came out close to a photo while the broken one looked painted; the pair is kept as generated (below) and all later prompts share one fixed tail ("stylized miniature diorama game prop, soft hand-painted textures … plain white background, no shadow") so the rest of the set reads as one style. (2) Asking for "the same object, fully restored" kept the silhouette close between states, which makes the swap read as a repair. (3) Raw GLBs at 8–12 MB were too heavy for 30+ models on the web; meshopt + WebP compression brought all ${nModels} models together to ${totalMb} MB. (4) Room bases were generated as empty cutaway dioramas ("no small loose objects") so the props could be placed and swapped independently.</p>
${propRows}

<h2 class="pb">4. Final result</h2>
${roomRows}
<p><b>Gameplay loop:</b> hover → hold (0.9 s ring) → swap to repaired model + sparks + room light rises → room complete card → next room. The in-game <i>Asset log</i> lists every Lux3D source image so players can see where each object came from.</p>

<h2>5. Tools used and their purposes</h2>
<table>
<tr><th>Tool</th><th>Purpose</th></tr>
<tr><td>Aholo Lux3D — image generation</td><td>Source images for every object state and every room base (Hand Painted style)</td></tr>
<tr><td>Aholo Lux3D — Image to 3D (Standard, mesh, PBR)</td><td>All ${nModels} 3D models used in the game</td></tr>
<tr><td>three.js</td><td>Real-time rendering, lighting, orbit camera, interaction</td></tr>
<tr><td>glTF-Transform</td><td>GLB compression (meshopt, WebP textures)</td></tr>
<tr><td>Claude Code (AI coding assistant)</td><td>Writing and debugging the game code and the asset-processing scripts</td></tr>
<tr><td>GitHub Pages</td><td>Hosting the playable demo</td></tr>
</table>
</body></html>`;
writeFileSync('report/report.html', html);
console.log('report/report.html', allProps.length, 'objects', nModels, 'models');
