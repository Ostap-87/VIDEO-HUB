"""Перерендер готовых роликов GTT с фирменной заставкой (решение пользователя 12.10.2026: в начало — интро shards,
в конец — аутро shards; TalkReelPro ставит её сам, см. bumperOf / bumperFrames).

  python3 scripts/rebumper.py 2026-10-07-intro 2026-10-08-roboty …   # props/<имя>.json

Для каждого ролика: Reels → finished-videos/<имя>.mp4 (+ раскадровка в раскадровки/, лёгкая копия в для-телефона/),
Stories → finished-videos/<имя>-stories-1.mp4, -2.mp4 … (+ лёгкие копии). Точка разреза Stories — прежняя (длина старой
первой части) + 1,47 с интро; если какая-то часть вышла бы длиннее 59,5 с, разрез переносится на ближайший конец фразы
(слова из props). Прогресс — строки «▶ …», в конце по каждому ролику «REBUMPER_DONE <имя>».
"""
import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from auto import CONCURRENCY, FIN, STUDIO, light_copy, run  # noqa: E402

LEAD, TAIL, LIMIT = 44 / 30, 35 / 30, 59.5
R = ["./node_modules/.bin/remotion", "render", "src/index.ts", "TalkReelPro"]


def dur(p: pathlib.Path) -> float:
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)]).decode())


def cuts_for(name: str, props: dict) -> list[float]:
    """Точки разреза Stories (секунды готового ролика с заставкой)."""
    old = sorted(FIN.glob(f"{name}-stories-[0-9]*.mp4"), key=lambda p: int(p.stem.rsplit("-", 1)[1]))
    total = props["speechSeconds"] + props["ctaSeconds"] + LEAD + TAIL
    if len(old) < 2:
        return [] if total <= LIMIT else [round(total / 2, 2)]
    acc, want = 0.0, []
    for p in old[:-1]:
        acc += dur(p)
        want.append(acc + LEAD)
    # концы фраз: слово со знаком препинания (паузы после склейки почти нулевые); разрез — посередине до следующего слова
    w = props["words"]
    ends = [(w[i]["end"] + w[i + 1]["start"]) / 2 + LEAD for i in range(len(w) - 1) if w[i]["text"].rstrip()[-1:] in ".,!?…:;—"]
    out, prev = [], 0.0
    for k, c in enumerate(want):
        nxt_limit = total if k == len(want) - 1 else (want[k + 1] if k + 1 < len(want) else total)
        ok = lambda x: x - prev <= LIMIT and (nxt_limit - x <= LIMIT if k == len(want) - 1 else True) and x > prev + 5
        if ok(c):
            out.append(round(c, 2))
        else:
            cand = [e for e in ends if ok(e)]
            if not cand:
                print(f"! {name}: не нашёл конец фразы для разреза около {c:.1f} с — режу на {c:.1f}", flush=True)
                out.append(round(c, 2))
            else:
                best = min(cand, key=lambda e: abs(e - c))
                print(f"▶ {name}: разрез {c:.2f} → {best:.2f} с (конец фразы, части ≤ {LIMIT} с)", flush=True)
                out.append(round(best, 2))
        prev = out[-1]
    return out


def main():
    for name in sys.argv[1:]:
        props_path = STUDIO / "props" / f"{name}.json"
        props = json.loads(props_path.read_text())
        cuts = cuts_for(name, props)
        print(f"▶ {name}: Reels", flush=True)
        reels = FIN / f"{name}.mp4"
        run(R + [reels, f"--props=./props/{name}.json", f"--concurrency={CONCURRENCY}", "--log=error"])
        run(["python3", "scripts/frames.py", reels, "--every", "3"])
        (FIN / "раскадровки").mkdir(exist_ok=True)
        (FIN / "раскадровки" / f"{name}.jpg").write_bytes((FIN / "frames" / f"{name}.jpg").read_bytes())
        light_copy(reels, FIN / "для-телефона" / f"{name}.mp4")
        print(f"REELS {name} {dur(reels):.1f} с", flush=True)

        print(f"▶ {name}: Stories, разрез {cuts}", flush=True)
        sp = dict(props, format="stories")
        st_props = FIN / "frames" / f"_{name}-stories.props.json"
        st_props.write_text(json.dumps(sp, ensure_ascii=False))
        stories = FIN / f"{name}-stories.mp4"
        run(R + [stories, f"--props={st_props}", f"--concurrency={CONCURRENCY}", "--log=error"])
        st_props.unlink()
        for old in FIN.glob(f"{name}-stories-[0-9]*.mp4"):
            old.unlink()
        if cuts:
            run(["python3", "scripts/stories.py", stories, "--at", ",".join(map(str, cuts))])
        else:
            (FIN / f"{name}-stories-1.mp4").write_bytes(stories.read_bytes())
        stories.unlink()
        for part in sorted(FIN.glob(f"{name}-stories-[0-9]*.mp4")):
            light_copy(part, FIN / "для-телефона" / part.name)
            print(f"  {part.name}: {dur(part):.1f} с", flush=True)
        print(f"REBUMPER_DONE {name}", flush=True)


if __name__ == "__main__":
    main()
