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
]
SECTOR_FOLDER = {'consumer': 'ритейл', 'food': 'еда', 'internet': 'техгиганты', 'ai': 'ии', 'finance': 'техгиганты',
                 'medtech': 'медицина', 'robotics': 'роботы', 'auto': 'авто', 'appliances': 'бытовая-техника'}
SECTOR_ICON = {'consumer': 'store', 'food': 'cart', 'internet': 'smartphone', 'ai': 'cpu', 'finance': 'chart',
               'medtech': 'target', 'robotics': 'cpu', 'auto': 'car'}
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
    if not p:
        return word
    q = p.inflect(set(grams))
    if not q:
        return word
    w = q.word
    if word[:1].isupper():
        w = w[:1].upper() + w[1:]
    return w


def loct(city):
    """Бангкок → в Бангкоке."""
    w = inflect(city, {'loct'}) if MORPH else city
    return w


def gent(city):
    return inflect(city, {'gent'}) if MORPH else city


def is_verb(word):
    p = parse_word(word.strip('«»"(),.;:'))
    return bool(p and p.tag.POS in ('VERB',) and word[:1].islower())


def cap(s):
    return s[:1].upper() + s[1:] if s else s


def sentences(text):
    text = re.sub(r'\s+', ' ', text or '').strip()
    parts = re.split(r'(?<=[.!?])\s+(?=[А-ЯЁA-Z«"0-9])', text)
    out = []
    for p in parts:  # склеиваем ложные разрывы после сокращений
        if out and re.search(r'(?:\b(?:тыс|млн|млрд|г|гг|д-р|др|Co|Ltd|Inc|Dr|St|т\.е|т\.д|англ|им)\.|\b[A-ZА-Я]\.)$', out[-1]):
            out[-1] += ' ' + p
        else:
            out.append(p)
    return [p.strip() for p in out if p.strip()]


def strip_parens(s):
    return re.sub(r'\s*\([^()]*\)', '', s).strip()


def end_dot(s):
    s = s.strip().rstrip(',;:—– ')
    return s if s.endswith(('.', '!', '?', '»')) else s + '.'


def clause_cuts(s, limit):
    """Варианты укорачивания фразы по границам частей (запятая, тире, «;», «:»), от длинного к короткому."""
    s = s.strip()
    out = []
    if len(s) <= limit:
        out.append(s)
    for m in reversed(list(re.finditer(r'[,;:]\s| — | – ', s))):
        head = s[:m.start()].strip()
        if 25 <= len(head) <= limit and head.count('(') == head.count(')') and head.count('«') == head.count('»'):
            out.append(head)
    if not out:  # нет подходящей границы — режем по словам
        words, acc = s.split(), ''
        for w in words:
            if len(acc) + len(w) + 1 > limit:
                break
            acc = (acc + ' ' + w).strip()
        acc = re.sub(r'\s+(?:в|на|и|с|со|по|к|о|об|у|от|до|для|из|за|при|как|а|но)$', '', acc)
        out.append(acc)
    seen, res = set(), []
    for o in out:
        if o not in seen:
            seen.add(o)
            res.append(o)
    return res


# ---------------------------------------------------------------- факты из описания компании
NUMRE = r'(\d{1,3}(?:[   ]\d{3})+|\d+(?:,\d+)?)'
MULT = r'(тыс\.|тысяч\w*|млн|млрд|трлн)'
CUR = r'(бат\w*|долл\w*|евро|юан\w*|иен\w*|рупи\w*|вон\w*|дирхам\w*|ринггит\w*|донг\w*)'
APPROX = [('более чем в', '+'), ('более чем на', '+'), ('более чем', '+'), ('свыше', '+'), ('более', '+'),
          ('больше', '+'), ('около', '~'), ('почти', '~'), ('примерно', '~'), ('порядка', '~'), ('приблизительно', '~'),
          ('до', 'до '), ('менее', '<'), ('не менее', '+')]
MONTHS = 'января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря'
STOPW = {'в', 'на', 'и', 'с', 'со', 'по', 'к', 'о', 'у', 'от', 'до', 'для', 'из', 'за', 'при', 'через', 'как', 'а', 'но',
         'или', 'что', 'это', 'по', 'среди', 'после', 'перед', 'между', 'под', 'над', 'без', 'включая', 'а также', 'также',
         'против', 'вокруг', 'внутри', 'вне', 'благодаря', 'около', 'свыше', 'более', 'почти', 'чем', 'года', 'году', 'год'}
ICON_STEMS = [
    (r'магазин|точ[ек]|точк|филиал|кофейн|аптек|бутик|киоск|отделени|супермаркет|гипермаркет|ресторан', 'store'),
    (r'пользовател|клиент|сотрудник|курьер|человек|специалист|посетител|партн[её]р|пациент|подписчик|покупател|участник|врач|бариста', 'users'),
    (r'стран|провинц|рынк|регион|город|штат', 'globe'),
    (r'завод|предприяти|площадк|фабрик|центр|клиник|больниц|кухн|склад|лаборатор', 'building'),
    (r'проект|контракт|сделк|организац|компани|стартап', 'briefcase'),
    (r'заказ', 'cart'),
    (r'позици|товар|продукт|SKU|бренд|упаков', 'package'),
]


