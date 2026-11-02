"""Генератор спецификаций ролика о приложении v4 (02.11.2026): полная версия и версия на 1 минуту из одних сцен."""
# Запуск: python3 reels-studio/promo/2026-11-02-gtt-app-v4.make.py (перезаписывает обе спецификации v4).
import json, copy, pathlib
R = pathlib.Path(__file__).resolve().parents[1]
v3 = json.loads((R / 'promo/2026-10-27-gtt-app-v3.json').read_text())
B = {b['id']: copy.deepcopy(b) for b in v3['beats']}
for b in B.values():
    b['voice'] = b['id']  # голос v3 той же сцены

def drop_focus(b):
    for c in b.get('cues', []):
        c.pop('focus', None)

# ---- c04: роли — зум на «Сегодня» делегата, переворот к координатору и зум на сбор группы
b = B['c04']; drop_focus(b)
b['chips'] = []
b['zooms'] = [
    {"on": "делегата", "box": [0.03, 0.15, 0.94, 0.2], "hold": 1.3, "label": "Делегат: вся поездка"},
    {"on": "координатора", "box": [0.02, 0.06, 0.96, 0.4], "hold": 1.6, "label": "Координатор: вся группа", "delay": 0.35},
]
# ---- c05: «Сегодня» → программа → маршрут на карте (крупно, с паузой)
b = B['c05']; drop_focus(b)
b['chips'] = [{"text": "Куда едем", "on": "куда", "icon": "pin"}, {"text": "Выезд в 09:30", "on": "выезд.", "icon": "bus"}]
b['zooms'] = [
    {"on": "сейчас", "box": [0.03, 0.155, 0.94, 0.18], "hold": 0.9, "label": "Что сейчас"},
    {"on": "программа", "box": [0.02, 0.06, 0.96, 0.36], "hold": 1.2, "label": "Программа по дням", "delay": 0.25},
    {"on": "маршрут", "box": [0.03, 0.25, 0.94, 0.42], "to": [0.18, 0.36, 0.64, 0.3], "hold": 3.4, "label": "Весь маршрут — на карте", "delay": 0.2},
]
b['widgets'] = [{"kind": "trio", "on": "карте.", "items": [["4", "города"], ["6", "дней"], ["9", "компаний"]], "y": 1300, "until": 2.2, "keep": True}]
b['pauseAfter'] = 1.5
# ---- c06: «Я в автобусе» крупно, кольцо «15 из 18», опрос и чат, штамп «Ничего не теряется»
b = B['c06']; drop_focus(b)
b['chips'] = [{"text": "Объявления", "on": "Объявления,", "icon": "chat"}, {"text": "Опросы", "on": "опросы", "icon": "poll"}, {"text": "Чат с координатором", "on": "чат", "icon": "chat"}]
b['zooms'] = [
    {"on": "кнопка", "box": [0.03, 0.15, 0.94, 0.17], "hold": 1.6, "label": "Одна кнопка — «Я в автобусе»"},
]
b['widgets'] = [{"kind": "ring", "on": "видит,", "value": 15, "total": 18, "label": "в автобусе", "sub": "видит координатор", "x": 64, "y": 600, "until": 2.4}]
b['hook'] = {"kind": "stamp", "on": "ничего", "lines": ["Ничего", "не теряется ✓"], "until": 1.6}
# ---- c07: визит — заметки, радиогид, визитка (распознавание)
b = B['c07']; drop_focus(b)
b['chips'] = [{"text": "Заметки: голос и фото", "on": "заметки", "icon": "mic"}]
b['zooms'] = [
    {"on": "радиогид", "box": [0.02, 0.07, 0.96, 0.44], "hold": 1.8, "label": "Радиогид с субтитрами"},
    {"on": "визитки", "box": [0.04, 0.07, 0.92, 0.29], "hold": 1.5, "label": "Визитку — сразу в контакты"},
    {"on": "распознавание", "box": [0.03, 0.04, 0.94, 0.3], "hold": 2.2, "label": "王晓明 → Wang Xiaoming"},
]
# ---- c09: бухгалтерия — хук «ЧЕКИ», зум на валюты, график расходов, штамп
b = B['c09']
b['hook'] = {"kind": "slam", "on": "Чеки", "lines": ["Чеки?", "→ **один отчёт**"], "lineOn": ["Чеки", "единый"], "images": ["chek-taksi.jpg", "chek-obed.jpg", "chek-svyaz.jpg"], "until": "формате"}
b['report'] = {"on": "формате", "excelOn": "Эксель", "pdfOn": "PDF.", "rubOn": "валюте", "doneOn": "Бухгалтер", "timeOn": "теряете"}
b['zooms'] = [
    {"on": "валюте", "pt": [389, 1090], "scale": 1.45, "hold": 1.7, "label": "Любая валюта — автоматически", "labelY": 1270, "delay": -0.15},
]
b['widgets'] = [{"kind": "bars", "on": "Суммы", "title": "Расходы по категориям", "items": [["Такси", 1038], ["Обед", 3235], ["Связь", 1448]], "x": 64, "y": 1195, "w": 650, "until": "теряете"}]
b['hook2'] = {"kind": "stamp", "on": "теряете", "lines": ["Без ручных", "отчётов ✓"], "until": 1.5}
# ---- c10: майндмэп — хук «ИТОГИ», камера по узлам, штамп «Автоматически»
b = B['c10']
b['hook'] = {"kind": "slam", "on": "В", "lines": ["Поездка закончилась?", "**Итоги** уже готовы"], "lineOn": ["В", "итоговый"], "until": "поездке"}
b['mind'] = {**b['mind'], "reportOn": "поездке"}
b['zooms'] = [
    {"on": "время,", "pt": [254, 840], "scale": 1.7, "hold": 0.9, "label": "Время и день визита"},
    {"on": "договорённости,", "pt": [254, 770], "scale": 1.45, "hold": 0.55, "label": "Договорённости"},
    {"on": "контакты,", "pt": [826, 1160], "scale": 1.45, "hold": 0.5, "label": "Контакты"},
    {"on": "следующие", "pt": [254, 1400], "scale": 1.45, "hold": 0.7, "label": "Следующие шаги"},
]
b['widgets'] = [{"kind": "trio", "on": "Всё", "items": [["6", "компаний"], ["5", "дней"], ["1", "карта"]], "y": 290, "until": "автоматически."}]
b['hook2'] = {"kind": "stamp", "on": "автоматически.", "lines": ["Собирается", "автоматически ✓"], "until": 1.4}
# ---- c11: город — переводчик, карта без интернета, экстренный вызов крупно
b = B['c11']
b['chips'] = [{"text": "Переводчик", "on": "переводчик,", "icon": "lang"}]
b['zooms'] = [
    {"on": "карта", "box": [0.02, 0.12, 0.96, 0.46], "hold": 1.2, "label": "Карта без интернета"},
    {"on": "экстренного", "box": [0.03, 0.05, 0.94, 0.17], "hold": 1.6, "label": "Экстренный вызов", "delay": 0.1},
]
# ---- c13: 76 программ — график по странам (данные сайта: tours.json SINOTECH)
b = B['c13']
b['visual'] = 'countries'
b['countries'] = {"on": "семидесяти", "subOn": "девяти", "items": [["cn", "Китай", 23], ["jp", "Япония", 7], ["th", "Таиланд", 7], ["vn", "Вьетнам", 7], ["id", "Индонезия", 7], ["in", "Индия", 7], ["my", "Малайзия", 7], ["ae", "ОАЭ", 7], ["kr", "Корея", 4]]}
b.pop('counter', None); b.pop('still', None)
b['pauseAfter'] = 0.9

