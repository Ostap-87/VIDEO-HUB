import {Player, type PlayerRef} from "@remotion/player";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {TalkReelPro} from "../../reels-studio/src/compositions/TalkReelPro";
import {cleanVoice} from "./audio";
import {BRANDS, MUSIC} from "./brands";
import {EXAMPLES, parseCommand} from "./commands";
import {CATS, DEFAULT_QUAD, EFFECTS, effectById, parseQuad, spoken} from "./effects";
import {EMOJI, emojiSrc} from "./emoji";
import {GRADES, gradeCss} from "./grades";
import {advise, PALETTES, SWATCHES} from "./palettes";
import {decodeAudio, fmtTime, frames, peaks, probe} from "./media";
import {buildProps, cleanKey, clipKey, durationFrames, leadFrames, LOCAL, projSeconds} from "./props";
import {AssembleStep, cleanClips, clipsOf, modeOf, PENDING, transcribeClips} from "./AssembleStep";
import {PhoneFrame} from "./Phone";
import {AutoMontage, RhythmPanel} from "./AutoTools";
import {edlLocate, edlSeconds, edlWords} from "./assemble";
import {autoPlace, hfName, loadModel, phrases, search, thumb, usedInProject, type Found} from "./images";
import {fetchLink, forgetToken, githubState, hasServer, jobState, openOutside, saveJobFile, saveState, saveToken, sendFile, submitJob, type GithubState, type JobState, type SaveState} from "./server";
import {deleteProject, getFile, listProjects, putFile, putProject} from "./store";
import {parseWordsFile, transcribe, type AsrModel} from "./transcribe";
import {newId, nowIso, type Brand, type EffectItem, type Project} from "./types";

const STEPS = [
  ["source", "Исходник"],
  ["assemble", "Склейка"],
  ["text", "Текст"],
  ["sound", "Звук"],
  ["color", "Цвет"],
  ["edit", "Монтаж"],
  ["library", "Библиотека"],
  ["done", "Готово"],
] as const;
type Step = (typeof STEPS)[number][0];

const FPS = 30;

function newProject(name: string, brand: Brand): Project {
  const b = BRANDS[brand];
  return {
    id: newId("v"),
    name,
    brand,
    format: "both",
    created: nowIso(),
    updated: nowIso(),
    focus: {x: 540, y: 700},
    words: [],
    captions: {style: "flat", size: b.captionSize, top: b.captionTop},
    audio: {clean: false, music: MUSIC[0].id, musicVolume: 1},
    grade: {preset: "natural", amount: 0.7},
    finale: false,
    effects: [],
    notes: [],
  };
}

