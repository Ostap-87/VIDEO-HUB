#!/usr/bin/env python3
"""Конвертер «экспедиция с сайта globaltechtour.ru → JSON презентации» для build.py.

    python3 презентации/шаблон/from_site.py thailand-food-dairy-expedition
    python3 презентации/шаблон/from_site.py thailand-food-dairy-expedition --out презентации/контент/2026-10-08-тайланд-еда.json --build

Берёт данные экспедиции и карточек компаний из JS-бандла сайта (https://globaltechtour.ru/ → /assets/index-*.js),
собирает слайды в том же порядке, что и ручная презентация Таиланда: обложка, «Почему мы», «Направления»,
«Маршрут» (если городов больше одного), «Программа по дням», карточка каждой компании, «Выгоды», «Формат и условия»,
«Контакты». Факты — только из данных сайта (цифры, годы, названия берутся из описаний компаний дословно).
Логотипы скачиваются с globaltechtour.ru/logos в source-videos/логотипы/<отрасль>/ (если их ещё нет), обрезаются поля
и белый фон, бренд дописывается в reels-studio/library/brands.json, источник — в интернет-материалы/АВТОРЫ.md.
После генерации HTML проверяется в Chromium (fit_check.mjs): если текст вылезает из своего блока, поле
укорачивается (следующий вариант текста) и проверка повторяется.

Ключи: --bundle путь (взять сохранённый бандл вместо скачивания), --out путь JSON, --build (сразу собрать PDF и превью),
--no-logos (не скачивать логотипы), --no-fit (без проверки в Chromium), --list [страна] (список экспедиций).
Нужны: Python 3 с jinja2, Pillow, pymorphy3 + pymorphy3-dicts-ru (склонения; без них — упрощённый режим), Node + Playwright.
"""
import argparse, datetime, json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
PRES = HERE.parent
ROOT = PRES.parent
SITE = 'https://globaltechtour.ru'
BRANDS = ROOT / 'reels-studio/library/brands.json'
AUTHORS = ROOT / 'интернет-материалы/АВТОРЫ.md'
LOGOS = ROOT / 'source-videos/логотипы'

sys.path.insert(0, str(HERE))

try:
    import pymorphy3
    MORPH = pymorphy3.MorphAnalyzer()
except Exception:  # без морфологии — без склонений
    MORPH = None

# ---------------------------------------------------------------- справочники
COUNTRY = {  # код → (страна в имени файла, робот, родительный падеж, «в …», язык сопровождения)
    'th': ('тайланд', 'bangkok', 'Таиланда', 'в Таиланд'),
    'in': ('индия', 'india', 'Индии', 'в Индию'),
    'vn': ('вьетнам', 'vietnam', 'Вьетнама', 'во Вьетнам'),
    'my': ('малайзия', 'malaysia', 'Малайзии', 'в Малайзию'),
    'jp': ('япония', 'japan', 'Японии', 'в Японию'),
    'kr': ('корея', 'korea', 'Кореи', 'в Корею'),
    'id': ('индонезия', 'indonesia', 'Индонезии', 'в Индонезию'),
    'ae': ('оаэ', 'uae', 'ОАЭ', 'в ОАЭ'),
    'cn': ('китай', None, 'Китая', 'в Китай'),
}
TOPIC = [  # хвост tour_id → тема в имени файла
    ('retail-ecommerce', 'ритейл'), ('retail', 'ритейл'), ('food-dairy', 'еда'), ('dark-kitchen-delivery', 'доставка'),
    ('tech-internet-giants', 'интернет'), ('beauty-industry', 'красота'), ('beauty-antiage', 'красота'),
    ('longevity-biotech', 'лонгевити'), ('bubble-tea-coffee', 'чай-кофе'), ('tea-coffee-retail', 'чай-кофе'),
    ('ai-tech', 'ии'), ('fintech', 'финтех'), ('logistics-ports', 'логистика'), ('aviation', 'авиация'),  # ОАЭ
    ('realestate', 'недвижимость'), ('energy-green-tech', 'энергетика'),
]
SECTOR_FOLDER = {'consumer': 'ритейл', 'food': 'еда', 'internet': 'техгиганты', 'ai': 'ии', 'finance': 'финансы',
                 'medtech': 'медицина', 'robotics': 'роботы', 'auto': 'авто', 'appliances': 'бытовая-техника',
                 'logistics': 'логистика', 'aerospace': 'авиация', 'realestate': 'недвижимость', 'energy': 'энергетика'}
SECTOR_ICON = {'consumer': 'store', 'food': 'cart', 'internet': 'smartphone', 'ai': 'cpu', 'finance': 'chart',
               'medtech': 'target', 'robotics': 'cpu', 'auto': 'car',
               'logistics': 'package', 'aerospace': 'plane', 'realestate': 'building', 'energy': 'zap'}
THAI_DAYS = {1: 'หนึ่งวัน', 2: 'สองวัน', 3: 'สามวัน', 4: 'สี่วัน', 5: 'ห้าวัน', 6: 'หกวัน', 7: 'เจ็ดวัน'}
CJK_DAYS = {1: '一天', 2: '两天', 3: '三天', 4: '四天', 5: '五天', 6: '六天', 7: '七天'}
GHOST_COUNTRY = {'th': ('ไทย', True), 'cn': ('中国', False), 'jp': ('日本', False)}
LANG = {'тайском': 'тайском', 'английском': 'английском'}
GENERIC_ALIAS = {'line', 'true', 'class', 'roots', 'central', 'more', 'space', 'group', 'thailand', 'meiji', 'vega',
                 'better way', 'divana', 'harnn', 'scb', 'bjc', 'ptt', 'or', 'cp', 'jd', 'ai', 'one', 'go', 'ascend'}
CONTACTS_STATIC = [  # как в ручной презентации (контакты пользователя)
    {'type': 'email', 'text': 'info@globaltechtour.ru'},
    {'type': 'site', 'text': 'globaltechtour.ru'},
    None,  # телефон — с сайта
    {'type': 'whatsapp', 'text': 'WhatsApp: +79858744958'},
    None,  # telegram — с сайта
    {'type': 'wechat', 'text': 'WeChat: ostap10081987'},
]
QR = [{'label': 'Сайт', 'img': 'assets/qr-site.png'},
      {'label': 'TG @globaltechtour', 'img': 'assets/qr-tg-globaltechtour.png'},
      {'label': 'TG @ostapdotcenko', 'img': 'assets/qr-tg-ostapdotcenko.png'}]


# ---------------------------------------------------------------- бандл сайта
class JS:
    """Разбор JS-литералов (объекты, массивы, строки, числа) без выполнения кода."""
    NUM = re.compile(r'-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?')
    ID = re.compile(r'[A-Za-z_$][\w$]*')
    KEY = re.compile(r'[\w$]+')

    def __init__(self, s, i):
        self.s, self.i = s, i

    def ws(self):
        while self.s[self.i] in ' \t\r\n':
            self.i += 1

    def val(self):
        self.ws()
        s, i = self.s, self.i
        c = s[i]
        if c == '{':
            return self.obj()
        if c == '[':
            return self.arr()
        if c in '`"\'':
            return self.string()
        for lit, v in (('!0', True), ('!1', False), ('null', None), ('void 0', None), ('true', True), ('false', False)):
            if s.startswith(lit, i):
                self.i += len(lit)
                return v
        m = self.NUM.match(s, i)
        if m:
            self.i = m.end()
            t = m.group()
            return float(t) if ('.' in t or 'e' in t) else int(t)
        m = self.ID.match(s, i)
        if m:  # ссылка на переменную — значение неизвестно
            self.i = m.end()
            return None
        raise ValueError(f'неожиданно: {s[i:i + 30]!r}')

    def string(self):
        s, q = self.s, self.s[self.i]
        self.i += 1
        out = []
        while True:
            c = s[self.i]
            if c == '\\':
                n = s[self.i + 1]
                if n == 'u':
                    out.append(chr(int(s[self.i + 2:self.i + 6], 16)))
                    self.i += 6
                    continue
                out.append({'n': '\n', 't': '\t', 'r': ''}.get(n, n))
                self.i += 2
                continue
            if c == q:
                self.i += 1
                return ''.join(out)
            if q == '`' and s.startswith('${', self.i):
                raise ValueError('шаблонная строка')
            out.append(c)
            self.i += 1

    def obj(self):
        self.i += 1
        d = {}
        while True:
            self.ws()
            if self.s[self.i] == '}':
                self.i += 1
                return d
            if self.s[self.i] in '`"\'':
                k = self.string()
            else:
                m = self.KEY.match(self.s, self.i)
                self.i = m.end()
                k = m.group()
            self.ws()
            if self.s[self.i] != ':':
                raise ValueError('ожидалось «:»')
            self.i += 1
            d[k] = self.val()
            self.ws()
            if self.s[self.i] == ',':
                self.i += 1

    def arr(self):
        self.i += 1
        a = []
        while True:
            self.ws()
            if self.s[self.i] == ']':
                self.i += 1
                return a
            a.append(self.val())
            self.ws()
            if self.s[self.i] == ',':
                self.i += 1


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (GlobalTechTour presentation builder)'})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if binary else data.decode('utf-8')


def load_bundle(path=None):
    if path:
        return Path(path).read_text(encoding='utf-8'), str(path)
    page = fetch(SITE + '/')
    m = re.search(r'/assets/index-[\w-]+\.js', page)
    if not m:
        sys.exit('Не нашёл /assets/index-*.js на главной сайта')
    url = SITE + m.group()
    print('Бандл:', url, file=sys.stderr)
    return fetch(url), url


def parse_site(src):
    tours, comps = {}, {}
    for m in re.finditer(r'\{tour_id:', src):
        try:
            t = JS(src, m.start()).val()
            tours.setdefault(t['tour_id'], t)
        except Exception:
            pass
    for m in re.finditer(r'\{id:[`"\']', src):
        try:
            c = JS(src, m.start()).val()
        except Exception:
            continue
        if 'name_en' in c and 'desc_ru' in c:
            c['desc_ru'] = re.sub(r"(?<![\w'])'([^'\n]{2,60})'(?![\w'])", r'«\1»', c['desc_ru'] or '')  # 'Cimory Dairyland' → «…»
            comps.setdefault(c['id'], c)
    return tours, comps


# ---------------------------------------------------------------- русский язык
def plural(n, one, few, many):
    n = abs(int(n))
    if n % 10 == 1 and n % 100 != 11:
        return one
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return few
    return many


def cnt(n, one, few, many):
    return f'{n} {plural(n, one, few, many)}'


def parse_word(w):
    if not MORPH:
        return None
    ps = MORPH.parse(w)
    return ps[0] if ps else None


def inflect(word, grams):
    p = parse_word(word)
    if not p or ('Fixd' in p.tag and word[:1].isupper()):  # несклоняемое имя: «Абу-Даби» (не «абу-даби»)
        return word
    if '-' in word and word[:1].isupper() and not MORPH.word_is_known(word.lower()):
        return word  # «Абу-Даби», «Куала-Лумпур», «Нави-Мумбаи» — не «навях-мумбаях»
    q = p.inflect(set(grams))
    if not q:
        return word
    w = q.word
    if '-' in word and w.count('-') == word.count('-'):  # «Эр-Рияд» → «Эр-Рияде», регистр каждой части
        w = '-'.join(a[:1].upper() + a[1:] if b[:1].isupper() else a for a, b in zip(w.split('-'), word.split('-')))
    if word[:1].isupper():
        w = w[:1].upper() + w[1:]
    return w


def _city_case(city, case):
    """Склонение города; у составных («Куала-Лумпур», «Петалинг-Джая») — только последняя часть, регистр сохраняется."""
    if not MORPH or ' ' in city:
        return city
    head, dash, last = city.rpartition('-')
    if re.search(r'[иоуюэе]$', last.lower()):
        return city  # «в Мумбаи», «в Кулаи», «в Токио» — не склоняются
    return f'{head}{dash}{inflect(last, {case, "sing"})}'  # «Пенанг» без sing → «в Пенангах»


def loct(city):
    """Бангкок → в Бангкоке."""
    return _city_case(city, 'loct')


def gent(city):
    return _city_case(city, 'gent')


def is_verb(word):
    p = parse_word(word.strip('«»"(),.;:'))
    return bool(p and p.tag.POS in ('VERB',) and word[:1].islower())


def cap(s):
    return s[:1].upper() + s[1:] if s else s


def sentences(text):
    text = re.sub(r'\s+', ' ', text or '').strip()
    parts = re.split(r'(?<=[.!?])\s+(?=[А-ЯЁA-Z«"0-9])', text)
    out = []
    for p in parts:  # склеиваем ложные разрывы после инициалов и сокращений
        if out and (re.search(r'(?:\b(?:Co|Ltd|Inc|Sdn|Bhd|Dr|St|Mr|Mrs|д-р|т\.е|т\.д|им|преф|ул|р-н|обл|проф|акад)\.|(?:^|[\s.])[A-ZА-ЯЁ]\.)$', out[-1])
                    or out[-1].count('«') > out[-1].count('»')):  # точка внутри кавычек: «Shiseido. Global …»
            out[-1] += ' ' + p
        elif out and re.search(r'\b(?:ок|кв|гг?|долл|тыс|млн|млрд|трлн|руб|янв|февр?|апр|авг|сент?|окт|нояб?|дек)\.$', out[-1]) and re.match(r'\d', p):
            out[-1] += ' ' + p  # «ок. 24 млн», «II кв. 2026 г.», «с авг. 2025»
        elif (out and re.search(r'\bгг?\.$', out[-1]) and re.search(r'(?:основан|создан|запущен|открыт|учрежд)\w*[^.]*\bгг?\.$', out[-1])
              and re.match(r'(?:[A-ZА-ЯЁ][\w-]*\s){0,3}[A-ZА-ЯЁ][\w-]*(?:ом|ем|ём|ой|ей|ым|им)\b', p)):
            out[-1] += ' ' + p  # «основана в 2010 г. Чан Нгок Тхай Соном»
        else:
            out.append(p)
    return [p.strip() for p in out if p.strip()]


def strip_parens(s):
    return re.sub(r'(?<!\.)\.\.(?!\.)', '.', re.sub(r'\s*\([^()]*\)', '', s)).strip()  # «2011 г. (…).» → «2011 г.»


def end_dot(s):
    s = s.strip().rstrip(',;:—– ')
    return s if s.endswith(('.', '!', '?')) else s + '.'


def first_pos(word):
    p = parse_word(word.strip('«»"(),.;:'))
    return p.tag.POS if p else None


def bad_start(s):
    """Фраза не может начинаться с деепричастия/причастия/союза — это обрывок."""
    if re.match(r'(?:В том же|В тот же|Позже|Затем|Тогда|После этого|Кроме того|При этом|Там|Здесь)\b', s.strip()):
        return True  # ссылка на предыдущую фразу — вне контекста непонятно
    w = s.split()[0] if s.split() else ''
    if w.lower() in ('и', 'а', 'но', 'что', 'который', 'которая', 'которое', 'которые', 'чья', 'чей', 'где', 'включая', 'при', 'позволяя'):
        return True
    return first_pos(w) == 'GRND' or (first_pos(w) == 'PRTF' and w[:1].islower())


