"""Быстрая замена перебивки в черновике (после проверки листа _work/<clip>.sheet.jpg).

  npm run broll -- 2026-10-09-avto --find "battery swap|charging"   # свободные картинки каталога Higgsfield
  npm run broll -- 2026-10-09-avto --set 33.5 338                    # перебивка в 33.5 с → картинка №338
  npm run broll -- 2026-10-09-avto --drop 33.5                       # убрать перебивку
  npm run broll -- 2026-10-09-avto --block 600 "Mercedes на картинке" # больше никогда не предлагать

--find ищет по английскому описанию (регулярка), без использованных и заблокированных, и печатает номер,
формат и описание. --set скачивает картинку в source-videos/<имя>/broll/, меняет props и реестр
source-videos/higgsfield/использовано.json (старая картинка освобождается). После --set/--drop
пересчитай вырезку спикера: npm run auto -- --name <имя> --until prep --rematte.
"""
import argparse
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
HF = ROOT / "source-videos" / "higgsfield"
LIB = ROOT / "reels-studio" / "library"


def load(p):
    return json.loads(pathlib.Path(p).read_text())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("name")
    ap.add_argument("--find")
    ap.add_argument("--set", nargs=2, metavar=("СЕКУНДА", "НОМЕР"))
    ap.add_argument("--drop", type=float)
    ap.add_argument("--block", nargs=2, metavar=("НОМЕР", "ПРИЧИНА"))
    a = ap.parse_args()

    cat = load(HF / "каталог.json")
    reg_p = HF / "использовано.json"
    reg = load(reg_p)
    blk_p = LIB / "blocked-images.json"
    blk = load(blk_p)
    used = {v["id"] for v in reg.values()}
    props_p = ROOT / "reels-studio" / "props" / f"{a.name}.json"

    if a.block:
        blk[a.block[0]] = a.block[1]
        blk_p.write_text(json.dumps(blk, ensure_ascii=False, indent=1))
        print(f"№{a.block[0]} заблокирована")
    if a.find:
        rx = re.compile(a.find, re.I)
        n = 0
        for i, c in enumerate(cat):
            if c["id"] in used or str(i) in blk or not rx.search(c["prompt"]):
                continue
            print(f"{i:4d}  {c.get('aspect', ''):5s}  {c['prompt'][:150]}")
            n += 1
        print(f"— найдено {n}")
    if a.set or a.drop is not None:
        props = load(props_p)
        t = float(a.set[0]) if a.set else a.drop
        b = min(props["broll"], key=lambda x: abs(x["at"] - t))
        if abs(b["at"] - t) > 1.0:
            raise SystemExit(f"Нет перебивки около {t} с. Есть: " + ", ".join(str(x["at"]) for x in props["broll"]))
        old = re.search(r"hf-(\d+)", b["src"])
        if old and old.group(1) in reg and reg[old.group(1)].get("videos") == [a.name]:
            del reg[old.group(1)]
        if a.set:
            idx = int(a.set[1])
            if cat[idx]["id"] in used:
                print(f"! №{idx} уже стоит в другом ролике — картинки не повторяем")
                raise SystemExit(1)
            dst = ROOT / "source-videos" / a.name / "broll" / f"hf-{idx}.png"
            dst.parent.mkdir(parents=True, exist_ok=True)
            if not dst.exists():
                req = urllib.request.Request(cat[idx]["urls"][0], headers={"User-Agent": "Mozilla/5.0"})
                dst.write_bytes(urllib.request.urlopen(req, timeout=120).read())
            b["src"] = str(dst.relative_to(ROOT))
            reg[str(idx)] = {"id": cat[idx]["id"], "prompt": cat[idx]["prompt"], "videos": [a.name]}
            print(f"{b['at']} с → №{idx}: {cat[idx]['prompt'][:100]}")
        else:
            props["broll"].remove(b)
            print(f"перебивка {b['at']} с убрана")
        props_p.write_text(json.dumps(props, ensure_ascii=False, indent=1))
        reg_p.write_text(json.dumps(reg, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
