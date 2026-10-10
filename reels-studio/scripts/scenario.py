"""Сценарий ролика TalkReelPro до съёмки: проверка и суфлёр.

  python3 scripts/scenario.py 2026-10-10-aura-intro      # scenarios/2026-10-10-aura-intro.json
  python3 scripts/scenario.py --all                      # все сценарии

Что делает:
- собирает fullText (текст для суфлёра) из blocks[].say и пишет его обратно в JSON;
- считает слова и оценку длины (2,45 слова в секунду — средний темп в готовых роликах), пишет wordCount и estSeconds;
- проверяет, что фраза-триггер каждого элемента (`on`) есть в тексте своего блока: после съёмки по ней ищется время
  в `_work/<клип>.cut.words.json`, и элементы переносятся в props;
- предупреждает, если оценка длиннее targetSeconds или логотипа нет в library/brands.json;
- пишет рядом суфлёр `scenarios/<имя>.txt` (крупные абзацы по блокам).

Формат сценария — reels-studio/CLAUDE.md, раздел «Сценарии до съёмки».
"""
import json
import pathlib
import re
import sys

STUDIO = pathlib.Path(__file__).resolve().parent.parent
DIR = STUDIO / "scenarios"
BRANDS = json.loads((STUDIO / "library" / "brands.json").read_text(encoding="utf-8"))
WPS = 2.45


def norm(s: str) -> str:
    return re.sub(r"[^\wё]+", " ", s.lower().replace("ё", "е")).strip()


def check(path: pathlib.Path) -> bool:
    sc = json.loads(path.read_text(encoding="utf-8"))
    ok = True
    for i, b in enumerate(sc["blocks"], 1):
        text = norm(b["say"])
        for el in b.get("overlays", []):
            on = el.get("on")
            if on and norm(on) not in text:
                print(f"  ✗ блок {i} ({b['part']}): «{on}» нет в тексте блока")
                ok = False
            if el.get("type") == "logos":
                for brand in el.get("items", []):
                    if brand not in BRANDS:
                        print(f"  · логотипа «{brand}» нет в library/brands.json — добавить до монтажа")
    full = "\n\n".join(b["say"] for b in sc["blocks"])
    words = len(re.findall(r"[\wё%+–-]+", full))
    sc["fullText"] = full
    sc["wordCount"] = words
    sc["estSeconds"] = round(words / WPS)
    path.write_text(json.dumps(sc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    path.with_suffix(".txt").write_text(f"{sc['title']}\n\n{full}\n", encoding="utf-8")
    target = sc.get("targetSeconds")
    flag = "" if not target or sc["estSeconds"] <= target else f"  ⚠ длиннее цели {target} с"
    print(f"{'✓' if ok else '✗'} {path.stem}: {words} слов ≈ {sc['estSeconds']} с{flag}")
    return ok


if __name__ == "__main__":
    names = sys.argv[1:]
    paths = sorted(DIR.glob("*.json")) if names == ["--all"] else [DIR / f"{n.removesuffix('.json')}.json" for n in names]
    sys.exit(0 if all([check(p) for p in paths]) else 1)