EN_STOPW = {'of', 'the', 'and', 'for', 'by', '&', 'a', 'an', 'in', 'at', 'to', 'on', 'de'}  # «… в Mall of the» — обрыв названия
COMPOUND_PREP = {('за', 'счёт'), ('за', 'счет'), ('в', 'составе'), ('на', 'основе'), ('на', 'базе'), ('в', 'рамках'), ('при', 'поддержке'),
                 ('с', 'помощью'), ('в', 'течение'), ('в', 'области'), ('по', 'данным'), ('в', 'сфере')}


def trim_tail(ws):
    """Обрезанная по словам фраза не кончается на «телеком-», «за счёт», «в составе»."""
    ws = list(ws)
    while len(ws) > 3:
        if ws[-1].endswith(('-', '–')):
            ws.pop()
        elif tuple(w.lower().strip(',') for w in ws[-2:]) in COMPOUND_PREP:
            ws = ws[:-2]
        else:
            break
    return ws


def clause_cuts(s, limit):
    """Варианты укорачивания фразы по границам частей (запятая, тире, «;», «:»), от длинного к короткому.
    Не режем посреди перечисления («комбикорма, животноводство, …»)."""
    s = s.strip()
    out = []
    if len(s) <= limit:
        out.append(s)
    bounds = list(re.finditer(r'[,;:]\s| — | – ', s))
    for k in range(len(bounds) - 1, -1, -1):
        m = bounds[k]
        head = s[:m.start()].strip()
        if not (25 <= len(head) <= limit):
            continue
        if head.count('(') != head.count(')') or head.count('«') != head.count('»'):
            continue
        prev = s[bounds[k - 1].end():m.start()] if k > 0 else head
        nxt_end = bounds[k + 1].start() if k + 1 < len(bounds) else len(s)
        nxt = s[m.end():nxt_end]
        if m.group().startswith(',') and (len(prev.split()) <= 2 or (len(nxt.split()) <= 3 and re.search(r'\sи\s', nxt + ' '))):
            continue  # перечисление
        if any(len(seg.split()) <= 1 for seg in re.split(r',\s', head)[1:]):
            continue  # «…, ставший, по данным …» — оборванная вставка
        if m.group().startswith(',') and nxt.split() and len(nxt.split()) <= 2 and not is_verb(nxt.split()[0]):
            continue  # «в страны Азии, Европы, …»
        lastw = head.split()[-1].strip('»"')
        if first_pos(lastw) in ('ADJF', 'PRTF', 'PREP', 'CONJ') and not re.match(r'[A-Z0-9]', lastw):
            continue  # «с игривым, ориентированным …»
        out.append(head)
    if not out:  # нет подходящей границы — режем по словам
        words, acc = s.split(), ''
        for w in words:
            if len(acc) + len(w) + 1 > limit:
                break
            acc = (acc + ' ' + w).strip()
        ws = trim_tail(acc.split())
        while len(ws) > 3 and (ws[-1].lower() in STOPW or ws[-1].lower() in EN_STOPW or first_pos(ws[-1]) in ('PREP', 'CONJ', 'ADJF', 'PRTF', 'PRCL', 'ADVB', 'NUMR')
                               or ws[-1].lower() in ('под', 'над', 'для', 'их', 'его', 'её', 'чем', 'которые', 'который')):
            ws.pop()
            ws = trim_tail(ws)
        out.append(' '.join(ws))
    res = []
    for o in out:
        if o not in res:
            res.append(o)
    return res


# ---------------------------------------------------------------- факты из описания компании
NUMRE = r'(\d{1,3}(?:[   ]\d{3})+|\d+(?:,\d+)?)'
MULT = r'(тыс\.|тысяч\w*|млн|млрд|трлн|крор\w*)'  # крор — индийские 10 млн (₹330 870 крор)
CUR = r'(бат\w*|долл\w*|евро|юан\w*|иен\w*|рупи\w*|вон\w*|дирхам\w*|ринггит\w*|донг\w*)'
AREA = r'(кв\.\s?м\.?|м²|кв\. метр\w*|квадратн\w+ метр\w*|гектар\w*|га\b|кв\.\s?фут\w*|квадратн\w+ фут\w*|акр(?:ов|а|ы)?\b)'


def area_unit(a):
    """Единица площади из текста: «кв. м» → «м²», «гектаров» → «га», «кв. футов» → «кв. футов», «акров» → «акров»."""
    a = a.lower()
    return 'га' if a.startswith(('га', 'гект')) else 'кв. футов' if 'фут' in a else 'акров' if a.startswith('акр') else 'м²'
APPROX = [('более чем в', '+'), ('более чем на', '+'), ('более чем', '+'), ('свыше', '+'), ('более', '+'), ('больше', '+'),
          ('не менее', '+'), ('превысила', '+'), ('превысили', '+'), ('превысило', '+'), ('превысил', '+'), ('превышает', '+'), ('превышают', '+'), ('около', '~'), ('почти', '~'), ('примерно', '~'),
          ('порядка', '~'), ('приблизительно', '~'), ('менее', '<'), ('до', 'до ')]
