"""Нейросетевой шумодав голоса DeepFilterNet3 (бесплатно, локально): убирает шум улицы, цеха, ветра и гулкость.

  /opt/dfn/bin/python scripts/denoise.py вход.wav выход.wav [--limit 18]

--limit — насколько глубоко давить шум, дБ (по умолчанию 18). Без предела (0) модель «выедает» вместе с шумом
верх согласных и тихие хвосты слов — голос глухой, «как из трубы» (жалоба пользователя 22.10.2026; замер на уличном
od-6: без предела −3,5 дБ на 8–16 кГц и −5 дБ на хвостах слов, с 18 дБ — −2,8 и −4, шум в паузах почти тот же).

Запускается из отдельного окружения /opt/dfn (torch + deepfilternet), которое ставит scripts/setup.sh:
у deepfilternet свои старые зависимости, в общий Python их ставить нельзя (ломают OpenCV).
Веса модели — с Hugging Face (shakahl/DeepFilterNet3), лежат в /opt/dfn/model, в git не идут.
"""
import argparse

import soundfile as sf
import torch
from df.enhance import enhance, init_df

ap = argparse.ArgumentParser()
ap.add_argument("inp")
ap.add_argument("out")
ap.add_argument("--limit", type=float, default=18, help="предел подавления, дБ (0 — без предела)")
a = ap.parse_args()
model, st, _ = init_df(model_base_dir="/opt/dfn/model/DeepFilterNet3", log_level="ERROR")
x, sr = sf.read(a.inp, dtype="float32")
if sr != st.sr():
    raise SystemExit(f"нужен {st.sr()} Гц, а не {sr}")
if x.ndim > 1:
    x = x.mean(1)
y = enhance(model, st, torch.from_numpy(x)[None], atten_lim_db=a.limit or None)
sf.write(a.out, y.squeeze(0).numpy(), sr)
