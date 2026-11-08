// 로컬 개발 서버 — 정적 파일 + POST /save?name=<파일> (캡처 PNG를 report/renders에 쓴다)
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = process.cwd();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/save') {
    const name = (url.searchParams.get('name') || 'shot.png').replace(/[^\w.-]/g, '_');
    const chunks = []; for await (const c of req) chunks.push(c);
    let buf = Buffer.concat(chunks);
    const s = buf.toString('latin1', 0, 30);
    if (s.startsWith('data:')) buf = Buffer.from(buf.toString().split(',')[1], 'base64');
    await mkdir(join(ROOT, 'report/renders'), { recursive: true });
    await writeFile(join(ROOT, 'report/renders', name), buf);
    res.writeHead(200).end('ok ' + buf.length); return;
  }
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^([\\/])+/, '');
  if (!p || p.endsWith('/') || p.endsWith('\\')) p = join(p, 'index.html');
  try {
    const data = await readFile(join(ROOT, p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(data);
  } catch { res.writeHead(404).end('not found'); }
}).listen(8766, '127.0.0.1', () => console.log('serving on 8766'));
