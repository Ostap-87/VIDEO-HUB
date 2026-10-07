#!/usr/bin/env bash
# Ставит whisper.cpp и модель large-v3-turbo (сжатая q5_0, ~550 МБ) в reels-studio/whisper.cpp.
# Папка в git не идёт. Модель качается через curl: в облачной среде Claude Node.js к Hugging Face не пускают.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -x whisper.cpp/build/bin/whisper-cli ]; then
  rm -rf whisper.cpp
  git clone --depth 1 --branch v1.7.6 https://github.com/ggml-org/whisper.cpp whisper.cpp
  cmake -S whisper.cpp -B whisper.cpp/build -DCMAKE_BUILD_TYPE=Release
  cmake --build whisper.cpp/build -j --config Release --target whisper-cli
fi

MODEL=whisper.cpp/ggml-large-v3-turbo-q5_0.bin
if [ ! -s "$MODEL" ] || [ "$(stat -c%s "$MODEL" 2>/dev/null || stat -f%z "$MODEL")" -lt 100000000 ]; then
  curl -L --fail -o "$MODEL" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin
fi
echo "Whisper готов: $MODEL"