def num_value(raw, sign, mult='', money_cur=''):
    n = raw.replace(' ', ' ').replace(' ', ' ')
    v = n
    if mult:
        v += ' ' + {'тыс.': 'тыс.'}.get(mult, mult if not mult.startswith('тысяч') else 'тыс.')
    if money_cur:
        if money_cur.startswith('долл') or money_cur == '$':
            v = '$' + v
        elif money_cur == 'евро' or money_cur == '€':
            v = '€' + v
        else:
            v += ' ' + {'бат': 'бат'}.get(money_cur[:3], money_cur)
    if sign == '+':
        v = (v + '+') if not mult and not money_cur else v.replace(n, n + '+', 1)
    elif sign == '~':
        v = '~' + v
    elif sign:
        v = sign + v
    return v


def np_after(text, i, max_words=4):
    """Именная группа после позиции i: слова до знака препинания/предлога."""
    rest = text[i:]
    m = re.match(r'\s*([^.,;:()—–\n]*)', rest)
    words = m.group(1).split() if m else []
    out = []
    for w in words:
        lw = w.lower()
        if out and (lw in STOPW or re.match(r'^(?:19|20)\d\d', lw)):
            break
        if not out and lw in STOPW:
            return []
        out.append(w)
        if len(out) >= max_words:
            break
    return out


def agree(words, n_for_agree, plus):
    """«в 135 магазинах» → «магазинов»: ставим слова в форму, согласованную с числом."""
    if not MORPH or not words:
        return words
    res = []
    changed = False
    for k, w in enumerate(words):
        p = parse_word(w)
        if not p or not w[:1].islower() or p.tag.POS not in ('NOUN', 'ADJF', 'PRTF'):
            res.append(w)
            if k == 0:
                return words
            continue
        case = p.tag.case
        if k == 0 and case in ('gent',):
            return words  # уже согласовано (15 430 магазинов)
        if k == 0 and case == 'nomn' and not plus:
            return words
        if case in ('gent',) and changed and p.tag.POS == 'NOUN':  # «точках сетей» — второе слово уже в родительном
            res.extend(words[k:])
            return res
        q = p.inflect({'gent', 'plur'}) if (plus or n_for_agree % 10 in (0, 5, 6, 7, 8, 9) or 11 <= n_for_agree % 100 <= 14) else (
            p.inflect({'gent', 'sing'}) if n_for_agree % 10 in (2, 3, 4) else p.inflect({'nomn', 'sing'}))
        res.append(q.word if q else w)
        changed = True
    return res


def nomn_phrase(words):
    """Первое существительное (и прилагательные перед ним) — в именительный падеж: «долю рынка» → «доля рынка»."""
    if not MORPH:
        return words
    res = list(words)
    for k, w in enumerate(words):
        p = parse_word(w)
        if not p or not w[:1].islower():
            break
        if p.tag.POS == 'NOUN':
            num = p.tag.number or 'sing'
            for j in range(k + 1):
                pj = parse_word(res[j])
                if pj and pj.tag.POS in ('NOUN', 'ADJF', 'PRTF'):
                    q = pj.inflect({'nomn', num}) if pj.tag.POS != 'NOUN' or j == k else None
                    if pj.tag.POS == 'NOUN' and j == k:
                        q = pj.inflect({'nomn', num})
                    if q:
                        res[j] = q.word
            break
        if p.tag.POS not in ('ADJF', 'PRTF'):
            break
    return res


def label_variants(words, limit=30):
    """Подпись к цифре: целиком, без прилагательных, только существительное (+родительный)."""
    words = [w for w in words if w]
    if not words:
        return ['']
    out = [' '.join(words)]
    if MORPH and len(words) > 1:
        keep = []
        for k, w in enumerate(words):
            p = parse_word(w)
            if p and p.tag.POS in ('ADJF', 'PRTF') and w[:1].islower() and k < len(words) - 1 and len(words) > 2:
                continue
            keep.append(w)
        out.append(' '.join(keep))
    for n in range(len(words) - 1, 0, -1):
        cut = words[:n]
        while cut and cut[-1].lower() in STOPW:
            cut = cut[:-1]
        if cut:
            out.append(' '.join(cut))
    res = []
    for o in out:
        if o and o not in res:
            res.append(o)
    good = [o for o in res if len(o) <= limit]
    return good + [o for o in res if o not in good]


def year_phrase(clause, skip=None):
    for m in re.finditer(r'(?:(?:по состоянию на|по данным на|по данным|в|к|на|с|за)\s+)?(?:(?:' + MONTHS.replace('я', '[яь]') + r'|\w+е)\s+)?((?:19|20)\d\d)(?:\s*(?:году|года|год|г\.)|-м|-х|-го)?', clause):
        if skip and m.group(1) == skip:
            continue
        txt = m.group(0).strip()
        if len(txt) > 30:
            txt = m.group(1)
        return txt
    return ''


def icon_for(label):
    for rx, ic in ICON_STEMS:
        if re.search(rx, label, re.I):
            return ic
    return 'chart'


