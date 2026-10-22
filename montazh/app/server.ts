// Связь с локальным сервером Монтажной на Mac (mac/montazh_server.py). В браузере по ссылке его нет —
// тогда ролик по ссылке уходит движку как есть, а предпросмотр работает с файлами с диска.

let has: Promise<boolean> | null = null;
export const hasServer = () =>
  (has ??= fetch("api/ping")
    .then((r) => r.ok)
    .catch(() => false));

// скачать ролик по ссылке (Google Диск, Яндекс Диск, Dropbox, WeTransfer, прямая) → Blob
export async function fetchLink(url: string, onProgress: (text: string) => void): Promise<{blob: Blob; name: string}> {
  const r = await fetch("api/fetch", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({url})});
  const d = await r.json();
  if (!r.ok) throw new Error(d.detail || "Не удалось скачать");
  for (;;) {
    const s = await (await fetch(`api/fetch/${d.id}`)).json();
    if (s.error) throw new Error(s.error);
    if (s.done) {
      onProgress("Готово");
      const f = await fetch(`api/fetch/${d.id}/file`);
      return {blob: await f.blob(), name: s.name};
    }
    onProgress(s.note || "Скачиваю…");
    await new Promise((res) => setTimeout(res, 800));
  }
}
