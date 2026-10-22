// Сборка Монтажной: node montazh/build.mjs [--out <папка>] [--watch]
// Пакеты берутся из reels-studio/node_modules (React, @remotion/player, mediabunny) — свой npm install не нужен.
// В dist/: index.html, app.js, app.css, vendor/ (шумодав RNNoise), library/previews/ (превью эффектов) и
// assets/ — файлы, которые шаблону TalkReelPro нужны в предпросмотре (звуки, музыка, страницы сайта для финала).
import {createRequire} from "node:module";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const NM = path.join(ROOT, "reels-studio", "node_modules");
const esbuild = createRequire(path.join(NM, "x.js"))("esbuild");

const args = process.argv.slice(2);
const OUT = path.resolve(args.includes("--out") ? args[args.indexOf("--out") + 1] : path.join(HERE, "dist"));

const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), {recursive: true});
  fs.copyFileSync(from, to);
};
const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return 0;
  let n = 0;
  for (const f of fs.readdirSync(from, {withFileTypes: true})) {
    if (f.isDirectory()) n += copyDir(path.join(from, f.name), path.join(to, f.name));
    else (copy(path.join(from, f.name), path.join(to, f.name)), n++);
  }
  return n;
};

async function assetsList() {
  // список файлов шаблона живёт в app/brands.ts (ASSETS) — собираем его отдельно и читаем
  const r = await esbuild.build({entryPoints: [path.join(HERE, "app", "brands.ts")], bundle: true, write: false, format: "esm", platform: "node"});
  const mod = await import("data:text/javascript;base64," + Buffer.from(r.outputFiles[0].text).toString("base64"));
  return [...new Set(mod.ASSETS)];
}

const options = {
  entryPoints: [path.join(HERE, "app", "main.tsx")],
  bundle: true,
  outfile: path.join(OUT, "app.js"),
  format: "iife",
  platform: "browser",
  target: ["chrome100", "safari15"],
  jsx: "automatic",
  minify: !args.includes("--dev"),
  sourcemap: args.includes("--dev"),
  nodePaths: [NM],
  define: {"process.env.NODE_ENV": '"production"'},
  loader: {".png": "file", ".jpg": "file", ".svg": "file", ".woff2": "file"},
  logLevel: "info",
};

fs.mkdirSync(OUT, {recursive: true});
for (const f of ["index.html", "app.css"]) copy(path.join(HERE, "app", f), path.join(OUT, f));
copyDir(path.join(HERE, "app", "vendor"), path.join(OUT, "vendor"));
const previews = copyDir(path.join(HERE, "library", "previews"), path.join(OUT, "library", "previews"));
let missing = [];
for (const a of await assetsList()) {
  const src = path.join(ROOT, a);
  if (!fs.existsSync(src) || fs.readFileSync(src).subarray(0, 40).toString().startsWith("version https://git-lfs")) {
    missing.push(a);
    continue;
  }
  copy(src, path.join(OUT, "assets", a));
}
if (missing.length) console.warn("! нет файлов шаблона (git lfs pull?):\n  " + missing.join("\n  "));
console.log(`превью эффектов: ${previews}`);

if (args.includes("--watch")) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("слежу за изменениями…");
} else {
  await esbuild.build(options);
  console.log("MONTAZH_BUILD_OK", OUT);
}