def extract_facts(desc, city_ru=''):
    """Факты из описания: числа с подписью, год основания, «первый/крупнейший», названия брендов и платформ."""
    text = re.sub(r'\s+', ' ', desc or '').strip()
    facts = []
    sents = sentences(text)

    def add(kind, value, label_words, sub, icon, pos, prio):
        if not value:
            return
        facts.append({'kind': kind, 'value': value.strip(), 'labels': label_variants(label_words) if isinstance(label_words, list) else [label_words],
                      'subs': [s for s in sub if s] if isinstance(sub, list) else ([sub] if sub else []), 'icon': icon, 'pos': pos, 'prio': prio})

    offset = 0
    for sent in sents:
        base = text.find(sent, offset)
        offset = max(offset, base)
        # --- числа
        for m in re.finditer(r'(\$\s?)?(?<![\w.,/–-])' + NUMRE + r'(\+)?(?![.,]\d|[/–-]\d|\d)', sent):
            raw = m.group(2)
            pre_dollar = bool(m.group(1))
            after = sent[m.end():]
            before = sent[:m.start()]
            digits = raw.replace(' ', '').replace(' ', '').replace(' ', '')
            # годы и даты
            if re.fullmatch(r'(19|20)\d\d', digits) and not re.match(r'\s*(%|' + MULT + r'|' + CUR + r')', after):
                continue
            if re.match(r'\s*(' + MONTHS + r')', after):
                continue
            if re.search(r'(?:версии|версия|v)\s*$', before) or re.match(r'\s*(?:мл|г|кг|см|мм|ч|час|мин)\b', after):
                continue
            mm = re.match(r'\s*' + MULT, after)
            mult = mm.group(1) if mm else ''
            aft2 = after[mm.end():] if mm else after
            cm = re.match(r'\s*' + CUR, aft2)
            cur = cm.group(1) if cm else ''
            aft3 = aft2[cm.end():] if cm else aft2
            pct = re.match(r'\s*%', aft2)
            if pre_dollar:
                cur = cur or 'долл'
            sign = '+' if m.group(3) else ''
            for word, sg in APPROX:
                if re.search(r'(?:^|\s)' + word + r'\s*$', before, re.I):
                    sign = sign or sg
                    break
            # «на 3-14 дней» и т.п. уже отброшены; номер в названии («Series D») — нет цифр
            clause_start = max(before.rfind(','), before.rfind(';'), before.rfind('('), before.rfind(' — '), before.rfind(':'))
            clause = sent[clause_start + 1: m.end() + 120]
            nval = float(digits.replace(',', '.')) if digits.replace(',', '').isdigit() else 0
            if pct:
                after_pct = aft2[pct.end():]
                words = np_after(after_pct, 0, 4)
                if not words or after_pct.strip().startswith((')', ',')):
                    # «долю рынка доставки еды (около 47%)» → подпись — слова перед скобкой
                    pre = re.sub(r'\(\s*(?:около|свыше|более|почти|примерно)?\s*$', '', before).strip()
                    pw = re.findall(r'[\w-]+', pre.split(',')[-1])[-4:]
                    while pw and (pw[0].lower() in STOPW or is_verb(pw[0])):
                        pw = pw[1:]
                    words = nomn_phrase(pw)
                if not words:
                    continue
                v = ('~' if sign == '~' else '') + raw + '%' + ('+' if sign == '+' else '')
                add('pct', v, words, [year_phrase(clause)], 'trending', base + m.start(), 1)
                continue
            if cur:
                v = num_value(raw, sign if sign in ('+', '~') else '', mult, cur)
                ctx = before[-70:].lower()
                lab = None
                for rx, lb in [(r'выручк|доход|продаж', 'выручка'), (r'капитализац', 'капитализация'), (r'оцен', 'оценка компании'),
                               (r'убыт', 'убытки'), (r'привлек|раунд|series|инвестиций от|получил', 'привлечено инвестиций'),
                               (r'инвест|вложи|вложен', 'инвестиции'), (r'продал|сделк|за\s*$', 'сумма сделки'),
                               (r'стоимост|модернизац', 'стоимость проекта')]:
                    if re.search(rx, ctx):
                        lab = lb
                if not lab:
                    w = np_after(aft3, 0, 3)
                    lab = ' '.join(w) if w and not is_verb(w[0]) else ''
                if not lab:
                    continue
                if 'привлечено' in lab and re.search(r'series\s+\w+', clause, re.I):
                    sub = re.search(r'series\s+\w+(?:\s+extension)?', clause, re.I).group(0)
                    yp = year_phrase(clause)
                    sub = f'раунд {sub}' + (f', {yp}' if yp else '')
                else:
                    sub = year_phrase(clause)
                add('money', v, lab, [sub], 'chart' if lab in ('выручка', 'капитализация', 'убытки') else 'briefcase', base + m.start(), 1)
                continue
            # счётные величины
            words = np_after(aft2, 0, 4)
            if not words:
                continue
            if words[0][:1].isupper() and not re.match(r'^[A-Z]', words[0]) is None and len(words) == 1:
                continue
            if is_verb(words[0]) or words[0].lower() in ('лет', 'года', 'год', 'летнего', 'летия', 'раз', 'процентов'):
                if words[0].lower() == 'лет' and re.search(r'(?:спустя|свыше|более|почти|уже)\s*$', before):
                    pass
                else:
                    continue
            p0 = parse_word(words[0])
            if MORPH and p0 and p0.tag.POS not in ('NOUN', 'ADJF', 'PRTF') and not words[0][:1].isupper():
                continue
            if not mult and nval < 2:
                continue
            n_ag = int(nval) if nval == int(nval) else 5
            words2 = agree(words, n_ag, sign == '+' or bool(mult))
            v = num_value(raw, sign if sign in ('+', '~') else ('до ' if sign == 'до ' else ''), mult)
            rest_words = np_after(aft2, 0, 8)[len(words):]
            subs = [year_phrase(clause)]
            add('count', v, words2, subs, icon_for(' '.join(words2)), base + m.start(), 1)
        # --- год основания / запуска
        for m in re.finditer(r'(основан\w*|созда\w*|запущен\w*|запуст\w*|открыл\w*|открыт\w*|образован\w*|зарегистрирован\w*|появил\w*|вышедш\w*|вышл\w*|начинал\w*)'
                             r'([^.;]{0,45}?)\b((?:19|20)\d\d)(?:\s*(?:году|года|год|г\.)|-м)?', sent):
            verb, mid, year = m.group(1).lower(), m.group(2), m.group(3)
            if re.search(r'\d{4}', mid):
                continue
            if verb.startswith(('вышедш', 'вышл')):
                if 'бирж' not in mid and 'IPO' not in mid and 'Nasdaq' not in mid:
                    continue
                lab = 'IPO на бирже'
            else:
                lab = {'основ': 'год основания', 'созда': 'год создания', 'запущ': 'год запуска', 'запус': 'год запуска',
                       'откры': 'год открытия', 'образ': 'год образования', 'зарег': 'год регистрации', 'появи': 'год появления',
                       'начин': 'начало истории'}.get(verb[:5], 'год основания')
            tail = sent[m.end():]
            sm = re.match(r'\s*,?\s*((?:в|во|со штаб-квартирой в)\s+[А-ЯЁA-Z][\w-]+(?:\s+[А-ЯЁA-Z][\w-]+)?)', tail)
            sub = sm.group(1) if sm else ''
            if not sub:
                dm = re.search(r'(\d{1,2})\s+(' + MONTHS + r')\s*$', mid)
                if dm:
                    sub = f'{dm.group(1)} {dm.group(2)} {year} года'
            if not sub:
                sm = re.search(r'\bв\s+([А-ЯЁ][\w-]+е)\b', mid)
                sub = f'в {sm.group(1)}' if sm else ''
            add('year', year, lab, [sub], 'flag', base + m.start(), 3)
        # --- «первый / крупнейший / №1»
        for m in re.finditer(r'\b(перв(?:ый|ая|ое|ым|ой|ую)|крупнейш(?:ий|ая|ее|им|ей|ую)|единственн(?:ый|ая|ым|ой))\s+'
                             r'(?:(в мире|в Таиланде|в стране|в Азии|в АСЕАН|в Юго-Восточной Азии|в регионе|в Японии|в Китае|во Вьетнаме|в Индии|в Индонезии|в Малайзии|в Корее|в ОАЭ)\s+)?'
                             r'([^.,;:()—]{3,60})', sent):
            w0, scope, rest = m.group(1).lower(), m.group(2) or '', m.group(3)
            before = sent[:m.start()]
            if re.search(r'(?:одн\w+\s+из|в\s+числ\w+)\s*$', before):
                continue
            p = parse_word(w0)
            if MORPH and p and p.tag.case not in ('nomn', 'ablt'):
                continue
            words = np_after(rest, 0, 4)
            if not words:
                continue
            words = nomn_phrase(words) if MORPH else words
            if w0.startswith('перв'):
                val = 'Первый' if not words or (parse_word(words[0]) and parse_word(words[0]).tag.gender != 'femn') else 'Первая'
                g = parse_word(words[-1]) if words else None
                head = None
                for w in words:
                    pw = parse_word(w)
                    if pw and pw.tag.POS == 'NOUN':
                        head = pw
                        break
                if head:
                    val = {'femn': 'Первая', 'neut': 'Первое'}.get(head.tag.gender, 'Первый')
            elif w0.startswith('единств'):
                head = next((parse_word(w) for w in words if parse_word(w) and parse_word(w).tag.POS == 'NOUN'), None)
                val = {'femn': 'Единственная', 'neut': 'Единственное'}.get(head.tag.gender if head else '', 'Единственный')
            else:
                val = '№1'
            if scope:
                val = f'{val} {scope}'
            add('top', val, words, [], 'trending' if val.startswith('№') else 'star', base + m.start(), 2)
        for m in re.finditer(r'\bодн\w+\s+из\s+(двух|трёх|трех|пяти|десяти|\d+)\s+(крупнейш\w+|ведущ\w+)\s+([^.,;:()—]{3,60})', sent):
            nmap = {'двух': 2, 'трёх': 3, 'трех': 3, 'пяти': 5, 'десяти': 10}
            n = nmap.get(m.group(1), m.group(1))
            words = np_after(m.group(3), 0, 4)
            if words:
                add('top', f'Топ-{n}', words, [], 'trending', base + m.start(), 2)
        # --- названия брендов / платформ / моделей
        for m in re.finditer(r'\b(бренд\w*|линейк\w+|платформ\w+|приложени\w+|модел\w+|сервис\w*|кошел[её]к\w*|кошельк\w*|'
                             r'программ\w+|формат\w*|технологи\w+|систем\w+|проект\w*|суббренд\w*|маркетплейс\w*|'
                             r'ассистент\w*|супер-апп\w*|супер-приложени\w*|акселератор\w*|инкубатор\w*|тест\w*)\s+'
                             r'(?:под брендом\s+)?«?([A-Z][\w&+\'’.!-]*(?:\s+(?:[A-Z0-9][\w&+\'’.!-]*|of|the|by|for|&))*)»?', sent):
            kw, name = m.group(1), m.group(2).strip().rstrip('.')
            if len(name) < 2 or name.upper() in ('NYSE', 'SE', 'COVID-19', 'IPO', 'USA', 'NSF', 'FDA', 'AI', 'ИИ', 'DNA'):
                continue
            name_words = name.split()
            while name_words and name_words[-1] in ('of', 'the', 'by', 'for', '&'):
                name_words.pop()
            name = ' '.join(name_words[:3])
            lab = inflect(kw, {'nomn', 'sing'}) if MORPH else kw
            tail = sent[m.end():]
            sm = re.match(r'\s*(?:\([^)]*\)\s*)?(?:—|–)\s*([^.,;:()]{3,45})', tail)
            sub = sm.group(1).strip() if sm else ''
            ic = {'платформ': 'smartphone', 'приложе': 'smartphone', 'кошел': 'smartphone', 'кошель': 'smartphone', 'модел': 'cpu',
                  'ассист': 'cpu', 'сервис': 'smartphone', 'маркет': 'cart', 'тест': 'target'}.get(kw[:7].lower(), None)
            if not ic:
                ic = {'платформ'[:5]: 'smartphone'}.get(kw[:5].lower(), 'star')
            add('name', name, lab, [sub], ic, base + m.start(), 4)
        # --- биржа
        for m in re.finditer(r'(Фондов\w+ бирж\w+ Таиланда|Nasdaq|NYSE|SET\b|Фондов\w+ бирж\w+)', sent):
            ex = m.group(1)
            val = {'Nasdaq': 'Nasdaq', 'NYSE': 'NYSE'}.get(ex, 'SET' if 'Таиланд' in ex or ex == 'SET' else 'Биржа')
            add('listing', val, 'публичная компания', [year_phrase(sent[max(0, m.start() - 60): m.end() + 40])], 'chart', base + m.start(), 5)
    # дубли по значению
    res, seen = [], set()
    for f in sorted(facts, key=lambda f: (f['prio'], f['pos'])):
        key = f['value'].lower()
        if key in seen:
            continue
        seen.add(key)
        res.append(f)
    return res


