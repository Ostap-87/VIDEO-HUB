// Шаг «Склейка»: несколько роликов и фото, лучшие дубли, чистка пауз, эканий, мусорных слов и цыканий
// (решение пользователя 22.10.2026). Логика — assemble.ts, здесь — медиатека и настройки; предпросмотр справа
// сразу играет склеенный ролик (монтажный лист в шаблоне).
import React, {useEffect, useMemo, useRef, useState} from "react";
import type {StepCtx} from "./App";
import {assemble, DEFAULT_OPTS, edlFind, edlSeconds, edlWords, envelope, remapTime, TRASH, type Cut, type CutWhy} from "./assemble";
import {denoise} from "./audio";
import {decodeAudio, fmtTime, frames, probe} from "./media";
import {cleanKey, clipKey} from "./props";
import {getFile, putFile} from "./store";
import {transcribe, type AsrModel} from "./transcribe";
import {newId, nowIso, type AssembleOpts, type Clip, type Project, type Seg} from "./types";

// медиатека проекта; старый проект с одним исходником — один ролик «source»
export function clipsOf(p: Project): Clip[] {
  if (p.clips) return p.clips;
  if (!p.source?.local) return [];
  const s = p.source;
  return [
    {
      id: "source",
      kind: "video",
      name: s.name,
      size: s.size,
      duration: s.duration,
      width: s.width,
      height: s.height,
      added: p.created,
      words: p.words.length && !p.edl ? p.words.map(({text, start, end}) => ({text, start, end})) : undefined,
    },
  ];
}

const identity = (p: Project): Seg[] => (p.edl?.length ? p.edl : p.source ? [{clip: "source", from: 0, to: p.source.duration}] : []);

// новый монтажный лист: слова — из роликов, эффекты и заметки остаются на своих словах
export function applyEdl(q: Project, clips0: Clip[], edl: Seg[], dropped?: Record<string, number[]>): Project {
  const clips = dropped ? clips0.map((c) => ({...c, cut: dropped[c.id] ?? []})) : clips0;
  const old = identity(q);
  const same = JSON.stringify(old) === JSON.stringify(edl);
  const map = (t: number) => (same || !old.length ? t : remapTime(old, edl, t));
  return {
    ...q,
    clips,
    edl,
    words: edlWords(edl, clips),
    effects: same
      ? q.effects
      : q.effects.map((e) => {
          const at = map(e.at);
          return {...e, at, until: e.until !== undefined ? Math.max(at + 0.3, map(e.until)) : undefined};
        }),
    notes: same ? q.notes : q.notes.map((n) => ({...n, at: map(n.at)})),
  };
}

// громкость голоса по 10 мс — для чистки: по звуку после шумодава RNNoise (на улице шум города прячет паузы, как у
// npm run cut); считается один раз и хранится рядом с роликом
async function loadEnv(pid: string, c: Clip): Promise<Float32Array | null> {
  const saved = await getFile(pid, `env/${c.id}`);
  if (saved) return new Float32Array(await saved.arrayBuffer());
  const file = await getFile(pid, clipKey(c.id));
  if (!file) return null;
  const env = envelope(await denoise(await decodeAudio(file, 48000), undefined, true), 48000);
  await putFile(pid, `env/${c.id}`, new Blob([env.buffer as ArrayBuffer]));
  return env;
}

// речь во всех роликах, где её ещё нет (или во всех — again)
export async function transcribeClips(
  p: Project,
  up: StepCtx["up"],
  model: AsrModel,
  onProgress: (k: number, t: string) => void,
  again = false,
): Promise<void> {
  const clips = clipsOf(p);
  const todo = clips.filter((c) => c.kind === "video" && (again || !c.words?.length));
  for (let i = 0; i < todo.length; i++) {
    const c = todo[i];
    const file = await getFile(p.id, clipKey(c.id));
    if (!file) continue;
    const words = await transcribe(file, model, (k, t) => onProgress((i + k) / todo.length, `Ролик ${i + 1} из ${todo.length}: ${t}`));
    up((q) => {
      const cl = clipsOf(q).map((x) => (x.id === c.id ? {...x, words} : x));
      return q.edl?.length ? {...q, clips: cl, words: edlWords(q.edl, cl)} : {...q, clips: cl};
    });
  }
}

