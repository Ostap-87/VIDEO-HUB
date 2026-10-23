// Кнопки «Ритм» и «Автомонтаж» (решения пользователя 23.10.2026). Логика выбора — auto.ts, здесь — окна и шаги.
import React, {useState} from "react";
import type {StepCtx} from "./App";
import {applyEdl, cleanClips, clipsOf, loadEnv, transcribeClips} from "./AssembleStep";
import {assemble, DEFAULT_OPTS} from "./assemble";
import {cleanVoice} from "./audio";
import {autoEffects, RHYTHM_SETS, rhythmSlots, slotToEffect, type Slot} from "./auto";
import {BRANDS, MUSIC} from "./brands";
import {CATS, EFFECTS, effectById, spoken} from "./effects";
import {search, usedInProject} from "./images";
import {fmtTime} from "./media";
import {projSeconds} from "./props";
import {newId, type EffectItem, type Project} from "./types";

const TRANSITIONS = ["broll-circle", "broll-slide", "broll-zoom", "broll-wipe", "broll-pip", "broll-screen"];
const settle = () => new Promise((r) => setTimeout(r, 80)); // дать окну применить правку проекта
const isAuto = (e: EffectItem) => !!(e.params.auto || e.params.rhythm);

// картинки по смыслу для мест [{at, until, text}]: лучшая по смыслу фразы из каталога, без повторов
async function pictures(slots: {at: number; until: number; text: string}[], effects: EffectItem[], tag: string): Promise<EffectItem[]> {
  if (!slots.length) return [];
  const skip = usedInProject(effects);
  const found = await search(
    slots.map((s) => s.text),
    skip,
    8,
  );
  const before = effects.filter((e) => e.effect.startsWith("broll")).length;
  const out: EffectItem[] = [];
  slots.forEach((s, i) => {
    const img = found[i]?.find((f) => !skip.has(f.n));
    if (!img) return;
    skip.add(img.n);
    out.push({id: newId("e"), effect: TRANSITIONS[(before + out.length) % TRANSITIONS.length], at: +s.at.toFixed(2), until: +s.until.toFixed(2), params: {hf: String(img.n), hfUrl: img.url, [tag]: "1"}});
  });
  return out;
}

// эффекты для слотов ритма (картинки — поиском по каталогу)
async function rhythmEffects(p: Project, slots: Slot[], base: EffectItem[]): Promise<EffectItem[]> {
  const out: EffectItem[] = [];
  for (const s of slots) {
    if (s.kind === "broll") continue;
    const e = slotToEffect(s, "rhythm");
    if (!e) continue;
    const ef = effectById(e.effect);
    if (ef && !["zoom-punch", "zoom-push", "zoom-pull", "emoji-pop"].includes(e.effect)) e.until = +(s.at + ef.len).toFixed(2);
    out.push(e);
  }
  const br = slots.filter((s) => s.kind === "broll").map((s) => ({at: s.at, until: s.at + 2.8, text: spoken(p.words, s.at - 0.5, s.at + 3.5, 10) || "Китай"}));
  if (br.length) out.push(...(await pictures(br, [...base, ...out], "rhythm")));
  return out;
}