// ---------------------------------------------------------------- приложение
export const App: React.FC = () => {
  const [list, setList] = useState<Project[] | null>(null);
  const [open, setOpen] = useState<Project | null>(null);
  const [startNew, setStartNew] = useState(false); // «+ Новый ролик» прямо из отправленного ролика
  const reload = useCallback(() => listProjects().then(setList), []);
  useEffect(() => {
    reload();
  }, [reload]);
  useEffect(() => {
    const id = location.hash.match(/^#p=([\w-]+)/)?.[1];
    if (id && list && !open) {
      const p = list.find((x) => x.id === id);
      if (p) setOpen(p);
    }
  }, [list, open]);
  if (open)
    return (
      <Workspace
        initial={open}
        onClose={(next) => {
          setOpen(null);
          setStartNew(next === "new");
          history.replaceState(null, "", "#");
          reload();
        }}
      />
    );
  return (
    <Home
      list={list}
      startNew={startNew}
      onOpen={(p) => {
        location.hash = `p=${p.id}`;
        setOpen(p);
      }}
      onChanged={reload}
    />
  );
};

// ---------------------------------------------------------------- главный экран: ролики
const Home: React.FC<{list: Project[] | null; startNew?: boolean; onOpen: (p: Project) => void; onChanged: () => void}> = ({list, startNew, onOpen, onChanged}) => {
  const [adding, setAdding] = useState(!!startNew);
  return (
    <div className="home">
      <header className="top">
        <div className="logo">
          <span className="dot" />
          Монтажная
        </div>
        <span className="sub">ролики для Instagram и TikTok</span>
        <span className="sp" />
        <button className="btn primary" onClick={() => setAdding(true)}>
          + Новый ролик
        </button>
      </header>
      <main className="homebody">
        {list === null ? null : list.length === 0 ? (
          <div className="empty">
            <h2>Добавьте первый ролик</h2>
            <p>Сырое видео с телефона или по ссылке. Дальше — текст, субтитры в нашем стиле, звук, цвет и эффекты, и всё это сразу видно в окне.</p>
            <button className="btn primary big" onClick={() => setAdding(true)}>
              + Новый ролик
            </button>
          </div>
        ) : (
          <div className="grid">
            {list.map((p) => (
              <article key={p.id} className="card" onClick={() => onOpen(p)}>
                <div className={`badge b-${p.brand}`}>{BRANDS[p.brand].title}</div>
                <h3>{p.name}</h3>
                <div className="meta">
                  {p.source ? `${fmtTime(p.source.duration)} · ${p.source.width}×${p.source.height}` : "без видео"}
                  {p.words.length ? ` · ${p.words.length} слов` : ""}
                  {p.effects.length ? ` · эффектов: ${p.effects.length}` : ""}
                  {p.notes.length ? ` · заметок: ${p.notes.filter((n) => !n.done).length}` : ""}
                </div>
                {p.jobs?.length ? <JobBadge id={p.jobs[0].id} /> : <div className="meta">Изменён {p.updated}</div>}
                <button
                  className="del"
                  title="Удалить ролик из Монтажной"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const b = e.currentTarget;
                    if (b.dataset.armed !== "1") {
                      b.dataset.armed = "1";
                      b.textContent = "Удалить?";
                      setTimeout(() => {
                        b.dataset.armed = "";
                        b.textContent = "✕";
                      }, 3000);
                      return;
                    }
                    await deleteProject(p.id);
                    onChanged();
                  }}
                >
                  ✕
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
      {adding ? (
        <NewVideo
          onCancel={() => setAdding(false)}
          onCreated={(p) => {
            setAdding(false);
            onChanged();
            onOpen(p);
          }}
        />
      ) : null}
    </div>
  );
};

const isImage = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|gif)$/i.test(f.name);

const NewVideo: React.FC<{onCancel: () => void; onCreated: (p: Project) => void}> = ({onCancel, onCreated}) => {
  const [mode, setMode] = useState<"single" | "multi" | null>(null);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState<Brand>("gtt");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [server, setServer] = useState(false);
  useEffect(() => {
    hasServer().then(setServer);
  }, []);
  const create = async (file: Blob | null, fname: string, url?: string, rest: File[] = []) => {
    setErr("");
    try {
      const p = newProject(name.trim() || fname.replace(/\.[^.]+$/, "") || "Новый ролик", brand);
      p.mode = mode ?? "single";
      if (file) {
        setBusy("Сохраняю видео в Монтажной…");
        const u = URL.createObjectURL(file);
        const pr = await probe(u);
        URL.revokeObjectURL(u);
        await putFile(p.id, "source", file);
        p.source = {name: fname, size: file.size, duration: pr.duration, width: pr.width, height: pr.height, url, local: true};
        if (pr.width > pr.height) p.focus = {x: 540, y: 900};
      } else if (url) {
        p.source = {name: fname, size: 0, duration: 0, width: 0, height: 0, url, local: false};
      }
      await putProject(p);
      if (rest.length) PENDING[p.id] = rest; // остальные ролики и фото склейки добавит шаг «Склейка»
      onCreated(p);
    } catch (e) {
      setErr(String((e as Error).message || e));
      setBusy("");
    }
  };
  // выбранные файлы: один ролик — первый видеофайл; склейка — первый ролик сразу, остальное добавит шаг «Склейка»
  const pick = (list: FileList) => {
    const files = Array.from(list);
    const first = files.find((f) => !isImage(f));
    if (!first) return setErr(mode === "multi" ? "Нужен хотя бы один ролик — фото добавятся к нему." : "Это не видео — выберите ролик (MOV, MP4).");
    create(first, first.name, undefined, mode === "multi" ? files.filter((f) => f !== first) : []);
  };
  return (
    <div className="modal" onClick={onCancel}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <h2>Новый ролик</h2>
        <label className="lbl">Что монтируем</label>
        <div className="modes">
          <button className={mode === "single" ? "on" : ""} onClick={() => setMode("single")}>
            <b>🎬 Один ролик</b>
            <span>Одно видео: субтитры, звук, цвет, эффекты. Паузы и эканья вырежу сам.</span>
          </button>
          <button className={mode === "multi" ? "on" : ""} onClick={() => setMode("multi")}>
            <b>🧩 Склейка роликов</b>
            <span>Несколько роликов и дублей, фото для вставок — склею лучшие куски по порядку.</span>
          </button>
        </div>
        {mode ? (
          <>
        <label className="lbl">Название</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: «Заводы Шэньчжэня»" />
        <label className="lbl">Для какого проекта</label>
        <div className="seg3">
          {(Object.keys(BRANDS) as Brand[]).map((b) => (
            <button key={b} className={brand === b ? "on" : ""} onClick={() => setBrand(b)}>
              {BRANDS[b].title}
            </button>
          ))}
        </div>
        <label
          className="drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files);
          }}
        >
          <b>{mode === "multi" ? "Перетащите ролики и фото сюда" : "Перетащите видео сюда"}</b>
          <span>
            {mode === "multi"
              ? "или нажмите и выберите сразу несколько файлов: все ролики, дубли, фото для вставок"
              : "или нажмите, чтобы выбрать файл (MOV, MP4 с телефона)"}
          </span>
          <input
            type="file"
            multiple={mode === "multi"}
            accept={mode === "multi" ? "video/*,image/*,.mov,.mp4,.m4v,.jpg,.jpeg,.png,.webp" : "video/*,.mov,.mp4,.m4v"}
            hidden
            onChange={(e) => e.target.files && pick(e.target.files)}
          />
        </label>
        <label className="lbl">Или ссылка</label>
        <div className="row">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Google Диск, Яндекс Диск, Dropbox, WeTransfer или прямая ссылка" />
          <button
            className="btn"
            disabled={!/^https?:\/\//.test(link.trim())}
            onClick={async () => {
              const url = link.trim();
              if (server) {
                try {
                  const {blob, name: fn} = await fetchLink(url, setBusy);
                  await create(blob, fn, url);
                } catch (e) {
                  setErr(String((e as Error).message || e));
                  setBusy("");
                }
              } else create(null, "ролик по ссылке", url);
            }}
          >
            Добавить
          </button>
        </div>
        <p className="hint">
          {server
            ? "Ссылка должна быть открыта «для всех, у кого есть ссылка». Видео скачается на этот Mac и сразу откроется."
            : "В браузере видео по ссылке скачает движок при обработке; чтобы смотреть эффекты сразу, добавьте файл с диска или откройте Монтажную на Mac."}
        </p>
        {mode === "multi" ? <p className="hint">По ссылке добавляется первый ролик, остальные — на шаге «Склейка».</p> : null}
          </>
        ) : (
          <p className="hint">Выберите вариант — его можно поменять потом на шаге «Исходник».</p>
        )}
        {busy ? <div className="busy">{busy}</div> : null}
        {err ? <div className="err">{err}</div> : null}
        <div className="acts">
          <button className="btn ghost" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- рабочее место ролика
// clips / cleanClips — ролики склейки и их чистый голос (id ролика → ссылка в браузере)
type Media = {
  video?: string;
  clean?: string;
  images: Record<string, string>;
  clips: Record<string, string>;
  cleanClips: Record<string, string>;
  strip: string[];
  times: number[];
  wave: number[];
  waveClean: number[];
};

const Workspace: React.FC<{initial: Project; onClose: (next?: "new") => void}> = ({initial, onClose}) => {
  const [p, setP] = useState<Project>(initial);
  const [step, setStep] = useState<Step>(initial.words.length ? "edit" : PENDING[initial.id]?.length ? "assemble" : "source");
  const [m, setM] = useState<Media>({images: {}, clips: {}, cleanClips: {}, strip: [], times: [], wave: [], waveClean: []});
  const pcmCache = useRef<Record<string, Float32Array>>({});
  const [frame, setFrame] = useState(0);
  const [status, setStatus] = useState("");
  const player = useRef<PlayerRef>(null);
  const fileRef = useRef<Blob | null>(null);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    panel.current?.scrollTo(0, 0); // новый шаг — с начала
  }, [step]);

  // сохранение (через 400 мс после последней правки)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => putProject({...p, updated: nowIso()}), 400);
    return () => clearTimeout(t);
  }, [p]);
  const up = useCallback((f: (q: Project) => Project) => setP((q) => f(q)), []);

  // файлы проекта → ссылки для предпросмотра; кадры и волна
  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    (async () => {
      const src = await getFile(p.id, "source");
      if (!alive) return;
      let video: string | undefined;
      let clean: string | undefined;
      const cleanBlob = src ? await getFile(p.id, "clean.wav") : undefined;
      if (src) {
        fileRef.current = src;
        urls.push((video = URL.createObjectURL(src)));
        if (cleanBlob) urls.push((clean = URL.createObjectURL(cleanBlob)));
      }
      const images: Record<string, string> = {};
      const clips: Record<string, string> = video ? {source: video} : {};
      const cleanClips: Record<string, string> = clean ? {source: clean} : {};
      for (const e of p.effects) {
        for (const n of [e.params.image, e.params.image2, e.params.image3, e.params.image4]) {
          if (n && !images[n]) {
            const b = await getFile(p.id, `img/${n}`);
            if (b) urls.push((images[n] = URL.createObjectURL(b)));
          }
        }
      }
      // ролики и фото склейки
      for (const c of p.clips ?? []) {
        if (c.kind === "video" && !clips[c.id]) {
          const b = await getFile(p.id, clipKey(c.id));
          if (b) urls.push((clips[c.id] = URL.createObjectURL(b)));
          const cb = await getFile(p.id, cleanKey(c.id));
          if (cb) urls.push((cleanClips[c.id] = URL.createObjectURL(cb)));
        } else if (c.kind === "photo" && !images[c.name]) {
          const b = await getFile(p.id, `img/${c.name}`);
          if (b) urls.push((images[c.name] = URL.createObjectURL(b)));
        }
      }
      if (!alive) return;
      setM((x) => ({...x, video, clean, images, clips, cleanClips}));
      if (!src || p.edl?.length) return; // кадры и волну склейки считает отдельный шаг ниже
      const d = p.source?.duration || 10;
      const times = Array.from({length: 16}, (_, i) => (d * (i + 0.5)) / 16);
      const strip = await frames(video!, times, 160);
      if (alive) setM((x) => ({...x, strip, times}));
      try {
        const pcm = await decodeAudio(src, 8000);
        if (alive) setM((x) => ({...x, wave: peaks(pcm, 400)}));
        if (cleanBlob) {
          const pc = await decodeAudio(cleanBlob, 8000);
          if (alive) setM((x) => ({...x, waveClean: peaks(pc, 400)}));
        }
      } catch (e) {
        setStatus("Звук не прочитался: " + String((e as Error).message || e));
      }
    })();
    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // кадры и волна склеенного ролика: пересчитываются, когда меняется монтажный лист
  const edlSig = JSON.stringify(p.edl ?? null);
  const clipsSig = Object.keys(m.clips).join(",");
  useEffect(() => {
    const edl = p.edl;
    if (!edl?.length) return;
    let alive = true;
    const t = window.setTimeout(async () => {
      const total = edlSeconds(edl);
      const times = Array.from({length: 16}, (_, i) => (total * (i + 0.5)) / 16);
      const strip: string[] = new Array(times.length).fill("");
      const byClip: Record<string, {k: number; t: number}[]> = {};
      times.forEach((tt, k) => {
        const loc = edlLocate(edl, tt);
        if (loc) (byClip[loc.clip] ??= []).push({k, t: loc.t});
      });
      for (const [clip, list] of Object.entries(byClip)) {
        const url = m.clips[clip];
        if (!url) continue;
        try {
          const shots = await frames(url, list.map((x) => x.t), 160);
          list.forEach((x, i) => (strip[x.k] = shots[i]));
        } catch {
          /* кадр не прочитался — пустая клетка */
        }
      }
      if (!alive) return;
      setM((x) => ({...x, strip, times}));
      const parts: Float32Array[] = [];
      for (const s of edl) {
        let pcm = pcmCache.current[s.clip];
        if (!pcm) {
          const f = await getFile(p.id, clipKey(s.clip));
          if (!f) continue;
          try {
            pcm = pcmCache.current[s.clip] = await decodeAudio(f, 8000);
          } catch {
            continue;
          }
        }
        parts.push(pcm.subarray(Math.round(s.from * 8000), Math.round(s.to * 8000)));
      }
      const all = new Float32Array(parts.reduce((n, x) => n + x.length, 0));
      let o = 0;
      for (const x of parts) (all.set(x, o), (o += x.length));
      if (alive) setM((x) => ({...x, wave: peaks(all, 400), waveClean: []}));
    }, 700);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [edlSig, clipsSig]); // eslint-disable-line react-hooks/exhaustive-deps

  // подмена файлов для шаблона: имена из props → файлы из браузера. Ставится до отрисовки плеера; когда файлы
  // меняются (загрузилось видео, посчитан чистый звук, добавлена картинка), плеер пересоздаётся (key)
  const filesKey = useMemo(() => {
    const files = [
      m.video ? {name: LOCAL.video, src: m.video} : null,
      m.clean ? {name: LOCAL.clean, src: m.clean} : null,
      ...Object.entries(m.clips).map(([id, src]) => ({name: LOCAL.clip(id), src})),
      ...Object.entries(m.cleanClips).map(([id, src]) => ({name: LOCAL.cleanClip(id), src})),
      ...Object.entries(m.images).map(([n, src]) => ({name: LOCAL.image(p.id, n), src})),
      ...p.effects.filter((e) => e.params.hf && e.params.hfUrl).map((e) => ({name: hfName(e.params.hf), src: e.params.hfUrl})),
    ].filter(Boolean) as {name: string; src: string}[];
    (window as any).remotion_staticFiles = files;
    return files.map((f) => f.src).join("|");
  }, [m.video, m.clean, m.clips, m.cleanClips, m.images, p.id, p.effects]);

  const [view, setView] = useState<"reels" | "stories">("reels");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  // интерфейс соцсети поверх ролика в телефоне — запоминается в этом окне
  const [igui, setIgui] = useState(() => {
    try {
      return localStorage.getItem("montazh:igui") !== "0";
    } catch {
      return true;
    }
  });
  const toggleIgui = () =>
    setIgui((v) => {
      try {
        localStorage.setItem("montazh:igui", v ? "0" : "1");
      } catch {
        /* хранилище недоступно — просто не запомнится */
      }
      return !v;
    });
  const props = useMemo(() => buildProps(p, {cleanReady: !!m.clean, cleanClips: m.cleanClips, view}), [p, m.clean, m.cleanClips, view]);
  const frames_ = useMemo(() => durationFrames(props), [props]);
  const lead = useMemo(() => leadFrames(props), [props]);
  const sec = Math.max(0, (frame - lead) / FPS);
  const seek = useCallback((s: number) => player.current?.seekTo(Math.round(lead + s * FPS)), [lead]);

  // плеер пересоздаётся при новых файлах (картинка, чистый звук) — возвращаем его на ту же секунду
  const frameRef = useRef(0);
  frameRef.current = frame;
  useEffect(() => {
    const k = window.setTimeout(() => frameRef.current && player.current?.seekTo(frameRef.current), 60);
    return () => clearTimeout(k);
  }, [filesKey]);
  useEffect(() => {
    const pl = player.current;
    if (!pl) return;
    const on = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);
    const play = () => setPlaying(true);
    const pause = () => setPlaying(false);
    pl.addEventListener("frameupdate", on);
    pl.addEventListener("play", play);
    pl.addEventListener("pause", pause);
    pl.addEventListener("ended", pause);
    return () => {
      pl.removeEventListener("frameupdate", on);
      pl.removeEventListener("play", play);
      pl.removeEventListener("pause", pause);
      pl.removeEventListener("ended", pause);
    };
  });
  // пробел — пуск и пауза (кроме полей ввода)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code !== "Space" || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(t.tagName) || t.isContentEditable) return;
      e.preventDefault();
      player.current?.toggle();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  const ready = p.edl?.length ? p.edl.every((s) => m.clips[s.clip]) : !!m.video;
  const pRef = useRef(p);
  pRef.current = p;
  const getP = useCallback(() => pRef.current, []);
  const ctx: StepCtx = {p, up, m, setM, sec, seek, file: fileRef, setStatus, player, step, setStep, getP, goHome: onClose};
  return (
    <div className="ws">
      <header className="top">
        <button className="btn ghost sm homebtn" onClick={() => onClose()} title="На главную: все ролики и их готовность">
          ← Все ролики
        </button>
        <input className="pname" value={p.name} onChange={(e) => up((q) => ({...q, name: e.target.value}))} />
        <nav className="steps">
          {STEPS.map(([id, t], i) => (
            <button key={id} className={step === id ? "on" : ""} onClick={() => setStep(id)}>
              <b>{i + 1}</b>
              {id === "assemble" && modeOf(p) === "single" ? "Чистка" : t}
            </button>
          ))}
        </nav>
        <span className="sp" />
        <button className={`btn sm makebtn ${step === "done" ? "ghost" : "primary"}`} onClick={() => setStep("done")} title="Шаг «Готово»: отправить ролик в облако и скачать готовый">
          🎬 Сделать ролик
        </button>
      </header>
      {status ? (
        <div className="status" onClick={() => setStatus("")}>
          {status}
        </div>
      ) : null}
      <div className={`body s-${step}`}>
        <section className="panel" ref={panel}>
          {step === "source" ? <SourceStep {...ctx} /> : null}
          {step === "assemble" ? <AssembleStep {...ctx} /> : null}
          {step === "text" ? <TextStep {...ctx} /> : null}
          {step === "sound" ? <SoundStep {...ctx} /> : null}
          {step === "color" ? <ColorStep {...ctx} /> : null}
          {step === "edit" ? <EditStep {...ctx} /> : null}
          {step === "library" ? <LibraryStep {...ctx} /> : null}
          {step === "done" ? <DoneStep {...ctx} props={props} /> : null}
        </section>
        <aside className="preview">
          <PhoneFrame brand={p.brand} view={p.format === "stories" ? "stories" : p.format === "both" ? view : "reels"} ui={igui} progress={frames_ > 1 ? frame / (frames_ - 1) : 0}>
            {ready ? (
              <Player
                key={filesKey}
                ref={player}
                component={TalkReelPro as never}
                inputProps={props}
                durationInFrames={frames_}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={FPS}
                clickToPlay
                acknowledgeRemotionLicense
                style={{width: "100%", height: "100%", background: "#000"}}
              />
            ) : (
              <div className="noprev">
                {p.source && !p.source.local
                  ? "Ролик по ссылке: предпросмотр появится, когда движок его скачает. Или добавьте файл с диска."
                  : "Здесь будет ролик с субтитрами и эффектами — сразу, без ожидания."}
              </div>
            )}
          </PhoneFrame>
          <div className="pctl">
            <button className="btn primary sm round" disabled={!ready} title="Пуск / пауза (пробел)" onClick={() => player.current?.toggle()}>
              {playing ? "❚❚" : "▶"}
            </button>
            <span className="ptime">
              {fmtTime(sec)} / {fmtTime(Math.max(0, (frames_ - lead) / FPS))}
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(1, frames_ - 1)}
              value={frame}
              disabled={!ready}
              onChange={(e) => player.current?.seekTo(+e.target.value)}
              title="Перемотка"
            />
            <button
              className="btn ghost sm round"
              disabled={!ready}
              title={muted ? "Включить звук" : "Выключить звук"}
              onClick={() => {
                if (muted) player.current?.unmute();
                else player.current?.mute();
                setMuted(!muted);
              }}
            >
              {muted ? "🔇" : "🔊"}
            </button>
          </div>
          {p.format === "both" ? (
            <div className="seg3 viewseg">
              <button className={view === "reels" ? "on" : ""} onClick={() => setView("reels")}>
                Как Reels
              </button>
              <button className={view === "stories" ? "on" : ""} onClick={() => setView("stories")}>
                Как Stories
              </button>
            </div>
          ) : null}
          <div className="ptoggles">
            <button className={igui ? "on" : ""} onClick={toggleIgui} title="Кнопки и подписи Instagram поверх ролика: видно, что они закроют">
              Интерфейс Instagram
            </button>
            {p.brand === "gtt" ? <BumperToggles p={p} up={up} /> : null}
          </div>
        </aside>
        {step === "edit" ? <Timeline {...ctx} props={props} /> : null}
      </div>
    </div>
  );
};

