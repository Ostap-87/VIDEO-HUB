import {Player, type PlayerRef} from "@remotion/player";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {TalkReelPro} from "../../reels-studio/src/compositions/TalkReelPro";
import {cleanVoice} from "./audio";
import {BRANDS, MUSIC} from "./brands";
import {CATS, EFFECTS, effectById, spoken} from "./effects";
import {GRADES, gradeCss} from "./grades";
import {decodeAudio, fmtTime, frames, peaks, probe} from "./media";
import {buildProps, durationFrames, leadFrames, LOCAL} from "./props";
import {fetchLink, hasServer} from "./server";
import {deleteProject, getFile, listProjects, putFile, putProject} from "./store";
import {parseWordsFile, transcribe, type AsrModel} from "./transcribe";
import {newId, nowIso, type Brand, type EffectItem, type Project} from "./types";

const STEPS = [
  ["source", "Исходник"],
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
    format: "reels",
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
        onClose={() => {
          setOpen(null);
          history.replaceState(null, "", "#");
          reload();
        }}
      />
    );
  return (
    <Home
      list={list}
      onOpen={(p) => {
        location.hash = `p=${p.id}`;
        setOpen(p);
      }}
      onChanged={reload}
    />
  );
};

// ---------------------------------------------------------------- главный экран: ролики
const Home: React.FC<{list: Project[] | null; onOpen: (p: Project) => void; onChanged: () => void}> = ({list, onOpen, onChanged}) => {
  const [adding, setAdding] = useState(false);
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
                <div className="meta">{p.sentAt ? `Отправлен в работу ${p.sentAt}` : `Изменён ${p.updated}`}</div>
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

const NewVideo: React.FC<{onCancel: () => void; onCreated: (p: Project) => void}> = ({onCancel, onCreated}) => {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState<Brand>("gtt");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [server, setServer] = useState(false);
  useEffect(() => {
    hasServer().then(setServer);
  }, []);
  const create = async (file: Blob | null, fname: string, url?: string) => {
    setErr("");
    try {
      const p = newProject(name.trim() || fname.replace(/\.[^.]+$/, "") || "Новый ролик", brand);
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
      onCreated(p);
    } catch (e) {
      setErr(String((e as Error).message || e));
      setBusy("");
    }
  };
  return (
    <div className="modal" onClick={onCancel}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <h2>Новый ролик</h2>
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
            const f = e.dataTransfer.files[0];
            if (f) create(f, f.name);
          }}
        >
          <b>Перетащите видео сюда</b>
          <span>или нажмите, чтобы выбрать файл (MOV, MP4 с телефона)</span>
          <input type="file" accept="video/*,.mov,.mp4,.m4v" hidden onChange={(e) => e.target.files?.[0] && create(e.target.files[0], e.target.files[0].name)} />
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
type Media = {video?: string; clean?: string; images: Record<string, string>; strip: string[]; times: number[]; wave: number[]; waveClean: number[]};

const Workspace: React.FC<{initial: Project; onClose: () => void}> = ({initial, onClose}) => {
  const [p, setP] = useState<Project>(initial);
  const [step, setStep] = useState<Step>(initial.words.length ? "edit" : "source");
  const [m, setM] = useState<Media>({images: {}, strip: [], times: [], wave: [], waveClean: []});
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
      if (!src || !alive) return;
      fileRef.current = src;
      const video = URL.createObjectURL(src);
      urls.push(video);
      const cleanBlob = await getFile(p.id, "clean.wav");
      const clean = cleanBlob ? URL.createObjectURL(cleanBlob) : undefined;
      if (clean) urls.push(clean);
      const images: Record<string, string> = {};
      for (const e of p.effects) {
        const n = e.params.image;
        if (n && !images[n]) {
          const b = await getFile(p.id, `img/${n}`);
          if (b) urls.push((images[n] = URL.createObjectURL(b)));
        }
      }
      setM((x) => ({...x, video, clean, images}));
      const d = p.source?.duration || 10;
      const times = Array.from({length: 16}, (_, i) => (d * (i + 0.5)) / 16);
      const strip = await frames(video, times, 160);
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

  // подмена файлов для шаблона: имена из props → файлы из браузера. Ставится до отрисовки плеера; когда файлы
  // меняются (загрузилось видео, посчитан чистый звук, добавлена картинка), плеер пересоздаётся (key)
  const filesKey = useMemo(() => {
    const files = [
      m.video ? {name: LOCAL.video, src: m.video} : null,
      m.clean ? {name: LOCAL.clean, src: m.clean} : null,
      ...Object.entries(m.images).map(([n, src]) => ({name: LOCAL.image(p.id, n), src})),
    ].filter(Boolean) as {name: string; src: string}[];
    (window as any).remotion_staticFiles = files;
    return files.map((f) => f.src).join("|");
  }, [m.video, m.clean, m.images, p.id]);

  const props = useMemo(() => buildProps(p, {cleanReady: !!m.clean}), [p, m.clean]);
  const frames_ = useMemo(() => durationFrames(props), [props]);
  const lead = useMemo(() => leadFrames(props), [props]);
  const sec = Math.max(0, (frame - lead) / FPS);
  const seek = useCallback((s: number) => player.current?.seekTo(Math.round(lead + s * FPS)), [lead]);

  useEffect(() => {
    const pl = player.current;
    if (!pl) return;
    const on = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);
    pl.addEventListener("frameupdate", on);
    return () => pl.removeEventListener("frameupdate", on);
  });

  const ready = !!m.video;
  const ctx: StepCtx = {p, up, m, setM, sec, seek, file: fileRef, setStatus, player, step, setStep};
  return (
    <div className="ws">
      <header className="top">
        <div className="logo link" onClick={onClose} title="Все ролики">
          <span className="dot" />
          Монтажная
        </div>
        <input className="pname" value={p.name} onChange={(e) => up((q) => ({...q, name: e.target.value}))} />
        <nav className="steps">
          {STEPS.map(([id, t], i) => (
            <button key={id} className={step === id ? "on" : ""} onClick={() => setStep(id)}>
              <b>{i + 1}</b>
              {t}
            </button>
          ))}
        </nav>
        <span className="sp" />
        <span className={`badge b-${p.brand}`}>{BRANDS[p.brand].title}</span>
      </header>
      {status ? (
        <div className="status" onClick={() => setStatus("")}>
          {status}
        </div>
      ) : null}
      <div className={`body s-${step}`}>
        <section className="panel" ref={panel}>
          {step === "source" ? <SourceStep {...ctx} /> : null}
          {step === "text" ? <TextStep {...ctx} /> : null}
          {step === "sound" ? <SoundStep {...ctx} /> : null}
          {step === "color" ? <ColorStep {...ctx} /> : null}
          {step === "edit" ? <EditStep {...ctx} /> : null}
          {step === "library" ? <LibraryStep {...ctx} /> : null}
          {step === "done" ? <DoneStep {...ctx} props={props} /> : null}
        </section>
        <aside className="preview">
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
              controls
              clickToPlay
              acknowledgeRemotionLicense
              style={{width: "100%", aspectRatio: "9 / 16", borderRadius: 14, overflow: "hidden", background: "#000"}}
            />
          ) : (
            <div className="noprev">
              {p.source && !p.source.local
                ? "Ролик по ссылке: предпросмотр появится, когда движок его скачает. Или добавьте файл с диска."
                : "Здесь будет ролик с субтитрами и эффектами — сразу, без ожидания."}
            </div>
          )}
          <div className="pinfo">
            {fmtTime(sec)} · {p.format === "reels" ? "Reels" : "Stories"} 1080×1920
          </div>
        </aside>
      </div>
      {step === "edit" ? <Timeline {...ctx} props={props} /> : null}
    </div>
  );
};

