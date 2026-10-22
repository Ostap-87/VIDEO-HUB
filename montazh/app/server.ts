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

// ---- «Сделать ролик» в облаке (сервер на Mac → релиз GitHub + задание → GitHub Actions)
export type GithubState = {configured: boolean; repo: string};
export const githubState = (): Promise<GithubState> => fetch("api/github").then((r) => r.json());
export async function saveToken(token: string): Promise<GithubState> {
  const r = await fetch("api/github", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({token})});
  const d = await r.json();
  if (!r.ok) throw new Error(d.detail || "Токен не подошёл");
  return d;
}
export const forgetToken = () => fetch("api/github", {method: "DELETE"});

// файл задания → сервер (с ходом загрузки)
export function sendFile(jid: string, name: string, blob: Blob, onProgress: (k: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", `api/job/${jid}/file/${name}`);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => (x.status === 200 ? resolve() : reject(new Error(`сервер ответил ${x.status}`)));
    x.onerror = () => reject(new Error("сервер Монтажной не отвечает"));
    x.send(blob);
  });
}

export async function submitJob(jid: string, job: unknown) {
  const r = await fetch(`api/job/${jid}/submit`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(job)});
  if (!r.ok) throw new Error((await r.json()).detail || "Не отправилось");
}

export type JobFile = {name: string; kind: "video" | "phone" | "frames" | "part"; title: string; size: number; url?: string};
export type JobState = {
  stage: string;
  text: string;
  progress?: number;
  files?: JobFile[];
  notes?: {at: number; text: string}[];
  error?: string;
  done?: boolean;
  seconds?: number;
};
export const jobState = (jid: string): Promise<JobState> => fetch(`api/job/${jid}`).then((r) => r.json());