def pick_facts(cands, extra):
    """4 факта: цифры → «первый/№1» → бренды → год → биржа → дополнительные (группа, город визита)."""
    chosen, kinds = [], {}
    limits = {'year': 1, 'name': 2, 'listing': 1, 'top': 2}
    for f in cands + extra:
        k = f['kind']
        if kinds.get(k, 0) >= limits.get(k, 9):
            continue
        if any(f['value'].lower() == c['value'].lower() for c in chosen):
            continue
        chosen.append(f)
        kinds[k] = kinds.get(k, 0) + 1
        if len(chosen) == 4:
            break
    # порядок: цифры/лидерство сначала, как в ручной презентации
    order = {'count': 0, 'pct': 0, 'money': 0, 'top': 1, 'name': 2, 'year': 3, 'listing': 4, 'group': 5, 'city': 6}
    chosen.sort(key=lambda f: (order.get(f['kind'], 9), f.get('pos', 0)))
    return chosen


# ---------------------------------------------------------------- тексты о компании
def predicate(sent, name):
    """Главная мысль первого предложения: «X — крупнейший переработчик…» → «крупнейший переработчик…»;
    «X, входящая в …, управляет сетью…» → «управляет сетью…»."""
    s = sent
    words = s.split()
    dash = re.search(r'\s[—–]\s', s)
    pre = s[:dash.start()] if dash else s
    verb_at = None
    depth = 0
    pos = 0
    for w in pre.split():
        st = pre.find(w, pos)
        pos = st + len(w)
        depth += w.count('(') - w.count(')')
        if depth == 0 and is_verb(w):
            verb_at = st
            break
    if verb_at is not None:
        rest = s[verb_at:]
    elif dash:
        rest = s[dash.end():]
    else:
        rest = s
    return rest.strip()