# ---- монтаж функций без голоса (полная версия)
F = []
def feat(fid, clip, mark, title, box, label=None, at=0.15, zat=0.75, scale=None, dur=2.3, trans=None):
    z = {"at": zat, "box": box, "hold": dur - zat - 0.35}
    if label: z["label"] = label
    if scale: z["scale"] = scale
    d = {"id": fid, "part": "more", "silent": dur, "say": "", "title": title,
         "cues": [{"clip": clip, "mark": mark, "at": at}], "zooms": [z]}
    if trans: d["trans"] = trans
    F.append(d)
    return d
m_prep = [
    feat("m01", "profile", "alg", "Питание и **аллергии**", [0.02, 0.1, 0.96, 0.42], "Профиль делегата", at=0.0, trans="whip"),
    feat("m02", "prep", "apps", "Подготовка **к поездке**", [0.02, 0.07, 0.96, 0.42], "Документы · приложения · памятка", at=0.0),
]
m_coord = [
    feat("m03", "rooming", "idle", "Расселение **по номерам**", [0.02, 0.06, 0.96, 0.4], "Кто с кем в номере", trans="zoom"),
    feat("m04", "groupmap", "idle", "Вся группа **на карте**", [0.02, 0.06, 0.96, 0.36], "Координатор видит, где помощь", zat=0.6),
    feat("m05", "food", "idle", "Питание группы — **ресторану**", [0.02, 0.06, 0.96, 0.34], "Сразу по-китайски"),
    feat("m06", "pollq", "like", "Вопросы компании — **заранее**", [0.02, 0.2, 0.96, 0.36], "Лучшие вопросы — наверх", at=0.4),
]
m_visit = [
    feat("m07", "cards", "idle", "Визитки → **Excel и CRM**", [0.02, 0.06, 0.96, 0.3], "Таблица контактов одной кнопкой", trans="flash"),
    feat("m08", "followup", "pick", "Что нужно **после визита**", [0.02, 0.08, 0.96, 0.4], "Образцы, повторная встреча", at=0.3),
]
m_city = [
    feat("m09", "driver", "idle", "Адрес — **таксисту**", [0.02, 0.37, 0.96, 0.22], "Крупно, по-китайски", trans="whip"),
    feat("m10", "waiter", "idle", "Аллергии — **официанту**", [0.02, 0.32, 0.96, 0.3], "Карточка на китайском"),
    feat("m11", "pharmacy", "card", "Аптека: **покажите фармацевту**", [0.02, 0.2, 0.96, 0.36], "Фраза по-китайски", at=-0.9),
    feat("m12", "fruit", "down", "Фруктовые **лавки**", [0.02, 0.15, 0.96, 0.42], "Как купить и не переплатить", at=0.3),
    feat("m13", "around", "show", "Еда и места **рядом**", [0.02, 0.1, 0.96, 0.42], "По картам Amap", at=0.2),
    feat("m14", "city", "conv", "Юани → **рубли**", [0.02, 0.1, 0.96, 0.3], "Курс за секунду", at=0.4),
]
TOTAL = 14
for i, d in enumerate(F):
    d["feature"] = [i + 1, TOTAL]

