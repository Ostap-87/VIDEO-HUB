// Знак GTT (кристалл) в 3D: кадр или анимация по кругу. Сам поднимает локальный сервер от корня репозитория.
//   node reels-studio/tools/gtt-crystal/render.mjs still out.jpg "w=1080&h=1080&k=0.82&ring=1&t=0.33"
//   node reels-studio/tools/gtt-crystal/render.mjs loop  out.mp4 "w=800&h=800&k=0.82&ring=1" [кадров=150]
//   ss=2 — рисовать вдвое крупнее и уменьшать (максимальное качество); obj=none — пустой фон-шаблон хайлайта
//   страница: page=crystal (знак), obj (3D-предметы хайлайтов: obj=plane|cap|factory|globe|star|camera|crystal|paper|question),
//             orbit (кристалл + самолёт: mode=orbit|trail|routes|dash, яркость маршрутов ro/rw/rd/mo/mw/rc/cs, neon=1, pulse=1)
import { createRequire } from 'module'; import fs from 'fs'; import http from 'http'; import path from 'path'; import os from 'os';
import { execSync } from 'child_process'; import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const [mode, out, qs = '', frames = '150'] = process.argv.slice(2);
if (!['still', 'loop'].includes(mode) || !out) { console.log('usage: render.mjs still|loop <out> "<параметры>" [кадров]'); process.exit(1); }
const q0 = new URLSearchParams(qs); const OW = +q0.get('w') || 1080, OH = +q0.get('h') || 1080, SS = +q0.get('ss') || 1, PAGE = q0.get('page') || 'crystal';
const q = new URLSearchParams(q0); q.set('w', OW * SS); q.set('h', OH * SS); if (q0.get('cy')) q.set('cy', +q0.get('cy') * SS);
const W = OW * SS, H = OH * SS;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const srv = http.createServer((req, res) => { const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise(r => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pg = await br.newPage({ viewport: { width: W, height: H } }); pg.on('pageerror', e => console.log('PAGEERR', e.message));
await pg.goto(`http://127.0.0.1:${port}/reels-studio/tools/gtt-crystal/${PAGE}.html?${q}`);
await pg.waitForFunction(() => window.ready, null, { timeout: 60000 }); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
const clip = { x: 0, y: 0, width: W, height: H };
const SC = SS > 1 ? `-vf scale=${OW}:${OH}:flags=lanczos` : '';
if (mode === 'still') { const big = `${os.tmpdir()}/gtt-crystal-${process.pid}.png`; await pg.screenshot({ path: big, clip });
  execSync(`ffmpeg -v error -y -i ${big} ${SC} ${/\.jpe?g$/.test(out) ? '-q:v 1' : ''} "${out}"`); fs.rmSync(big, { force: true }); }
else { const D = fs.mkdtempSync(path.join(fs.existsSync('/dev/shm') ? '/dev/shm' : os.tmpdir(), 'gtt-crystal-'));
  for (let i = 0; i < +frames; i++) { await pg.evaluate(t => window.renderAt(t), i / +frames); await pg.screenshot({ path: `${D}/${String(i).padStart(4, '0')}.png`, clip }); }
  execSync(`ffmpeg -v error -y -framerate 30 -i ${D}/%04d.png ${SC} -c:v libx264 -preset slow -pix_fmt yuv420p -crf 14 -movflags +faststart "${out}"`); fs.rmSync(D, { recursive: true, force: true }); }
await br.close(); srv.close(); console.log('ok', out);