type StepCtx = {
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
};

const Next: React.FC<{to: Step; setStep: (s: Step) => void; children: React.ReactNode}> = ({to, setStep, children}) => (
  <div className="next">
    <button className="btn primary" onClick={() => setStep(to)}>
      {children} →
    </button>
  </div>
);

// ---------------------------------------------------------------- 1. Исходник
const SourceStep: React.FC<StepCtx> = ({p, up, m, seek, setStep}) => (
  <div className="step">
    <h2>Исходник</h2>
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
    <h3>Кадры</h3>
    <div className="strip">
      {m.strip.map((s, i) => (
        <img key={i} src={s} onClick={() => seek(m.times[i])} title={fmtTime(m.times[i])} />
      ))}
      {!m.strip.length ? <div className="muted">Нарезаю на кадры…</div> : null}
    </div>
    <h3>Звук</h3>
    <Wave peaks={m.wave} onSeek={(k) => seek(k * (p.source?.duration ?? 0))} />
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
    </div>
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
    <Next to="text" setStep={setStep}>
      Дальше: текст и субтитры
    </Next>
  </div>
);

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
  const run = async () => {
    if (!file.current) return;
    setErr("");
    try {
      const words = await transcribe(file.current, model, (k, t) => setBusy({k, t}));
      up((q) => ({...q, words, wordsFrom: "browser"}));
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
        <button className="btn primary" disabled={!file.current || !!busy} onClick={run}>
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
                    up((q) => ({...q, words: v ? q.words.map((x, j) => (j === i ? {...x, text: v} : x)) : q.words.filter((_, j) => j !== i), wordsFrom: "manual"}));
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
  const make = async () => {
    if (!file.current) return;
    const blob = await cleanVoice(file.current, (k, t) => setBusy({k, t}));
    await putFile(p.id, "clean.wav", blob);
    const url = URL.createObjectURL(blob);
    const pc = await decodeAudio(blob, 8000);
    setM((x) => ({...x, clean: url, waveClean: peaks(pc, 400)}));
    up((q) => ({...q, audio: {...q.audio, clean: true}}));
    setBusy(null);
  };
  const d = p.source?.duration || 1;
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
          onClick={() => (m.clean ? up((q) => ({...q, audio: {...q.audio, clean: true}})) : make())}
        >
          <b>Чистый голос</b>
          <span>{m.clean ? "шумодав + эквалайзер + компрессор" : "посчитать (несколько секунд)"}</span>
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
      <Next to="edit" setStep={setStep}>
        Дальше: монтаж
      </Next>
    </div>
  );
};

