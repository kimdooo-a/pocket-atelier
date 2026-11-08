// assets/models에 실제로 있는 GLB만으로 assets/manifest.json을 만든다(없는 소품은 넣지 않는다).
import { existsSync, writeFileSync } from 'node:fs';

const ROOMS = [
  { id: 'shop', name: "Mr. Han's Repair Shop", doneText: 'The alley shop hums again — radio on, rice steaming, the fan turning. Mr. Han can open tomorrow.',
    props: [
      ['fan', 'Desk fan', 'A blade snapped off and the guard is bent.', 'New blades, a straight guard, fresh mint paint.'],
      ['radio', 'Transistor radio', 'Cracked grille, bent antenna, a knob missing.', 'Cherry-red case and a straight antenna — music again.'],
      ['ricecooker', 'Rice cooker', 'The lid hangs off one hinge.', 'Lid snug, steam vent shining — rice is on.'],
      ['phone', 'Rotary phone', 'The handset is split in two.', 'Jade-green and ringing.'],
      ['lamp', 'Desk lamp', 'Bent arm, shattered bulb.', 'A warm pool of light over the workbench.'],
      ['clock', 'Wall clock', 'Cracked glass, the minute hand is gone.', 'Ticking, with both hands home.'],
    ] },
  { id: 'hanok', name: 'Hanok Study', doneText: 'Ink is ground, tea is poured and the lantern glows behind the paper doors.',
    props: [
      ['desk', 'Writing desk', 'One leg snapped, the lacquer cracked.', 'Steady on four legs, glossy red lacquer.'],
      ['inkstone', 'Ink stone set', 'The stone is split, the brush splayed.', 'Smooth stone, wet ink, a pointed brush.'],
      ['lantern', 'Paper lantern', 'Torn paper, crooked frame.', 'Fresh hanji glowing orange.'],
      ['teapot', 'Celadon tea set', 'Chipped spout, a broken cup.', 'Pale jade glaze, two matching cups.'],
      ['screen', 'Folding screen', 'Torn, faded panels.', 'Plum blossoms bright again.'],
    ] },
  { id: 'sea', name: 'Seaside Lab', doneText: 'The lamp is lit, the telescope points at the tide and the little ship stands in its bottle.',
    props: [
      ['telescope', 'Brass telescope', 'Dented tube, cracked lens.', 'Polished brass, clear lens.'],
      ['globe', 'Globe', 'Peeling map, off its axis.', 'Spinning on a brass axis.'],
      ['helmet', 'Diving helmet', 'Green corrosion, cracked window.', 'Shining copper, clear windows.'],
      ['shipbottle', 'Ship in a bottle', 'Cracked glass, collapsed masts.', 'White sails standing tall.'],
      ['oillamp', 'Hurricane lamp', 'Smashed chimney, no flame.', 'A warm flame behind clean glass.'],
    ] },
];

const FLOOR = 0; // 바닥 높이는 main.js가 방 바탕에 레이캐스트로 잰다
const ok = (k) => existsSync(`assets/models/${k}.glb`);
const out = { rooms: [] };
for (const r of ROOMS) {
  const ready = r.props.filter(([id]) => ok(`${id}-broken`) && ok(`${id}-fixed`));
  if (!ready.length) continue;
  const n = ready.length;
  const props = ready.map(([id, name, b, f], i) => {
    // 방 바닥 위 두 줄(뒤 줄 3 · 앞 줄 나머지) — 실내 폭이 방마다 달라 펼침 폭(S)을 따로 둔다
    const S = r.id === 'sea' ? 0.45 : 0.7, ZB = r.id === 'sea' ? 0.0 : -0.18;
    const back = Math.ceil(n / 2), row = i < back ? 0 : 1, k = row ? i - back : i, m = row ? n - back : back;
    const x = m === 1 ? 0 : -S + (2 * S * k) / (m - 1) + (row ? 0.12 : -0.08);
    const z = row ? 0.62 : ZB;
    return { id, name, brokenNote: b, fixedNote: f, h: 0.4,
      pos: [x, FLOOR, z], rotY: -x * 0.4,
      broken: `assets/models/${id}-broken.glb`, fixed: `assets/models/${id}-fixed.glb`,
      srcBroken: `assets/src/${id}-broken.jpg`, srcFixed: `assets/src/${id}-fixed.jpg` };
  });
  const base = ok(`room-${r.id}`) ? `assets/models/room-${r.id}.glb` : null;
  out.rooms.push({ id: r.id, name: r.name, doneText: r.doneText, base, baseHeight: 2.2, baseRotY: Math.PI / 4, rayY: r.id === 'sea' ? 0.5 : 0.95, props });
}
writeFileSync('assets/manifest.json', JSON.stringify(out, null, 1));
console.log(out.rooms.map((r) => `${r.id}: ${r.props.length} props${r.base ? ' + base' : ''}`).join('\n'));
