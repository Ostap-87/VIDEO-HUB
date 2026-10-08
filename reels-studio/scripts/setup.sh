#!/usr/bin/env bash
# Готовит облачную среду к монтажу: всё, что нужно для npm run auto. Повторный запуск ничего не ломает
# и пропускает уже установленное. Запускается сам при старте сессии Claude (хук SessionStart в .claude/settings.json)
# в фоне; лог — /tmp/gtt-setup.log, по окончании создаётся /tmp/gtt-setup.done.
set -uo pipefail
cd "$(dirname "$0")/.."
rm -f /tmp/gtt-setup.done
echo "[setup] $(date +%T) старт"

# 1. Пакеты Node (Remotion)
if [ ! -x node_modules/.bin/remotion ]; then
  echo "[setup] npm ci"; npm ci --no-audit --no-fund || npm install --no-audit --no-fund
fi

# 2. Python: OpenCV <5 (в 5.0 нет каскадов Хаара для сетки глаз), ONNX Runtime (вырезка спикера), PIL, cairosvg (лист логотипов)
python3 - <<'PY' 2>/dev/null || pip install -q --break-system-packages "opencv-python-headless<5" onnxruntime numpy pillow cairosvg 2>/dev/null || pip install -q "opencv-python-headless<5" onnxruntime numpy pillow cairosvg
import cv2, onnxruntime, numpy, PIL, cairosvg
assert int(cv2.__version__.split(".")[0]) < 5 and hasattr(cv2, "CascadeClassifier")
PY

# 3. Whisper (сборка ~3 мин + модель ~550 МБ)
bash scripts/setup-whisper.sh

# 4. Модель вырезки спикера (Robust Video Matting, ~15 МБ)
mkdir -p models
[ -s models/rvm_mobilenetv3_fp32.onnx ] || curl -L --fail -o models/rvm_mobilenetv3_fp32.onnx \
  https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3_fp32.onnx

echo "[setup] $(date +%T) готово"
touch /tmp/gtt-setup.done