// ---------------------------------------------------------------- 5. Монтаж: эффекты и заметки
const EditStep: React.FC<StepCtx> = ({p, up, setM, sec, seek, setStep}) => {
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
      <p className="lead">
        Поставьте курсор на нужную секунду (в ролике или на дорожках внизу) и добавьте эффект — он сразу появится в предпросмотре.
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
      {item ? <EffectEditor item={item} p={p} up={up} setM={setM} seek={seek} onClose={() => setSel(null)} /> : null}
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

const EffectEditor: React.FC<{item: EffectItem; p: Project; up: StepCtx["up"]; setM: StepCtx["setM"]; seek: (s: number) => void; onClose: () => void}> = ({item, p, up, setM, seek, onClose}) => {
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
        f.kind === "image" ? (
          <label key={f.key} className="btn ghost">
            {item.params[f.key] ? "Заменить картинку" : "Выбрать картинку"}
            <input
              type="file"
              accept="image/*"
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
        ) : f.kind === "select" ? (
          <label key={f.key} className="inline">
            {f.label}
            <select value={item.params[f.key] ?? f.options?.[0][0]} onChange={(e) => setParam(f.key, e.target.value)}>
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

// ---------------------------------------------------------------- монтажный стол
const Timeline: React.FC<StepCtx & {props: Record<string, any>}> = ({p, m, sec, seek}) => {
  const d = p.source?.duration || 10;
  const [zoom, setZoom] = useState(1);
  const pct = (t: number) => `${(t / d) * 100}%`;
  const ref = useRef<HTMLDivElement>(null);
  const pick = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    seek(Math.max(0, Math.min(d, ((e.clientX - r.left) / r.width) * d)));
  };
  const ticks = Array.from({length: Math.floor(d / (d > 60 ? 10 : 5)) + 1}, (_, i) => i * (d > 60 ? 10 : 5));
  return (
    <div className="tl">
      <div className="tlbar">
        <b>Монтажный стол</b>
        <span className="muted">нажмите на дорожку — перейти к секунде</span>
        <span className="sp" />
        <label className="inline">
          Масштаб
          <input type="range" min={1} max={6} step={0.5} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
        </label>
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
              <span className="cat">{e.cat}</span>
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
      <h3>Референсы</h3>
      <p className="muted">
        Пришлите ролик, который нравится: я разберу его приёмы (переходы, титры, цвет, движение), соберу их в шаблоне и добавлю сюда
        карточками с превью.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------- 7. Готово
const DoneStep: React.FC<StepCtx & {props: Record<string, any>}> = ({p, props, up}) => {
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
      <h3>Отправить в работу</h3>
      <p className="muted">
        Задание — всё, что выбрано здесь: стиль, звук, цвет, эффекты по секундам и заметки. Движок делает чистый звук, вырезает паузы и
        «эканья», вырезает спикера из фона для эффектов «за головой» и рендерит Reels и Stories.
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
      <p className="muted">Кнопка «Отправить в GitHub» появится на следующем шаге: тогда задание и видео уходят в работу одной кнопкой.</p>
      <details>
        <summary>Задание целиком</summary>
        <pre>{text}</pre>
      </details>
    </div>
  );
};
