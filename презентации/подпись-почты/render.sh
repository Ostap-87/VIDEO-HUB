#!/bin/sh
# Подпись GTT → podpis-s-foto.png и podpis-logo.png (1200×340, для показа 600×170).
cd "$(dirname "$0")"
CH=$(find /opt/pw-browsers -name chrome -type f | head -1)
"$CH" --headless=new --no-sandbox --hide-scrollbars --force-device-scale-factor=2 --window-size=600,700 \
  --screenshot=_all.png "file://$PWD/podpis.html" 2>/dev/null
python3 -c "
from PIL import Image
im=Image.open('_all.png').convert('RGB'); print('screenshot', im.size)
im.crop((0,0,1200,340)).save('podpis-s-foto.png', optimize=True)
im.crop((0,340,1200,680)).save('podpis-logo.png', optimize=True)"
rm -f _all.png
