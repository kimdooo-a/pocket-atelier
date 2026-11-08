// 「키|glb해시|이미지경로」 줄을 lux3d-results.json에 합친다(브라우저 다운로드가 막힐 때의 우회)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const [, , inFile, outFile] = process.argv;
const out = existsSync(outFile) ? JSON.parse(readFileSync(outFile, 'utf8')) : {};
for (const line of readFileSync(inFile, 'utf8').split(/\r?\n/).filter(Boolean)) {
  const [k, g, i] = line.split('|');
  const glb = g.startsWith('URL:') ? g.slice(4) : `https://qhsmodel.kujiale.com/lux3dPbrEmbedResult/${g}/textured.glb`;
  const img = !i ? null : i.startsWith('M:') ? `https://qhmtl-cos.kujiale.com/${i.slice(2)}.jpg` : `https://qhmtl-cos.kujiale.com/lux3d-web/sg/image/${i}.jpg`;
  out[k] = { ...(out[k] || {}), glb, img: (out[k] && out[k].img) || img };
}
writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(Object.values(out).filter((x) => x.glb).length, 'with glb');
