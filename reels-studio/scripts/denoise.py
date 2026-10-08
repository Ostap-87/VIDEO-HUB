"""Нейросетевой шумодав голоса DeepFilterNet3 (бесплатно, локально): убирает шум улицы, цеха, ветра и гулкость.

  /opt/dfn/bin/python scripts/denoise.py вход.wav выход.wav

Запускается из отдельного окружения /opt/dfn (torch + deepfilternet), которое ставит scripts/setup.sh:
у deepfilternet свои старые зависимости, в общий Python их ставить нельзя (ломают OpenCV).
Веса модели — с Hugging Face (shakahl/DeepFilterNet3), лежат в /opt/dfn/model, в git не идут.
"""
import sys

import soundfile as sf
import torch
from df.enhance import enhance, init_df

model, st, _ = init_df(model_base_dir="/opt/dfn/model/DeepFilterNet3", log_level="ERROR")
x, sr = sf.read(sys.argv[1], dtype="float32")
if sr != st.sr():
    raise SystemExit(f"нужен {st.sr()} Гц, а не {sr}")
if x.ndim > 1:
    x = x.mean(1)
y = enhance(model, st, torch.from_numpy(x)[None])
sf.write(sys.argv[2], y.squeeze(0).numpy(), sr)