def why_variants(c):
    sents = sentences(c.get('desc_ru', ''))
    if not sents:
        return []
    pred = predicate(sents[0], c['name_en'])
    pred = strip_parens(pred)
    out = []
    for lim in (120, 95, 75):
        for v in clause_cuts(pred, lim):
            v = end_dot(cap(v))
            if v not in out:
                out.append(v)
    return out


LEARN_RX = (r'технолог|ИИ|искусствен|платформ|цифров|приложени|запуст|запущ|разработ|инновац|R&D|автоматиз|робот|данн|'
            r'e-commerce|онлайн|доставк|линейк|формат|систем|сервис|программ|модел|экспорт|франчайз|стратеги|ребрендинг|'
            r'омниканал|live|стрим|аналитик|прослеживаем|завод|производств|лаборатор|диагност|терапи|клиник')


def learn_variants(c, used=''):
    sents = sentences(c.get('desc_ru', ''))
    cands = []
    for k, s in enumerate(sents[1:], 1):
        score = len(re.findall(LEARN_RX, s, re.I)) * 2 + (1 if k == len(sents) - 1 else 0)
        cands.append((score, k, s))
    if not cands and sents:  # одно предложение — берём его вторую половину
        parts = re.split(r',\s|;\s', sents[0])
        if len(parts) > 2:
            cands.append((0, 0, ', '.join(parts[-2:])))
    if not cands:
        return []
    cands.sort(key=lambda x: (-x[0], x[1]))
    s = strip_parens(cands[0][2])
    out = []
    for lim in (130, 105, 80, 60):
        for v in clause_cuts(s, lim):
            v = end_dot(cap(v))
            if v not in out:
                out.append(v)
    return out


