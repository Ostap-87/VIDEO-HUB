"""Ручные правки презентаций Вьетнама после конвертера from_site.py (идемпотентно: только присваивания).

Порядок: python3 презентации/шаблон/from_site.py vietnam-<тема>-expedition  (все 7)
         python3 презентации/контент/правки/вьетнам.py [--build]
Факты — только из описаний сайта globaltechtour.ru. СТАТУС: черновик (WIP), правки фактов карточек ещё не внесены.
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
C = ROOT / 'презентации' / 'контент'
NAMES = ['ритейл', 'еда', 'доставка', 'интернет', 'красота', 'лонгевити', 'чай-кофе']


def path(n):
    return C / f'2026-10-08-вьетнам-{n}.json'


def load(n):
    return json.loads(path(n).read_text(encoding='utf-8'))


def save(n, d):
    path(n).write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def slide(d, typ):
    return next(s for s in d['slides'] if s['type'] == typ)


# ---------------- ритейл: обложка из заготовки (тексты лучше конвертерных)
d = load('ритейл')
draft = json.loads((C / '2026-10-08-обложка-vietnam.json').read_text(encoding='utf-8'))['slides'][0]
cov = d['slides'][0]
for k in ('tag', 'topright', 'logos', 'box_text', 'box_right', 'footer'):
    cov[k] = draft[k]
save('ритейл', d)

# ---------------- лонгевити: на сайте прилёт «Хошимин», но день 1 и маршрут (hanoi-to-hcmc) — Ханой.
# Берём маршрут программы; пользователю — проверить.
d = load('лонгевити')
slide(d, 'route')['footer'] = '<b>Прилёт:</b> Ханой · <b>Вылет:</b> Хошимин'
save('лонгевити', d)

if '--build' in sys.argv:
    for n in NAMES:
        subprocess.run([sys.executable, str(ROOT / 'презентации/шаблон/build.py'), str(path(n))], check=True)