const WHY: Record<CutWhy, string> = {
  pause: "Пауза",
  filler: "Эканье",
  noise: "Цыканье / звук без слов",
  trash: "Мусорное слово",
  restart: "Оговорка",
  take: "Неудачный дубль",
  edge: "Начало до речи",
};

export const AssembleStep: React.FC<StepCtx> = ({p, up, m, setM, sec, seek, setStatus, setStep}) => {
  const clips = clipsOf(p);
  const videos = clips.filter((c) => c.kind === "video");
  const photos = clips.filter((c) => c.kind === "photo");
  const opts: AssembleOpts = {...DEFAULT_OPTS, ...p.assemble};
  const [env, setEnv] = useState<Record<string, Float32Array | undefined>>({});
  const [busy, setBusy] = useState<{k: number; t: string} | null>(null);
  const [model, setModel] = useState<AsrModel>("small");
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [peek, setPeek] = useState<{clip: string; from: number; to: number} | null>(null);
  const [show, setShow] = useState<CutWhy | "all">("all");
  const [err, setErr] = useState("");

  // громкость и первые кадры роликов
  const envKey = videos.map((c) => c.id).join(",");
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const c of videos) {
        if (env[c.id]) continue;
        try {
          const e = await loadEnv(p.id, c);
          if (alive && e) setEnv((x) => ({...x, [c.id]: e}));
        } catch {
          /* звук не прочитался — чистка этого ролика пойдёт только по словам */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [envKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    for (const c of videos) {
      const url = m.clips[c.id];
      if (url && !thumbs[c.id]) frames(url, [Math.min(1, c.duration / 2)], 120).then(([t]) => setThumbs((x) => ({...x, [c.id]: t})), () => undefined);
    }
  }, [m.clips, envKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const allWords = videos.filter((c) => !c.off).every((c) => c.words?.length);
  const res = useMemo(() => (allWords && videos.some((c) => !c.off) ? assemble(clips, env, opts) : null), [JSON.stringify(clips), env, JSON.stringify(opts)]); // eslint-disable-line react-hooks/exhaustive-deps

  // после первой склейки любая настройка применяется сразу: предпросмотр — уже склеенный ролик
  useEffect(() => {
    if (!res || !p.assemble) return;
    const cutNow = Object.fromEntries(clips.map((c) => [c.id, c.cut ?? []]));
    const cutNew = Object.fromEntries(clips.map((c) => [c.id, res.dropped[c.id] ?? []]));
    if (JSON.stringify(res.edl) !== JSON.stringify(p.edl) || JSON.stringify(cutNow) !== JSON.stringify(cutNew))
      up((q) => applyEdl(q, clipsOf(q), res.edl, res.dropped));
  }, [res]); // eslint-disable-line react-hooks/exhaustive-deps

  const setOpts = (patch: Partial<AssembleOpts>) => up((q) => ({...q, assemble: {...DEFAULT_OPTS, ...q.assemble, ...patch}}));
  const setClips = (f: (c: Clip[]) => Clip[]) =>
    up((q) => {
      const cl = f(clipsOf(q));
      return q.edl?.length ? {...q, clips: cl, words: edlWords(q.edl, cl)} : {...q, clips: cl};
    });

  const add = async (files: FileList | File[]) => {
    setErr("");
    for (const file of Array.from(files)) {
      try {
        if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|gif)$/i.test(file.name)) {
          const name = newId("i") + "." + (file.name.split(".").pop() || "jpg").toLowerCase();
          await putFile(p.id, `img/${name}`, file);
          const url = URL.createObjectURL(file);
          const img = await new Promise<HTMLImageElement>((ok, bad) => {
            const i = new Image();
            i.onload = () => ok(i);
            i.onerror = () => bad(new Error(`${file.name}: фото не открывается (HEIC — сохраните как JPEG)`));
            i.src = url;
          });
          setM((x) => ({...x, images: {...x.images, [name]: url}}));
          setClips((c) => [...c, {id: newId("f"), kind: "photo", name, size: file.size, duration: 0, width: img.naturalWidth, height: img.naturalHeight, added: nowIso()}]);
        } else {
          setBusy({k: 0, t: `Сохраняю ${file.name}…`});
          const id = newId("c");
          const url = URL.createObjectURL(file);
          const pr = await probe(url);
          await putFile(p.id, clipKey(id), file);
          setM((x) => ({...x, clips: {...x.clips, [id]: url}}));
          setClips((c) => [...c, {id, kind: "video", name: file.name, size: file.size, duration: pr.duration, width: pr.width, height: pr.height, added: nowIso()}]);
          up((q) => (q.source ? q : {...q, source: {name: file.name, size: file.size, duration: pr.duration, width: pr.width, height: pr.height, local: true}}));
        }
      } catch (e) {
        setErr(String((e as Error).message || e));
      }
    }
    setBusy(null);
  };

  const recognize = async (again = false) => {
    setErr("");
    try {
      await transcribeClips(p, up, model, (k, t) => setBusy({k, t}), again);
    } catch (e) {
      setErr("Не получилось распознать: " + String((e as Error).message || e));
    }
    setBusy(null);
  };

  const move = (id: string, d: number) =>
    setClips((c) => {
      const a = [...c];
      const i = a.findIndex((x) => x.id === id);
      const j = i + d;
      if (i < 0 || j < 0 || j >= a.length) return c;
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });

  const glue = () => {
    if (!res) return;
    up((q) => applyEdl({...q, assemble: {...DEFAULT_OPTS, ...q.assemble}}, clipsOf(q), res.edl, res.dropped));
    setStatus(`Склеено: ${fmtTime(res.before)} → ${fmtTime(res.after)}. Предпросмотр справа — уже готовый монтаж.`);
  };
  const unglue = () =>
    up((q) => {
      const cl = clipsOf(q);
      const whole = cl.filter((c) => c.kind === "video" && !c.off).map((c) => ({clip: c.id, from: 0, to: c.duration}));
      return {...applyEdl(q, cl, whole, {}), assemble: undefined};
    });

  const toggleKeep = (c: Cut) => setOpts({keep: c.kept ? opts.keep.filter((k) => k !== c.id) : [...opts.keep, c.id]});
  const cutAt = (c: Cut) => {
    const t = edlFind(p.edl ?? [], c.clip, c.from) ?? remapTime([{clip: c.clip, from: 0, to: 1e6}], p.edl ?? [], c.from);
    seek(Math.max(0, t - 1));
  };

  // короткий просмотр дубля или вырезанного куска — прямо в карточке
  const peekRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = peekRef.current;
    if (!v || !peek) return;
    v.currentTime = Math.max(0, peek.from - 0.2);
    v.play().catch(() => undefined);
  }, [peek]);

  const byWhy = useMemo(() => {
    const out: Partial<Record<CutWhy, {n: number; s: number}>> = {};
    for (const c of res?.cuts ?? []) {
      if (c.kept) continue;
      const x = (out[c.why] ??= {n: 0, s: 0});
      x.n++;
      x.s += c.to - c.from;
    }
    return out;
  }, [res]);
  const clipNo = (id: string) => videos.findIndex((c) => c.id === id) + 1;
  const glued = !!p.assemble && !!p.edl?.length;

  return (
    <div className="step">
      <h2>Склейка</h2>
      <p className="lead">
        Добавьте все ролики и дубли — Монтажная распознает речь, оставит лучший дубль каждой фразы и вырежет паузы, эканья,
        мусорные слова и цыканья. Фото можно вставить в любой момент ролика. Предпросмотр справа сразу показывает склеенный ролик.
      </p>

      <h3>
        Ролики <span className="muted">— в ролике идут в этом порядке</span>
      </h3>
      <div className="clips">
        {videos.map((c, i) => (
          <div key={c.id} className={`clip ${c.off ? "off" : ""}`}>
            {thumbs[c.id] ? <img src={thumbs[c.id]} /> : <i className="ph" />}
            <div className="ci">
              <b>
                {i + 1}. {c.name}
              </b>
              <span>
                {fmtTime(c.duration)} · {c.words?.length ? `${c.words.length} слов` : "речь не распознана"}
                {c.off ? " · не в ролике" : ""}
              </span>
            </div>
            <div className="ca">
              <button className="btn ghost sm" title="Раньше" disabled={i === 0} onClick={() => move(c.id, -1)}>
                ↑
              </button>
              <button className="btn ghost sm" title="Позже" disabled={i === videos.length - 1} onClick={() => move(c.id, 1)}>
                ↓
              </button>
              <button className="btn ghost sm" onClick={() => setClips((cl) => cl.map((x) => (x.id === c.id ? {...x, off: !x.off} : x)))}>
                {c.off ? "В ролик" : "Убрать"}
              </button>
            </div>
          </div>
        ))}
        {!videos.length ? <div className="muted">Роликов пока нет — добавьте ниже.</div> : null}
      </div>
      <label
        className="drop sm"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          add(e.dataTransfer.files);
        }}
      >
        <b>+ Добавить ролики и фото</b>
        <span>можно сразу несколько: все дубли, куски, фото для вставок</span>
        <input type="file" multiple accept="video/*,image/*,.mov,.mp4,.m4v,.jpg,.jpeg,.png,.webp" hidden onChange={(e) => e.target.files && add(e.target.files)} />
      </label>

      {photos.length ? (
        <>
          <h3>
            Фото <span className="muted">— «Вставить» ставит фото за спиной спикера на 3 с с текущей секунды ({fmtTime(sec)})</span>
          </h3>
          <div className="photos">
            {photos.map((ph) => (
              <div key={ph.id} className="photo">
                {m.images[ph.name] ? <img src={m.images[ph.name]} /> : <i className="ph" />}
                <button
                  className="btn sm"
                  onClick={() =>
                    up((q) => ({...q, effects: [...q.effects, {id: newId("e"), effect: "broll-zoom", at: +sec.toFixed(2), until: +(sec + 3).toFixed(2), params: {image: ph.name}}]}))
                  }
                >
                  Вставить
                </button>
                <button className="x" title="Убрать из медиатеки" onClick={() => setClips((cl) => cl.filter((x) => x.id !== ph.id))}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <h3>Речь в роликах</h3>
      <div className="row wrap">
        <button className="btn primary" disabled={!videos.length || !!busy} onClick={() => recognize(false)}>
          {videos.every((c) => c.words?.length) ? "Речь распознана ✓" : "Распознать речь во всех роликах"}
        </button>
        <select value={model} onChange={(e) => setModel(e.target.value as AsrModel)} title="Модель Whisper">
          <option value="small">точно (Whisper small)</option>
          <option value="base">быстро (Whisper base)</option>
        </select>
        {videos.some((c) => c.words?.length) ? (
          <button className="btn ghost" disabled={!!busy} onClick={() => recognize(true)}>
            Распознать заново
          </button>
        ) : null}
      </div>
      {busy ? (
        <div className="prog">
          <i style={{width: `${busy.k * 100}%`}} />
          <span>{busy.t}</span>
        </div>
      ) : null}
      {err ? <div className="err">{err}</div> : null}

      <h3>Что вырезать</h3>
      <div className="checks">
        <label>
          <input type="checkbox" checked={opts.pauses} onChange={(e) => setOpts({pauses: e.target.checked})} />
          Паузы длиннее
          <select value={opts.minPause} onChange={(e) => setOpts({minPause: +e.target.value})}>
            {[0.25, 0.35, 0.5, 0.7, 1].map((v) => (
              <option key={v} value={v}>
                {String(v).replace(".", ",")} с
              </option>
            ))}
          </select>
          <em>по краям остаётся 0,12 с — речь не обрывается</em>
        </label>
        <label>
          <input type="checkbox" checked={opts.fillers} onChange={(e) => setOpts({fillers: e.target.checked})} />
          Эканья и мэканья <em>«э», «эм», «мм», «а-а»</em>
        </label>
        <label>
          <input type="checkbox" checked={opts.noise} onChange={(e) => setOpts({noise: e.target.checked})} />
          Цыканья, вдохи, причмокивания <em>короткие звуки без слов</em>
        </label>
        <label>
          <input type="checkbox" checked={opts.restarts} onChange={(e) => setOpts({restarts: e.target.checked})} />
          Оговорки <em>«я, я буду», оборванное начало фразы</em>
        </label>
        <label>
          <input type="checkbox" checked={opts.takes} onChange={(e) => setOpts({takes: e.target.checked})} />
          Дубли — оставить лучший <em>одна фраза сказана несколько раз</em>
        </label>
        <label>
          <input type="checkbox" checked={opts.jumpZoom} onChange={(e) => setOpts({jumpZoom: e.target.checked})} />
          Зум на склейках <em>джамп-каты: кадр чуть меняет крупность — склейку не видно</em>
        </label>
      </div>
      <div className="lbl">Мусорные слова</div>
      <div className="chips">
        {TRASH.map((t) => (
          <button
            key={t.id}
            className={opts.trash.includes(t.id) ? "on" : ""}
            title={t.where === "any" ? "в любом месте фразы" : t.where === "start" ? "в начале фразы" : t.where === "end" ? "в конце фразы" : "в начале или в конце фразы"}
            onClick={() => setOpts({trash: opts.trash.includes(t.id) ? opts.trash.filter((x) => x !== t.id) : [...opts.trash, t.id]})}
          >
            {t.id}
          </button>
        ))}
      </div>

      <div className="row wrap">
        {!glued ? (
          <>
            <button className="btn primary" disabled={!res} onClick={glue}>
              Склеить и почистить
            </button>
            {videos.length > 1 ? (
              <button className="btn ghost" onClick={unglue}>
                Просто подряд, без чистки
              </button>
            ) : null}
          </>
        ) : (
          <button className="btn ghost" onClick={unglue}>
            Без чистки (ролики целиком)
          </button>
        )}
        {!res && videos.length ? <span className="muted">Сначала распознайте речь — по ней ищутся паузы, дубли и лишние слова.</span> : null}
      </div>
      {res ? (
        <div className="summary">
          <b>
            {fmtTime(res.before)} → {fmtTime(res.after)}
          </b>
          <span>
            вырезано {fmtTime(res.before - res.after)}
            {(Object.keys(byWhy) as CutWhy[]).map((w) => ` · ${WHY[w].toLowerCase()}: ${byWhy[w]!.n}`).join("")}
          </span>
          {!glued ? <em>Нажмите «Склеить и почистить», чтобы увидеть в предпросмотре.</em> : null}
        </div>
      ) : null}

      {peek && m.clips[peek.clip] ? (
        <div className="peek">
          <video
            ref={peekRef}
            src={m.clips[peek.clip]}
            playsInline
            onTimeUpdate={(e) => {
              if (e.currentTarget.currentTime > peek.to + 0.2) e.currentTarget.pause();
            }}
          />
          <button className="x" onClick={() => setPeek(null)}>
            ✕
          </button>
        </div>
      ) : null}

      {res?.groups.length ? (
        <>
          <h3>
            Дубли <span className="muted">— ▶ послушать, нажмите на дубль, чтобы взять его</span>
          </h3>
          {res.groups.map((g) => (
            <div key={g.key} className="takes">
              <p>«{g.text}»</p>
              <div className="row wrap">
                {g.items.map((it, k) => (
                  <span key={it.key} className={`take ${g.pick === it.key ? "on" : ""}`}>
                    <button onClick={() => setOpts({pick: {...opts.pick, [g.key]: it.key}})}>
                      Дубль {k + 1} · ролик {clipNo(it.clip)}, {fmtTime(it.from)}
                      {g.items.reduce((a, b) => (b.score >= a.score ? b : a)).key === it.key ? " ★" : ""}
                    </button>
                    <button className="pl" title="Послушать" onClick={() => setPeek({clip: it.clip, from: it.from, to: it.to})}>
                      ▶
                    </button>
                  </span>
                ))}
                <span className={`take ${g.pick === "*" ? "on" : ""}`}>
                  <button onClick={() => setOpts({pick: {...opts.pick, [g.key]: "*"}})}>Оставить все</button>
                </span>
              </div>
            </div>
          ))}
        </>
      ) : null}

      {res?.cuts.length ? (
        <>
          <h3>
            Вырезано <span className="muted">— «Вернуть» оставляет кусок в ролике</span>
          </h3>
          <div className="chips">
            <button className={show === "all" ? "on" : ""} onClick={() => setShow("all")}>
              всё ({res.cuts.length})
            </button>
            {(Object.keys(WHY) as CutWhy[])
              .filter((w) => res.cuts.some((c) => c.why === w))
              .map((w) => (
                <button key={w} className={show === w ? "on" : ""} onClick={() => setShow(w)}>
                  {WHY[w].toLowerCase()} ({res.cuts.filter((c) => c.why === w).length})
                </button>
              ))}
          </div>
          <div className="cuts">
            {res.cuts
              .filter((c) => show === "all" || c.why === show)
              .slice(0, 300)
              .map((c) => (
                <div key={c.id} className={`cut ${c.kept ? "kept" : ""}`}>
                  <span className={`why w-${c.why}`}>{WHY[c.why]}</span>
                  <span className="tx" onClick={() => cutAt(c)}>
                    {c.text}
                  </span>
                  <span className="muted">
                    ролик {clipNo(c.clip)} · {fmtTime(c.from)} · {(c.to - c.from).toFixed(2).replace(".", ",")} с
                  </span>
                  <button className="pl" title="Послушать" onClick={() => setPeek({clip: c.clip, from: c.from - 0.6, to: c.to + 0.6})}>
                    ▶
                  </button>
                  {c.why !== "take" ? (
                    <button className="btn ghost sm" onClick={() => toggleKeep(c)}>
                      {c.kept ? "Вырезать" : "Вернуть"}
                    </button>
                  ) : null}
                </div>
              ))}
          </div>
        </>
      ) : null}

      {glued ? (
        <div className="edlbar" title="Монтажный лист: цвет — ролик">
          {p.edl!.map((s, i) => (
            <i key={i} className={`k${(clipNo(s.clip) - 1) % 6}`} style={{flexGrow: s.to - s.from}} title={`ролик ${clipNo(s.clip)}: ${fmtTime(s.from)}–${fmtTime(s.to)}`} />
          ))}
          <b style={{left: `${(sec / Math.max(0.1, edlSeconds(p.edl!))) * 100}%`}} />
        </div>
      ) : null}

      <div className="next">
        <button className="btn primary" onClick={() => setStep("text")}>
          Дальше: текст и субтитры →
        </button>
      </div>
    </div>
  );
};

// чистый голос для всех роликов склейки (шаг «Звук»)
export async function cleanClips(p: Project, clean: (f: Blob, on: (k: number, t: string) => void) => Promise<Blob>, onProgress: (k: number, t: string) => void) {
  const out: Record<string, Blob> = {};
  const vids = clipsOf(p).filter((c) => c.kind === "video" && !c.off);
  for (let i = 0; i < vids.length; i++) {
    const f = await getFile(p.id, clipKey(vids[i].id));
    if (!f) continue;
    const b = await clean(f, (k, t) => onProgress((i + k) / vids.length, `Ролик ${i + 1} из ${vids.length}: ${t}`));
    await putFile(p.id, cleanKey(vids[i].id), b);
    out[vids[i].id] = b;
  }
  return out;
}