def parent_group(c):
    d = c.get('desc_ru', '')
    m = re.search(r'(?:входящ\w+ в|в составе|часть|дочерн\w+ (?:компани\w+|структур\w+)|подразделение|принадлеж\w+|'
                  r'контролируем\w+|структур\w+ конгломерата|конгломерата|флагманский кошел[её]к|совместн\w+ предприяти\w+)\s+([^,.;—()]{2,70})', d)
    if not m:
        return ''
    seg = m.group(1)
    lat = re.findall(r'[A-Z][\w&.\'’-]*(?:\s+(?:[A-Z][\w&.\'’-]*|of|and|&))*', seg)
    lat = [x for x in lat if x not in (c['name_en'],) and len(x) > 1]
    return lat[0].strip() if lat else ''


def base_name(name):
    return re.sub(r'\s*\([^)]*\)', '', name).strip()


def paren_name(name):
    m = re.search(r'\(([^)]*)\)', name)
    return m.group(1).strip() if m else ''


def title_variants(c):
    n = base_name(c['name_en'])
    out = [n]
    short = re.sub(r'\s+(Thailand|Group|Corporation|Holdings|Public Company Limited|PCL|Co\.?,? Ltd\.?|Integrative Wellness|'
                   r'Scientific Wellness Center|Wellness Center|Longevity Clinic|Clinic|International)$', '', n).strip()
    if short and short != n:
        out.append(short)
    if '/' in n:
        out.append(n.split('/')[0].strip())
    if len(n.split()) > 2:
        out.append(' '.join(n.split()[:2]))
    res = []
    for o in out:
        if o not in res:
            res.append(o)
    return res


def native_variants(c):
    z = (c.get('name_zh') or '').strip()
    if not z or re.fullmatch(r'[\x00-\x7fÀ-ɏ\s.,&()\'’-]+', z):
        return [None]
    out = [z]
    if '(' in z:
        out.append(base_name(z))
    if '/' in z:
        out.append(z.split('/')[0].strip())
    out.append(None)
    res = []
    for o in out:
        if o not in res:
            res.append(o)
    return res


def ghost_for(c):
    z = (c.get('name_zh') or '').strip()
    if not z:
        return None, False
    if re.search(r'[฀-๿]', z):
        return re.split(r'[\s(/]', z)[0], True
    if re.search(r'[぀-ヿ一-鿿]', z):
        return re.sub(r'[\s()/A-Za-z0-9]', '', z)[:2], False
    return None, False


# ---------------------------------------------------------------- логотипы
def slugify(s):
    s = base_name(s).lower().replace('&', 'and').replace("'", '').replace('’', '')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s


def load_brands():
    return json.loads(BRANDS.read_text(encoding='utf-8')) if BRANDS.exists() else {}


def find_existing_logo(c, brands):
    names = {c['name_en'].lower(), base_name(c['name_en']).lower()}
    for k, v in brands.items():
        if v.get('site_logo') == c.get('logo') and v.get('logo'):
            return v['logo']
    for k, v in brands.items():
        bn = {x.lower() for x in v.get('names', [])}
        if names & bn and v.get('logo') and (ROOT / v['logo']).exists():
            return v['logo']
    return None


def trim_logo(path):
    """Обрезка пустых полей и белого/«шахматного» фона по краям (заливка от краёв, внутренний белый не трогаем)."""
    from PIL import Image
    from collections import deque
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    px = im.load()

    def light(p):
        return p[3] < 20 or (p[0] > 225 and p[1] > 225 and p[2] > 225) or (
            abs(p[0] - p[1]) < 8 and abs(p[1] - p[2]) < 8 and p[0] > 185)  # серые клетки «шахматки»

    border = [px[x, y] for x in range(w) for y in (0, h - 1)] + [px[x, y] for y in range(h) for x in (0, w - 1)]
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
    a = [p for p in im.getdata() if p[3] > 128]
    if a and sum(1 for p in a if p[0] > 235 and p[1] > 235 and p[2] > 235) > 0.85 * len(a):
        print(f'  ! логотип почти весь белый: {out}', file=sys.stderr)
    return out