export type StepCtx = {
  p: Project;
  up: (f: (q: Project) => Project) => void;
  m: Media;
  setM: React.Dispatch<React.SetStateAction<Media>>;
  sec: number;
  seek: (s: number) => void;
  file: React.MutableRefObject<Blob | null>;
  setStatus: (s: string) => void;
  player: React.RefObject<PlayerRef | null>;
  step: Step;
  setStep: (s: Step) => void;
  getP: () => Project; // проект после последних правок (для долгих операций: автомонтаж)
  goHome?: (next?: "new") => void; // на главную; "new" — сразу открыть «Новый ролик»
};

// фирменная заставка GTT отдельно в начале и в конце (решение пользователя 23.10.2026: «кнопки под каждую»)
const BumperToggles: React.FC<{p: Project; up: StepCtx["up"]}> = ({p, up}) => {
  const b = p.bumper ?? {intro: true, outro: true};
  const flip = (k: "intro" | "outro") => up((q) => ({...q, bumper: {...(q.bumper ?? {intro: true, outro: true}), [k]: !b[k]}}));
  return (
    <span className="bumpers">
      <em>Заставка:</em>
      <button className={b.intro ? "on" : ""} onClick={() => flip("intro")} title="Заставка GLOBAL TECH TOUR в начале ролика (~1,5 с)">
        в начале
      </button>
      <button className={b.outro ? "on" : ""} onClick={() => flip("outro")} title="Заставка GLOBAL TECH TOUR в конце ролика (~1,2 с)">
        в конце
      </button>
    </span>
  );
};

const Next: React.FC<{to: Step; setStep: (s: Step) => void; children: React.ReactNode}> = ({to, setStep, children}) => (
  <div className="next">
    <button className="btn primary" onClick={() => setStep(to)}>
      {children} →
    </button>
  </div>
);

// ---------------------------------------------------------------- 1. Исходник
const SourceStep: React.FC<StepCtx> = (ctx) => {
  const {p, up, m, seek, setStep} = ctx;
  const single = modeOf(p) === "single";
  return (
  <div className="step">
    <h2>Исходник</h2>
    <div className="seg3 modeseg">
      <button className={single ? "on" : ""} onClick={() => up((q) => ({...q, mode: "single"}))}>
        🎬 Один ролик
      </button>
      <button className={!single ? "on" : ""} onClick={() => up((q) => ({...q, mode: "multi"}))}>
        🧩 Склейка роликов
      </button>
    </div>
    <p className="muted">
      {single
        ? "Шаг 2 — «Чистка»: паузы, эканья и мусорные слова вырезаются из этого ролика."
        : "Шаг 2 — «Склейка»: добавьте остальные ролики и дубли, Монтажная склеит лучшие куски по порядку."}
    </p>
    <div className="autobox">
      <AutoMontage {...ctx} big />
      <span>
        Одна кнопка: распознать речь, вырезать паузы и эканья, чистый голос, музыка, эффекты по смыслу, картинки и ритм.
        Или пройдите шаги сами.
      </span>
    </div>
    {p.source ? (
      <p className="lead">
        {p.source.name} · {fmtTime(p.source.duration)} · {p.source.width}×{p.source.height}
        {p.source.size ? ` · ${(p.source.size / 1048576).toFixed(0)} МБ` : ""}
        {p.source.url ? (
          <>
            {" "}
            · <a href={p.source.url} target="_blank" rel="noreferrer">ссылка</a>
          </>
        ) : null}
      </p>
    ) : null}
    {p.edl?.length ? (
      <p className="lead">
        Склейка из {new Set(p.edl.map((x) => x.clip)).size} роликов · {fmtTime(projSeconds(p))} · {p.edl.length} кусков{" "}
        <a onClick={() => setStep("assemble")}>изменить</a>
      </p>
    ) : null}
    <h3>Кадры</h3>
    <div className="strip">
      {m.strip.map((s, i) => (
        <img key={i} src={s} onClick={() => seek(m.times[i])} title={fmtTime(m.times[i])} />
      ))}
      {!m.strip.length ? <div className="muted">Нарезаю на кадры…</div> : null}
    </div>
    <h3>Звук</h3>
    <Wave peaks={m.wave} onSeek={(k) => seek(k * projSeconds(p))} />
    <h3>Проект и формат</h3>
    <div className="seg3">
      {(Object.keys(BRANDS) as Brand[]).map((b) => (
        <button
          key={b}
          className={p.brand === b ? "on" : ""}
          onClick={() => up((q) => ({...q, brand: b, captions: {...q.captions, size: BRANDS[b].captionSize, top: BRANDS[b].captionTop}}))}
        >
          {BRANDS[b].title}
        </button>
      ))}
    </div>
    <div className="seg3">
      <button className={p.format === "reels" ? "on" : ""} onClick={() => up((q) => ({...q, format: "reels"}))}>
        Reels / TikTok
      </button>
      <button className={p.format === "stories" ? "on" : ""} onClick={() => up((q) => ({...q, format: "stories"}))}>
        Stories
      </button>
      <button className={p.format === "both" ? "on" : ""} onClick={() => up((q) => ({...q, format: "both"}))}>
        Оба сразу
      </button>
    </div>
    <p className="muted">
      «Оба сразу» — облако делает два файла: Reels и Stories (Stories — частями до 60 с). Предпросмотр переключается под
      роликом.
    </p>
    {p.brand === "gtt" ? (
      <>
        <h3>Заставка GLOBAL TECH TOUR</h3>
        <div className="ptoggles left">
          <BumperToggles p={p} up={up} />
        </div>
        <p className="muted">Включается отдельно в начале и в конце; те же кнопки — под телефоном на любом шаге.</p>
      </>
    ) : null}
    <h3>Линия глаз</h3>
    <p className="muted">Нажмите на глаза в кадре: вокруг этой точки делаются наезды, а плашки не закрывают лицо.</p>
    {m.strip[2] ? (
      <div
        className="eyes"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          // кадр исходника в шаблоне ложится «cover» на 1080×1920
          const sw = p.source?.width || 1080,
            sh = p.source?.height || 1920;
          const k = Math.max(1080 / sw, 1920 / sh);
          const ox = (1080 - sw * k) / 2,
            oy = (1920 - sh * k) / 2;
          const x = ((e.clientX - r.left) / r.width) * sw * k + ox;
          const y = ((e.clientY - r.top) / r.height) * sh * k + oy;
          up((q) => ({...q, focus: {x: Math.round(x), y: Math.round(y)}}));
        }}
      >
        <img src={m.strip[2]} />
        <i
          style={{
            left: `${((p.focus.x - (1080 - (p.source?.width || 1080) * Math.max(1080 / (p.source?.width || 1080), 1920 / (p.source?.height || 1920))) / 2) / ((p.source?.width || 1080) * Math.max(1080 / (p.source?.width || 1080), 1920 / (p.source?.height || 1920)))) * 100}%`,
            top: `${((p.focus.y - (1920 - (p.source?.height || 1920) * Math.max(1080 / (p.source?.width || 1080), 1920 / (p.source?.height || 1920))) / 2) / ((p.source?.height || 1920) * Math.max(1080 / (p.source?.width || 1080), 1920 / (p.source?.height || 1920)))) * 100}%`,
          }}
        />
      </div>
    ) : null}
    <Next to="assemble" setStep={setStep}>
      {single ? "Дальше: чистка пауз и эканий" : "Дальше: склейка роликов"}
    </Next>
  </div>
  );
};

const Wave: React.FC<{peaks: number[]; second?: number[]; onSeek?: (k: number) => void; pos?: number}> = ({peaks: pk, second, onSeek, pos}) => (
  <div
    className="wave"
    onClick={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      onSeek?.((e.clientX - r.left) / r.width);
    }}
  >
    <svg viewBox={`0 0 ${Math.max(1, pk.length)} 100`} preserveAspectRatio="none">
      {pk.map((v, i) => (
        <rect key={i} x={i} y={50 - v * 46} width={0.7} height={Math.max(1, v * 92)} className="w1" />
      ))}
      {(second ?? []).map((v, i) => (
        <rect key={`c${i}`} x={i + 0.15} y={50 - v * 46} width={0.4} height={Math.max(1, v * 92)} className="w2" />
      ))}
    </svg>
    {pos !== undefined ? <i style={{left: `${pos * 100}%`}} /> : null}
    {!pk.length ? <span className="muted">Читаю звук…</span> : null}
  </div>
);

// ---------------------------------------------------------------- 2. Текст и субтитры
const TextStep: React.FC<StepCtx> = ({p, up, file, seek, sec, setStep}) => {
  const [busy, setBusy] = useState<{k: number; t: string} | null>(null);
  const [model, setModel] = useState<AsrModel>("small");
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<number | null>(null);
  const multi = !!p.edl?.length;
  const run = async () => {
    if (!file.current && !multi) return;
    setErr("");
    try {
      if (multi) await transcribeClips(p, up, model, (k, t) => setBusy({k, t}), true);
      else {
        const words = await transcribe(file.current!, model, (k, t) => setBusy({k, t}));
        up((q) => ({...q, words, wordsFrom: "browser"}));
      }
    } catch (e) {
      setErr("Не получилось распознать: " + String((e as Error).message || e) + ". Можно загрузить готовые субтитры файлом или отдать ролик движку.");
    }
    setBusy(null);
  };
  const phrases = useMemo(() => {
    const out: {i: number; w: (typeof p.words)[number]}[][] = [];
    p.words.forEach((w, i) => {
      const last = out[out.length - 1];
      if (!last || w.start - last[last.length - 1].w.end > 0.6 || last.length >= 12) out.push([{i, w}]);
      else last.push({i, w});
    });
    return out;
  }, [p.words]);
  return (
    <div className="step">
      <h2>Текст и субтитры</h2>
      <div className="row wrap">
        <button className="btn primary" disabled={(!file.current && !multi) || !!busy} onClick={run}>
          {p.words.length ? "Распознать заново" : "Распознать речь"}
        </button>
        <select value={model} onChange={(e) => setModel(e.target.value as AsrModel)} title="Модель Whisper">
          <option value="small">точно (Whisper small, ~250 МБ один раз)</option>
          <option value="base">быстро (Whisper base, ~80 МБ)</option>
        </select>
        <label className="btn ghost">
          Загрузить субтитры (.json, .srt)
          <input
            type="file"
            accept=".json,.srt"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const words = parseWordsFile(f.name, await f.text());
                up((q) => ({...q, words, wordsFrom: "file"}));
              } catch (x) {
                setErr("Файл не прочитался: " + String(x));
              }
            }}
          />
        </label>
      </div>
      {busy ? (
        <div className="prog">
          <i style={{width: `${busy.k * 100}%`}} />
          <span>{busy.t}</span>
        </div>
      ) : null}
      {err ? <div className="err">{err}</div> : null}
      <h3>Стиль субтитров</h3>
      <div className="cards">
        {(
          [
            ["flat", "Фирменные", p.brand === "gtt" ? "по 3 слова, текущее — синим" : p.brand === "aura" ? "лимонный маркер" : "жёлтый маркер, жёсткая тень"],
            ["3d", "Объёмные 3D", "буквы в перспективе прилетают из глубины"],
          ] as const
        ).map(([id, t, d]) => (
          <button key={id} className={`opt ${p.captions.style === id ? "on" : ""}`} onClick={() => up((q) => ({...q, captions: {...q.captions, style: id}}))}>
            <b>{t}</b>
            <span>{d}</span>
          </button>
        ))}
      </div>
      <div className="sliders">
        <label>
          Размер <b>{p.captions.size}</b>
          <input type="range" min={40} max={90} value={p.captions.size} onChange={(e) => up((q) => ({...q, captions: {...q.captions, size: +e.target.value}}))} />
        </label>
        <label>
          Высота <b>{p.captions.top}</b>
          <input type="range" min={900} max={1500} step={10} value={p.captions.top} onChange={(e) => up((q) => ({...q, captions: {...q.captions, top: +e.target.value}}))} />
        </label>
      </div>
      <h3>
        Текст <span className="muted">— нажмите на слово, чтобы перейти к нему; двойной щелчок — исправить</span>
      </h3>
      <div className="words">
        {phrases.map((ph, k) => (
          <p key={k}>
            <em onClick={() => seek(ph[0].w.start)}>{fmtTime(ph[0].w.start)}</em>
            {ph.map(({i, w}) =>
              edit === i ? (
                <input
                  key={i}
                  autoFocus
                  defaultValue={w.text}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    up((q) => {
                      const ow = q.words[i];
                      if (ow?.c !== undefined && ow.ci !== undefined && q.edl?.length) {
                        // склейка: правка попадает в слова ролика, чтобы не пропасть при пересклейке
                        const cl = clipsOf(q).map((c) =>
                          c.id === ow.c ? {...c, words: (c.words ?? []).flatMap((x, j) => (j === ow.ci ? (v ? [{...x, text: v}] : []) : [x]))} : c,
                        );
                        return {...q, clips: cl, words: edlWords(q.edl, cl), wordsFrom: "manual"};
                      }
                      return {...q, words: v ? q.words.map((x, j) => (j === i ? {...x, text: v} : x)) : q.words.filter((_, j) => j !== i), wordsFrom: "manual"};
                    });
                    setEdit(null);
                  }}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && (e.target as HTMLInputElement).blur()}
                />
              ) : (
                <span key={i} className={sec >= w.start && sec < w.end ? "now" : ""} onClick={() => seek(w.start)} onDoubleClick={() => setEdit(i)}>
                  {w.text}
                </span>
              ),
            )}
          </p>
        ))}
        {!p.words.length ? <div className="muted">Пока пусто: нажмите «Распознать речь».</div> : null}
      </div>
      <Next to="sound" setStep={setStep}>
        Дальше: звук
      </Next>
    </div>
  );
};