MONTHS = ['январ', 'феврал', 'март', 'апрел', 'ма', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр']
MONTH_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
MONTH_RX = r'(?:январ[яь]|феврал[яь]|марта?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|августа?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь])'
STOPW = {'в', 'во', 'на', 'и', 'с', 'со', 'по', 'к', 'о', 'у', 'от', 'до', 'из', 'за', 'при', 'через', 'как', 'а', 'но',
         'или', 'что', 'это', 'среди', 'после', 'перед', 'между', 'под', 'над', 'без', 'включая', 'также', 'против',
         'вокруг', 'внутри', 'вне', 'благодаря', 'около', 'свыше', 'более', 'почти', 'чем', 'года', 'году', 'год',
         'примерно', 'порядка', 'приблизительно', 'уже', 'ещё', 'еще', 'всего', 'только', 'лишь', 'же', 'ли'}
ICON_STEMS = [
    (r'магазин|точ[ек]|точк|филиал|кофейн|аптек|бутик|киоск|отделени|супермаркет|гипермаркет|ресторан', 'store'),
    (r'пользовател|клиент|сотрудник|курьер|человек|специалист|посетител|партн[её]р|пациент|подписчик|покупател|участник|врач|бариста|дата-сайентист', 'users'),
    (r'стран|провинц|рынк|регион|город|штат', 'globe'),
    (r'завод|предприяти|площадк|фабрик|центр|клиник|больниц|кухн|склад|лаборатор|площад|м²', 'building'),
    (r'проект|контракт|сделк|организац|компани|стартап', 'briefcase'),
    (r'заказ', 'cart'),
    (r'позици|товар|продукт|SKU|бренд|упаков', 'package'),
]
TOP_BAD = ('подобн', 'мест', 'крупн', 'так', 'ден', 'раз', 'этап', 'квартал', 'год', 'половин', 'поток', 'шаг', 'магазин', 'сезон', 'выпуск',
           'точк', 'филиал', 'зал', 'офис', 'этаж')
SIGNIF = r'крупнейш|лидер|перв(?:ый|ая|ое|ым|ой|ую)\b|№\s?\d|ведущ|доминир|пионер|культов|старейш|единствен|флагман|топ-|место\b|место в|одн\w+ из'
ACTIVITY = (r'управля|развива|разрабатыва|производ|выпуска|владеет|специализир|обслужива|объединя|созда[её]т|предлага|'
            r'работает|занима|контролир|поставля|связывает|делает ставку|выросл|является|позиционир|насчитыва|удержива')


def num_value(raw, sign, mult='', unit='', money_cur=''):
    n = raw.replace(' ', ' ').replace(' ', ' ')
    if re.fullmatch(r'\d{4}', n):
        pass
    elif re.fullmatch(r'\d{5,}', n):
        n = f'{int(n):,}'.replace(',', ' ')
    v = n
    if mult:
        v += ' ' + ('тыс.' if mult.startswith('тыс') else 'крор' if mult.startswith('крор') else mult)
    if unit:
        v += ' ' + unit
    if money_cur:
        if money_cur == '₹' or (money_cur.startswith('рупи') and mult.startswith('крор')):  # индийская рупия: «₹4744 крор»
            v = '₹' + v
        elif money_cur.startswith(('долл', '$')):
            v = '$' + v
        elif money_cur.startswith('евро'):
            v = '€' + v
        else:
            v += ' ' + ('бат' if money_cur.startswith('бат') else money_cur)
    if sign == '+':
        v = (v + '+') if not mult and not money_cur and not unit else v.replace(n, n + '+', 1)
    elif sign == '~':
        v = '~' + v
    elif sign:
        v = sign + v
    return v


def np_after(text, i=0, max_words=4):
    """Именная группа после позиции i: слова до знака препинания, предлога или глагола."""
    m = re.match(r'\s*([^.,;:()—–\n]*)', text[i:])
    words = m.group(1).split() if m else []
    out = []
    for w in words:
        lw = w.lower()
        if out and (lw in STOPW or re.match(r'^(?:19|20)\d\d', lw) or re.match(r'^\d', lw) or is_verb(w) or first_pos(w) in ('GRND', 'PRTS', 'INFN')):
            break
        if not out and (lw in STOPW or is_verb(w)):
            return []
        out.append(w.strip('«»"'))
        if len(out) >= max_words:
            break
    while out and (out[-1].lower() in STOPW or out[-1].lower() in ('для',)):
        out.pop()
    return out


def agree(words, n_for_agree, plus):
    """«в 135 магазинах» → «магазинов»: слова в форму, согласованную с числом."""
    if not MORPH or not words:
        return words
    res = []
    changed = False
    for k, w in enumerate(words):
        p = parse_word(w)
        if not p or not w[:1].islower() or p.tag.POS not in ('NOUN', 'ADJF', 'PRTF'):
            if k == 0:
                return words
            res.extend(words[k:])
            return res
        case = p.tag.case
        if k == 0 and case == 'gent':
            return words
        if k == 0 and case == 'nomn' and not plus:
            return words
        if case == 'gent' and changed and p.tag.POS == 'NOUN' and res and parse_word(res[-1]) and parse_word(res[-1]).tag.POS == 'NOUN':
            res.extend(words[k:])
            return res
        if plus or n_for_agree % 10 in (0, 5, 6, 7, 8, 9) or 11 <= n_for_agree % 100 <= 14:
            q = p.inflect({'gent', 'plur'})
        elif n_for_agree % 10 in (2, 3, 4):
            q = p.inflect({'gent', 'sing'}) if p.tag.POS == 'NOUN' else p.inflect({'gent', 'plur'})
        else:
            q = p.inflect({'nomn', 'sing'})
        res.append(q.word if q else w)
        changed = True
        if p.tag.POS == 'NOUN':  # дальше — зависимые слова в своём падеже
            res.extend(words[k + 1:])
            return res
    return res


def _infl_word(w, grams):
    """Склонение слова; у слов через дефис («ИИ-ассистента», «масс-брендом») склоняется последняя часть."""
    if '-' in w:
        head, _, last = w.rpartition('-')
        if re.fullmatch(r'[а-яё]+', last):
            q = _infl_word(last, grams)
            return f'{head}-{q}' if q else None
        return None
    ps = MORPH.parse(w.lower())
    if not ps or not MORPH.word_is_known(w.lower()):
        return None
    q = ps[0].inflect(set(grams))
    return q.word if q else None


def _pos(w):
    last = w.rpartition('-')[2] if '-' in w else w
    p = parse_word(last.lower())
    return p.tag.POS if p else None


def nomn_phrase(words):
    """Прилагательные + первое существительное — в именительный падеж: «долю рынка» → «доля рынка»."""
    if not MORPH or not words:
        return words
    res = list(words)
    head = None
    for k, w in enumerate(words):
        pos = _pos(w)
        if pos == 'NOUN':
            head = k
            break
        if pos not in ('ADJF', 'PRTF', 'ADVB'):
            return words
    if head is None:
        return words
    hw = words[head].rpartition('-')[2].lower()
    parses = [p for p in MORPH.parse(hw)[:4] if p.tag.POS == 'NOUN']
    nums = {p.tag.number for p in parses}
    num = 'sing' if 'sing' in nums else 'plur'
    gender = next((p.tag.gender for p in parses if p.tag.gender), None)
    q = _infl_word(words[head], {'nomn', num})
    if q:
        res[head] = q
    for j in range(head):
        if _pos(words[j]) in ('ADJF', 'PRTF'):
            if res[head] == words[head] and any(p.tag.case == 'nomn' and p.tag.POS in ('ADJF', 'PRTF')
                                                for p in MORPH.parse(words[j].rpartition('-')[2].lower())[:3]):
                continue  # уже именительный («полноценный франчайзинговый конбини») — род не трогаем
            g = {'nomn', num} | ({gender} if num == 'sing' and gender else set())
            qj = _infl_word(words[j], g)
            if qj:
                res[j] = qj
    if words[0][:1].isupper():
        res[0] = res[0][:1].upper() + res[0][1:]
    return res


def label_variants(words, limit=40):
    """Подпись к цифре: целиком → без первого прилагательного → короче с конца → без прилагательных."""
    words = [w for w in words if w]
    if not words:
        return ['']
    out = [' '.join(words)]
    if MORPH and len(words) > 2 and words[0][:1].islower() and _pos(words[0]) in ('ADJF', 'PRTF'):
        out.append(' '.join(words[1:]))
    for n in range(len(words) - 1, 0, -1):
        cut = words[:n]
        while cut and (cut[-1].lower() in STOPW or _pos(cut[-1]) in ('ADJF', 'PRTF', 'ADVB', 'PREP', 'CONJ')):
            cut = cut[:-1]
        if cut:
            out.append(' '.join(cut))
    if MORPH and len(words) > 1:
        keep = [w for k, w in enumerate(words)
                if not (w[:1].islower() and _pos(w) in ('ADJF', 'PRTF', 'ADVB') and k < len(words) - 1)]
        out.append(' '.join(keep))
    res = []
    for o in out:
        if o and o not in res:
            res.append(o)
    good = [o for o in res if len(o) <= limit]
    return good + [o for o in res if o not in good]


def year_phrase(clause):
    """«по состоянию на май 2025 года» → «по состоянию на май 2025»; «в 2024 году» → «2024 год»."""
    m = re.search(r'(по состоянию на|по данным на|по данным|к|с|на|до)?\s*(?:(\d{1,2})\s+)?(' + MONTH_RX + r')?\s*((?:19|20)\d\d)(\s*(?:году|года|год|г\.)|-м|-го)?', clause, re.I)
    while m and not (m.group(1) or m.group(3) or m.group(5)):
        m = re.search(r'(по состоянию на|по данным на|по данным|к|с|на|до)?\s*(?:(\d{1,2})\s+)?(' + MONTH_RX + r')?\s*((?:19|20)\d\d)(\s*(?:году|года|год|г\.)|-м|-го)?', clause[m.end():], re.I) if m else None
        if m is None:
            break
    if not m:
        return ''
    pre, mon, year = (m.group(1) or '').lower(), m.group(3), m.group(4)
    if mon:
        idx = next((i for i, st in enumerate(MONTHS) if mon.lower().startswith(st)), None)
        mon_n = MONTH_NOM[idx] if idx is not None else mon
        return f'{pre + " " if pre and pre.startswith("по") else ""}{mon_n} {year}'.strip()
    if pre in ('к', 'с', 'до'):
        return f'{pre} {year} года' if pre in ('с', 'до') else f'к {year} году'  # «инвестиции … до 2026 года»
    if pre.startswith('по'):
        return f'{pre} {year}'
    return f'{year} год'


def icon_for(label):
    for rx, ic in ICON_STEMS:
        if re.search(rx, label, re.I):
            return ic
    return 'chart'


def in_parens(sent, pos):
    return sent[:pos].count('(') > sent[:pos].count(')')


def extract_facts(desc, names=()):
    """Факты из описания: числа с подписью, «№1/первый», год основания, названия брендов и платформ, биржа."""
    text = re.sub(r'\s+', ' ', desc or '').strip()
    text = re.sub(r'\bRM\s?(?=\d)', 'RM ', text)  # «RM355 млн» — ринггиты перед числом, как «$»
    text = re.sub(r'\bAED\s?(?=\d)', 'AED ', text)  # «AED 5,4 млрд» — дирхамы ОАЭ перед числом
    facts = []
    sents = sentences(text)
    lname = [n.lower() for n in names if n]

    def add(kind, value, label_words, sub, icon, pos, prio):
        if not value:
            return
        labels = label_variants(label_words) if isinstance(label_words, list) else [label_words]
        facts.append({'kind': kind, 'value': value.strip().rstrip('.,;:'), 'labels': labels,
                      'subs': [s for s in (sub if isinstance(sub, list) else [sub]) if s], 'icon': icon, 'pos': pos, 'prio': prio})

    gpos = 0
    for si, sent in enumerate(sents):
        base = gpos
        gpos += len(sent) + 1
        subj_is_company = si == 0 or any(sent.lower().startswith(n) for n in lname) or re.match(r'(Компания|Сеть|Бренд|Группа|Клиника|Сервис|Платформа)\b', sent)
        # --- числа
        for m in re.finditer(r'([$₹]\s?|RM |AED )?(?<![\w.,/–×-])(?<!\d[ \u00a0\u202f])' + NUMRE + r'(\+)?(?![.,]\d|[/–×-]\d|\d|-[а-я]|[A-Za-zА-Яа-я])', sent):
            if in_parens(sent, m.start()) and not re.search(r'%|' + MULT + '|' + AREA, sent[m.end():m.end() + 14]):
                continue
            raw = m.group(2)
            after = sent[m.end():]
            before = sent[:m.start()]
            digits = raw.replace(' ', '').replace(' ', '').replace(' ', '')
            if re.fullmatch(r'(19|20)\d\d', digits) and not re.match(r'\s*(%|' + MULT + r'|' + CUR + r')', after):
                continue
            if re.match(r'\s*' + MONTH_RX, after, re.I) or re.match(r'-', after):
                continue
            if re.search(r'(?:версии|версия|v|Series|раунд\w*|№)\s*$', before, re.I):
                continue
            if re.match(r'\s*(?:мл|г|кг|см|мм|м|км|ч|час\w*|мин\w*|сек\w*|дн\w*|дней|недел\w*|месяц\w*|лет|года?|раз\w*)\b', after):
                continue
            if re.search(r'(?:уступая|опережая|после|чем у|в отличие от)\b', before) or re.search(r'(запланирован\w*|планиру\w*|план\w*|цел\w*)\s*$', before):
                continue
            mm = re.match(r'\s*' + MULT, after)
            mult = mm.group(1) if mm else ''
            aft2 = after[mm.end():] if mm else after
            plus2 = bool(mm and aft2.startswith('+'))  # «135 млн+ единиц»
            if plus2:
                aft2 = aft2[1:]
            am = re.match(r'\s*' + AREA, aft2)
            unit = area_unit(am.group(1)) if am else ''
            if am:
                aft2 = aft2[am.end():]
            cm = re.match(r'\s*' + CUR, aft2) or re.match(r'\s*(\$)(?!\w)', aft2)  # «около 35 млрд $»
            cur = cm.group(1) if cm else ''
            aft3 = aft2[cm.end():] if cm else aft2
            if cur.startswith('дирхам'):
                aft3 = re.sub(r'^\s*ОАЭ\b', '', aft3)  # «305 млрд дирхамов ОАЭ»
            pct = re.match(r'\s*%', aft2)
            if m.group(1):
                cur = cur or ('₹' if '₹' in m.group(1) else 'ринггитов' if m.group(1).startswith('RM') else 'дирхамов' if m.group(1).startswith('AED') else 'долл')
            sign = '+' if m.group(3) or plus2 else ''
            for word, sg in APPROX:
                if re.search(r'(?:^|\s)' + word + r'\s*$', before, re.I):
                    sign = sign or sg
                    break
            cs = max(before.rfind(','), before.rfind(';'), before.rfind('('), before.rfind(' — '), before.rfind(':'))
            ce = min([x for x in (after.find(','), after.find(';'), after.find(')'), after.find(' — ')) if x >= 0] + [len(after)])
            clause = sent[cs + 1: m.end() + ce]
            # год к цифре: сначала после неё («67,8% рынка … на конец 2024 года»), иначе вся часть фразы («основанная в 2003 году и …»)
            yphr = year_phrase(sent[m.end(): m.end() + ce]) or year_phrase(clause)
            try:
                nval = float(digits.replace(',', '.'))
            except ValueError:
                nval = 0
            if pct:
                after_pct = re.sub(r'^-(?:ное|ный|ная|ным|ной|ную)\b', '', aft2[pct.end():])  # «100%-ное иностранное владение»
                words = np_after(after_pct, 0, 4)
                if not words or after_pct.strip().startswith((')', ',')):
                    pre = re.sub(r'\(\s*(?:около|свыше|более|почти|примерно)?\s*$', '', before).strip()
                    seg = re.split(r',\s|[;(—]', pre)[-1]  # «$1,5 млрд» — запятая внутри числа не граница
                    dm = re.search(r'\bдол(?:[яеию]|ей)\b', seg)
                    pw = re.findall(r'[\w-]+', seg)
                    growth = False
                    while pw and (pw[-1].lower() in STOPW or pw[-1].lower() in ('её', 'его', 'их') or is_verb(pw[-1])
                                  or first_pos(pw[-1]) in ('PREP', 'CONJ')):
                        growth = growth or bool(re.match(r'(?:вырос|увеличил)', pw[-1].lower()))
                        pw = pw[:-1]  # «доля рынка достигла» → «доля рынка»
                    k = max([i + 1 for i, w in enumerate(pw) if re.search(r'\d', w) or is_verb(w) or first_pos(w) == 'GRND'] + [0])
                    pw = pw[k:][-4:]  # «вложила $1,5 млрд и получила», «сократив ручной труд на 90%» — не подпись
                    while pw and (pw[0].lower() in STOPW or pw[0].lower() in ('её', 'его', 'их') or is_verb(pw[0])
                                  or re.fullmatch(MULT + '|' + CUR, pw[0].lower() + ('.' if pw[0] == 'тыс' else ''))
                                  or first_pos(pw[0]) in ('PREP', 'CONJ')):  # «67 млн евро с увеличением мощности до 50%»
                        pw = pw[1:]
                    if dm:  # «крупнейшую долю рынка доставки еды (около 47%)» → «доля рынка доставки еды»
                        take = []
                        for w in re.findall(r'[\w-]+', seg[dm.start():]):
                            if is_verb(w) or w.lower() in STOPW or re.search(r'\d', w) or len(take) >= 4:
                                break
                            take.append(w)
                        words = (nomn_phrase(take) or ['доля', 'рынка']) if 'рынк' in ' '.join(take) else (['доля', 'рынка'] if 'рынк' in seg else ['доля'])
                    else:
                        words = nomn_phrase(pw)
                        if words and pw and seg.strip() == pre and re.fullmatch(r'[А-ЯЁ][а-яё-]+', words[0]) and not (
                                MORPH and {'Name', 'Surn', 'Geox', 'Orgn', 'Trad'} & set(map(str, MORPH.parse(words[0])[0].tag.grammemes))):
                            words = [words[0].lower()] + words[1:]  # начало предложения: «Консолидированный GMV» → «консолидированный GMV»
                        if growth and MORPH and words and len(words) <= 3 and all(_pos(w) in ('NOUN', 'ADJF', 'PRTF', None) for w in words):
                            words = ['рост'] + [_infl_word(w, {'gent'}) or w for w in words]  # «Выручка выросла на 26%» → «рост выручки»
                if not words:
                    continue
                v = {'~': '~', 'до ': 'до ', '<': '<'}.get(sign, '') + raw + '%' + ('+' if sign == '+' else '')
                weak = MORPH and all(_pos(w) in ('ADJF', 'PRTF') for w in words)
                if weak:
                    prev = [f for f in facts if f['kind'] == 'count' and base <= f['pos'] < base + m.start()]
                    if prev:
                        noun = prev[-1]['labels'][0].split()[-1]
                        words = words + [noun]
                        weak = False
                add('pct', v, words, [yphr], 'trending', base + m.start(), 6 if weak else 1)
                continue
            if cur:
                v = num_value(raw, sign if sign in ('+', '~') else '', mult, '', cur)
                ctx = before[-80:].lower()
                folw = ' '.join(np_after(aft3, 0, 2)).lower()
                best, lab = -1, None
                for rx, lb in [(r'выручк|доход|продаж', 'выручка'), (r'капитализац', 'капитализация'), (r'оцен', 'оценка компании'),
                               (r'убыт', 'убытки'), (r'привлек|раунд|series|посевн', 'привлечено инвестиций'),
                               (r'инвест|вложи|вложен', 'инвестиции'), (r'продал|сделк|приобр\w+ компани|куплен', 'сумма сделки'),
                               (r'оборот', 'оборот'), (r'\bgmv\b', 'GMV'), (r'\bактив', 'активы'),
                               (r'стоимост|модернизац', 'стоимость проекта'), (r'прибыл', 'прибыль')]:
                    for mm2 in re.finditer(rx, ctx):
                        if mm2.start() > best:
                            best, lab = mm2.start(), lb
                if not lab and re.search(r'\bipo\s+(?:на|объ[её]мом)\s+(?:около\s+|примерно\s+|свыше\s+|более\s+)?$', ctx):
                    lab = 'объём IPO'  # «провела IPO на ₹1701 крор»
                if folw.startswith('инвестиц') and lab not in ('привлечено инвестиций',):
                    lab = 'инвестиции'
                if lab and re.search(r'цел', ctx[-60:]):
                    lab = {'выручка': 'цель по выручке'}.get(lab, lab)
                if not lab:
                    w = np_after(aft3, 0, 3)
                    lab = ' '.join(w) if w else ''
                if not lab:
                    continue
                win = re.split(r'\d', aft3, maxsplit=1)[0][:60]
                sm = re.search(r'(?:раунд\w*\s+)?Series\s+[A-F](?:\s+extension)?', win)
                if sm:
                    sub = 'раунд ' + re.sub(r'^раунд\w*\s+', '', sm.group(0))
                elif re.search(r'посевн', win):
                    sub = 'посевной раунд'
                elif re.match(r'\s*за\s+(\d)-й\s+квартал', aft3):
                    sub = 'за ' + re.match(r'\s*за\s+(\d-й\s+квартал)', aft3).group(1)
                elif re.match(r'\s*за\s+\w+\s+раунд', aft3):
                    sub = re.match(r'\s*(за\s+\w+\s+раунд\w*)', aft3).group(1)
                else:
                    sub = ''
                yp = yphr
                if yp and yp not in sub:
                    sub = f'{sub}, {yp}' if sub else yp
                add('money', v, lab, [sub], 'chart' if lab in ('выручка', 'капитализация', 'убытки', 'прибыль', 'цель по выручке') else 'briefcase', base + m.start(), 1)
                continue
            # счётные величины
            words = np_after(aft2, 0, 4)
            if not words and unit:  # «525 тыс. м² торговых площадей» / «занимают 20 000 м²»
                words = ['площадь']
            pre_label = False
            if not words and mult and not re.search(r'\bпри\b', ' '.join(before.split()[-4:])):  # «аудитория оценивается свыше 50 млн»
                pre_label = True
                pw = re.findall(r'[\w-]+', re.split(r'[,;:(—]', before)[-1])
                pw = [w for w in pw if not (w.lower() in STOPW or is_verb(w) or first_pos(w) in ('PREP', 'CONJ', 'ADVB', 'PRTS'))][-2:]
                if pw and first_pos(pw[0]) in ('NOUN', 'ADJF'):
                    words = nomn_phrase(pw)
            if not words:
                continue
            w0 = words[0].lower()
            if w0 in ('лет', 'года', 'год', 'летнего', 'летия', 'раз', 'процентов', 'человек') and w0 != 'человек':
                continue
            p0 = parse_word(words[0])
            if MORPH and p0 and p0.tag.POS not in ('NOUN', 'ADJF', 'PRTF') and not re.match(r'[A-Z]', words[0]):
                continue
            if not mult and not unit and nval < 2:
                continue
            n_ag = int(nval) if nval == int(nval) else 5
            words2 = agree(words, n_ag, sign == '+' or bool(mult)) if not (unit or pre_label) else words
            v = num_value(raw, sign if sign in ('+', '~', 'до ') else '', mult, unit)
            weak = MORPH and all(first_pos(w) in ('ADJF', 'PRTF') for w in words2)
            add('count', v, words2, [yphr], 'building' if unit else icon_for(' '.join(words2)), base + m.start(), 6 if weak else 1)
        # --- «№1», «второе место»
        for m in re.finditer(r'([\w-]+)\s+№\s?(\d+)(\s+(?:в|во)\s+[А-ЯЁ][\w-]+)?(\s+по\s+[^,.;()]{3,30})?', sent):
            pw = nomn_phrase([m.group(1)]) if m.group(1)[:1].islower() else [m.group(1)]
            add('top', f'№{m.group(2)}' + (m.group(3) or ''), pw, [(m.group(4) or '').strip()], 'trending', base + m.start(), 2)
        for m in re.finditer(r'(перв|втор|трет)\w+\s+мест\w*\s*(в мире|в Таиланде|в стране|в Азии|в АСЕАН|в регионе)?(\s+по\s+[^,.;()—]{3,40})?', sent):
            n = {'перв': 1, 'втор': 2, 'трет': 3}[m.group(1)]
            scope = m.group(2) or ''
            by = (m.group(3) or '').strip()
            if not by:
                pm = re.search(r'(?:^|,\s*)(По\s+[^,]{3,40}?)\s+[\w-]+\s+[\w-]+\s+(?:в\s+[А-ЯЁ]\w+\s+)?занима\w*\s*$', sent[:m.start()])
                by = pm.group(1)[0].lower() + pm.group(1)[1:] if pm else ''
            if not by and not scope:
                continue
            add('top', f'№{n}' + (f' {scope}' if scope else ''), by or 'по рейтингу', [], 'trending', base + m.start(), 2)
        # --- «первый / крупнейший / единственный»
        for m in re.finditer(r'\b(перв(?:ый|ая|ое|ым|ой|ую)|крупнейш(?:ий|ая|ее|им|ей|ую)|единственн(?:ый|ая|ым|ой))\s+'
                             r'(?:(в мире|в Таиланде|в стране|в Азии|в АСЕАН|в Юго-Восточной Азии|в регионе|в Японии|в Китае|во Вьетнаме|в Индии|в Индонезии|в Малайзии|в Корее|в ОАЭ)\s+)?'
                             r'([^.,;:()—]{3,60})', sent):
            w0, scope, rest = m.group(1).lower(), m.group(2) or '', m.group(3)
            before = sent[:m.start()]
            if re.search(r'(?:одн\w+\s+из|в\s+числ\w+|из|среди)\s*$', before) or in_parens(sent, m.start()) or not subj_is_company:
                continue
            p = parse_word(w0)
            if MORPH and p and p.tag.case not in ('nomn', 'ablt', 'accs'):
                continue
            if MORPH and p and p.tag.case == 'ablt' and not re.search(r'(?:стал\w*|являе\w*|являл\w*|оставаясь|остаётся|остается|признан\w*|назван\w*|считается)\s+(?:\S+\s+)?$', before):
                continue  # «основанная X — единственным инструктором» — это про основателя
            words = np_after(rest, 0, 4)
            if not words or words[0].lower().startswith(TOP_BAD):
                continue
            if MORPH and words and first_pos(words[0]) not in ('NOUN', 'ADJF', 'PRTF', 'ADVB'):
                continue
            words = nomn_phrase(words)
            head = next((parse_word(w) for w in words if parse_word(w) and parse_word(w).tag.POS == 'NOUN'), None)
            if head and head.word.startswith(TOP_BAD):
                continue
            g = head.tag.gender if head else ''
            p0 = parse_word(w0)
            if p0 and p0.tag.gender and p0.tag.number != 'plur':
                g = p0.tag.gender
            if w0.startswith('перв'):
                val = {'femn': 'Первая', 'neut': 'Первое'}.get(g, 'Первый')
            elif w0.startswith('единств'):
                val = {'femn': 'Единственная', 'neut': 'Единственное'}.get(g, 'Единственный')
            else:
                val = '№1'
            if scope:
                val = f'{val} {scope}'
            add('top', val, words, [], 'trending' if val.startswith('№') else 'star', base + m.start(), 2)
        for m in re.finditer(r'\bодн\w+\s+из\s+(двух|трёх|трех|пяти|десяти|\d+)\s+(крупнейш\w+|ведущ\w+)\s+([^.,;:()—]{3,60})', sent):
            n = {'двух': 2, 'трёх': 3, 'трех': 3, 'пяти': 5, 'десяти': 10}.get(m.group(1), m.group(1))
            words = np_after(m.group(3), 0, 4)
            if words:
                add('top', f'Топ-{n}', words, [], 'trending', base + m.start(), 2)
        # --- год основания / запуска (только про саму компанию)
        for m in re.finditer(r'(?i)(основан\w*|учрежд\w*|созда\w*|запущен\w*|запуст\w*|открыл\w*|открыт\w*|образован\w*|зарегистрирован\w*|появил\w*|вышедш\w*|вышл\w*|вышел)'
                             r'([^.;]{0,45}?)\b((?:19|20)\d\d)(?:\s*(?:году|года|год|г\.)|-м)?', sent):
            verb, mid, year = m.group(1).lower(), m.group(2), m.group(3)
            if re.search(r'\d{4}', mid) or in_parens(sent, m.start()):
                continue
            pv = parse_word(verb)
            if MORPH and pv and pv.tag.POS not in ('VERB', 'PRTS') and (pv.tag.case not in ('nomn', None) or m.start() > 80):
                continue
            if not subj_is_company or (si == 0 and m.start() > 120 and not sent.lower().startswith(tuple(lname))):
                continue
            if verb.startswith(('вышедш', 'вышл', 'вышел')):
                if not re.search(r'бирж|IPO|Nasdaq|NYSE', mid):
                    continue
                lab = 'IPO на бирже'
            else:
                lab = {'основ': 'год основания', 'учреж': 'год основания', 'созда': 'год создания', 'запущ': 'год запуска', 'запус': 'год запуска',
                       'откры': 'год открытия', 'образ': 'год образования', 'зарег': 'год регистрации', 'появи': 'год появления'}.get(verb[:5], 'год основания')
            tail = sent[m.end():]
            sm = re.match(r'\s*,?\s*((?:в|во|со штаб-квартирой в)\s+[А-ЯЁA-Z][\w-]+(?:\s+[А-ЯЁA-Z][\w-]+)?)', tail)
            sub = sm.group(1) if sm else ''
            if sub and MORPH:  # «в Бангкоке Ти» → только город
                ws = sub.split()
                while len(ws) > 2 and (first_pos(ws[-1]) != 'NOUN' or len(ws[-1]) <= 3):
                    ws.pop()
                if len(ws) > 2:
                    pl = parse_word(ws[-1])
                    if pl and 'Name' in str(pl.tag) or (pl and pl.tag.case == 'ablt'):
                        ws.pop()
                sub = ' '.join(ws)
            if not sub:
                dm = re.search(r'(\d{1,2})\s+(' + MONTH_RX + r')\s*$', mid)
                if dm:
                    sub = f'{dm.group(1)} {dm.group(2)} {year} года'
            if not sub:
                sm = re.search(r'\bв\s+([А-ЯЁ][\w-]+е)\b', mid)
                sub = f'в {sm.group(1)}' if sm else ''
            add('year', year, lab, [sub], 'flag', base + m.start(), 3)
        # --- названия брендов / платформ / моделей
        for m in re.finditer(r'(?:([А-ЯЁа-яё-]+)\s+)?\b((?i:бренд\w*|агрегатор\w*|мессенджер\w*|логистик\w*|соцкоммерци\w*|линейк\w+|платформ\w+|приложени\w+|модел\w+|сервис\w*|кошел[её]к\w*|кошельк\w*|'
                             r'программ\w+|формат\w*|технологи\w+|систем\w+|проект\w*|суббренд\w*|маркетплейс\w*|стратеги\w+|'
                             r'ассистент\w*|супер-апп\w*|акселератор\w*|инкубатор\w*|тест\w*|сет[ьи]))\s+'
                             r'(?:под (?:брендом|названием)\s+)?«?([A-Z][\w&+\'’.!-]*(?:\s+(?:[A-Z0-9][\w&+\'’.!-]*|of|the|by|for|&))*)»?', sent):
            adj, kw, name = m.group(1), m.group(2), m.group(3).strip().rstrip('.')
            if len(name) < 2 or name.upper() in ('NYSE', 'SE', 'COVID-19', 'IPO', 'USA', 'NSF', 'FDA', 'AI', 'DNA', 'LLM', 'ML', 'AWS'):
                continue
            pk = parse_word(kw)
            if MORPH and pk and (pk.tag.case not in ('nomn', 'accs', 'ablt') or pk.tag.number == 'plur'):
                continue
            nw = name.split()
            while nw and nw[-1] in ('of', 'the', 'by', 'for', '&'):
                nw.pop()
            name = ' '.join(nw[:4])
            if any(name.lower() == n or name.lower() in n.split() or name.lower() in n for n in lname if len(name) >= 3) or name.lower() in lname:
                continue
            lab = (inflect(kw.lower(), {'nomn', 'sing'}) if MORPH else kw).lower()
            adj = adj.lower() if adj else adj
            if adj and MORPH and first_pos(adj) == 'ADJF':
                pa = parse_word(adj)
                pkw = parse_word(lab)
                qa = pa.inflect({'nomn', 'sing'} | ({pkw.tag.gender} if pkw and pkw.tag.gender else set()))
                if qa:
                    lab = f'{qa.word} {lab}'
            tail = sent[m.end():]
            sm = re.match(r'\s*(?:\([^)]*\)\s*)?(?:—|–)\s*([^.;:()]+)', tail)
            sub = clause_cuts(sm.group(1).strip(), 34)[0] if sm else ''
            if len(sub) > 36:
                sub = ''
            k5 = kw[:5].lower()
            ic = {'платф': 'smartphone', 'прило': 'smartphone', 'кошел': 'smartphone', 'кошел': 'smartphone', 'модел': 'cpu',
                  'ассис': 'cpu', 'серви': 'smartphone', 'марке': 'cart', 'тест': 'target', 'техно': 'cpu', 'систе': 'cpu',
                  'страт': 'target', 'сеть': 'store', 'сети': 'store', 'супер': 'smartphone'}.get(k5, 'star')
            add('name', name, lab, [sub], ic, base + m.start(), 4)
        # --- запуски/внедрения: «внедрила Copilot для Microsoft 365», «запущено подразделение AXTRA Digital»
        for m in re.finditer(r'\b(запустил\w*|запущен\w*|внедрил\w*|создал\w*|разработал\w*)\s+(?:[а-яё-]+\s+){0,2}«?([A-Z][\w&+.\'’-]*(?:\s+[A-Z0-9][\w&+.\'’-]*){0,3})»?', sent):
            if in_parens(sent, m.start()):
                continue
            name = m.group(2).strip()
            if len(name) < 3 or any(name.lower() == n for n in lname) or any(name == f['value'] for f in facts):
                continue
            lab = {'запус': 'запуск', 'запущ': 'запуск', 'внедр': 'внедрение', 'созда': 'создание', 'разра': 'разработка'}[m.group(1)[:5].lower()]
            tail = sent[m.end():]
            sm = re.match(r'\s+((?:для|с|на базе|совместно с)\s+[^,.;:()—]{3,30})', tail)
            sub = sm.group(1) if sm else year_phrase(sent[max(0, m.start() - 40):m.start()])
            add('name', name, lab, [sub], 'star', base + m.start(), 4)
        # --- «запустило «Tops Chef Bot» — ИИ-ассистента …»
        for m in re.finditer(r'«([A-Z][^»]{1,28})»\s*—\s*([^,.;:()]{3,60})', sent):
            name = m.group(1)
            if any(f['value'] == name for f in facts):
                continue
            words = np_after(m.group(2), 0, 3)
            if words:
                add('name', name, nomn_phrase(words), [], 'star', base + m.start(), 4)
        # --- партнёры
        for m in re.finditer(r'(?:совместно с|в партн[её]рстве с|партн[её]рство с|партн[её]р(?:ом)?)\s+([A-Z][\w&.\'’-]*(?:\s+[A-Z][\w&.\'’-]*){0,2})', sent):
            name = m.group(1)
            if any(name.lower() in n for n in lname):
                continue
            add('partner', name, 'партнёр', [], 'handshake', base + m.start(), 5)
        # --- специализация: «специализирующаяся на anti-age и регенеративной медицине»
        for m in re.finditer(r'(?:специализирующ\w*|специализируется|специализация)\s+на\s+([^.;:(,]+(?:,[^.;:(,]+)*)', sent):
            items = re.split(r',\s*|\s+и\s+', m.group(1))
            for item in items[:3]:
                ws = item.split()
                if not ws:
                    continue
                lm = re.match(r'[A-Za-z][A-Za-z0-9+]*(?:-[A-Za-z0-9+]+)*', ws[0])
                if lm:
                    val = lm.group(0)
                else:
                    ph = []
                    for w in ws[:3]:
                        ph.append(w)
                        if _pos(w) == 'NOUN':
                            break
                    if len(ph) < 2 or _pos(ph[-1]) != 'NOUN':
                        continue
                    val = ' '.join(nomn_phrase(ph))
                val = cap(val)
                if 3 <= len(val) <= 16:
                    add('spec', val, 'направление', [], 'target', base + m.start(), 7)
        # --- биржа
        for m in re.finditer(r'(Фондов\w+ бирж\w+ Таиланда|Nasdaq|NYSE|\bSET\b|Фондов\w+ бирж\w+)', sent):
            if in_parens(sent, m.start()) or not subj_is_company:
                continue
            ex = m.group(1)
            val = {'Nasdaq': 'Nasdaq', 'NYSE': 'NYSE'}.get(ex, 'SET' if ('Таиланд' in ex or ex == 'SET') else 'Биржа')
            add('listing', val, 'акции на бирже', [], 'chart', base + m.start(), 5)
    # дубли: одно значение — один факт; одна подпись у денег — первый; у счётных — больший
    res = []
    for f in sorted(facts, key=lambda f: (f['prio'], f['pos'])):
        if any(f['value'].lower() == r['value'].lower() for r in res):
            continue
        if f['kind'] == 'top' and any(r['labels'][0] == f['labels'][0] or (r['kind'] == 'pct' and f['labels'][0].startswith(r['labels'][0] + ' '))
                                      for r in res):  # «47% доля рынка» + «№1 доля рынка доставки еды»
            continue
        same = [r for r in res if r['kind'] == f['kind'] and r['labels'][0] == f['labels'][0] and f['kind'] in ('money', 'count', 'pct', 'year')]
        if same:
            if f['kind'] == 'count':
                def nv(x):
                    try:
                        return float(re.sub(r'[^\d,]', '', x['value']).replace(',', '.') or 0)
                    except ValueError:
                        return 0
                if nv(f) > nv(same[0]):
                    res[res.index(same[0])] = f
            continue
        res.append(f)
    return res


def _vs(x):
    return x.v[0] if isinstance(x, Var) else x


def bad_label(f):
    """Подпись-обрывок: «которых не менее», «2021 Masan Group купила», «больше», «мощностью»."""
    lb = f['labels'][0] if f.get('labels') else ''
    lb = _vs(lb) if lb else ''
    ws = [w.strip('«»"(),.;:') for w in str(lb).split()]
    ws = [w for w in ws if w]
    if not ws:
        return False
    if re.match(r'\d', ws[0]) or any(w.lower() in ('которых', 'которые', 'который', 'которой', 'больше', 'меньше') for w in ws):
        return True
    if any(w[:1].islower() and first_pos(w) == 'VERB' for w in ws) or (ws[0][:1].isupper() and first_pos(ws[0].lower()) == 'VERB'):
        return True
    p = parse_word(ws[0]) if len(ws) == 1 and ws[0][:1].islower() else None
    return bool(p and p.tag.POS == 'NOUN' and p.tag.case == 'ablt')


def pick_facts(cands, extra):
    """4 факта: сначала по одному каждого вида (цифры, №1, бренд, год…), потом добор; в конце — группа, город."""
    limits = {'year': 1, 'name': 2, 'listing': 1, 'top': 2, 'money': 2, 'count': 3, 'pct': 2, 'partner': 1, 'spec': 2}
    cands = [f for f in cands if not bad_label(f)]
    ranked = sorted(cands, key=lambda f: (f['prio'], f['pos']))
    chosen, kinds = [], {}

    def take(f):
        if len(chosen) >= 4 or kinds.get(f['kind'], 0) >= limits.get(f['kind'], 9):
            return
        if any(_vs(f['value']).lower() == _vs(c['value']).lower() for c in chosen):
            return
        chosen.append(f)
        kinds[f['kind']] = kinds.get(f['kind'], 0) + 1

    numeric = [f for f in ranked if f['kind'] in ('count', 'pct', 'money') and f['prio'] <= 2]
    for f in numeric[:2]:
        take(f)
    for f in ranked:  # по одному каждого вида
        if f['kind'] not in kinds:
            take(f)
    for f in ranked + extra:
        take(f)
    order = {'count': 0, 'pct': 0, 'money': 0, 'top': 1, 'name': 2, 'spec': 2, 'partner': 3, 'year': 4, 'listing': 5, 'group': 6, 'city': 7, 'city2': 8}
    chosen.sort(key=lambda f: (order.get(f['kind'], 9), f.get('pos', 0)))
    return chosen


# ---------------------------------------------------------------- тексты о компании
def company_names(c):
    n = c['name_en']
    out = [base_name(n), paren_name(n), n.split()[0]]
    for part in re.split(r'\s*/\s*', base_name(n)):
        out.append(part)
    return [x for x in out if x and len(x) > 2]


FOUND_RX = r'основан|учрежд|зарегистр|образован|создан|запущен|открыт|открыл|появил|начинал'


def ok_start(word, subj):
    w = word.strip('«»"(')
    if not w:
        return False
    if re.match(r'(?:Ltd|Inc|Co|LLC|PCL|Plc|Corp)\b', w):
        return False
    if re.match(r'[A-Z]', w):
        return True
    if re.match(r'(?:один|одна|одно)$', w.lower()):
        return True
    p = parse_word(w)
    if not p:
        return False
    if p.tag.POS == 'NOUN' and p.tag.case == 'nomn':
        return True
    if subj and (p.tag.POS == 'VERB' or p.tag.POS == 'PRTS'):
        return True
    return False


def candidates(c):
    """Части описания для «Почему выбран» / «Фокус визита»: [оценка, № предложения, текст]."""
    sents = sentences(c.get('desc_ru', ''))
    names = [x.lower() for x in company_names(c)]
    out = []
    for si, s in enumerate(sents):
        s0 = strip_parens(s)
        starts_company = s0.lower().startswith(tuple(names)) or re.match(r'(Компания|Сеть|Бренд|Группа|Клиника|Сервис|Платформа)\b', s0)
        subj = bool(starts_company) or si == 0 or (bool(s0.split()) and first_pos(s0.split()[0].lower()) in ('VERB', 'PRTS'))
        found_pen = lambda t: -4 if re.search(FOUND_RX, t[:60]) else 0
        # 1) именное сказуемое: «X — крупнейший …»
        dm = re.search(r'\s[—–]\s', s0)
        if dm and subj:
            pre = s0[:dm.start()]
            np_ = s0[dm.end():].strip()
            if not any(is_verb(w) for w in pre.split()) and len(pre.split()) <= 14 and np_ and ok_start(np_.split()[0], False) or (
                    dm and subj and np_ and first_pos(np_.split()[0]) in ('ADJF', 'PRTF') and parse_word(np_.split()[0]).tag.case == 'nomn'
                    and not any(is_verb(w) for w in pre.split())):
                out.append([9 + (1 if si == 0 else 0) + found_pen(np_), si, np_, 'nominal'])
        # 2) глагольное сказуемое при подлежащем-компании
        if subj:
            for pi_, part in enumerate(s0.split('; ')):
                pos = 0
                founded = False
                if pi_ > 0 and not (part.lower().startswith(tuple(names)) or is_verb(part.split()[0]) if part.split() else False):
                    continue
                for w in part.split():
                    st = part.find(w, pos)
                    pos = st + len(w)
                    if is_verb(w) or (first_pos(w) == 'PRTS' and w[:1].islower()):
                        if re.match(FOUND_RX, w.lower()):
                            founded = True
                            continue
                        if re.search(r'\b(?:котор\w+|чь\w+|где|когда)\b', part[:st], re.I):
                            break  # «…, корни которых восходят к 1906 году» — придаточное, не про компанию
                        if founded and re.search(r'(?:изначально|первоначально|сначала|поначалу|когда-то|ранее|с самого начала|с момента основания)\s+$', part[:st], re.I):
                            continue  # «основана в 1899 году, изначально выпускала …» — история, не суть
                        txt = part[st:]
                        sc = 5 if re.match(ACTIVITY, w.lower()) else 2
                        out.append([sc + (1 if si == 0 else 0), si, txt, 'verb'])
                        break
        # 3) значимость: «лидерство», «первая в Таиланде», «№1»
        if re.search(SIGNIF, s0, re.I):
            for bm in [None] + list(re.finditer(r';\s+|,\s+|\s[—–]\s', s0)):
                st = bm.end() if bm else 0
                txt = s0[st:]
                if not txt or not re.search(SIGNIF, txt[:90], re.I):
                    continue
                if bm and not ok_start(txt.split()[0], subj):
                    continue
                if bad_start(txt):
                    continue
                out.append([8 + (1 if si == 0 else 0) + found_pen(txt), si, txt, 'signif'])
        # 4) предложение целиком
        if re.match(r'[A-ZА-ЯЁ0-9«]', s0) and not bad_start(s0):
            sc = 1 + (1 if re.search(SIGNIF, s0, re.I) else 0) + len(re.findall(LEARN_RX, s0, re.I)) + found_pen(s0) // 2 + (2 if re.search(ACTIVITY, s0) and not subj else 0)
            out.append([sc, si, s0, 'sentence'])
    return out


LEARN_RX = (r'технолог|ИИ|искусствен|платформ|цифров|приложени|запуст|запущ|разработ|инновац|R&D|автоматиз|робот|данн|'
            r'e-commerce|онлайн|доставк|линейк|формат|систем|сервис|программ|модел|экспорт|франчайз|стратеги|ребрендинг|'
            r'омниканал|live|стрим|аналитик|прослеживаем|завод|производств|лаборатор|диагност|терапи|клиник|phygital')


def has_verb(t):
    ws = t.split()
    if ws and (first_pos(ws[0].lower()) in ('VERB', 'PRTS')):
        return True
    return bool(re.search(r'\s[—–]\s', t)) or any(is_verb(w) or first_pos(w) == 'PRTS' for w in ws)


def text_variants(s, limits, kind='sentence'):
    out = []
    for lim in limits:
        cuts = clause_cuts(s, lim)
        if cuts and len(cuts[0]) < 0.35 * lim and len(s) > lim:
            ws, acc = s.split(), ''
            for w in ws:
                if len(acc) + len(w) + 1 > lim:
                    break
                acc = (acc + ' ' + w).strip()
            wl = trim_tail(acc.split())
            while len(wl) > 3 and (wl[-1].lower() in STOPW or wl[-1].lower() in EN_STOPW or first_pos(wl[-1].strip(',')) in ('PREP', 'CONJ', 'ADJF', 'PRTF', 'PRCL', 'ADVB', 'NUMR')):
                wl.pop()
            cuts = [' '.join(wl).rstrip(',')] + cuts
        for v in cuts:
            if len(v) < 20 or (kind != 'nominal' and bad_start(v)):
                continue
            if kind == 'sentence' and not has_verb(v):
                continue
            v = end_dot(cap(v))
            if v not in out:
                out.append(v)
    return out


def why_learn(c):
    cands = candidates(c)
    if not cands:
        return [], []
    cands.sort(key=lambda x: (-x[0], x[1]))
    why = []
    used_si = None
    for sc, si, txt, kind in cands:
        txt = re.sub(r',\s+(?:основанн|запущенн|созданн)\w*\s[^,;—]*\.?$', '.', txt)
        why = text_variants(txt, (120, 95, 75), kind)
        if why:
            used_si = si
            break
    learn = []
    lc = []
    for sc, si, txt, kind in cands:
        if si == used_si:
            continue
        lsc = len(re.findall(LEARN_RX, txt, re.I)) * 2 + (2 if txt == strip_parens(sentences(c['desc_ru'])[si]) else 0) - (3 if re.search(FOUND_RX, txt[:60]) else 0)
        lc.append((lsc, si, txt, kind))
    lc.sort(key=lambda x: (-x[0], x[1]))
    for sc, si, txt, kind in lc:
        learn = text_variants(txt, (130, 105, 80, 60), kind)
        if learn and not any(l[:40] == w[:40] for l in learn for w in why):
            break
        learn = []
    if not learn:
        for sc, si, txt, kind in lc:
            learn = text_variants(txt, (130, 105, 80, 60), 'signif')
            if learn and not any(l[:40] == w[:40] for l in learn for w in why):
                break
            learn = []
    return why, learn


def words_cut(text, n):
    """Первые n слов; если последнее — прилагательное/предлог/союз, добираем до существительного (не больше n + 3)."""
    ws = text.split()
    k = min(n, len(ws))
    while k < len(ws) and k < n + 3 and (first_pos(ws[k - 1].strip(',;.')) in ('ADJF', 'PRTF', 'PREP', 'CONJ') or ws[k - 1].endswith('-')):
        k += 1
    return ' '.join(ws[:k]).rstrip(',;')


def nominal_kind(c, limit=55):
    """«Dutch Mill — доминирующий производитель питьевого йогурта» → «доминирующий производитель питьевого йогурта»."""
    sents = sentences(c.get('desc_ru', ''))
    if not sents:
        return ''
    s0 = strip_parens(sents[0])
    dm = re.search(r'\s[—–]\s', s0)
    if not dm or re.search(ACTIVITY, s0[:dm.start()]) or len(s0[:dm.start()].split()) > 14:
        return ''
    w0 = s0[dm.end():].split()[0] if s0[dm.end():].split() else ''
    p0 = parse_word(w0.lower())
    if not w0 or (p0 and p0.tag.case not in ('nomn', None)) or any(is_verb(w) for w in s0[:dm.start()].split()):
        return ''
    if any(first_pos(w) == 'PRTS' for w in s0[:dm.start()].split()) or any(is_verb(w) for w in re.split(r'[,;:]', s0[dm.end():])[0].split()):
        return ''  # «… основана в 2018 году — первая точка продавала …»
    np_ = re.sub(r',\s+(?:основан|запущен|создан|учрежд[её]н|открыт)\w*\s.*$', '', s0[dm.end():].strip())  # «…, основанная в 2012 году …» — только суть  # «…, основанная в 2012 году …»
    v = clause_cuts(np_, limit)
    v = [x for x in v if len(x) <= limit and x.split() and not x.endswith('-') and not re.search(r'\b(?:19|20)\d\d$', x)
         and first_pos(x.split()[-1].strip('.,')) not in ('ADJF', 'PRTF')]  # «государственный телеком-», «…, основанная в 2012» — обрывки
    return v[0] if v else ''


def parent_group(c):
    sents = sentences(c.get('desc_ru', ''))
    if not sents:
        return ''
    d = sents[0]
    m = re.search(r'(?:входящ\w+ в|входит в|в составе|часть|дочерн\w+ (?:компани\w+|структур\w+)|^[^—]{0,60}— (?:[а-яё-]+\s+)?подразделени\w*|принадлеж\w+|'
                  r'контролируем\w+|контролиру\w+|конгломерата|флагманский кошел[её]к|совместн\w+ предприяти\w+|под управлением)\s+([^,.;—()]{2,80})', d)
    if not m:
        return ''
    seg = m.group(1)
    lat = re.findall(r'[A-Z][\w&.\'’-]*(?:\s+(?:[A-Z][\w&.\'’-]*|of|and|&))*', seg)
    names = [x.lower() for x in company_names(c)]
    lat = [x.strip() for x in lat if len(x) > 1 and x.strip().lower() not in names]
    return lat[0] if lat else ''


def city_base(city):
    """«Токио / Нода (Тиба)», «Осака / Кобе» → основной город (для маршрута и списка городов)."""
    return re.split(r'\s*/\s*', city or '')[0].strip() or city


LEGAL_RX = r'(?:\s+Co\.)?\s+(?:Sdn\.?\s*Bhd\.?|Berhad|Bhd\.?)(?=\s*[(（]|$)'  # малайзийские формы собственности
COUNTRY_PAREN_RX = r'\s*[(（](?:M|Malaysia|Thailand|Japan|Vietnam|India|Indonesia|Korea|UAE|(?:Greater\s+)?China)(?:\s+entry)?[)）]'


def legal_clean(name):
    """«AEON Co. (M) Bhd» → «AEON», «Phuture Foods Sdn Bhd» → «Phuture Foods», «Hilton (China)» → «Hilton»."""
    n = re.sub(COUNTRY_PAREN_RX, '', name).strip()
    return re.sub(LEGAL_RX, '', n).strip() or n


def base_name(name):
    return legal_clean(re.sub(r'\s*[(（][^)）]*[)）]', '', name).strip())


def paren_name(name):
    m = re.search(r'[(（]([^)）]*)[)）]', legal_clean(name))
    return m.group(1).strip() if m else ''


def title_variants(c):
    n = base_name(c['name_en'])
    out = [n]
    short = re.sub(r'\s+(Thailand|Japan|Vietnam|India|Malaysia|Indonesia|Korea|K\.K\.|Group|Corporation|Holdings|Public Company Limited|PCL|Co\.?,? Ltd\.?|Integrative Wellness|'
                   r'Scientific Wellness Center|Wellness Center|Wellness Clinic|Longevity Clinic|Clinic|International|Coffee Roasters|' + REGION_SUFFIX + r')$', '', n).strip()
    if short and short != n:
        out.append(short)
    if '/' in n:
        out += [x.strip() for x in n.split('/')]
    if len(n.split()) > 2:
        out.append(' '.join(n.split()[:2]))
    res = []
    for o in out:
        if o not in res:
            res.append(o)
    return res


JP_FORM = r'(?:株式会社|有限会社|合同会社)'


def native_clean(c):
    """Родное название без «株式会社» и без повтора латинского имени («ZMP株式会社» → пусто, «PayPay株式会社» → пусто)."""
    z = re.sub(JP_FORM, '', (c.get('name_zh') or '')).strip()
    z = re.sub(r'[(（]\s*[)）]', '', z).strip()
    lat = {x.lower() for x in company_names(c)} | {c['name_en'].lower(), base_name(c['name_en']).lower()}
    if not z or base_name(z).lower() in lat or z.lower() in lat or re.fullmatch(r'[\x00-\x7fÀ-ɏ\s.,&()（）\'’-]+', z):
        return ''
    return z


def native_variants(c):
    z = native_clean(c)
    if not z:
        return [None]
    out = []
    if re.search(r'[(（]', z):
        out.append(base_name(z))
    out.append(z)
    if '/' in z:
        out.append(z.split('/')[0].strip())
    out.append(None)
    res = []
    for o in out:
        if o not in res:
            res.append(o)
    return res


def ghost_for(c):
    raw = (c.get('name_zh') or '').strip()
    z = native_clean(c) if re.search(r'[぀-ヿ]|' + JP_FORM, raw) else raw
    if not z:
        return None, False
    if re.search(r'[฀-๿]', z):
        return re.split(r'[\s(/]', z)[0], True
    if re.search(r'[぀-ヿ]', z):  # японское: короткое название целиком, длинное — первые 2 знака
        g = re.sub(r'[\s()（）/A-Za-z0-9・‑-]', '', base_name(z))
        return (g if len(g) <= 4 else g[:2]) or None, False
    if re.search(r'[一-鿿]', z):
        return re.sub(r'[\s()/A-Za-z0-9]', '', z)[:2], False
    return None, False


# ---------------------------------------------------------------- логотипы
def slugify(s):
    import unicodedata
    s = unicodedata.normalize('NFKD', base_name(s)).encode('ascii', 'ignore').decode().lower().replace('&', 'and').replace("'", '').replace('’', '')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s


def load_brands():
    return json.loads(BRANDS.read_text(encoding='utf-8')) if BRANDS.exists() else {}


REGION_SUFFIX = r'MENA|MEA|Middle East(?: & (?:Africa|Central Asia))?|Middle East & North Africa'  # «Google MENA», «Visa Middle East & Central Asia»
GENERIC_SUFFIX = r'\s+(?:Thailand|Japan|Vietnam|India|Malaysia|Indonesia|Korea|UAE|K\.K\.|Group|Corporation|Corp\.?|Holdings|Public Company Limited|PCL|Co\.?,? Ltd\.?|Ltd\.?|Inc\.?|Stores|Marketing|' + REGION_SUFFIX + r')$'


def name_keys(c):
    n = c['name_en']
    keys = set()
    for part in [n, base_name(n), paren_name(n)] + re.split(r'\s*/\s*|\s+[—–]\s+', base_name(n)):
        part = part.strip()
        if not part:
            continue
        keys.add(part.lower())
        keys.add(re.sub(GENERIC_SUFFIX, '', part).strip().lower())
    return {k for k in keys if len(k) >= 3}


def find_existing_logo(c, brands):
    """Логотип уже в библиотеке? Сначала по ссылке сайта, потом по названиям из brands.json."""
    for v in brands.values():
        if v.get('site_logo') and v.get('site_logo') == c.get('logo') and v.get('logo') and (ROOT / v['logo']).exists():
            return v['logo']
    keys = name_keys(c)
    base_keys = {re.sub(GENERIC_SUFFIX, '', base_name(c['name_en'])).strip().lower()}
    pn = paren_name(c['name_en']).lower()
    first = None
    for v in brands.values():
        bn = {x.lower() for x in v.get('names', [])}
        if not (v.get('logo') and (ROOT / v['logo']).exists()):
            continue
        if base_keys & bn:
            return v['logo']
        hit = keys & bn
        if hit == {pn} and v.get('names', [''])[0].lower() == pn:
            continue  # «Point Coffee (Indomaret)»: в скобках материнская компания — её логотип не подходит
        if hit and not first:
            first = v['logo']
    return first


def trim_logo(path):
    """Обрезка пустых полей и белого/«шахматного» фона по краям (заливка от краёв, внутренний белый не трогаем)."""
    from PIL import Image
    from collections import deque
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()

    border = [px[x, y] for x in range(w) for y in (0, h - 1)] + [px[x, y] for y in range(h) for x in (0, w - 1)]
    grey = lambda p: abs(p[0] - p[1]) < 8 and abs(p[1] - p[2]) < 8 and 185 < p[0] <= 225 and p[3] >= 20
    # серые клетки «шахматки» убираем, только если по краю и правда шахматка (белые + серые); иначе серое —
    # часть знака (верх эмблемы YTL)
    checker = sum(1 for p in border if grey(p)) > 0.1 * len(border)

    def light(p):
        return p[3] < 20 or (p[0] > 225 and p[1] > 225 and p[2] > 225) or (checker and grey(p))

    transparent_bg = sum(1 for p in border if p[3] < 20) > 0.8 * len(border)
    if not transparent_bg and sum(1 for p in border if light(p)) > 0.85 * len(border):
        seen = bytearray(w * h)
        q = deque()
        for x in range(w):
            for y in (0, h - 1):
                q.append((x, y))
        for y in range(h):
            for x in (0, w - 1):
                q.append((x, y))
        while q:
            x, y = q.popleft()
            i = y * w + x
            if seen[i]:
                continue
            seen[i] = 1
            p = px[x, y]
            if not light(p):
                continue
            px[x, y] = (255, 255, 255, 0)
            if x > 0: q.append((x - 1, y))
            if x < w - 1: q.append((x + 1, y))
            if y > 0: q.append((x, y - 1))
            if y < h - 1: q.append((x, y + 1))
    bbox = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    if bbox:
        pad = max(2, int(0.03 * max(bbox[2] - bbox[0], bbox[3] - bbox[1])))
        bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad))
        im = im.crop(bbox)
    out = path.with_suffix('.png')
    im.save(out, optimize=True)
    if out != path:
        path.unlink()
    # белый логотип на прозрачном фоне на белой карточке не виден — предупреждаем
    a = [p for p in (im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()) if p[3] > 128]
    if a and sum(1 for p in a if p[0] > 235 and p[1] > 235 and p[2] > 235) > 0.85 * len(a):
        print(f'  ! логотип почти весь белый: {out}', file=sys.stderr)
    return out


