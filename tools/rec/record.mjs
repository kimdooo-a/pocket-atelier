// 시연 영상 녹화 — 고정 포트 크롬(19392)에 탭을 새로 열어 실제 마우스로 플레이하고 CDP screencast 프레임을 모은다.
//   node record.mjs <url> <출력폴더>
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [url, out] = process.argv.slice(2);
mkdirSync(join(out, 'frames'), { recursive: true });
const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:19392', defaultViewport: null });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });
await page.waitForFunction(() => !document.getElementById('loading') && window.__game && window.__game.props.length > 0, { timeout: 120000 });
await page.bringToFront();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 영상용 자막 띠(화면 하단 중앙) — 게임 안내문 자리를 쓴다
await page.evaluate(() => {
  const h = document.getElementById('hint');
  h.style.fontSize = '17px'; h.style.padding = '10px 18px';
});
const caption = (t) => page.evaluate((t) => { document.getElementById('hint').textContent = t; }, t);

const client = await page.createCDPSession();
const frames = [];
client.on('Page.screencastFrame', async (f) => {
  const i = frames.length;
  writeFileSync(join(out, 'frames', `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'));
  frames.push(f.metadata.timestamp);
  try { await client.send('Page.screencastFrameAck', { sessionId: f.sessionId }); } catch {}
});
await client.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

// 소품 중심의 화면 좌표(CSS px)
const propPoints = () => page.evaluate(() => {
  const g = window.__game, T = g.THREE, out = [];
  for (const p of g.props) {
    if (p.repaired) continue;
    const c = new T.Box3().setFromObject(p.group).getCenter(new T.Vector3()).project(g.camera);
    out.push({ id: p.id, x: (c.x + 1) / 2 * innerWidth, y: (1 - c.y) / 2 * innerHeight });
  }
  return out;
});
async function orbit(dx, ms) {
  await page.mouse.move(1180, 360); await page.mouse.down();
  const steps = Math.round(ms / 30);
  for (let i = 1; i <= steps; i++) { await page.mouse.move(1180 + (dx * i) / steps, 360); await sleep(30); }
  await page.mouse.up();
}
async function repairRoom(lines) {
  let k = 0;
  for (;;) {
    const pts = await propPoints();
    if (!pts.length) break;
    const p = pts[0];
    await caption(lines[k++ % lines.length]);
    await page.mouse.move(p.x - 60, p.y + 40); await sleep(150);
    await page.mouse.move(p.x, p.y, { steps: 12 }); await sleep(350);
    await page.mouse.down(); await sleep(1150); await page.mouse.up();
    await sleep(1100);
  }
}

await caption('Pocket Atelier — every object and room here was generated with Aholo Lux3D');
await sleep(2500);
await orbit(90, 1200); await sleep(300); await orbit(-90, 1200); await sleep(400);
await caption('Click and hold a broken object to repair it');
await sleep(1200);
await repairRoom([
  'Each repair swaps the broken Lux3D model for its restored twin',
  'Both states come from Lux3D: text → image → 3D (Standard, PBR)',
  'The room gets warmer and brighter with every fix',
]);
await sleep(1600);
await caption('Room restored — on to the next one');
await sleep(1500);
await page.click('#nextRoom'); await sleep(2500);
await caption('Hanok Study — desk, ink stone, lantern, tea set, folding screen');
await orbit(80, 1100); await sleep(300); await orbit(-80, 1100); await sleep(400);
await repairRoom(['Hanok Study — desk, ink stone, lantern, tea set, folding screen', 'Hold to repair']);
await sleep(1400);
await page.click('#nextRoom'); await sleep(2500);
await caption('Seaside Lab — telescope, globe, diving helmet, ship in a bottle, lamp');
await repairRoom(['Seaside Lab — telescope, globe, diving helmet, ship in a bottle, lamp', 'Hold to repair']);
await sleep(1400);
await page.evaluate(() => { document.getElementById('done').hidden = true; });
await caption('Asset log: the Lux3D source image behind every object');
await page.click('#logBtn'); await sleep(3500);
await page.evaluate(() => { document.getElementById('log').scrollTop = 600; }); await sleep(2500);
await caption('Play in the browser: kimdooo-a.github.io/pocket-atelier  ·  #Manycorehackathon');
await page.click('#logClose'); await sleep(3000);

await client.send('Page.stopScreencast');
await sleep(500);
writeFileSync(join(out, 'frames.json'), JSON.stringify(frames));
await page.close();
await browser.disconnect();
console.log('frames', frames.length, 'seconds', (frames.at(-1) - frames[0]).toFixed(1));
