#!/bin/sh
# Подпись GTT: podpis.png — 300×92, в размере показа (Яндекс Почта вставляет картинку в натуральном размере);
# podpis@2x.png — 600×184, чёткая копия, если в почте можно задать ширину 300.
cd "$(dirname "$0")"
CH=$(find /opt/pw-browsers -name chrome -type f | head -1)
for s in 1 2; do
  "$CH" --headless=new --no-sandbox --hide-scrollbars --force-device-scale-factor=$s --window-size=300,300 \
    --screenshot=_s$s.png "file://$PWD/podpis.html" 2>/dev/null
done
python3 -c "
from PIL import Image
Image.open('_s1.png').convert('RGB').crop((0,0,300,92)).save('podpis.png', optimize=True)
Image.open('_s2.png').convert('RGB').crop((0,0,600,184)).save('podpis@2x.png', optimize=True)"
rm -f _s1.png _s2.png