def ensure_logo(c, tour, brands, new_logos, allow_download=True):
    if not c.get('logo'):
        return None
    hit = find_existing_logo(c, brands)
    if hit:
        return hit
    for c2, rel, _ in new_logos:  # «Amul (GCMMF)» и «Amul Fed Dairy» — один файл сайта, второй раз не качаем
        if c2.get('logo') == c['logo']:
            return rel
    folder = SECTOR_FOLDER.get(c.get('sector'), 'общие')
    tid = tour['tour_id']
    if 'beauty' in tid and c.get('sector') in ('consumer', 'medtech'):
        folder = 'косметика'
    if 'tea' in tid or 'coffee' in tid:
        folder = 'чай-кофе'
    slug = slugify(re.sub(r'-(thailand|th|vietnam|vn|japan|jp|india|in|malaysia|my|indonesia|id|korea|kr|uae|ae)$', '', c['id']).replace('-', ' ') or c['name_en'])
    slug = slug or c['id']
    for ext in ('.png', '.svg', '.jpg', '.webp'):
        for f in LOGOS.glob(f'*/{slug}{ext}'):
            rel = str(f.relative_to(ROOT))
            new_logos.append((c, rel, False))
            return rel
    if not allow_download:
        return None
    url = SITE + urllib.parse.quote(c['logo'])
    ext = Path(c['logo']).suffix.lower() or '.png'
    dest = LOGOS / folder / f'{slug}{ext}'
    dest.parent.mkdir(parents=True, exist_ok=True)
    import unicodedata
    data = None
    # сайт на несуществующий файл отдаёт HTML-страницу; «Kosé.png» лежит в NFD-записи — пробуем варианты
    for u in dict.fromkeys([url, SITE + urllib.parse.quote(unicodedata.normalize('NFD', c['logo'])),
                            SITE + urllib.parse.quote(unicodedata.normalize('NFC', c['logo']))]):
        try:
            d_ = fetch(u, binary=True)
        except Exception as e:
            print(f'  ! не скачался логотип {u}: {e}', file=sys.stderr)
            continue
        if d_[:200].lstrip().lower().startswith((b'<!doctype html', b'<html')):
            continue
        data = d_
        break
    if data is None:
        print(f'  ! логотипа нет на сайте: {url}', file=sys.stderr)
        return None
    dest.write_bytes(data)
    if ext in ('.png', '.jpg', '.jpeg', '.webp'):
        dest = trim_logo(dest)
    rel = str(dest.relative_to(ROOT))
    new_logos.append((c, rel, True))
    print(f'  логотип: {rel}', file=sys.stderr)
    return rel