def ensure_logo(c, tour, brands, new_logos, allow_download=True):
    if not c.get('logo'):
        return None
    hit = find_existing_logo(c, brands)
    if hit:
        return hit
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
    try:
        data = fetch(url, binary=True)
    except Exception as e:
        print(f'  ! не скачался логотип {url}: {e}', file=sys.stderr)
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
        if any(v.get('logo') == rel for v in brands.values()):
            continue
        names = []
        for n in (c['name_en'], base_name(c['name_en']), paren_name(c['name_en'])):
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
        BRANDS.write_text(json.dumps(brands, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
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
        self.v = [x for i, x in enumerate(vs) if x not in vs[:i]] or ['']

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
    parts = [p.strip() for p in re.split(r',\s*|\s+и\s+', tail) if p.strip()]
    return [cap(p) for p in parts]


def lines2(items, sep=' · '):
    """Список коротких слов → 2 строки."""
    if len(items) <= 1:
        return sep.join(items)
    k = (len(items) + 1) // 2
    return sep.join(items[:k]) + '\n' + sep.join(items[k:])


def company_short(c):
    return base_name(c['name_en'])


def build_deck(tour, comps, logos_ok=True):
    country = tour['country']
    cinfo = COUNTRY.get(country, (country, None, '', ''))
    itin = tour['itinerary']
    stats = tour.get('stats') or {}
    n_comp = stats.get('companies') or sum(len(d['companies']) for d in itin)
    days, nights = stats.get('days') or len(itin) + 1, stats.get('nights') or len(itin) + 1
    cities = []
    for d in itin:
        if d['city_ru'] not in cities:
            cities.append(d['city_ru'])
    main_city = itin[0]['city_ru'] if itin else ''
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
    for d, c in clist:
        logo_of[c['id']] = ensure_logo(c, tour, brands, new_logos, allow_download=logos_ok) if logos_ok else find_existing_logo(c, brands)
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
    counts = f'{cnt(n_comp, "компания", "компании", "компаний")}, {cnt(days, "день", "дня", "дней")}, {cnt(nights, "ночь", "ночи", "ночей")}'
    head_vars = []
    for lim in (70, 55, 42):
        for v in clause_cuts(re.sub(r'\s+и\s+[^,]+$', '', pos_head) if lim < 70 else pos_head, lim):
            head_vars.append(v)
    box_text = Var([f'{h} —\n{counts}' for h in head_vars if h.startswith(('От', 'Из', 'С ')) or len(h) < 60], counts)
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
        'footer': f'Global Tech Tour · {tour.get("eyebrow_ru", "").lower() or "бизнес-делегации"} · РФ/СНГ',
    })

    # 2. почему мы
    adv = [a['ru'] for a in tour.get('advantages', [])]
    with_us = (tour.get('why_vs_self') or {}).get('with_us_ru', [])
    inc_ru = [i['ru'] for i in tour.get('includes', [])]
    transfers = next((i for i in inc_ru if i.lower().startswith('трансфер')), '')
    hq = next((a for a in adv if 'штаб' in a.lower()), adv[0] if adv else '')
    route = next((a for a in adv if 'маршрут' in a.lower()), adv[1] if len(adv) > 1 else '')
    support = next((a for a in adv if 'сопровожд' in a.lower() or 'перевод' in a.lower()), adv[2] if len(adv) > 2 else '')
    slides.append({'type': 'why', 'items': [
        {'title': 'Большой опыт', 'text': 'Организуем benchmark‑туры и технологические экспедиции — от робототехники до общепита и напитков. Прямые контакты с руководством сотен компаний.'},
        {'title': 'Доступ к штаб-квартирам', 'text': Var(end_dot(cap(hq.replace('Доступ к штаб-квартирам, обычно', 'Визиты в штаб-квартиры, обычно').replace('обычно закрытым', 'обычно закрытые'))) + (' ' + end_dot(cap(with_us[0])) if with_us else ''), end_dot(cap(hq)))},
        {'title': 'Готовый маршрут', 'text': Var(end_dot(cap(route)) + (f' {transfers} включены.' if transfers else ''), end_dot(cap(route)))},
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
        gc = sorted({d['city_ru'] for d in g}, key=lambda x: cities.index(x))
        if len(cities) > 1:
            name += ' · ' + ' + '.join(gc)
        names = [company_short(comps[cid]) for d in g for cid in d['companies'] if cid in comps]
        notes = [x for d in g for x in (d.get('note_ru'),) if x]
        txt = ', '.join(names) if names else ''
        if notes and not names:
            txt = notes[0]
        full = txt + (' — ' + notes[0][0].lower() + notes[0][1:] if notes and names else '')
        items.append({'name': name, 'text': Var(full, txt)})
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
            dd = [d for d in itin if d['city_ru'] == cname]
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
                m = re.search(r'\(([≈~][^)]*)\)', tr)
                entry['leg'] = {'icon': 'plane' if stats.get('flights') else 'car', 'text': m.group(1) if m else ''}
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
        title2 = ' ·\n'.join(re.sub(r'\s+(Group|Thailand|Corporation)$', '', n) for n in names) if names else title
        tx = []
        if d.get('transfer_ru'):
            tx.append(d['transfer_ru'])
        if d.get('note_ru'):
            tx.append(d['note_ru'])
        kinds = []
        for c in cs:
            ss = sentences(c.get('desc_ru', ''))
            if not ss:
                continue
            pred = strip_parens(predicate(ss[0], c['name_en']))
            if is_verb(pred.split()[0]) if pred else True:
                continue
            kinds.append(f'{company_short(c)} — {clause_cuts(pred, 60)[-1]}')
        alt = '; '.join(kinds)
        full = ' '.join(tx) if tx else (end_dot(alt) if alt else '')
        short_tx = ' '.join(clause_cuts(tx[0], 70)[-1:]) + ('.' if tx else '') if tx else ''
        variants = [full]
        if tx:
            variants += [end_dot(short_tx)] + ([d['note_ru']] if d.get('note_ru') else [])
        else:
            variants += [end_dot('; '.join(k.split(' — ')[0] + ' — ' + ' '.join(k.split(' — ')[1].split()[:4]) for k in kinds))] if kinds else []
        variants += [f'Визиты: {", ".join(names)}.' if names else '']
        dlist.append({'sub': d.get('time') or '', 'title': Var(title, title2),
                      'text': Var(*[v for v in variants if v]), 'label': f'День {d["day"]}' + (f' · {d["city_ru"]}' if len(cities) > 1 and d['city_ru'] != main_city else '')})
    dghost = THAI_DAYS.get(len(itin)) if country == 'th' else (CJK_DAYS.get(len(itin)) if country in ('cn', 'jp') else None)
    slides.append({'type': 'days', 'tag': 'Программа по дням', 'title': f'{cnt(len(itin), "день", "дня", "дней")} визитов',
                   'ghost': dghost, 'days': dlist})

    # 6. компании
    for d, c in clist:
        city = d['city_ru']
        gh, thai = ghost_for(c)
        cands = extract_facts(c.get('desc_ru', ''), city)
        extra = []
        grp = parent_group(c)
        if grp and grp.lower() not in c['name_en'].lower():
            extra.append({'kind': 'group', 'value': grp, 'labels': ['в составе группы'], 'subs': [], 'icon': 'handshake', 'pos': 999})
        extra.append({'kind': 'city', 'value': city, 'labels': ['площадка визита'], 'subs': [f'день {d["day"]} программы'], 'icon': 'pin', 'pos': 1000})
        extra.append({'kind': 'city2', 'value': f'День {d["day"]}', 'labels': ['визит делегации'], 'subs': [d.get('time') or ''], 'icon': 'calendar', 'pos': 1001})
        facts = pick_facts(cands, extra)
        fl = []
        for f in facts:
            subs = [s for s in f['subs'] if s]
            fl.append({'icon': f['icon'], 'value': f['value'],
                       'label': Var(*f['labels']) if len(f['labels']) > 1 else f['labels'][0],
                       'sub': Var(*(subs + [''])) if subs else ''})
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
        combos.sort(key=lambda x: (len(x[0]) + len(x[1] or '') * 0.9) if x != (tv[0], nv[0]) else -1)
        slide = {'type': 'company', 'tag': f'День {d["day"]} · {city}',
                 'title': Var(*[t for t, n in combos]), 'native': Var(*[n for t, n in combos]),
                 '_combo': True,
                 'ghost': gh, 'ghost_thai': thai,
                 'logo': logo_of.get(c['id']),
                 'short': Var(c['name_en'], base_name(c['name_en'])),
                 'subtitle': Var(' · '.join(sub_parts), ' · '.join(sub_parts[-2:]), city),
                 'facts': fl,
                 'why': Var(*why_variants(c)),
                 'learn': Var(*(learn_variants(c) or [''])),
                 'learn_label': 'Фокус визита'}
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
    sixth_text = (', '.join(s.lower() if i else s for i, s in enumerate(subs[:-1])) + (' и ' + subs[-1] if len(subs) > 1 else '') if subs else ' · '.join(tagline[:3]))
    sixth_text = cap(sixth_text) + ('\nв одном городе' if len(cities) == 1 else '\n' + ' + '.join(cities))
    slides.append({'type': 'benefits', 'items': [
        {'title': 'Переговоры\nс компаниями', 'text': Var(inc_short[0] if inc_short else 'Все визиты и переговоры программы', 'Все визиты программы'), 'icon': 'users'},
        {'title': 'Закрытые двери', 'text': Var('Штаб-квартиры, обычно закрытые\nдля случайных визитов' if 'штаб' in hq.lower() else hq, 'Штаб-квартиры компаний'), 'icon': 'building'},
        {'title': 'Трансферы', 'text': Var(cap(re.sub(r'^Трансферы\s+', '', transfers)) if transfers else 'Включены', 'Включены'), 'icon': 'car'},
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
        {'icon': sector_icon, 'value': cnt(n_comp, 'компания', 'компании', 'компаний'), 'label': Var(topic, cinfo[2] and f'программа {cinfo[2]}'),
         'sub': Var(', '.join(s.lower() for s in subs) if subs else ', '.join(tagline[:3]), ', '.join(tagline[:2]), '')},
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
            print(f'Автоподгонка, проход {rnd + 1}: {len(issues)} замечаний' + (f', не исправить: {len(stuck)}' if stuck else ''), file=sys.stderr)
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
