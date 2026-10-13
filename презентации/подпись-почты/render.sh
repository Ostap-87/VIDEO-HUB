#!/bin/sh
# Подпись GTT → podpis.png (1200×300, для показа 600×150).
cd "$(dirname "$0")"
CH=$(find /opt/pw-browsers -name chrome -type f | head -1)
"$CH" --headless=new --no-sandbox --hide-scrollbars --force-device-scale-factor=2 --window-size=600,400 \
  --screenshot=_all.png "file://$PWD/podpis.html" 2>/dev/null
python3 -c "
from PIL import Image
Image.open('_all.png').convert('RGB').crop((0,0,1200,300)).save('podpis.png', optimize=True)"
rm -f _all.png