def register_brands(new_logos, tour, brands):
    changed = False
    added = []
    for c, rel, downloaded in new_logos:
        key = slugify(c['name_en']) or c['id']
        if key in brands and brands[key].get('logo') == rel:
            continue
        if key in brands:  # «GoTo (GoFood/GoKitchen)» и «GoTo (Gojek + …)» — разные логотипы, запись не затираем
            key = c['id'] if c['id'] not in brands else f'{key}-{c["id"]}'
        if any(v.get('logo') == rel for v in brands.values()):
            continue
        names = []
        pn = paren_name(c['name_en'])
        if pn and not re.fullmatch(r'[A-Z]{2,5}|[A-Z][a-z]+[A-Z]\w*|Mistine|Eucerin', pn):
            pn = ''  # в скобках часто материнская компания (Bumrungrad, PTT OR) — не алиас логотипа
        parts = [x.strip() for x in re.split(r'\s*/\s*', base_name(c['name_en']))] if '/' in c['name_en'] else []
        for n in [c['name_en'], base_name(c['name_en']), re.sub(GENERIC_SUFFIX, '', base_name(c['name_en'])).strip(), pn] + parts:
            n = n.strip()
            if not n or n in names:
                continue
            if n.lower() in GENERIC_ALIAS or len(n) < 3:
                continue
            names.append(n)
        if not names:
            names = [c['name_en']]
        brands[key] = {'names': names, 'logo': rel, 'site_logo': c['logo']}
        added.append(base_name(c['name_en']))
        changed = True
    if changed:
        BRANDS.write_text(json.dumps(brands, ensure_ascii=False, indent=1), encoding='utf-8')
        note = (f'\n- {datetime.date.today():%d.%m.%Y}, экспедиция {tour["tour_id"]}: ' + ', '.join(added) +
                ' — с сайта пользователя globaltechtour.ru (`/logos/…`, карточки компаний); обрезаны поля и белый фон. '
                'Товарные знаки принадлежат владельцам; используются для указания компаний в программе.\n')
        txt = AUTHORS.read_text(encoding='utf-8')
        head = '## Логотипы компаний экспедиций (конвертер `презентации/шаблон/from_site.py`)'
        if head not in txt:
            txt = txt.rstrip('\n') + '\n\n' + head + '\n\nПапки `source-videos/логотипы/<отрасль>/`, имена файлов — по названию компании.\n'
        txt = txt.rstrip('\n') + '\n' + note.lstrip('\n')
        AUTHORS.write_text(txt, encoding='utf-8')
    return added


