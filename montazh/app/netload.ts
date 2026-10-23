// Библиотека transformers.js и модели (распознавание речи, картинки по смыслу). В Монтажной на Mac всё идёт через её
// сервер (mac/montazh_server.py, адреса net/…): он пробует зеркала (huggingface.co → hf-mirror.com; jsdelivr → fastly →
// unpkg → npmmirror), ходит через прокси/VPN macOS, докачивает оборванное и хранит скачанное на диске — в окне не бывает
// «Failed to fetch» из-за закрытого сайта. В браузере по ссылке (без сервера) — напрямую, при закрытом
// huggingface.co — зеркало hf-mirror.com.
import {hasServer} from "./server";

const PKG = "npm/@huggingface/transformers@3.7.5/dist/";
const dynImport = new Function("u", "return import(u)") as (u: string) => Promise<any>;

async function reachable(url: string) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 6000);
    const r = await fetch(url, {method: "HEAD", signal: c.signal});
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

let lib: Promise<any> | null = null;
export function loadTransformers(): Promise<any> {
  lib ??= (async () => {
    const local = await hasServer();
    const cdn = local ? new URL(`net/cdn/${PKG}`, location.href).href : `https://cdn.jsdelivr.net/${PKG}`;
    let T: any;
    try {
      T = await dynImport(cdn + "transformers.min.js");
    } catch (e) {
      throw new Error(`не загрузилась библиотека распознавания (${String((e as Error).message || e)})`);
    }
    T.env.allowLocalModels = false;
    if (local) {
      T.env.remoteHost = new URL("net/hf/", location.href).href;
      T.env.backends.onnx.wasm.wasmPaths = cdn;
    } else if (!(await reachable("https://huggingface.co/Xenova/whisper-base/resolve/main/config.json"))) {
      T.env.remoteHost = "https://hf-mirror.com/";
    }
    return T;
  })();
  lib.catch(() => (lib = null));
  return lib;
}

// понятный текст ошибки сети для окна
export function netError(e: unknown): string {
  const s = String((e as Error)?.message || e);
  if (/Failed to fetch|NetworkError|Load failed|network error|Could not locate file|status 50\d/i.test(s))
    return `не скачались файлы модели (${s}). Проверьте интернет или VPN и нажмите ещё раз — скачанное уже не потеряется`;
  return s;
}