def spec(name, voice_dir, screens_dir, order, title):
    beats = []
    for x in order:
        beats.append(copy.deepcopy(B[x]) if isinstance(x, str) else copy.deepcopy(x))
    return {
        "name": name, "sourceDir": "2026-10-27-gtt-app-promo", "voiceDir": voice_dir, "screensDir": screens_dir,
        "title": title, "brand": "gtt",
        "voice": {"final": "голос v3 (Остап, Higgsfield seed_audio) — те же записи сцен voice-v3/beats, темп ×1,1 и паузы внутри фраз до 0,24 с (02.11.2026: «голос слишком заторможенный»)",
                  "gapAfter": 0.25, "tempo": 1.1, "maxPause": 0.24},
        "music": v3["music"], "captionMap": v3["captionMap"], "beats": beats,
    }

full_order = ["c01", "c02", "c03", "c04", "c05", *m_prep, "c06", *m_coord, "c07", *m_visit, "c08", "c09", "c10", "c11", *m_city, "c12", "c13", "c14"]
full = spec("2026-11-02-gtt-app-promo-full", "voice-v4-full", "screens-v4-full", full_order,
            "Приложение Global Tech Tour — расширенная версия: все возможности (v4, 02.11.2026)")
short_order = ["c01", "c02", "c03", "c05", "c09", "c10", "c11", "c14"]
s60 = spec("2026-11-02-gtt-app-promo-60", "voice-v4-60", "screens-v4-60", short_order,
           "Приложение Global Tech Tour — версия на 1 минуту (v4, 02.11.2026)")
for b in s60["beats"]:
    if b["id"] == "c05":
        b["trans"] = "zoom"
    if b["id"] == "c09":
        b["trans"] = "iris"
    if b["id"] == "c11":
        b["trans"] = "whip"
(R / 'promo/2026-11-02-gtt-app-full.json').write_text(json.dumps(full, ensure_ascii=False, indent=1))
(R / 'promo/2026-11-02-gtt-app-60.json').write_text(json.dumps(s60, ensure_ascii=False, indent=1))
print(len(full['beats']), len(s60['beats']))