// ---------------------------------------------------------------- 3. Звук
const SoundStep: React.FC<StepCtx> = ({p, up, m, setM, file, seek, sec, setStep}) => {
  const [busy, setBusy] = useState<{k: number; t: string} | null>(null);
  const multi = !!p.edl?.length;
  const make = async () => {
    if (multi) {
      const got = await cleanClips(p, cleanVoice, (k, t) => setBusy({k, t}));
      const urls: Record<string, string> = {};
      for (const [id, b] of Object.entries(got)) urls[id] = URL.createObjectURL(b);
      setM((x) => ({...x, cleanClips: {...x.cleanClips, ...urls}, clean: urls.source ?? x.clean}));
      up((q) => ({...q, audio: {...q.audio, clean: true}}));
      setBusy(null);
      return;
    }
    if (!file.current) return;
    const blob = await cleanVoice(file.current, (k, t) => setBusy({k, t}));
    await putFile(p.id, "clean.wav", blob);
    const url = URL.createObjectURL(blob);
    const pc = await decodeAudio(blob, 8000);
    setM((x) => ({...x, clean: url, waveClean: peaks(pc, 400)}));
    up((q) => ({...q, audio: {...q.audio, clean: true}}));
    setBusy(null);
  };
  const d = projSeconds(p) || 1;
  return (
    <div className="step">
      <h2>Звук</h2>
      <p className="lead">Переключайте и слушайте в предпросмотре справа: разница слышна сразу.</p>
      <div className="cards">
        <button className={`opt ${!p.audio.clean ? "on" : ""}`} onClick={() => up((q) => ({...q, audio: {...q.audio, clean: false}}))}>
          <b>Как снято</b>
          <span>звук с телефона без обработки</span>
        </button>
        <button
          className={`opt ${p.audio.clean ? "on" : ""}`}
          disabled={!!busy}
          onClick={() =>
            (multi ? p.edl!.every((x) => m.cleanClips[x.clip]) : m.clean) ? up((q) => ({...q, audio: {...q.audio, clean: true}})) : make()
          }
        >
          <b>Чистый голос</b>
          <span>{(multi ? p.edl!.every((x) => m.cleanClips[x.clip]) : m.clean) ? "шумодав + эквалайзер + компрессор" : "посчитать (несколько секунд)"}</span>
        </button>
      </div>
      {busy ? (
        <div className="prog">
          <i style={{width: `${busy.k * 100}%`}} />
          <span>{busy.t}</span>
        </div>
      ) : null}
      <h3>
        Волна <span className="muted">— серая: как снято, зелёная: чистый голос</span>
      </h3>
      <Wave peaks={m.wave} second={m.waveClean} onSeek={(k) => seek(k * d)} pos={sec / d} />
      <p className="muted">
        В готовом ролике звук делает движок «как в студии»: нейросетевой шумодав DeepFilterNet3, де-эссер, громкость −14 LUFS,
        вырезка пауз, «эканий» и цыканий.
      </p>
      <h3>Музыка</h3>
      <div className="row wrap">
        <select value={p.audio.music ?? ""} onChange={(e) => up((q) => ({...q, audio: {...q.audio, music: e.target.value || null}}))}>
          <option value="">без музыки</option>
          {MUSIC.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
        <label className="inline">
          Громкость
          <input type="range" min={0.3} max={2} step={0.05} value={p.audio.musicVolume} onChange={(e) => up((q) => ({...q, audio: {...q.audio, musicVolume: +e.target.value}}))} />
        </label>
        <label className="inline" title="Пока вы говорите, музыка тише; в паузах — громче">
          <input type="checkbox" checked={p.audio.duck !== false} onChange={(e) => up((q) => ({...q, audio: {...q.audio, duck: e.target.checked}}))} />
          Тише под голос
        </label>
      </div>
      <Next to="color" setStep={setStep}>
        Дальше: цвет
      </Next>
    </div>
  );
};

// ---------------------------------------------------------------- 4. Цвет
const ColorStep: React.FC<StepCtx> = ({p, up, m, setStep}) => {
  const shots = [m.strip[2], m.strip[7], m.strip[12]].filter(Boolean);
  return (
    <div className="step">
      <h2>Цвет</h2>
      <p className="lead">Каждый вариант — на кадрах вашего ролика. Нажмите — и предпросмотр справа сразу в этом цвете.</p>
      <div className="grades">
        {GRADES.map((g) => (
          <button key={g.id} className={`grade ${p.grade.preset === g.id ? "on" : ""}`} onClick={() => up((q) => ({...q, grade: {...q.grade, preset: g.id}}))}>
            <div className="gshots">
              {shots.map((s, i) => (
                <img key={i} src={s} style={{filter: gradeCss(g.id, p.grade.preset === g.id ? p.grade.amount : 0.8) || "none"}} />
              ))}
            </div>
            <b>{g.title}</b>
            <span>{g.note}</span>
          </button>
        ))}
      </div>
      <div className="sliders">
        <label>
          Сила <b>{Math.round(p.grade.amount * 100)}%</b>
          <input type="range" min={0} max={1.5} step={0.05} value={p.grade.amount} onChange={(e) => up((q) => ({...q, grade: {...q.grade, amount: +e.target.value}}))} />
        </label>
      </div>
      <p className="muted">Видео с iPhone в HDR движок сначала переводит в естественный цвет (bt709), потом накладывает выбранный вариант.</p>
      <TextColors p={p} up={up} />
      <Next to="edit" setStep={setStep}>
        Дальше: монтаж
      </Next>
    </div>
  );
};

// цвета текста: готовые сочетания + свои цвета с проверкой; меняются сразу в предпросмотре
const TextColors: React.FC<{p: Project; up: StepCtx["up"]}> = ({p, up}) => {
  const pal = p.palette ?? {preset: "brand"};
  const set = (patch: Partial<NonNullable<Project["palette"]>>) => up((q) => ({...q, palette: {...(q.palette ?? {preset: "brand"}), ...patch}}));
  const cur = {text: pal.text || "#FFFFFF", accent: pal.accent || BRANDS[p.brand].accent, ink: pal.ink || "#191922"};
  const tip = pal.preset === "custom" ? advise(cur.text, cur.accent, cur.ink) : null;
  return (
    <>
      <h3>Цвета текста</h3>
      <p className="muted">Субтитры, выделенные слова и надписи. Готовые сочетания проверены на читаемость; на отдельном отрезке цвет меняет эффект «Цвета текста на отрезке» (Монтаж → Цвет).</p>
      <div className="pals">
        {PALETTES.map((x) => {
          const t = x.text || "#FFFFFF";
          const a = x.accent || BRANDS[p.brand].accent;
          const k = x.ink || "#191922";
          return (
            <button key={x.id} className={`pal ${pal.preset === x.id ? "on" : ""}`} onClick={() => set({preset: x.id, text: x.text || undefined, accent: x.accent || undefined, ink: x.ink || undefined})}>
              <div className="palprev">
                <span style={{color: t}}>Пять</span> <span style={{color: a}}>дней</span> <mark style={{background: a, color: k}}>Китай</mark>
              </div>
              <b>
                {x.title}
                {x.brands?.includes(p.brand) ? " · фирменный" : ""}
              </b>
              <span>{x.note}</span>
            </button>
          );
        })}
        <button className={`pal ${pal.preset === "custom" ? "on" : ""}`} onClick={() => set({preset: "custom", ...cur})}>
          <div className="palprev">
            <span style={{color: cur.text}}>Свои</span> <span style={{color: cur.accent}}>цвета</span>
          </div>
          <b>Свои цвета</b>
          <span>выбрать и проверить сочетание</span>
        </button>
      </div>
      {pal.preset === "custom" ? (
        <div className="editor">
          <ColorField label="Субтитры" value={cur.text} onChange={(v) => set({text: v})} />
          <ColorField label="Акцент (текущее и важные слова)" value={cur.accent} onChange={(v) => set({accent: v})} />
          <ColorField label="Текст на акценте" value={cur.ink} onChange={(v) => set({ink: v})} />
          {tip ? (
            <ul className={`advice ${tip.ok ? "ok" : "warn"}`}>
              {tip.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

const ColorField: React.FC<{label: string; value: string; onChange: (v: string) => void}> = ({label, value, onChange}) => (
  <div className="colorf">
    <span>{label}</span>
    <div className="row wrap">
      {SWATCHES.map((c) => (
        <button key={c} className={`sw ${value.toLowerCase() === c.toLowerCase() ? "on" : ""}`} style={{background: c}} title={c} onClick={() => onChange(c)} />
      ))}
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"} onChange={(e) => onChange(e.target.value.toUpperCase())} />
    </div>
  </div>
);

// ---------------------------------------------------------------- 5. Монтаж: эффекты и заметки
const EditStep: React.FC<StepCtx> = (ctx) => {
  const {p, up, m, setM, sec, seek, setStep} = ctx;
  const [rhythm, setRhythm] = useState(false);
  const [cat, setCat] = useState(CATS[0]);
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const item = p.effects.find((e) => e.id === sel);
  const add = (effect: string) => {
    const ef = effectById(effect)!;
    const it: EffectItem = {id: newId("e"), effect, at: +sec.toFixed(2), until: +(sec + ef.len).toFixed(2), params: {}};
    up((q) => ({...q, effects: [...q.effects, it]}));
    setSel(it.id);
  };
  return (
    <div className="step">
      <h2>Монтаж</h2>
      <div className="row wrap toolsrow">
        <AutoMontage {...ctx} />
        <button className={`btn ${rhythm ? "primary" : ""}`} onClick={() => setRhythm(!rhythm)} title="Эффект каждые N секунд по всему ролику">
          ⏱ Ритм{p.effects.some((e) => e.params.rhythm) ? ` · каждые ${p.rhythm?.every ?? 4} с` : ""}
        </button>
        <span className="muted">Автомонтаж собирает всё сам; Ритм ставит эффект каждые 4 с (или как настроите).</span>
      </div>
      {rhythm ? <RhythmPanel {...ctx} onClose={() => setRhythm(false)} /> : null}
      <CommandBar p={p} up={up} sec={sec} seek={seek} />
      <p className="lead">
        Или выберите сами: поставьте курсор на нужную секунду (в ролике или на дорожках внизу) и нажмите эффект — он сразу появится в
        предпросмотре.
      </p>
      <div className="tabs">
        {CATS.map((c) => (
          <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="fxlist">
        {EFFECTS.filter((e) => e.cat === cat).map((e) => (
          <button key={e.id} className="fx" onClick={() => add(e.id)} title={e.desc}>
            <Preview id={e.id} />
            <b>{e.title}</b>
            <span>+ на {fmtTime(sec)}</span>
          </button>
        ))}
      </div>
      {cat === "Перебивки" || withImage(item) ? <ImagePicker p={p} up={up} sec={sec} target={withImage(item) ? item : undefined} onAdded={setSel} /> : null}
      {item ? <EffectEditor item={item} p={p} up={up} setM={setM} mImages={m.images} media={{video: m.video, clips: m.clips}} seek={seek} onClose={() => setSel(null)} /> : null}
      <div className="effects-on">
        <h3>В ролике</h3>
        {p.effects.length ? null : <div className="muted">Эффектов пока нет.</div>}
        {[...p.effects]
          .sort((a, b) => a.at - b.at)
          .map((e) => (
            <button key={e.id} className={`chip ${sel === e.id ? "on" : ""}`} onClick={() => (setSel(e.id), seek(e.at))}>
              {fmtTime(e.at)} · {effectById(e.effect)?.title ?? e.effect}
            </button>
          ))}
      </div>
      <h3>Заметки</h3>
      <p className="muted">Что добавить или исправить на этой секунде — увижу вместе с роликом и сделаю.</p>
      <div className="row">
        <input
          className="noteinput"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Заметка на ${fmtTime(sec)}: например, «здесь логотип BYD» или «вырезать оговорку»`}
          onKeyDown={(e) => {
            if (e.key === "Enter" && note.trim()) {
              up((q) => ({...q, notes: [...q.notes, {id: newId("n"), at: +sec.toFixed(2), text: note.trim(), created: nowIso()}].sort((a, b) => a.at - b.at)}));
              setNote("");
            }
          }}
        />
        <button
          className="btn"
          disabled={!note.trim()}
          onClick={() => {
            up((q) => ({...q, notes: [...q.notes, {id: newId("n"), at: +sec.toFixed(2), text: note.trim(), created: nowIso()}].sort((a, b) => a.at - b.at)}));
            setNote("");
          }}
        >
          Добавить
        </button>
      </div>
      <ul className="notes">
        {p.notes.map((n) => (
          <li key={n.id} className={n.done ? "done" : ""}>
            <em onClick={() => seek(n.at)}>{fmtTime(n.at)}</em>
            <span>{n.text}</span>
            <button title="Выполнено" onClick={() => up((q) => ({...q, notes: q.notes.map((x) => (x.id === n.id ? {...x, done: !x.done} : x))}))}>
              ✓
            </button>
            <button title="Удалить" onClick={() => up((q) => ({...q, notes: q.notes.filter((x) => x.id !== n.id)}))}>
              ✕
            </button>
          </li>
        ))}
      </ul>
      <Next to="done" setStep={setStep}>
        Готово: отправить в работу
      </Next>
    </div>
  );
};

const withImage = (it?: EffectItem) => !!it && !!effectById(it.effect)?.fields.some((f) => f.kind === "image" || f.kind === "media");

// углы экрана в кадре («Экран в кадре»): кадр ролика на секунде эффекта, 4 щелчка — TL, TR, BR, BL (точки кадра 1080×1920)
const QuadField: React.FC<{label: string; hint?: string; value: string; onChange: (v: string) => void; p: Project; at: number; media: {video?: string; clips: Record<string, string>}}> = ({label, hint, value, onChange, p, at, media}) => {
  const [shot, setShot] = useState("");
  const [pts, setPts] = useState<[number, number][]>([]);
  // размер кадра того ролика, который идёт на этой секунде (в склейке — у каждого свой)
  const loc = p.edl?.length ? edlLocate(p.edl, at) : null;
  const clip = loc ? clipsOf(p).find((c) => c.id === loc.clip) : undefined;
  const sw = (clip?.width || p.source?.width || 1080) as number;
  const sh = (clip?.height || p.source?.height || 1920) as number;
  const k = Math.max(1080 / sw, 1920 / sh);
  const ox = (1080 - sw * k) / 2;
  const oy = (1920 - sh * k) / 2;
  useEffect(() => {
    let alive = true;
    const url = loc ? media.clips[loc.clip] : media.video;
    const t = loc ? loc.t : at;
    if (!url) return;
    frames(url, [t], 360).then(([img]) => alive && setShot(img), () => {});
    return () => {
      alive = false;
    };
  }, [at, media.video, loc?.clip, loc?.t]);
  const cur = pts.length ? pts : parseQuad(value) ?? parseQuad(DEFAULT_QUAD)!;
  const toPct = ([x, y]: [number, number]) => [((x - ox) / (sw * k)) * 100, ((y - oy) / (sh * k)) * 100];
  const NAMES = ["слева сверху", "справа сверху", "справа снизу", "слева снизу"];
  return (
    <div className="quadf">
      <span>
        {label} <b>{pts.length ? `щёлкните: ${NAMES[pts.length]}` : value ? "отмечены" : "по умолчанию — ноутбук перед собой"}</b>
      </span>
      {hint ? <span className="muted">{hint}</span> : null}
      <div
        className="quadpick"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = Math.round(((e.clientX - r.left) / r.width) * sw * k + ox);
          const y = Math.round(((e.clientY - r.top) / r.height) * sh * k + oy);
          const next = [...pts, [x, y] as [number, number]];
          if (next.length === 4) {
            onChange(next.map((q) => q.join(",")).join(" "));
            setPts([]);
          } else setPts(next);
        }}
      >
        {shot ? <img src={shot} /> : <div className="muted">Кадр загружается…</div>}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon points={cur.map((q) => toPct(q).join(",")).join(" ")} />
        </svg>
        {cur.map((q, i) => {
          const [l, t] = toPct(q);
          return (
            <i key={i} style={{left: `${l}%`, top: `${t}%`}}>
              {i + 1}
            </i>
          );
        })}
      </div>
      <div className="row">
        <button className="btn ghost sm" onClick={() => setPts([])}>
          Отметить заново
        </button>
        {value ? (
          <button className="btn ghost sm" onClick={() => onChange("")}>
            Сбросить
          </button>
        ) : null}
      </div>
    </div>
  );
};

const EffectEditor: React.FC<{item: EffectItem; p: Project; up: StepCtx["up"]; setM: StepCtx["setM"]; mImages: Record<string, string>; media: {video?: string; clips: Record<string, string>}; seek: (s: number) => void; onClose: () => void}> = ({
  item,
  p,
  up,
  setM,
  mImages,
  media,
  seek,
  onClose,
}) => {
  const ef = effectById(item.effect)!;
  const set = (patch: Partial<EffectItem>) => up((q) => ({...q, effects: q.effects.map((e) => (e.id === item.id ? {...e, ...patch} : e))}));
  const setParam = (k: string, v: string) => set({params: {...item.params, [k]: v}});
  return (
    <div className="editor">
      <div className="ehead">
        <b>{ef.title}</b>
        <span className="muted">{ef.desc}</span>
        <button className="x" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="row">
        <label className="inline">
          с
          <input type="number" step={0.1} value={item.at} onChange={(e) => set({at: +e.target.value})} />
        </label>
        <label className="inline">
          до
          <input type="number" step={0.1} value={item.until ?? item.at + ef.len} onChange={(e) => set({until: +e.target.value})} />
        </label>
        <button className="btn ghost" onClick={() => seek(Math.max(0, item.at - 0.5))}>
          ▶ посмотреть
        </button>
      </div>
      {ef.fields.map((f) =>
        f.key === "emoji" ? (
          <div key={f.key} className="emogrid">
            {EMOJI.map((x) => (
              <button
                key={x.file}
                className={(item.params.emoji || "огонь") === x.file ? "on" : ""}
                title={x.file}
                onClick={() => setParam("emoji", x.file)}
              >
                <img src={`assets/${emojiSrc(x.file)}`} alt={x.char} loading="lazy" />
              </button>
            ))}
          </div>
        ) : (f.kind === "image" || f.kind === "media") && f.key === "image" && item.params.hf ? (
          <div key={f.key} className="row">
            <img className="hfthumb" src={thumb(+item.params.hf)} />
            <span className="muted">Картинка №{item.params.hf} из каталога — другую выберите выше или загрузите свою:</span>
            <label className="btn ghost sm">
              Своя
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const name = newId("i") + "." + (file.name.split(".").pop() || "jpg");
                  await putFile(p.id, `img/${name}`, file);
                  setM((x) => ({...x, images: {...x.images, [name]: URL.createObjectURL(file)}}));
                  set({params: {...item.params, image: name, hf: "", hfUrl: ""}});
                }}
              />
            </label>
          </div>
        ) : f.kind === "quad" ? (
          <QuadField key={f.key} label={f.label} hint={f.hint} value={item.params[f.key] || ""} onChange={(v) => setParam(f.key, v)} p={p} at={item.at} media={media} />
        ) : f.kind === "range" ? (
          <label key={f.key} className="rangef">
            <span>
              {f.label} <b>{item.params[f.key] ?? f.def}</b>
            </span>
            <input type="range" min={f.min} max={f.max} step={f.step} value={item.params[f.key] ?? f.def ?? f.min} onChange={(e) => setParam(f.key, e.target.value)} />
          </label>
        ) : f.kind === "color" ? (
          <ColorField key={f.key} label={f.label} value={item.params[f.key] || f.def || "#FFFFFF"} onChange={(v) => setParam(f.key, v)} />
        ) : f.kind === "image" || f.kind === "media" ? (
          <div key={f.key} className="mediaf">
          {clipsOf(p).some((c) => c.kind === "photo") ? (
            <div className="libphotos" title="Фото из медиатеки проекта (шаг «Склейка»)">
              {clipsOf(p)
                .filter((c) => c.kind === "photo")
                .map((c) => (
                  <button key={c.id} className={item.params[f.key] === c.name ? "on" : ""} onClick={() => set({params: {...item.params, [f.key]: c.name, hf: "", hfUrl: ""}})}>
                    <img src={mImages[c.name]} />
                  </button>
                ))}
            </div>
          ) : null}
          <label className="btn ghost">
            {item.params[f.key] ? `Заменить: ${f.label.toLowerCase()}` : `${f.label}: свой файл`}
            <input
              type="file"
              accept={f.kind === "media" ? "image/*,video/*" : "image/*"}
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const name = newId("i") + "." + (file.name.split(".").pop() || "jpg");
                await putFile(p.id, `img/${name}`, file);
                const url = URL.createObjectURL(file);
                setM((x) => ({...x, images: {...x.images, [name]: url}}));
                setParam(f.key, name);
              }}
            />
          </label>
          </div>
        ) : f.kind === "select" ? (
          <label key={f.key} className="inline">
            {f.label}
            <select value={item.params[f.key] ?? f.def ?? f.options?.[0][0]} onChange={(e) => setParam(f.key, e.target.value)}>
              {f.options?.map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label key={f.key} className="field">
            <span>
              {f.label}
              {f.hint ? <em> — {f.hint}</em> : null}
            </span>
            <input
              value={item.params[f.key] ?? ""}
              placeholder={f.key === "text" ? spoken(p.words, item.at, item.until ?? item.at + ef.len) : ""}
              onChange={(e) => setParam(f.key, e.target.value)}
            />
          </label>
        ),
      )}
      {ef.after ? <p className="muted">Готовый ролик: {ef.after}.</p> : null}
      <button className="btn danger" onClick={() => (up((q) => ({...q, effects: q.effects.filter((e) => e.id !== item.id)})), onClose())}>
        Убрать эффект
      </button>
    </div>
  );
};

// ---------------------------------------------------------------- команды словами
// «на 12 секунде приблизь», «смайл огонь», «хук «МОИ» за головой» — эффект сразу в предпросмотре; голосом — 🎤.
// Что не понято — заметка для Claude (жёлтая на монтажном столе), выполняется при рендере.
type Done = {text: string; lines: string[]; before: {effects: EffectItem[]; notes: Project["notes"]}};
const SR: any = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

const CommandBar: React.FC<{p: Project; up: StepCtx["up"]; sec: number; seek: (s: number) => void}> = ({p, up, sec, seek}) => {
  const [cmd, setCmd] = useState("");
  const [allEx, setAllEx] = useState(false);
  const [busy, setBusy] = useState("");
  const [log, setLog] = useState<Done[]>([]);
  const [rec, setRec] = useState<any>(null);
  const pRef = useRef(p);
  pRef.current = p;

  const run = async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const q0 = pRef.current;
    const r = parseCommand(text, sec, q0.words);
    const before = {effects: q0.effects, notes: q0.notes};
    const kept = q0.effects.filter((e) => !r.remove.some((x) => e.at <= x.until && (e.until ?? e.at + 1) >= x.at));
    const notes = r.note
      ? [...q0.notes, {id: newId("n"), at: +sec.toFixed(2), text: r.note, created: nowIso()}].sort((a, b) => a.at - b.at)
      : q0.notes;
    up((q) => ({...q, effects: [...kept, ...r.items], notes}));
    const lines = [...r.done];
    if (r.note) lines.push(`Не понял: «${r.note}» — записал заметкой для Claude, сделаю при рендере`);
    setLog((l) => [{text, lines, before}, ...l].slice(0, 5));
    setCmd("");
    if (r.items[0]) seek(Math.max(0, r.items[0].at - 0.6));
    if (!r.images.length) return;
    try {
      await loadModel((k) => setBusy(`Загружаю модель смысла (один раз, ~120 МБ): ${Math.round(k * 100)}%`));
      setBusy("Подбираю картинку по смыслу…");
      const skip = usedInProject(pRef.current.effects);
      const found = await search(
        r.images.map((a) => a.query || spoken(q0.words, a.at, a.until, 14) || "завод"),
        skip,
        6,
      );
      const add: EffectItem[] = [];
      r.images.forEach((a, i) => {
        const f = found[i].find((x) => !skip.has(x.n));
        if (!f) return;
        skip.add(f.n);
        add.push({id: newId("e"), effect: a.effect, at: a.at, until: a.until, params: {...(a.params ?? {}), hf: String(f.n), hfUrl: f.url}});
      });
      up((q) => ({...q, effects: [...q.effects, ...add]}));
      if (add[0]) seek(Math.max(0, add[0].at - 0.6));
      setBusy("");
    } catch (e) {
      setBusy("Картинку не подобрал: " + String((e as Error).message || e) + ". Проверьте интернет или выберите во вкладке «Перебивки».");
    }
  };

  const listen = () => {
    if (rec) return rec.stop();
    const r = new SR();
    r.lang = "ru-RU";
    r.interimResults = true;
    r.onresult = (e: any) => {
      const t = Array.from(e.results as ArrayLike<any>)
        .map((x) => x[0].transcript)
        .join("");
      setCmd(t);
      if (e.results[e.results.length - 1].isFinal) run(t);
    };
    r.onerror = (e: any) => setBusy(e.error === "not-allowed" ? "Нет доступа к микрофону — разрешите его в браузере." : "Голос не распознан: " + e.error);
    r.onend = () => setRec(null);
    r.start();
    setRec(r);
  };

  return (
    <div className="cmdbar">
      <div className="row">
        <input
          className="cmdinput"
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(cmd)}
          placeholder="Напишите, что сделать: «на 12 секунде приблизь», «смайл огонь», «хук «МОИ» за головой»…"
        />
        {SR ? (
          <button className={`btn ${rec ? "danger" : "ghost"}`} title="Сказать голосом" onClick={listen}>
            {rec ? "■" : "🎤"}
          </button>
        ) : null}
        <button className="btn primary" disabled={!cmd.trim()} onClick={() => run(cmd)}>
          Сделать
        </button>
      </div>
      <div className="muted">
        Без времени — на курсор ({fmtTime(sec)}). Время: «на 12 секунде», «в 1:05», «с 20 по 24 секунду», «на словах «пять дней»».
      </div>
      <div className="row wrap examples">
        {(allEx ? EXAMPLES : EXAMPLES.slice(0, 8)).map((x) => (
          <button key={x} className="chip" onClick={() => setCmd(x)}>
            {x}
          </button>
        ))}
        <button className="chip more" onClick={() => setAllEx(!allEx)}>
          {allEx ? "свернуть примеры" : `ещё примеры (${EXAMPLES.length - 8})`}
        </button>
      </div>
      {busy ? <div className="busy">{busy}</div> : null}
      {log.length ? (
        <ul className="cmdlog">
          {log.map((d, i) => (
            <li key={i}>
              <span className="q">{d.text}</span>
              {d.lines.map((l, k) => (
                <span key={k} className={l.startsWith("Не понял") ? "warn" : "ok"}>
                  {l}
                </span>
              ))}
              {i === 0 ? (
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    up((q) => ({...q, effects: d.before.effects, notes: d.before.notes}));
                    setLog((l) => l.slice(1));
                  }}
                >
                  Отменить
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------- картинки по смыслу
const ImagePicker: React.FC<{p: Project; up: StepCtx["up"]; sec: number; target?: EffectItem; onAdded: (id: string) => void}> = ({p, up, sec, target, onAdded}) => {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<Found[] | null>(null);
  const [busy, setBusy] = useState("");
  const at = target ? target.at : sec;
  const phrase = useMemo(() => {
    const ph = phrases(p.words);
    return ph.find((x) => x.at <= at + 0.05 && x.until >= at - 0.05) ?? ph.find((x) => x.at >= at);
  }, [p.words, at]);
  const wrap = async (f: () => Promise<void>) => {
    try {
      await loadModel((k) => setBusy(`Загружаю модель смысла (один раз, ~120 МБ): ${Math.round(k * 100)}%`));
      setBusy("Ищу…");
      await f();
      setBusy("");
    } catch (e) {
      setBusy("Не получилось: " + String((e as Error).message || e));
    }
  };
  const find = (query: string) =>
    wrap(async () => {
      const [r] = await search([query], usedInProject(p.effects), 9);
      setRes(r);
    });
  const pick = (f: Found) => {
    const params = {hf: String(f.n), hfUrl: f.url};
    if (target) {
      up((x) => ({...x, effects: x.effects.map((e) => (e.id === target.id ? {...e, params: {...e.params, ...params, image: ""}} : e))}));
      return;
    }
    const it: EffectItem = {id: newId("e"), effect: "broll-circle", at: +sec.toFixed(2), until: +(sec + 2.8).toFixed(2), params};
    up((x) => ({...x, effects: [...x.effects, it]}));
    onAdded(it.id);
  };
  const auto = () =>
    wrap(async () => {
      const add = await autoPlace(p.words, projSeconds(p) || 10, p.effects);
      up((x) => ({...x, effects: [...x.effects, ...add]}));
      setRes(null);
      setTimeout(() => setBusy(add.length ? `Расставил ${add.length} перебивок по смыслу фраз — проверьте в ролике.` : "Свободных фраз под перебивки не нашлось."), 0);
    });
  return (
    <div className="imgpick">
      <h3>
        Картинки по смыслу <span className="muted">— ваш каталог Higgsfield, без уже использованных</span>
      </h3>
      <div className="row">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && q.trim() && find(q)} placeholder="завод роботов, переговоры, Шанхай ночью…" />
        <button className="btn" disabled={!q.trim()} onClick={() => find(q)}>
          Найти
        </button>
      </div>
      <div className="row wrap">
        {phrase ? (
          <button className="btn ghost sm" onClick={() => find(phrase.text)} title={phrase.text}>
            Под фразу: «{phrase.text.length > 42 ? phrase.text.slice(0, 42) + "…" : phrase.text}»
          </button>
        ) : null}
        <button className="btn sm" onClick={auto} disabled={!p.words.length}>
          Расставить сам по всему ролику
        </button>
      </div>
      {busy ? <div className="busy">{busy}</div> : null}
      {res ? (
        <>
          <div className="hfgrid">
            {res.map((f) => (
              <button key={f.n} onClick={() => pick(f)} title={f.prompt}>
                <img src={thumb(f.n)} loading="lazy" />
                <span>
                  №{f.n} · {Math.round(f.score * 100)}%
                </span>
              </button>
            ))}
          </div>
          <p className="muted">
            {target ? `Нажмите картинку — она встанет в эффект «${effectById(target.effect)?.title}».` : `Нажмите картинку — перебивка встанет на ${fmtTime(sec)}.`}
          </p>
        </>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------- монтажный стол
const Timeline: React.FC<StepCtx & {props: Record<string, any>}> = ({p, m, sec, seek}) => {
  const d = projSeconds(p) || 10;
  const [zoom, setZoom] = useState(1);
  const [small, setSmall] = useState(false); // свёрнутый стол — больше места настройкам эффектов
  const pct = (t: number) => `${(t / d) * 100}%`;
  const ref = useRef<HTMLDivElement>(null);
  const pick = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    seek(Math.max(0, Math.min(d, ((e.clientX - r.left) / r.width) * d)));
  };
  const ticks = Array.from({length: Math.floor(d / (d > 60 ? 10 : 5)) + 1}, (_, i) => i * (d > 60 ? 10 : 5));
  return (
    <div className={`tl ${small ? "small" : ""}`}>
      <div className="tlbar">
        <b>Монтажный стол</b>
        <span className="muted">нажмите на дорожку — перейти к секунде</span>
        <span className="sp" />
        <label className="inline">
          Масштаб
          <input type="range" min={1} max={6} step={0.5} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
        </label>
        <button className="btn ghost sm" onClick={() => setSmall(!small)} title={small ? "Развернуть дорожки" : "Свернуть дорожки"}>
          {small ? "▴ Развернуть" : "▾ Свернуть"}
        </button>
      </div>
      <div className="tlscroll">
        <div className="tlin" style={{width: `${zoom * 100}%`}} ref={ref} onClick={pick}>
          <div className="ruler">
            {ticks.map((t) => (
              <span key={t} style={{left: pct(t)}}>
                {fmtTime(t).replace(/\.\d$/, "")}
              </span>
            ))}
          </div>
          <div className="track tframes">
            <label>Кадры</label>
            {m.strip.map((s, i) => (
              <img key={i} src={s} style={{left: pct((d * i) / m.strip.length), width: pct(d / m.strip.length)}} />
            ))}
          </div>
          <div className="track twave">
            <label>Звук</label>
            <Wave peaks={m.wave} second={p.audio.clean ? m.waveClean : undefined} />
          </div>
          <div className="track twords">
            <label>Субтитры</label>
            {p.words.map((w, i) => (
              <span key={i} style={{left: pct(w.start), width: pct(Math.max(0.12, w.end - w.start))}} title={w.text}>
                {w.text}
              </span>
            ))}
          </div>
          <div className="track tfx">
            <label>Эффекты</label>
            {p.effects.map((e) => {
              const ef = effectById(e.effect);
              return (
                <span key={e.id} className={`c-${ef?.cat}`} style={{left: pct(e.at), width: pct(Math.max(0.3, (e.until ?? e.at + (ef?.len ?? 1)) - e.at))}} title={ef?.title}>
                  {ef?.title}
                </span>
              );
            })}
          </div>
          <div className="track tnotes">
            <label>Заметки</label>
            {p.notes.map((n) => (
              <span key={n.id} className={n.done ? "done" : ""} style={{left: pct(n.at)}} title={n.text}>
                ✎ {n.text}
              </span>
            ))}
          </div>
          <i className="head" style={{left: pct(Math.min(d, sec))}} />
        </div>
      </div>
    </div>
  );
};

// превью эффекта: WebM (любой Chromium, Safari 15+), запасной — mp4 (H.264)
const Preview: React.FC<{id: string}> = ({id}) => (
  <video muted loop playsInline autoPlay preload="metadata">
    <source src={`library/previews/${id}.webm`} type="video/webm" />
    <source src={`library/previews/${id}.mp4`} type="video/mp4" />
  </video>
);

// ---------------------------------------------------------------- 6. Библиотека
const LibraryStep: React.FC<StepCtx> = ({sec, up, setStep}) => {
  const [cat, setCat] = useState("Все");
  return (
    <div className="step wide">
      <h2>Библиотека эффектов</h2>
      <p className="lead">Каждая карточка — сам эффект на 1–2 секунды. «В ролик» ставит его на текущую секунду ({fmtTime(sec)}).</p>
      <div className="tabs">
        {["Все", ...CATS].map((c) => (
          <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="lib">
        {EFFECTS.filter((e) => cat === "Все" || e.cat === cat).map((e) => (
          <article key={e.id} className="libcard">
            <Preview id={e.id} />
            <div>
              <span className="cat">
                {e.cat}
                {e.ref ? " · из референса" : ""}
              </span>
              <b>{e.title}</b>
              <p>{e.desc}</p>
              <button
                className="btn sm"
                onClick={() => {
                  up((q) => ({...q, effects: [...q.effects, {id: newId("e"), effect: e.id, at: +sec.toFixed(2), until: +(sec + e.len).toFixed(2), params: {}}]}));
                  setStep("edit");
                }}
              >
                В ролик
              </button>
            </div>
          </article>
        ))}
      </div>
      <References />
    </div>
  );
};

// референсы: ссылка или файл + «что забрать» → библиотека референсов на GitHub → Claude разбирает приёмы,
// собирает их в шаблоне и добавляет эффектами с превью (у эффекта — кусок референса рядом)
type Ref = {id: string; url?: string; name?: string; what?: string; created?: string; status?: string; effects?: string[]; video?: string; note?: string};
const References: React.FC = () => {
  const [server, setServer] = useState<boolean | null>(null);
  const [refs, setRefs] = useState<Ref[]>([]);
  const [pending, setPending] = useState<{id: string; name?: string; text?: string; error?: string}[]>([]);
  const [token, setToken] = useState(true);
  const [url, setUrl] = useState("");
  const [what, setWhat] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    const r = await fetch("api/refs").then((x) => x.json());
    setRefs(r.refs ?? []);
    setPending(r.pending ?? []);
    setToken(r.token !== false);
    return (r.pending ?? []).some((x: {error?: string}) => !x.error);
  }, []);
  useEffect(() => {
    let alive = true;
    let timer = 0;
    hasServer().then(async (ok) => {
      setServer(ok);
      if (!ok) return;
      const tick = async () => {
        const more = await load().catch(() => false);
        if (alive && more) timer = window.setTimeout(tick, 4000);
      };
      tick();
    });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [load]);
  const add = async () => {
    const rid = newId("");
    try {
      if (file) {
        setBusy("Передаю файл…");
        const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
        await sendFile(rid, `ref.${ext}`, file, (k) => setBusy(`Передаю файл: ${Math.round(k * 100)}%`), "ref").catch(() => {
          throw new Error("сервер не принял файл");
        });
      }
      const r = await fetch(`api/ref/${rid}/submit`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url: file ? "" : url.trim(), what: what.trim(), name: file?.name || url.trim().replace(/^https?:\/\/(www\.)?/, "").slice(0, 60), created: nowIso()}),
      });
      if (!r.ok) throw new Error((await r.json()).detail || "не добавилось");
      setUrl("");
      setWhat("");
      setFile(null);
      setBusy("");
      const tick = async () => {
        if (await load().catch(() => false)) setTimeout(tick, 4000);
      };
      tick();
    } catch (e) {
      setBusy("Не получилось: " + String((e as Error).message || e));
    }
  };
  return (
    <>
      <h3>Референсы</h3>
      <p className="muted">
        Ролик, который нравится, — ссылкой (Instagram, TikTok, YouTube, VK, Google Диск, Яндекс Диск) или файлом. Напишите, что забрать.
        Claude посмотрит его, соберёт приёмы в шаблоне и добавит сюда эффектами с превью — рядом будет кусок референса.
      </p>
      {server === false ? (
        <p className="muted">В браузере без приложения на Mac: пришлите ссылку Claude в чат с пометкой «референс» — результат тот же.</p>
      ) : !token ? (
        <p className="muted">Нужен ключ GitHub — он вводится один раз на шаге «Готово».</p>
      ) : (
        <div className="editor">
          <div className="row">
            <input value={url} disabled={!!file} onChange={(e) => setUrl(e.target.value)} placeholder="Ссылка на ролик: instagram.com/reel/…, tiktok.com/…, youtube.com/shorts/…" />
            <label className="btn ghost">
              {file ? file.name.slice(0, 24) : "или файл"}
              <input type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <textarea className="what" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="Что забрать: «переход на 0:03», «как появляются титры», «цвет», «всё интересное»…" />
          <div className="row">
            <button className="btn primary" disabled={!url.trim() && !file} onClick={add}>
              Добавить в библиотеку
            </button>
            {busy ? <span className="muted">{busy}</span> : null}
          </div>
        </div>
      )}
      {pending.map((x) => (
        <div key={x.id} className={`refrow ${x.error ? "bad" : ""}`}>
          <b>{x.name || "Референс"}</b>
          <span className={x.error ? "err" : "muted"}>{x.error || x.text}</span>
        </div>
      ))}
      {refs.map((r) => (
        <div key={r.id} className="refrow">
          <b>{r.name || r.url || r.id}</b>
          <span className="muted">
            {r.created} · {r.status}
            {r.what ? ` · «${r.what}»` : ""}
          </span>
          {r.effects?.length ? (
            <span>
              Эффекты:{" "}
              {r.effects
                .map((id) => effectById(id)?.title ?? id)
                .join(", ")}
            </span>
          ) : null}
          {r.note ? <span className="muted">{r.note}</span> : null}
          {r.video ? (
            <a
              href={r.video}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                e.preventDefault();
                openOutside(r.video!);
              }}
            >
              смотреть
            </a>
          ) : null}
        </div>
      ))}
      {server && token && !refs.length && !pending.length ? <p className="muted">Пока пусто.</p> : null}
      {refs.some((r) => r.status === "ждёт разбора") ? (
        <p className="muted">Чтобы разбор начался сразу, напишите Claude в чат: «разбери референсы из Монтажной».</p>
      ) : null}
    </>
  );
};

// ---------------------------------------------------------------- 7. Готово
// ---------------------------------------------------------------- «Сделать ролик» в облаке
// форма ключа на GitHub с заполненными полями (имя, срок 366 дней, владелец Ostap-87, Contents: Read and write) —
// параметры адреса из документации GitHub «Pre-filling fine-grained personal access token details using URL parameters»;
// сам репозиторий ссылкой выбрать нельзя — это один клик в форме
const TOKEN_URL =
  "https://github.com/settings/personal-access-tokens/new?" +
  new URLSearchParams({name: "Монтажная", description: "Монтажная: видео и задания рендера в VIDEO-HUB", target_name: "Ostap-87", expires_in: "366", contents: "write"}).toString();
// отпечаток проекта: всё, что влияет на ролик (без служебных полей) — отправка без правок не создаёт копию ролика
function projSig(p: Project): string {
  const {updated, sentAt, jobs, name, created, ...rest} = p;
  void updated, void sentAt, void jobs, void name, void created;
  const s = JSON.stringify(rest);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36) + "-" + s.length;
}

const Cloud: React.FC<{p: Project; up: StepCtx["up"]; props: Record<string, any>; goHome?: StepCtx["goHome"]}> = ({p, up, props, goHome}) => {
  const [server, setServer] = useState<boolean | null>(null);
  const [gh, setGh] = useState<GithubState | null>(null);
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [cut, setCut] = useState(true);
  const [sending, setSending] = useState("");
  const [again, setAgain] = useState(false); // «всё равно отправить ещё раз» — второе нажатие подтверждает
  const [tab, setTab] = useState<"ready" | "archive">("ready");
  const allJobs = (p.jobs ?? []).map((j, i, a) => ({...j, n: a.length - i})); // №1 — самая первая отправка
  const shown = allJobs.filter((j) => (tab === "archive" ? j.archived : !j.archived));
  const setArchived = (id: string, archived: boolean) => up((q) => ({...q, jobs: (q.jobs ?? []).map((j) => (j.id === id ? {...j, archived} : j))}));
  const sig = projSig(p);
  const last = p.jobs?.[0];
  const same = !!last && last.sig === sig; // уже отправлен ровно такой ролик
  useEffect(() => {
    hasServer().then((ok) => {
      setServer(ok);
      if (ok) githubState().then(setGh, () => setGh(null));
    });
  }, []);

  const send = async () => {
    setErr("");
    const jid = newId("");
    try {
      const multi = !!p.edl?.length;
      const extOf = (n?: string) => (n?.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
      const files: {name: string; blob: Blob}[] = [];
      // склейка: все ролики монтажного листа, движок склеит их кадр в кадр (montazh/engine/edl.py)
      const clipFiles: Record<string, string> = {};
      if (multi) {
        for (const id of [...new Set(p.edl!.map((x) => x.clip))]) {
          const b = await getFile(p.id, clipKey(id));
          if (!b) throw new Error("Нет файла одного из роликов склейки — добавьте его заново на шаге «Склейка»");
          clipFiles[id] = `clip-${id}.${extOf(clipsOf(p).find((c) => c.id === id)?.name)}`;
          files.push({name: clipFiles[id], blob: b});
        }
      }
      const src = multi ? undefined : await getFile(p.id, "source");
      const link = !multi && !src && p.source?.url ? p.source.url : undefined; // ролик по ссылке — движок скачает сам
      if (!multi && !src && !link) throw new Error("Нет видео — добавьте файл или ссылку на шаге «Исходник»");
      const ext = link ? "mp4" : extOf(p.source?.name);
      if (src) files.push({name: `source.${ext}`, blob: src});
      const images: Record<string, string> = {};
      for (const e of p.effects) {
        // все поля-картинки эффекта (у «картинок вокруг головы» их три); картинка из каталога (hf) — только в image
        const keys = effectById(e.effect)?.fields.filter((f) => f.kind === "image" || f.kind === "media").map((f) => f.key) ?? ["image"];
        for (const key of keys) {
          const n = e.params[key];
          if (!n || (key === "image" && e.params.hf) || images[LOCAL.image(p.id, n)]) continue;
          const b = await getFile(p.id, `img/${n}`);
          if (b) {
            images[LOCAL.image(p.id, n)] = `img-${n}`;
            files.push({name: `img-${n}`, blob: b});
          }
        }
      }
      const total = files.reduce((a, f) => a + f.blob.size, 0) || 1;
      let done = 0;
      for (const f of files) {
        await sendFile(jid, f.name, f.blob, (k) => setSending(`Передаю ${f.name}: ${Math.round(((done + k * f.blob.size) / total) * 100)}%`));
        done += f.blob.size;
      }
      const hf: Record<string, string> = {};
      for (const e of p.effects) if (e.params.hf && e.params.hfUrl) hf[hfName(e.params.hf)] = e.params.hfUrl;
      const job = {
        version: 2,
        id: jid,
        name: p.name,
        created: nowIso(),
        brand: p.brand,
        format: p.format,
        options: {cutPauses: multi ? false : cut, edl: multi, formats: p.format === "both" ? ["reels", "stories"] : [p.format]},
        files: multi
          ? {source: Object.values(clipFiles)[0], clips: clipFiles, images}
          : {source: `source.${ext}`, sourceUrl: link, images},
        local: multi ? {video: LOCAL.edl, clips: Object.fromEntries(Object.keys(clipFiles).map((id) => [LOCAL.clip(id), id]))} : {video: LOCAL.video},
        hf,
        props: {
          ...props,
          format: p.format === "both" ? "reels" : props.format, // Stories движок делает из тех же props, меняя формат
          audioSrc: undefined,
          edl: props.edl?.map((x: Record<string, unknown>) => ({...x, audio: undefined})),
        },
        effects: p.effects,
        notes: p.notes,
      };
      setSending("Отправляю на GitHub…");
      await submitJob(jid, job);
      up((q) => ({...q, sentAt: nowIso(), jobs: [{id: jid, sentAt: nowIso(), cutPauses: cut, sig: projSig(q)}, ...(q.jobs ?? [])]}));
      setSending("");
      setAgain(false);
    } catch (e) {
      setSending("");
      setErr(String((e as Error).message || e));
    }
  };

  if (server === null) return null;
  if (!server)
    return (
      <>
        <h3>Сделать ролик</h3>
        <p className="muted">
          Кнопка «Сделать ролик» работает в приложении Монтажной на Mac (оно отправляет видео в облако). Здесь — скачайте задание ниже.
        </p>
      </>
    );
  return (
    <>
      <h3>Сделать ролик в облаке</h3>
      {gh && !gh.configured ? (
        <div className="editor">
          <b>Один раз: ключ доступа к GitHub</b>
          <ol className="steps-ol">
            <li>
              Откройте{" "}
              <a
                href={TOKEN_URL}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  openOutside(TOKEN_URL);
                }}
              >
                эту ссылку на GitHub
              </a>{" "}
              — имя, срок и права уже заполнены (если попросит — войдите в аккаунт).
            </li>
            <li>
              В «Repository access» выберите <b>Only select repositories</b> → <b>{gh.repo.split("/")[1]}</b>.
            </li>
            <li>
              Внизу нажмите <b>Generate token</b>, скопируйте ключ (начинается с github_pat_) и вставьте сюда.
            </li>
          </ol>
          <p className="muted">Ключ хранится только на этом Mac и в окно больше не показывается. В чат его не присылайте.</p>
          <div className="row">
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" />
            <button
              className="btn primary"
              disabled={!token.trim()}
              onClick={() =>
                saveToken(token).then(
                  (g) => (setGh(g), setToken(""), setErr("")),
                  (e) => setErr(String(e.message || e)),
                )
              }
            >
              Сохранить
            </button>
          </div>
        </div>
      ) : null}
      {gh?.configured ? (
        <>
          {p.edl?.length ? (
            <p className="muted">Склейка из шага «Склейка»: облако соберёт ролик ровно по ней — как в предпросмотре.</p>
          ) : (
            <label className="chk">
              <input type="checkbox" checked={cut} onChange={(e) => setCut(e.target.checked)} /> Вырезать паузы и «эканья» (эффекты сдвинутся вместе со
              словами)
            </label>
          )}
          <p className="muted">
            В облаке: студийный звук (DeepFilterNet), {p.edl?.length ? "склейка роликов, " : cut ? "склейка без пауз, " : ""}вырезка спикера для эффектов «за головой» и рендер{" "}
            {p.format === "both" ? "Reels и Stories (части до 60 с)" : p.format === "stories" ? "Stories (части до 60 с)" : "Reels"}. Обычно 7–25 минут
            (оба формата — примерно вдвое дольше); окно можно закрыть — результат останется здесь.
          </p>
          {same && !sending ? (
            <div className="sentbox">
              <b>✓ Ролик отправлен в облако</b>
              <span>
                Ролик №{allJobs.length} · {shortTime(last!.sentAt)} · обычно готов через 7–25 минут. Готовность видна в карточке ниже и на главной у этого ролика. Окно
                можно закрыть или монтировать следующий ролик — облако доделает само.
              </span>
              <div className="row wrap">
                {goHome ? (
                  <>
                    <button className="btn primary" onClick={() => goHome()}>
                      ← На главную
                    </button>
                    <button className="btn" onClick={() => goHome("new")}>
                      + Новый ролик
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="row wrap">
            {same ? (
              <button className={`btn ${again ? "danger" : "ghost"} sm`} disabled={!!sending} onClick={() => (again ? send() : setAgain(true))}>
                {again ? "Да, отправить копию ещё раз" : "Отправить ещё раз (без правок — будет копия)"}
              </button>
            ) : (
              <button className="btn primary big" disabled={!!sending || !p.source} onClick={send}>
                {last?.sig ? "Сделать ролик заново (с правками)" : last ? "Сделать ролик ещё раз" : "Сделать ролик"}
              </button>
            )}
            <button
              className="btn ghost sm"
              onClick={() => {
                forgetToken();
                setGh((g) => (g ? {...g, configured: false} : g));
              }}
            >
              Сменить ключ GitHub
            </button>
          </div>
        </>
      ) : null}
      {sending ? <div className="busy">{sending}</div> : null}
      {err ? <div className="err">{err}</div> : null}
      {allJobs.length ? (
        <>
          <div className="jobtabs">
            <button className={tab === "ready" ? "on" : ""} onClick={() => setTab("ready")}>
              Готовые ролики ({allJobs.filter((j) => !j.archived).length})
            </button>
            <button className={tab === "archive" ? "on" : ""} onClick={() => setTab("archive")}>
              Архив ({allJobs.filter((j) => j.archived).length})
            </button>
          </div>
          {!shown.length ? (
            <p className="muted">
              {tab === "archive" ? "В архиве пусто. Кнопка «В архив» у готового ролика убирает его сюда." : "Все ролики в архиве — откройте вкладку «Архив»."}
            </p>
          ) : null}
          {shown.map((j, i) => (
            <JobCard
              key={j.id}
              id={j.id}
              n={j.n}
              sentAt={j.sentAt}
              newest={j.n === allJobs.length}
              open={tab === "ready" && i === 0}
              archived={!!j.archived}
              onArchive={(v) => setArchived(j.id, v)}
            />
          ))}
        </>
      ) : null}
    </>
  );
};

// готовность последнего задания на карточке ролика на главной: «собирается» / «готов» / «ошибка»
const JobBadge: React.FC<{id: string}> = ({id}) => {
  const [st, setSt] = useState<JobState | null>(null);
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const tick = async () => {
      const s = await jobState(id).catch(() => null);
      if (!alive) return;
      if (s) setSt(s);
      if (!s?.done && !s?.error) timer = window.setTimeout(tick, s ? 10000 : 20000);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);
  if (!st || st.stage === "token") return <div className="meta jobbadge">☁ Отправлен в облако</div>;
  if (st.error) return <div className="meta jobbadge bad">⚠ Ошибка в облаке — откройте ролик</div>;
  if (st.done) return <div className="meta jobbadge ok">✓ Готов — откройте и скачайте</div>;
  return (
    <div className="meta jobbadge run">
      ☁ {st.stage === "send" ? "Отправляется" : "Собирается"} · {Math.round((st.progress ?? 0) * 100)}%
    </div>
  );
};

// «23.10 15:30» из «2026-10-23 07:30:12» (время отправки по Mac)
const shortTime = (iso: string) => {
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (Number.isNaN(+d)) return iso;
  const z = (x: number) => String(x).padStart(2, "0");
  return `${z(d.getDate())}.${z(d.getMonth() + 1)} ${z(d.getHours())}:${z(d.getMinutes())}`;
};

const JobCard: React.FC<{id: string; n: number; sentAt: string; newest: boolean; open: boolean; archived: boolean; onArchive: (v: boolean) => void}> = ({
  id,
  n,
  sentAt,
  newest,
  open,
  archived,
  onArchive,
}) => {
  const [st, setSt] = useState<JobState | null>(null);
  const [show, setShow] = useState(open);
  useEffect(() => {
    let alive = true;
    let timer = 0;
    const tick = async () => {
      try {
        const s = await jobState(id);
        if (!alive) return;
        setSt(s);
        if (!s.done && !s.error) timer = window.setTimeout(tick, s.stage === "send" ? 1500 : 8000);
      } catch {
        if (alive) timer = window.setTimeout(tick, 15000);
      }
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);
  const files = st?.files ?? [];
  const video = files.find((f) => f.kind === "phone" && f.url) ?? files.find((f) => f.kind === "video" && f.url);
  const sheet = files.find((f) => f.kind === "frames" && f.url);
  return (
    <div className={`jobcard ${st?.done ? "done" : st?.error ? "bad" : ""}`}>
      <div className="row" onClick={() => setShow(!show)}>
        <b className="jobno">Ролик №{n}</b>
        <span className={`jobst ${st?.done ? "ok" : st?.error ? "bad" : ""}`}>{st?.done ? "готов" : st?.error ? "ошибка" : "в работе"}</span>
        {newest ? <span className="jobnew">последний</span> : null}
        <span className="muted">
          отправлен {shortTime(sentAt)} · {id}
        </span>
        <span className="sp" />
        {st?.done || st?.error || archived ? (
          <button
            className="btn ghost sm"
            title={archived ? "Вернуть в «Готовые ролики»" : "Убрать из списка во вкладку «Архив» (ролик не удаляется)"}
            onClick={(e) => {
              e.stopPropagation();
              onArchive(!archived);
            }}
          >
            {archived ? "↩ Вернуть" : "В архив"}
          </button>
        ) : null}
        <span className="muted">{show ? "▾" : "▸"}</span>
      </div>
      {show ? (
        <>
          {!st?.done ? (
            <div className="prog">
              <i style={{width: `${Math.round((st?.progress ?? 0) * 100)}%`}} />
              <span>{st?.text ?? "Узнаю…"}</span>
            </div>
          ) : null}
          {st?.error ? <div className="err">{st.error}</div> : null}
          {video ? <video className="result" src={video.url} controls playsInline /> : null}
          {files.some((f) => f.url) ? (
            <>
              <div className="row wrap">
                {files
                  .filter((f) => f.url)
                  .map((f) => (
                    <SaveButton key={f.name} jid={id} file={f} tag={`№${n} ${shortTime(sentAt)}`} />
                  ))}
              </div>
              <p className="muted">
                Файлы сохраняются в папку «Загрузки» → «Монтажная» на этом Mac и сразу показываются в Finder. Не скачивается —{" "}
                <a onClick={() => openOutside(files.find((f) => f.kind === "video")?.url ?? "")}>ссылка на ролик в браузере</a>.
              </p>
            </>
          ) : null}
          {sheet ? <img className="sheet" src={sheet.url} /> : null}
          {st?.done && st.notes?.length ? (
            <p className="muted">
              Заметок для Claude: {st.notes.length}. Напишите Claude в чат «Монтажная, задание {id}» — он выполнит их и пришлёт ролик.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

// кнопка «Скачать на Mac»: прогресс скачивания, потом «Показать в Finder»
const SaveButton: React.FC<{jid: string; file: NonNullable<JobState["files"]>[number]; tag?: string}> = ({jid, file, tag}) => {
  const [st, setSt] = useState<SaveState | null>(null);
  const [err, setErr] = useState("");
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);
  const poll = async () => {
    const s = await saveState(jid, file.name).catch(() => null);
    if (s) setSt(s);
    if (s?.error) setErr(s.error);
    else if (!s?.done) timer.current = window.setTimeout(poll, 700);
  };
  const go = async () => {
    setErr("");
    try {
      const s = await saveJobFile(jid, file.name, tag);
      setSt(s);
      if (!s.done) timer.current = window.setTimeout(poll, 700);
    } catch (e) {
      setErr(String((e as Error).message || e));
    }
  };
  const busy = st && !st.done && !st.error;
  return (
    <span className="savebtn">
      <button className={`btn ${file.kind === "video" ? "primary" : ""}`} disabled={!!busy} onClick={go}>
        {st?.done ? "📂 Показать в Finder: " : busy ? `⬇ ${Math.round((st?.progress ?? 0) * 100)}% · ` : "⬇ Скачать: "}
        {file.title} · {file.size >= 1048576 ? `${(file.size / 1048576).toFixed(0)} МБ` : `${Math.max(1, Math.round(file.size / 1024))} КБ`}
      </button>
      {err ? <em className="err">{err}</em> : null}
    </span>
  );
};

const DoneStep: React.FC<StepCtx & {props: Record<string, any>}> = ({p, props, up, goHome}) => {
  const job = useMemo(
    () => ({
      version: 1,
      id: p.id,
      name: p.name,
      brand: p.brand,
      format: p.format,
      source: p.source,
      words: p.words,
      wordsFrom: p.wordsFrom ?? null,
      captions: p.captions,
      audio: p.audio,
      grade: {...p.grade, css: gradeCss(p.grade.preset, p.grade.amount)},
      finale: p.finale,
      effects: p.effects,
      notes: p.notes,
      props: {...props, mediaSrc: "<ролик после обработки>", audioSrc: undefined},
    }),
    [p, props],
  );
  const text = JSON.stringify(job, null, 2);
  const [copied, setCopied] = useState(false);
  const checks: [boolean, string][] = [
    [!!p.source, p.source ? `Видео: ${p.source.name}` : "Нет видео"],
    [p.words.length > 0, p.words.length ? `Текст: ${p.words.length} слов` : "Текст не распознан — движок распознает сам"],
    [true, `Субтитры: ${p.captions.style === "3d" ? "объёмные 3D" : "фирменные"}, ${p.captions.size} px`],
    [true, `Звук: ${p.audio.clean ? "чистый голос" : "как снято"} → студийный DeepFilterNet; музыка: ${p.audio.music ? MUSIC.find((x) => x.id === p.audio.music)?.title : "нет"}`],
    [true, `Цвет: ${GRADES.find((g) => g.id === p.grade.preset)?.title} ${Math.round(p.grade.amount * 100)}%`],
    [true, `Эффектов: ${p.effects.length}, заметок: ${p.notes.filter((n) => !n.done).length}`],
  ];
  return (
    <div className="step">
      <h2>Готово</h2>
      <ul className="checks">
        {checks.map(([ok, t], i) => (
          <li key={i} className={ok ? "ok" : "no"}>
            {t}
          </li>
        ))}
      </ul>
      <label className="chk">
        <input type="checkbox" checked={p.finale} onChange={(e) => up((q) => ({...q, finale: e.target.checked}))} /> Финал с сайтом {BRANDS[p.brand].site}
      </label>
      <Cloud p={p} up={up} props={props} goHome={goHome} />
      <h3>Задание файлом</h3>
      <p className="muted">
        Если окно открыто не на Mac (без сервера Монтажной) — скачайте задание и пришлите Claude в чат вместе с видео: сделаю тот же ролик.
      </p>
      <div className="row wrap">
        <button
          className="btn primary"
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([text], {type: "application/json"}));
            a.download = `${p.name.replace(/[^\p{L}\p{N}-]+/gu, "-")}.job.json`;
            a.click();
            up((q) => ({...q, sentAt: nowIso()}));
          }}
        >
          Скачать задание
        </button>
        <button
          className="btn"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(
              () => setCopied(true),
              () => setCopied(false),
            );
          }}
        >
          {copied ? "Скопировано ✓" : "Скопировать задание"}
        </button>
      </div>
      <details>
        <summary>Задание целиком</summary>
        <pre>{text}</pre>
      </details>
    </div>
  );
};