// ---------------------------------------------------------------- «Ритм»: эффект каждые N секунд
export const RhythmPanel: React.FC<StepCtx & {onClose: () => void}> = ({p, up, setStatus, onClose}) => {
  const dur = projSeconds(p) || 10;
  const r = p.rhythm ?? {every: 4, set: "mix"};
  const [every, setEvery] = useState(r.every);
  const [set, setSet] = useState(r.effect ? "one" : r.set);
  const [one, setOne] = useState(r.effect ?? "zoom-punch");
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(+dur.toFixed(1));
  const [skipBusy, setSkipBusy] = useState(true);
  const [busy, setBusy] = useState("");
  const had = p.effects.filter((e) => e.params.rhythm).length;
  const go = async () => {
    setBusy(set.includes("broll") ? "Подбираю картинки по смыслу…" : "Расставляю…");
    try {
      const kinds = set === "one" ? [one] : (RHYTHM_SETS.find((x) => x.id === set)?.kinds ?? RHYTHM_SETS[0].kinds);
      const base = p.effects.filter((e) => !e.params.rhythm);
      const end = p.finale ? Math.min(to, dur - 3.4) : to;
      const slots = rhythmSlots(p.words, base, {every, kinds, from, to: end, skipBusy});
      const add = await rhythmEffects(p, slots, base);
      up((q) => ({...q, effects: [...q.effects.filter((e) => !e.params.rhythm), ...add], rhythm: {every, set: set === "one" ? "one" : set, effect: set === "one" ? one : undefined}}));
      setStatus(`Ритм: ${add.length} эффектов, примерно каждые ${every} с (с ${fmtTime(from)} до ${fmtTime(end)}). Убрать — «Ритм» → «Убрать ритм».`);
      onClose();
    } catch (e) {
      setBusy("Не получилось: " + String((e as Error).message || e));
    }
  };
  return (
    <div className="editor rhythm">
      <div className="ehead">
        <b>⏱ Ритм: эффект каждые {every} с</b>
        <span className="muted">чтобы в кадре всё время что-то происходило — правило удержания внимания</span>
        <button className="x" onClick={onClose}>
          ✕
        </button>
      </div>
      <label className="rangef">
        <span>
          Каждые <b>{every} с</b>
        </span>
        <input type="range" min={2} max={8} step={0.5} value={every} onChange={(e) => setEvery(+e.target.value)} />
      </label>
      <div className="lbl">Что ставить</div>
      <div className="checks">
        {RHYTHM_SETS.map((x) => (
          <label key={x.id}>
            <input type="radio" checked={set === x.id} onChange={() => setSet(x.id)} />
            {x.title}
          </label>
        ))}
        <label>
          <input type="radio" checked={set === "one"} onChange={() => setSet("one")} />
          Один эффект из библиотеки:
          <select value={one} onChange={(e) => (setOne(e.target.value), setSet("one"))}>
            {CATS.map((c) => (
              <optgroup key={c} label={c}>
                {EFFECTS.filter((e) => e.cat === c && !/^(broll|panel|speaker-contour|palette)/.test(e.id)).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      <div className="row">
        <label className="inline">
          с
          <input type="number" step={0.5} min={0} value={from} onChange={(e) => setFrom(+e.target.value)} />
        </label>
        <label className="inline">
          до
          <input type="number" step={0.5} min={0} value={to} onChange={(e) => setTo(+e.target.value)} />
        </label>
        <label className="inline">
          <input type="checkbox" checked={skipBusy} onChange={(e) => setSkipBusy(e.target.checked)} />
          не ставить, где уже есть эффект
        </label>
      </div>
      <p className="muted">
        Эффект встаёт на начало ближайшего слова, слои не накладываются друг на друга; в финале с сайтом — ничего. Повторное
        нажатие заменяет прежний ритм.
      </p>
      <div className="row">
        <button className="btn primary" disabled={!!busy && !busy.startsWith("Не")} onClick={go}>
          Расставить по всему ролику
        </button>
        {had ? (
          <button className="btn ghost" onClick={() => (up((q) => ({...q, effects: q.effects.filter((e) => !e.params.rhythm)})), onClose())}>
            Убрать ритм ({had})
          </button>
        ) : null}
        {busy ? <span className="muted">{busy}</span> : null}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- «Автомонтаж»: всё сразу одной кнопкой
const AUTO_STEPS = [
  ["words", "Распознаю речь"],
  ["clean", "Чищу паузы, эканья, мусорные слова, дубли"],
  ["voice", "Чистый голос"],
  ["fx", "Эффекты по смыслу: хук, цифры, эмодзи, списки, наезды"],
  ["pics", "Картинки по смыслу"],
  ["rhythm", "Ритм: что-то происходит каждые 4 с"],
] as const;
type AutoStep = (typeof AUTO_STEPS)[number][0];

export const AutoMontage: React.FC<StepCtx & {big?: boolean}> = (ctx) => {
  const {p, up, setM, setStatus, setStep, getP} = ctx;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<Partial<Record<AutoStep, string>>>({});
  const [now, setNow] = useState<{step: AutoStep; text: string; k: number} | null>(null);
  const [err, setErr] = useState("");
  const [report, setReport] = useState<string[]>([]);
  const [undo, setUndo] = useState<Project | null>(null);
  const [opts, setOpts] = useState({clean: true, voice: true, pics: true, rhythm: true});
  const hasVideo = clipsOf(p).some((c) => c.kind === "video");

  const run = async () => {
    setErr("");
    setReport([]);
    setState({});
    const before = JSON.parse(JSON.stringify(getP())) as Project;
    const done = (s: AutoStep, t: string) => setState((x) => ({...x, [s]: t}));
    const on = (step: AutoStep) => (k: number, text: string) => setNow({step, text, k});
    const lines: string[] = [];
    try {
      // 1. речь во всех роликах
      setNow({step: "words", text: "…", k: 0});
      await transcribeClips(getP(), up, "small", on("words"));
      await settle();
      done("words", `${clipsOf(getP()).reduce((n, c) => n + (c.words?.length ?? 0), 0)} слов`);

      // 2. чистка — по громкости чистого звука, как в «Склейке»
      if (opts.clean) {
        setNow({step: "clean", text: "Считаю громкость голоса…", k: 0});
        const q = getP();
        const clips = clipsOf(q);
        const env: Record<string, Float32Array | undefined> = {};
        for (const c of clips.filter((x) => x.kind === "video")) env[c.id] = (await loadEnv(q.id, c)) ?? undefined;
        const o = {...DEFAULT_OPTS, ...q.assemble};
        const res = assemble(clips, env, o);
        up((x) => applyEdl({...x, assemble: o}, clipsOf(x), res.edl, res.dropped));
        await settle();
        const cut = res.before - res.after;
        done("clean", `${fmtTime(res.before)} → ${fmtTime(res.after)}, вырезано ${cut.toFixed(1).replace(".", ",")} с`);
        lines.push(`чистка: ${fmtTime(res.before)} → ${fmtTime(res.after)} (${res.cuts.filter((c) => !c.kept).length} вырезов${res.groups.length ? `, дублей: ${res.groups.length}` : ""})`);
      } else {
        // без чистки: ролики целиком (несколько — встык), слова — из роликов
        const q = getP();
        const vids = clipsOf(q).filter((c) => c.kind === "video" && !c.off);
        if (vids.length > 1 || q.edl?.length) {
          const whole = vids.map((c) => ({clip: c.id, from: 0, to: c.duration}));
          up((x) => applyEdl(x, clipsOf(x), x.edl?.length ? x.edl : whole, {}));
        } else up((x) => ({...x, words: clipsOf(x)[0]?.words ?? x.words}));
        await settle();
        done("clean", "пропущено");
      }

      // 3. чистый голос
      if (opts.voice) {
        const got = await cleanClips(getP(), cleanVoice, on("voice"));
        const urls: Record<string, string> = {};
        for (const [id, b] of Object.entries(got)) urls[id] = URL.createObjectURL(b);
        setM((x) => ({...x, cleanClips: {...x.cleanClips, ...urls}, clean: urls.source ?? x.clean}));
        up((x) => ({...x, audio: {...x.audio, clean: true, music: x.audio.music ?? MUSIC[0].id}}));
        await settle();
        done("voice", "шумодав + мягкий эквалайзер");
        lines.push("чистый голос и музыка");
      } else done("voice", "пропущено");

      // 4. эффекты по смыслу
      setNow({step: "fx", text: "Читаю текст…", k: 0.5});
      const q = getP();
      const dur = projSeconds(q);
      const finale = q.brand !== "od";
      const kept = q.effects.filter((e) => !isAuto(e));
      const plan = autoEffects(q.words, kept, {brand: q.brand, duration: dur, finale, format: q.format});
      let effects = [...kept, ...plan.effects];
      done("fx", plan.report.length ? `${plan.effects.length} эффектов` : "в тексте не нашлось цифр и списков — только движение");
      lines.push(...plan.report);

      // 5. картинки по смыслу
      if (opts.pics && plan.brollSlots.length) {
        setNow({step: "pics", text: "Загружаю поиск по смыслу (один раз)…", k: 0.3});
        try {
          const pics = await pictures(plan.brollSlots, effects, "auto");
          effects = [...effects, ...pics];
          done("pics", `${pics.length} картинок`);
          lines.push(`картинки по смыслу: ${pics.length}`);
        } catch (e) {
          done("pics", "не получилось: " + String((e as Error).message || e).slice(0, 80));
        }
      } else done("pics", opts.pics ? "нет подходящих фраз" : "пропущено");

      // 6. ритм каждые 4 с — заполняет «пустые» места
      if (opts.rhythm) {
        const r = q.rhythm ?? {every: 4, set: "mix"};
        const kinds = r.effect ? [r.effect] : (RHYTHM_SETS.find((x) => x.id === r.set)?.kinds ?? RHYTHM_SETS[0].kinds);
        const slots = rhythmSlots(q.words, effects, {every: r.every, kinds, from: 0, to: finale ? dur - 3.4 : dur, skipBusy: true});
        const add = await rhythmEffects(q, slots, effects);
        effects = [...effects, ...add];
        done("rhythm", `${add.length} эффектов`);
        lines.push(`ритм: +${add.length} (каждые ${r.every} с)`);
      } else done("rhythm", "пропущено");

      up((x) => ({...x, effects, finale, rhythm: x.rhythm ?? {every: 4, set: "mix"}}));
      setNow(null);
      setReport(lines);
      setUndo(before);
      setStatus("Автомонтаж готов — смотрите предпросмотр. Любой эффект можно поправить или убрать на шаге «Монтаж».");
    } catch (e) {
      setNow(null);
      setErr(String((e as Error).message || e));
    }
  };

  return (
    <>
      <button className={`btn ${ctx.big ? "primary big" : ""} automont`} disabled={!hasVideo || !!now} onClick={() => setOpen(true)} title="Голос, чистка, эффекты по смыслу и ритм — сразу">
        ⚡ Автомонтаж
      </button>
      {open ? (
        <div className="modal" onClick={() => !now && setOpen(false)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h2>⚡ Автомонтаж</h2>
            <p className="muted">
              Монтажная сама соберёт ролик: речь → чистка → чистый голос и музыка → эффекты по смыслу ({BRANDS[p.brand].title}) →
              картинки → ритм. Ваши эффекты остаются, прежний автомонтаж заменяется. Потом всё можно поправить руками.
            </p>
            <div className="checks">
              <label>
                <input type="checkbox" checked={opts.clean} onChange={(e) => setOpts({...opts, clean: e.target.checked})} />
                Вырезать паузы, эканья, мусорные слова, оговорки, выбрать лучшие дубли
              </label>
              <label>
                <input type="checkbox" checked={opts.voice} onChange={(e) => setOpts({...opts, voice: e.target.checked})} />
                Чистый голос и музыка
              </label>
              <label>
                <input type="checkbox" checked={opts.pics} onChange={(e) => setOpts({...opts, pics: e.target.checked})} />
                Картинки по смыслу за спиной (примерно раз в 9 с)
              </label>
              <label>
                <input type="checkbox" checked={opts.rhythm} onChange={(e) => setOpts({...opts, rhythm: e.target.checked})} />
                Ритм: эффект каждые {p.rhythm?.every ?? 4} с
              </label>
            </div>
            <ol className="autosteps">
              {AUTO_STEPS.map(([id, t]) => (
                <li key={id} className={state[id] ? "done" : now?.step === id ? "now" : ""}>
                  <b>{t}</b>
                  <span>{state[id] ?? (now?.step === id ? now.text : "")}</span>
                  {now?.step === id ? (
                    <div className="prog">
                      <i style={{width: `${Math.round(now.k * 100)}%`}} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ol>
            {report.length ? (
              <div className="summary">
                <b>Готово</b>
                {report.map((l, i) => (
                  <span key={i}>• {l}</span>
                ))}
              </div>
            ) : null}
            {err ? <div className="err">{err}</div> : null}
            <div className="acts">
              {undo && !now ? (
                <button
                  className="btn ghost"
                  onClick={() => {
                    up(() => ({...undo, updated: undo.updated}));
                    setUndo(null);
                    setReport([]);
                    setState({});
                    setStatus("Автомонтаж отменён — ролик как был.");
                  }}
                >
                  Отменить автомонтаж
                </button>
              ) : null}
              <button className="btn ghost" disabled={!!now} onClick={() => setOpen(false)}>
                {report.length ? "Закрыть" : "Отмена"}
              </button>
              {report.length && !now ? (
                <button className="btn primary" onClick={() => (setOpen(false), setStep("edit"))}>
                  Смотреть в «Монтаже» →
                </button>
              ) : (
                <button className="btn primary" disabled={!!now} onClick={run}>
                  {now ? "Собираю…" : "Собрать"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
