#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Картинки для «фона по смыслу» в Монтажной: каталог Higgsfield пользователя → миниатюры и смысловые векторы.

  python3 montazh/scripts/build_images.py [--no-thumbs] [--no-emb]

* montazh/library/images.json — номер, id, описание (prompt, англ.), ссылка на оригинал, формат, пометки
  used (уже стояла в роликах — «одна картинка один раз», source-videos/higgsfield/использовано.json) и blocked
  (reels-studio/library/blocked-images.json: чужой бренд, искажённая надпись — в подбор не идёт);
* montazh/library/images/<номер>.jpg — миниатюра 160 px по ширине (для списка подбора);
* montazh/library/images.emb — векторы описаний (int8, 384 на картинку) той же модели, что считает фразы в окне
  (Xenova/paraphrase-multilingual-MiniLM-L12-v2, quantized ONNX): русская фраза → близкая по смыслу картинка.
Новые генерации в каталоге — запустить скрипт ещё раз (миниатюры докачиваются, векторы пересчитываются).
"""
import argparse
import io
import json
import os
import pathlib
import subprocess
import sys
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
LIB = ROOT / "montazh" / "library"
CATALOG = ROOT / "source-videos" / "higgsfield" / "каталог.json"
USED = ROOT / "source-videos" / "higgsfield" / "использовано.json"
BLOCKED = ROOT / "reels-studio" / "library" / "blocked-images.json"
MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
HF = os.environ.get("HF_ENDPOINT", "https://huggingface.co")


def fetch(url: str, dest: pathlib.Path) -> None:
    subprocess.run(["curl", "-sSL", "--fail", "--retry", "3", "-o", str(dest), url], check=True)


def thumbs(items: list) -> None:
    from PIL import Image
    out = LIB / "images"
    out.mkdir(parents=True, exist_ok=True)
    todo = [it for it in items if not (out / f"{it['n']}.jpg").exists()]
    print(f"миниатюры: {len(todo)} из {len(items)}", flush=True)
    with tempfile.TemporaryDirectory() as tmp:
        for k, it in enumerate(todo, 1):
            src = pathlib.Path(tmp) / "x"
            try:
                fetch(it["url"], src)
                with Image.open(src) as im:
                    im = im.convert("RGB")
                    w = 160
                    im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(out / f"{it['n']}.jpg", quality=72)
            except Exception as exc:  # noqa: BLE001
                print(f"  ! {it['n']}: {exc}", flush=True)
            if k % 50 == 0:
                print(f"  {k}/{len(todo)}", flush=True)


def embeddings(texts: list) -> "list":
    import numpy as np
    import onnxruntime as ort
    from tokenizers import Tokenizer
    cache = pathlib.Path.home() / ".cache" / "montazh-minilm"
    cache.mkdir(parents=True, exist_ok=True)
    for f in ("tokenizer.json", "onnx/model_quantized.onnx"):
        dst = cache / f.replace("/", "_")
        if not dst.exists():
            print(f"скачиваю {f}", flush=True)
            fetch(f"{HF}/{MODEL}/resolve/main/{f}", dst)
    tok = Tokenizer.from_file(str(cache / "tokenizer.json"))
    tok.enable_truncation(128)
    sess = ort.InferenceSession(str(cache / "onnx_model_quantized.onnx"), providers=["CPUExecutionProvider"])
    names = [i.name for i in sess.get_inputs()]
    out = []
    for i in range(0, len(texts), 32):
        enc = tok.encode_batch(texts[i:i + 32])
        n = max(len(e.ids) for e in enc)
        ids = np.array([e.ids + [1] * (n - len(e.ids)) for e in enc], dtype=np.int64)       # <pad> = 1
        mask = np.array([[1] * len(e.ids) + [0] * (n - len(e.ids)) for e in enc], dtype=np.int64)
        feed = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in names:
            feed["token_type_ids"] = np.zeros_like(ids)
        h = sess.run(None, feed)[0]                                                             # [b, n, 384]
        v = (h * mask[..., None]).sum(1) / mask.sum(1, keepdims=True)                           # mean pooling
        v /= np.linalg.norm(v, axis=1, keepdims=True)
        out.append(v)
    return np.concatenate(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-thumbs", action="store_true")
    ap.add_argument("--no-emb", action="store_true")
    a = ap.parse_args()
    cat = json.loads(CATALOG.read_text(encoding="utf-8"))
    used = json.loads(USED.read_text(encoding="utf-8")) if USED.exists() else {}
    blocked = {k for k in json.loads(BLOCKED.read_text(encoding="utf-8")) if k.isdigit()} if BLOCKED.exists() else set()
    items = []
    for n, it in enumerate(cat):
        if not it.get("urls"):
            continue
        items.append({"n": n, "id": it["id"], "prompt": it.get("prompt", "")[:400], "url": it["urls"][0],
                      "aspect": it.get("aspect", ""), "used": str(n) in used, "blocked": str(n) in blocked})
    LIB.mkdir(parents=True, exist_ok=True)
    (LIB / "images.json").write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"images.json: {len(items)} картинок, уже в роликах {sum(i['used'] for i in items)}, нельзя {sum(i['blocked'] for i in items)}")
    if not a.no_emb:
        import numpy as np
        v = embeddings([i["prompt"] for i in items])
        (LIB / "images.emb").write_bytes(np.clip(np.round(v * 127), -127, 127).astype(np.int8).tobytes())
        print(f"images.emb: {v.shape}")
    if not a.no_thumbs:
        thumbs(items)
    print("IMAGES_OK")


if __name__ == "__main__":
    sys.exit(main())