# ---------------------------------------------------------------- сборка слайдов
class Var:
    """Поле с вариантами текста (от длинного к короткому). Уровень выбирает автоподгонка."""
    def __init__(self, *variants):
        vs = []
        for v in variants:
            if isinstance(v, (list, tuple)):
                vs.extend(v)
            else:
                vs.append(v)
        vs = [x for x in vs if x is not None] or ([None] if variants == (None,) else [''])
        self.v = [x for i, x in enumerate(vs) if x not in vs[:i]]

    def get(self, level):
        return self.v[min(level, len(self.v) - 1)]


def resolve(obj, levels, path=''):
    if isinstance(obj, Var):
        return obj.get(levels.get(path, 0))
    if isinstance(obj, dict):
        return {k: resolve(v, levels, f'{path}.{k}' if path else k) for k, v in obj.items() if not k.startswith('_')}
    if isinstance(obj, list):
        return [resolve(v, levels, f'{path}.{i}' if path else str(i)) for i, v in enumerate(obj)]
    return obj


def var_paths(obj, path=''):
    if isinstance(obj, Var):
        yield path, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from var_paths(v, f'{path}.{k}' if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from var_paths(v, f'{path}.{i}' if path else str(i))


def topic_of(tour):
    t = tour['title_ru']
    head = t.split(':')[0].strip()
    return head


def subtopics(tour):
    t = tour['title_ru']
    if ':' not in t:
        return []
    tail = t.split(':', 1)[1]
    if re.match(r'\s*[Оо]т\s.+\sдо\s', tail):  # «от Emaar и Palm Jumeirah до острова Яс» — одна фраза, не перечисление
        return [cap(tail.strip())]
    parts = [p.strip() for p in re.split(r',\s*|\s+и\s+', tail) if p.strip()]
    return [cap(p) for p in parts]


def lines2(items, sep=' · '):
    """Список коротких слов → 2 строки."""
    if len(items) <= 1:
        return sep.join(items)
    k = (len(items) + 1) // 2
    return sep.join(items[:k]) + '\n' + sep.join(items[k:])


def company_short(c):
    n = re.split(r'\s*/\s*|\s+[—–]\s+', base_name(c['name_en']))[0]
    return re.sub(GENERIC_SUFFIX, '', n).strip() or n


def build_deck(tour, comps, logos_ok=True):
    country = tour['country']
    cinfo = COUNTRY.get(country, (country, None, '', ''))
    itin = tour['itinerary']
    plain = {strip_parens(city_base(d['city_ru'])) for d in itin if '(' not in city_base(d['city_ru'])}
    if any('(' in city_base(d['city_ru']) and strip_parens(city_base(d['city_ru'])) in plain for d in itin):
        # «Куала-Лумпур (Cyberjaya)» и «Куала-Лумпур» — один город: район остаётся только в подписи дня
        itin = [dict(d, city_ru=strip_parens(city_base(d['city_ru'])), area_ru=d.get('area_ru') or paren_name(city_base(d['city_ru'])))
                if strip_parens(city_base(d['city_ru'])) in plain else d for d in itin]
    stats = tour.get('stats') or {}
    n_comp = stats.get('companies') or sum(len(d['companies']) for d in itin)
    days, nights = stats.get('days') or len(itin) + 1, stats.get('nights') or len(itin) + 1
    cities = []
    for d in itin:
        if city_base(d['city_ru']) not in cities:
            cities.append(city_base(d['city_ru']))
    main_city = city_base(itin[0]['city_ru']) if itin else ''
    brands = load_brands()
    new_logos = []
    clist = []  # (день, компания)
    missing = []
    for d in itin:
        for cid in d['companies']:
            c = comps.get(cid)
            if not c:
                missing.append(cid)
                continue
            clist.append((d, c))
    logo_of = {}
    by_site = {}  # один файл сайта у двух компаний (Grab и GrabKitchen) — один логотип, без второй копии
    for d, c in clist:
        if c.get('logo') and c['logo'] in by_site:
            logo_of[c['id']] = by_site[c['logo']]
            continue
        logo_of[c['id']] = ensure_logo(c, tour, brands, new_logos, allow_download=logos_ok) if logos_ok else find_existing_logo(c, brands)
        if logo_of[c['id']] and c.get('logo'):
            by_site[c['logo']] = logo_of[c['id']]
    lang = ''
    for inc in tour.get('includes', []):
        m = re.search(r'на (\w+)/(\w+)', inc['ru'])
        if m:
            lang = f'на {m.group(1)} и {m.group(2)}'
    lang_slash = lang.replace(' и ', '/') if lang else ''
    slides = []

    # 1. обложка
    topic = topic_of(tour)
    subs = subtopics(tour)
    tagline = [x.strip() for x in tour.get('tagline_ru', '').split('·') if x.strip()]
    logos = []
    seen_logo = set()
    for d, c in clist:
        lg = logo_of.get(c['id'])
        if lg and lg not in seen_logo:
            seen_logo.add(lg)
            logos.append({'name': company_short(c), 'logo': lg})
    for d, c in clist:  # не хватает логотипов — текстовые
        if len(logos) >= 8:
            break
        if not logo_of.get(c['id']) and all(l['name'] != company_short(c) for l in logos):
            logos.append({'name': company_short(c)})
    logos = logos[:8]
    pos = tour.get('positioning_ru', '')
    pos_head, _, pos_tail = pos.partition(' — ')
    pos_tail = pos_tail.strip().rstrip('.')
    if len(pos_head.split()) == 1 and pos_tail:  # «Малайзия — глобальный халяль-косметический хаб: …» — суть после тире
        pos_head, pos_tail = cap(pos_tail), ''
    counts = f'{cnt(n_comp, "компания", "компании", "компаний")}, {cnt(days, "день", "дня", "дней")}, {cnt(nights, "ночь", "ночи", "ночей")}'
    head_vars = []
    for lim in (70, 55, 42):
        ph = strip_parens(pos_head)  # «MWG (Bách Hóa Xanh, Điện Máy Xanh) в Хошимине» — скобки на обложке не режем
        for v in clause_cuts(re.sub(r'\s+и\s+[^,]+$', '', ph) if lim < 70 else ph, lim):
            if v.count('(') == v.count(')'):
                head_vars.append(v)
    box_text = Var([f'{h} —\n{counts}' for h in head_vars if (h.startswith(('От', 'Из', 'С ')) or len(h) < 60) and not h.endswith(':')], counts)
    city_line = ' + '.join(cities)
    box_right = Var(f'{city_line} —\n{pos_tail}' if pos_tail and len(pos_tail) <= 48 else None,
                    f'{city_line} —\n{"вся программа в одном городе" if len(cities) == 1 else "без перелётов" if not stats.get("flights") else ""}'.rstrip(' —\n'),
                    city_line)
    tr_items = subs if len(subs) >= 2 else tagline
    slides.append({
        'type': 'cover',
        'tag': Var(f'Бизнес-делегация · {topic}', topic, f'Бизнес-делегация · {cinfo[2]}'),
        'topright': Var(lines2(tr_items), lines2(tr_items[:3]), lines2(tr_items[:2])),
        'logos': logos,
        'box_text': box_text,
        'box_right': box_right,
        'footer': f'Global Tech Tour · {(lambda e: e[:1].lower() + e[1:])(tour.get("eyebrow_ru", "")) or "бизнес-делегации"} · РФ/СНГ',
    })

    # 2. почему мы
    adv = [a['ru'] for a in tour.get('advantages', [])]
    with_us = (tour.get('why_vs_self') or {}).get('with_us_ru', [])
    inc_ru = [i['ru'] for i in tour.get('includes', [])]
    if not stats.get('flights'):  # «Трансферы/перелёты между городами» без единого перелёта (ОАЭ)
        inc_ru = [re.sub(r'^Трансферы/перел[её]ты\b', 'Трансферы', i) for i in inc_ru]
    if len(cities) == 1:  # один город — «между городами программы» не про него
        inc_ru = [re.sub(r'^(Трансферы)\s+между городами программы$', r'\1 по программе', i) for i in inc_ru]
    transfers = next((i for i in inc_ru if i.lower().startswith('трансфер')), '')
    tr_generic = transfers == 'Трансферы по программе'  # один город: «Трансферы включены», а не «… между городами»
    hq = next((a for a in adv if 'штаб' in a.lower()), adv[0] if adv else '')
    route = next((a for a in adv if 'маршрут' in a.lower()), adv[1] if len(adv) > 1 else '')
    support = next((a for a in adv if 'сопровожд' in a.lower() or 'перевод' in a.lower()), adv[2] if len(adv) > 2 else '')
    slides.append({'type': 'why', 'items': [
        {'title': 'Большой опыт', 'text': 'Организуем benchmark‑туры и технологические экспедиции — от робототехники до общепита и напитков. Прямые контакты с руководством сотен компаний.'},
        {'title': 'Доступ к штаб-квартирам', 'text': Var(end_dot(cap(re.sub(r'^Доступ к штаб-квартирам, обычно закрытым', 'Визиты в штаб-квартиры, обычно закрытые', hq))) + (' ' + end_dot(cap(with_us[0])) if with_us else ''), end_dot(cap(hq)))},  # «к площадкам, обычно закрытым» — падеж не трогаем
        {'title': 'Готовый маршрут', 'text': Var(end_dot(cap(route)) + (' Трансферы включены.' if tr_generic else f' {transfers} включены.' if transfers else ''),
                                                 end_dot(cap(route)))},
        {'title': 'Сопровождение и перевод', 'text': Var(end_dot(cap(support) + (f' — {lang}' if lang else '')), end_dot(cap(support)))},
    ]})

    # 3. направления: блоки дней
    groups = []
    k = len(itin)
    if k >= 3:
        sizes = [(k + 2) // 3, (k + 1) // 3, k // 3]
        i = 0
        for sz in sizes:
            groups.append(itin[i:i + sz])
            i += sz
    else:
        groups = [[d] for d in itin]
    items = []
    for g in groups:
        if not g:
            continue
        dn = [d['day'] for d in g]
        name = f'День {dn[0]}' if len(dn) == 1 else f'Дни {dn[0]}–{dn[-1]}'
        gc = sorted({city_base(d['city_ru']) for d in g}, key=lambda x: cities.index(x))
        if len(cities) > 1:
            name += ' · ' + ' + '.join(gc)
        names = [company_short(comps[cid]) for d in g for cid in d['companies'] if cid in comps]
        notes = [x for d in g for x in (d.get('note_ru'),) if x]
        txt = ', '.join(names) if names else ''
        if notes and not names:
            txt = notes[0]
        full = txt + (' — ' + notes[0][0].lower() + notes[0][1:] if notes and names else '')
        items.append({'name': Var(name, name.split(' · ')[0]), 'text': Var(full, txt)})
    quote = f'{cap(pos_tail)}.' if pos_tail else ''
    q2 = quote
    if quote and len(quote) > 28:
        ws = quote.split()
        half = len(quote) // 2
        acc, cut = 0, 1
        for i, w in enumerate(ws):
            acc += len(w) + 1
            if acc >= half:
                cut = i + 1
                break
        q2 = ' '.join(ws[:cut]) + '\n' + ' '.join(ws[cut:])
    n_dir = len(items)
    ghost, _ = GHOST_COUNTRY.get(country, (None, False))
    slides.append({'type': 'layers', 'tag': 'Программа', 'ghost': ghost,
                   'title1': cnt(n_comp, 'компания', 'компании', 'компаний'),
                   'title2': cnt(len(itin), 'день', 'дня', 'дней'),
                   'items': items, 'quote': Var(q2 if len(quote) <= 70 else '', '')})

    # 4. маршрут (если городов несколько)
    if len(cities) > 1:
        cl = []
        for ci, cname in enumerate(cities):
            dd = [d for d in itin if city_base(d['city_ru']) == cname]
            nums = [d['day'] for d in dd]
            if len(nums) == 1:
                dtxt = f'день {nums[0]}'
            else:
                runs, st = [], nums[0]
                for a, b in zip(nums, nums[1:] + [None]):
                    if b != a + 1:
                        runs.append(f'{st}' if st == a else f'{st}–{a}')
                        st = b
                dtxt = 'дни ' + ', '.join(runs)
            names = [company_short(comps[cid]) for d in dd for cid in d['companies'] if cid in comps]
            entry = {'name': cname, 'days': dtxt,
                     'companies': Var('\n'.join(names), '\n'.join(names[:4]) + (f'\n+ ещё {len(names) - 4}' if len(names) > 4 else ''),
                                      cnt(len(names), 'компания', 'компании', 'компаний'))}
            if ci > 0:
                tr = next((d.get('transfer_ru', '') for d in dd if d.get('transfer_ru')), '')
                k0 = itin.index(dd[0])
                prev_tr = itin[k0 - 1].get('transfer_ru') or '' if k0 else ''
                if not tr and '→' in prev_tr and cname in prev_tr.split('→')[-1]:  # «После утреннего визита — трансфер Абу-Даби → Дубай» накануне
                    tr = itin[k0 - 1]['transfer_ru']
                m = re.search(r'\(([≈~][^)]*)\)', tr)
                icon = ('plane' if re.search(r'[Пп]ерел[её]т|рейс', tr) else 'train' if re.search(r'[Пп]оезд(?!к)|[Сс]инкансэн', tr)
                        else 'car' if re.search(r'[Пп]оездк|[Пп]ереезд|[Тт]рансфер|[Вв]ыезд', tr)
                        else 'plane' if stats.get('flights') else 'car')
                entry['leg'] = {'icon': icon, 'text': re.sub(r'^[≈~]\s*(\d+(?:,\d+)?)\s*час\w*.*$', r'≈\1 ч', m.group(1)) if m else ''}  # «~1,5 часа по трассе» → «≈1,5 ч»
            cl.append(entry)
        foot = []
        if tour.get('arrival_ru'):
            foot.append(f'<b>Прилёт:</b> {tour["arrival_ru"].split(" (")[0]}')
        if tour.get('departure_ru'):
            foot.append(f'<b>Вылет:</b> {tour["departure_ru"].split(" — ")[0]}')
        day_trips = [d for d in itin if 'Однодневн' in (d.get('transfer_ru') or '')]
        if day_trips:
            foot.append('выезды — однодневные, ночёвка в ' + loct(main_city))
        slides.append({'type': 'route', 'cities': cl, 'footer': ' · '.join(foot)})

    # 5. программа по дням
    dlist = []
    for d in itin:
        cs = [comps[cid] for cid in d['companies'] if cid in comps]
        names = [company_short(c) for c in cs]
        title = ' ·\n'.join(names) if names else (d.get('area_ru') or d['city_ru'])
        title2 = ' ·\n'.join(company_short(c) for c in cs) if names else title
        tx = []
        if d.get('transfer_ru'):
            tx.append(d['transfer_ru'])
        if d.get('note_ru'):
            tx.append(d['note_ru'])
        kinds = []
        for c in cs:
            k = nominal_kind(c)
            if k:
                kinds.append(f'{company_short(c)} — {k}')
        alt = '; '.join(kinds)
        full = ' '.join(tx) if tx else (end_dot(alt) if alt else '')
        short_tx = clause_cuts(tx[0], 70)[0] if tx else ''
        variants = [full]
        if tx:
            variants += [sentences(tx[0])[0], end_dot(short_tx)] + ([d['note_ru']] if d.get('note_ru') else [])
        else:
            variants += [end_dot('; '.join(k.split(' — ')[0] + ' — ' + words_cut(k.split(' — ')[1], 4) for k in kinds))] if kinds else []
        variants += [f'Визиты: {", ".join(names)}.' if names else '']
        title3 = ' ·\n'.join(' '.join(n.split()[:2]) for n in names) if names else title
        title4 = title3
        if len(names) >= 3:  # три компании в день — в две строки: «Panasonic Beauty ·\nMandom · Rohto»
            k = (len(names) + 1) // 2 if len(names) > 3 else 1
            title4 = ' · '.join(names[:k]) + ' ·\n' + ' · '.join(names[k:])
        dlist.append({'sub': d.get('time') or '', 'title': Var(title, title2, title3, title4),
                      'text': Var(*[v for v in variants if v]), 'label': f'День {d["day"]}'})
        if len(cities) > 1 and d['city_ru'] != main_city:  # «Токио / Нода (Тиба)» — тоже подпись
            sub = f'{d["city_ru"]} · {d.get("time") or ""}'.strip(' ·')
            short_city = d['city_ru'] if len(d['city_ru']) <= 18 or d is itin[-1] else city_base(d['city_ru'])  # «Ахмадабад/Гандинагар»
            dlist[-1]['sub'] = sub if len(sub) <= 18 or len(itin) <= 3 else short_city  # «Семаранг · 10:00–13:00» наезжает на кружок следующего дня
    dghost = THAI_DAYS.get(len(itin)) if country == 'th' else (CJK_DAYS.get(len(itin)) if country in ('cn', 'jp') else None)
    slides.append({'type': 'days', 'tag': 'Программа по дням', 'title': f'{cnt(len(itin), "день", "дня", "дней")} визитов',
                   'ghost': dghost, 'days': dlist})

    # 6. компании (одна карточка на компанию: Zepto в дни 2 и 4 — «Дни 2 и 4 · Мумбаи / Бенгалуру»)
    visits = {}
    for d, c in clist:
        visits.setdefault(c['id'], []).append(d)
    carded = set()
    for d, c in clist:
        if c['id'] in carded:
            continue
        carded.add(c['id'])
        vd = visits[c['id']]
        day_word = f'День {d["day"]}' if len(vd) == 1 else 'Дни ' + ' и '.join(str(x['day']) for x in vd)
        city = ' / '.join(dict.fromkeys(x['city_ru'] for x in vd))
        gh, thai = ghost_for(c)
        cands = extract_facts(c.get('desc_ru', ''), company_names(c))
        extra = []
        grp = parent_group(c)
        if grp and grp.lower() not in c['name_en'].lower():
            ws_ = grp.split()
            gval = Var(grp, ''.join(w[0] for w in ws_ if w[0].isupper())) if len(ws_) >= 3 else grp
            extra.append({'kind': 'group', 'value': gval, 'labels': ['в составе группы'], 'subs': [], 'icon': 'handshake', 'pos': 999})
        extra.append({'kind': 'city', 'value': city, 'labels': ['площадка визита'], 'subs': [f'{day_word.lower()} программы'], 'icon': 'pin', 'pos': 1000})
        extra.append({'kind': 'city2', 'value': day_word, 'labels': ['визит делегации'], 'subs': [d.get('time') or ''], 'icon': 'calendar', 'pos': 1001})
        facts = pick_facts(cands, extra)
        wl = why_learn(c)
        fl = []
        for f in facts:
            fsubs = [x for x in f['subs'] if x]
            vv = f['value']
            if f['kind'] == 'top' and ' в ' in vv and not fsubs:
                head, _, scope = vv.partition(' в ')
                vv = Var(f['value'], head)
                fsubs = ['', 'в ' + scope]
            fl.append({'icon': f['icon'], 'value': vv,
                       'label': Var(*f['labels']) if len(f['labels']) > 1 else f['labels'][0],
                       'sub': Var(*(fsubs + [''])) if fsubs else ''})
        pn = paren_name(c['name_en'])
        sub_parts = []
        if pn and pn.lower() not in base_name(c['name_en']).lower():
            sub_parts.append(pn)
        if grp and grp.lower() not in ' '.join(sub_parts).lower() and grp.lower() not in c['name_en'].lower():
            sub_parts.append(grp)
        sub_parts.append(city)
        tv = title_variants(c)
        nv = native_variants(c)
        # комбинации «заголовок + родное название»: сначала полное, потом сокращаем
        combos = []
        for t in tv:
            for n in nv:
                combos.append((t, n))
        combos.sort(key=lambda x: (x[1] is None, len(x[0]) + len(x[1] or '') * 0.9) if x != (tv[0], nv[0]) else (False, -1))
        slide = {'type': 'company', 'tag': f'{day_word} · {city}',
                 'title': Var(None), 'native': Var(None),
                 '_combo': True,
                 'ghost': gh, 'ghost_thai': thai,
                 'logo': logo_of.get(c['id']),
                 # скобки уже в подзаголовке («Loob Holding · Куала-Лумпур») — под логотипом без них
                 'short': Var(base_name(c['name_en']) if pn and pn in sub_parts else legal_clean(c['name_en']),
                              base_name(c['name_en']), company_short(c), title_variants(c)[-1]),
                 'subtitle': Var(' · '.join(sub_parts), ' · '.join(sub_parts[-2:]), city),
                 'facts': fl,
                 'why': Var(*(wl[0] or [''])),
                 'learn': Var(*(wl[1] or [''])),
                 'learn_label': 'Фокус визита'}
        z = (c.get('name_zh') or '').strip()
        bn = base_name(c['name_en'])
        pairs = []
        if '/' in bn and '/' in z:
            pairs.append((bn.split('/')[0].strip(), z.split('/')[0].strip()))
        elif re.search(r'\s[—–]\s', bn) and nv[0]:
            head = re.split(r'\s[—–]\s', bn)[0]
            zw = base_name(z).split()
            if len(zw) > len(head.split()):
                pairs.append((head, ' '.join(zw[:len(head.split())])))
        for pr in reversed(pairs):
            combos.insert(1, pr)
        slide['title'].v = [t for t, n in combos]  # без удаления повторов: title и native идут парами
        slide['native'].v = [n for t, n in combos]
        if not slide['logo']:
            slide.pop('logo')
        if not gh:
            slide.pop('ghost')
            slide.pop('ghost_thai')
        slides.append(slide)

    # 7. выгоды
    inc_short = [re.sub(r'\s+с компаниями программы$', ' программы', i) for i in inc_ru]
    stay = next((i for i in inc_ru if i.lower().startswith('проживан')), f'Проживание {nights} ночей')
    extra_night = re.search(r'ночь после дня (\d+)', tour.get('departure_ru', ''))
    sector_icon = SECTOR_ICON.get(tour.get('sector'), 'target')
    sixth_title = topic if len(topic) <= 26 else cnt(n_comp, 'компания', 'компании', 'компаний')
    # регистр — как в названии тура: «e-commerce», «от Emaar …», но «Jebel Ali», «Абу-Даби»
    low = lambda x: x[:1].lower() + x[1:] if (x[:1].lower() + x[1:]) in tour.get('title_ru', '') else x
    sixth_text = (', '.join(low(s) if i else s for i, s in enumerate(subs[:-1])) + ' и ' + low(subs[-1]) if len(subs) > 1
                  else subs[0] if subs else ' · '.join(tagline[:3]))
    sixth_text = cap(sixth_text) + ('\nв одном городе' if len(cities) == 1 else '\n' + ' + '.join(cities))
    slides.append({'type': 'benefits', 'items': [
        {'title': 'Переговоры\nс компаниями', 'text': Var(inc_short[0] if inc_short else 'Все визиты и переговоры программы', 'Все визиты программы'), 'icon': 'users'},
        {'title': 'Закрытые двери', 'text': Var('Штаб-квартиры, обычно закрытые\nдля случайных визитов' if 'штаб' in hq.lower() else hq, 'Штаб-квартиры компаний'), 'icon': 'building'},
        {'title': 'Трансферы', 'text': Var(cap(re.sub(r'^Трансферы\s+', '', transfers)) if transfers and not tr_generic else 'Включены', 'Включены'), 'icon': 'car'},
        {'title': cap(stay), 'text': f'Включая ночь после дня {extra_night.group(1)}' if extra_night else '', 'icon': 'home'},
        {'title': 'Перевод и сопровождение', 'text': Var(f'{cap(lang_slash)}\nна всех встречах' if lang else 'На всех встречах', 'На всех встречах'), 'icon': 'headphones'},
        {'title': Var(sixth_title, cnt(n_comp, 'компания', 'компании', 'компаний')), 'text': Var(sixth_text, sixth_text.split('\n')[0]), 'icon': sector_icon},
    ]})

    # 8. формат и условия
    pricing = tour.get('pricing') or {}
    total = pricing.get('total_excl_flights')
    basis = pricing.get('basis_ru', '')
    price_val = f'{total:,}'.replace(',', ' ') + ' ₽' if isinstance(total, (int, float)) and total else 'По запросу'
    price_sub = 'на участника, без авиаперелёта' if 'участник' in basis else basis
    start = tour.get('start_date')
    vis_city = ' и '.join(loct(c) for c in cities)
    slides.append({'type': 'conditions', 'facts': [
        {'icon': 'calendar', 'value': cnt(days, 'день', 'дня', 'дней'), 'label': f'/ {cnt(nights, "ночь", "ночи", "ночей")}',
         'sub': Var(f'{cnt(len(itin), "день", "дня", "дней")} визитов в {vis_city}', f'{cnt(len(itin), "день", "дня", "дней")} визитов')},
        {'icon': sector_icon, 'value': cnt(n_comp, 'компания', 'компании', 'компаний'), 'label': Var(topic, 'в программе'),
         'sub': Var(', '.join(low(s) for s in subs) if subs else ', '.join(tagline[:3]), ', '.join(tagline[:2]), '')},
        {'icon': 'briefcase', 'value': price_val, 'label': 'стоимость', 'sub': price_sub},
        {'icon': 'flag', 'value': start if start else 'По запросу', 'label': 'ближайшие даты', 'sub': '' if start else 'даты уточняются'},
    ],
        'includes': Var([inc_ru, inc_short]),
        'includes_note': 'авиаперелёт оплачивается отдельно' if 'без авиа' in (pricing.get('total_label_ru') or '').lower() or 'без авиа' in basis else '',
        'footer': Var(f'<b>Прилёт:</b> {tour.get("arrival_ru", "")}.<br><b>Вылет:</b> {tour.get("departure_ru", "")}',
                      f'<b>Прилёт:</b> {tour.get("arrival_ru", "").split(" (")[0]}.<br><b>Вылет:</b> {tour.get("departure_ru", "").split(" — ")[0]}.')})
    # includes — Var из двух списков: исправим (Var раскладывает списки)
    slides[-1]['includes'] = Var(None)
    slides[-1]['includes'].v = [inc_ru, inc_short]

    # 9. контакты
    contact = tour.get('contact') or {}
    cts = []
    for i, x in enumerate(CONTACTS_STATIC):
        if x:
            cts.append(x)
        elif i == 2:
            cts.append({'type': 'phone', 'text': contact.get('phone') or '+86 137 6171 63 55'})
        else:
            cts.append({'type': 'telegram', 'text': f'TG: {contact.get("telegram") or "@ostapdotcenko"}'})
    slides.append({'type': 'contacts', 'note': 'Соберём делегацию под\nзадачи вашей компании', 'contacts': cts, 'qr': QR})

    deck = {'title': f'{tour["title_ru"]} — Global Tech Tour',
            'output': None,
            'source': f'{SITE}/expeditions/{tour["tour_id"]} (данные экспедиции и карточек компаний с сайта, конвертер from_site.py, {datetime.date.today():%d.%m.%Y})',
            'robot': cinfo[1],
            'slides': slides}
    if not deck['robot']:
        deck.pop('robot')
    return deck, new_logos, brands, missing


def combo_fix(deck_plain, deck_var, levels):
    """У карточек компаний title и native меняются парой — уровень title управляет обоими."""
    for i, s in enumerate(deck_var['slides']):
        if s.get('_combo'):
            lv = levels.get(f'slides.{i}.title', 0)
            deck_plain['slides'][i]['title'] = s['title'].get(lv)
            nat = s['native'].get(lv)
            if nat:
                deck_plain['slides'][i]['native'] = nat
            else:
                deck_plain['slides'][i].pop('native', None)
    return deck_plain


def check_fit(deck):
    import build
    html = build.render_html(deck, deck['slides'])
    with tempfile.TemporaryDirectory(prefix='gtt-fit-') as td:
        p = Path(td) / 'deck.html'
        p.write_text(html, encoding='utf-8')
        env = dict(os.environ)
        env.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/opt/pw-browsers')
        r = subprocess.run(['node', str(HERE / 'fit_check.mjs'), str(p)], capture_output=True, text=True, env=env, check=True)
    return json.loads(r.stdout.strip().splitlines()[-1])


def autofit(deck_var, rounds=8, verbose=True):
    levels = {}
    paths = dict(var_paths(deck_var))
    plain = None
    for rnd in range(rounds):
        plain = combo_fix(resolve(deck_var, levels), deck_var, levels)
        issues = check_fit(plain)
        if not issues:
            if verbose:
                print(f'Автоподгонка: всё влезает (проход {rnd + 1})', file=sys.stderr)
            return plain, []
        bumped = False
        stuck = []
        for it in issues:
            base = f'slides.{it["slide"]}.{it["field"]}'
            # подходящие поля-варианты: само поле или вложенные (facts.2 → facts.2.label/sub/value)
            cands = [p for p in paths if p == base or p.startswith(base + '.')]
            # сначала самые «длинные» по тексту, у которых ещё есть запас
            cands = [p for p in cands if levels.get(p, 0) < len(paths[p].v) - 1]
            if not cands:
                stuck.append(it)
                continue
            cands.sort(key=lambda p: -len(str(paths[p].get(levels.get(p, 0)))))
            p = cands[0]
            levels[p] = levels.get(p, 0) + 1
            bumped = True
        if verbose:
            print(f"Автоподгонка, проход {rnd + 1}: " + "; ".join(f"{it['slide'] + 1}:{it['field']}" for it in issues) + (f", не исправить: {len(stuck)}" if stuck else ""), file=sys.stderr)
        if not bumped:
            return plain, stuck
    plain = combo_fix(resolve(deck_var, levels), deck_var, levels)
    return plain, check_fit(plain)


def clean(deck):
    """Убираем пустые поля, чтобы JSON был как у ручных презентаций."""
    def c(o):
        if isinstance(o, dict):
            return {k: c(v) for k, v in o.items() if v not in (None, '', []) or k in ('text',)}
        if isinstance(o, list):
            return [c(v) for v in o]
        return o
    return c(deck)


def default_name(tour):
    cinfo = COUNTRY.get(tour['country'], (tour['country'],))
    tid = tour['tour_id']
    topic = None
    for suf, t in TOPIC:
        if suf in tid:
            topic = t
            break
    if not topic:
        topic = re.sub(r'-expedition$', '', tid)
        for pre in ('thailand-', 'japan-', 'vietnam-', 'india-', 'malaysia-', 'korea-', 'indonesia-', 'uae-', 'china-'):
            topic = topic.replace(pre, '')
    return f'{datetime.date.today():%Y-%m-%d}-{cinfo[0]}-{topic}'


def main():
    ap = argparse.ArgumentParser(description='Экспедиция с globaltechtour.ru → JSON презентации')
    ap.add_argument('tour_id', nargs='?')
    ap.add_argument('--bundle', help='путь к сохранённому JS-бандлу сайта (иначе скачать)')
    ap.add_argument('--out', help='куда записать JSON (по умолчанию презентации/контент/<дата>-<страна>-<тема>.json)')
    ap.add_argument('--build', action='store_true', help='сразу собрать PDF и превью (build.py)')
    ap.add_argument('--no-logos', action='store_true', help='не скачивать логотипы')
    ap.add_argument('--no-fit', action='store_true', help='без автоподгонки в Chromium')
    ap.add_argument('--list', nargs='?', const='', metavar='СТРАНА', help='список экспедиций (код страны: th, jp, …)')
    ap.add_argument('--dump', help='сохранить данные сайта (экспедиции и компании) в JSON')
    a = ap.parse_args()

    src, where = load_bundle(a.bundle)
    tours, comps = parse_site(src)
    print(f'Данные сайта: {len(tours)} экспедиций, {len(comps)} компаний ({where})', file=sys.stderr)
    if a.dump:
        Path(a.dump).write_text(json.dumps({'tours': tours, 'companies': comps}, ensure_ascii=False, indent=1), encoding='utf-8')
    if a.list is not None:
        for t in tours.values():
            if not a.list or t['country'] == a.list:
                print(f'{t["country"]}  {t["tour_id"]:55s} {t["title_ru"]}')
        return
    if not a.tour_id:
        ap.error('нужен tour_id (или --list)')
    tour = tours.get(a.tour_id)
    if not tour:
        sys.exit(f'Нет экспедиции {a.tour_id} (см. --list)')
    deck_var, new_logos, brands, missing = build_deck(tour, comps, logos_ok=not a.no_logos)
    if missing:
        print('  ! нет карточек компаний на сайте: ' + ', '.join(missing), file=sys.stderr)
    out = Path(a.out) if a.out else PRES / 'контент' / f'{default_name(tour)}.json'
    name = out.stem
    deck_var['output'] = name
    if a.no_fit:
        deck = combo_fix(resolve(deck_var, {}), deck_var, {})
        stuck = []
    else:
        deck, stuck = autofit(deck_var)
    for it in stuck:
        print(f'  ! не влезает: слайд {it["slide"] + 1}, поле {it["field"]} ({it["why"]})', file=sys.stderr)
    deck = clean(deck)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(deck, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    added = register_brands(new_logos, tour, brands) if not a.no_logos else []
    print(f'JSON: {out}  ({len(deck["slides"])} слайдов)')
    if added:
        print('Новые логотипы в brands.json: ' + ', '.join(added))
    if a.build:
        subprocess.run([sys.executable, str(HERE / 'build.py'), str(out)], check=True)


if __name__ == '__main__':
    main()
