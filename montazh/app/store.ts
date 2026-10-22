// Хранилище в браузере: проекты (JSON) и их файлы (исходное видео, чистый звук, картинки перебивок).
// Ничего не уходит в сеть, пока пользователь сам не отправит ролик в работу.
import type {Project} from "./types";

const DB = "montazh";
let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains("projects")) d.createObjectStore("projects", {keyPath: "id"});
        if (!d.objectStoreNames.contains("files")) d.createObjectStore("files");
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  return dbp;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const listProjects = () =>
  tx<Project[]>("projects", "readonly", (s) => s.getAll() as IDBRequest<Project[]>).then((a) => a.sort((x, y) => (x.updated < y.updated ? 1 : -1)));
export const getProject = (id: string) => tx<Project | undefined>("projects", "readonly", (s) => s.get(id));
export const putProject = (p: Project) => tx("projects", "readwrite", (s) => s.put(p));
export const deleteProject = async (id: string) => {
  await tx("projects", "readwrite", (s) => s.delete(id));
  for (const k of await listFileKeys(id)) await tx("files", "readwrite", (s) => s.delete(k));
};

// файлы: ключ «<проект>/<имя>», значение — Blob
export const putFile = (pid: string, name: string, blob: Blob) => tx("files", "readwrite", (s) => s.put(blob, `${pid}/${name}`));
export const getFile = (pid: string, name: string) => tx<Blob | undefined>("files", "readonly", (s) => s.get(`${pid}/${name}`));
export const listFileKeys = (pid: string) =>
  tx<IDBValidKey[]>("files", "readonly", (s) => s.getAllKeys()).then((keys) => keys.map(String).filter((k) => k.startsWith(pid + "/")));
