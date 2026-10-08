"""Ручные правки презентаций Индонезии после конвертера from_site.py (идемпотентно: только присваивания).

Порядок: python3 презентации/шаблон/from_site.py indonesia-<тема>-expedition   (все 7; красота — с --no-logos,
         чтобы не скачался «Kahf.png» — на сайте под этим именем логотип Paragon)
         python3 презентации/контент/правки/индонезия.py [--build]
Факты — только из описаний компаний на сайте globaltechtour.ru (переписаны короче, без новых данных).
СТАТУС: WIP — правки написаны, но после них сборка и просмотр листов ещё не сделаны (пауза ради рендера видео).
"""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
C = ROOT / 'презентации' / 'контент'
NAMES = ['ритейл', 'еда', 'доставка', 'интернет', 'красота', 'лонгевити', 'чай-кофе']
L = 'source-videos/логотипы/'


def path(n):
    return C / f'2026-10-08-индонезия-{n}.json'


def load(n):
    return json.loads(path(n).read_text(encoding='utf-8'))


def save(n, d):
    path(n).write_text(json.dumps(d, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def slide(d, typ):
    return next(s for s in d['slides'] if s['type'] == typ)


def comp(d, title):
    """Карточка компании: точное название, затем начало названия, затем вхождение в short (название меняет автоподгонка)."""
    cs = [s for s in d['slides'] if s['type'] == 'company']
    t = title.lower()
    for test in (lambda s: s['title'].lower() == t, lambda s: s['title'].lower().startswith(t),
                 lambda s: t in s.get('short', '').lower()):
        for s in cs:
            if test(s):
                return s
    raise KeyError(title)


def f(icon, value, label, sub=None):
    x = {'icon': icon, 'value': value, 'label': label}
    if sub:
        x['sub'] = sub
    return x


def pin(city, day):
    return f('pin', city, 'площадка визита', f'день {day} программы')


def cal(day, sub='10:00–13:00'):
    return f('calendar', f'День {day}', 'визит делегации', sub)


def card(d, title, facts=None, why=None, learn=None, **kw):
    s = comp(d, title)
    if facts is not None:
        s['facts'] = facts
    if why is not None:
        s['why'] = why
    if learn is not None:
        s['learn'] = learn
    for k, v in kw.items():
        if v is None:
            s.pop(k, None)
        else:
            s[k] = v
    return s


def day_text(d, i, text, title=None):
    dd = slide(d, 'days')['days'][i]
    dd['text'] = text
    if title:
        dd['title'] = title


def cover(d, **kw):
    s = slide(d, 'cover')
    s.update(kw)


# ---------------------------------------------------------------- ритейл
def retail():
    d = load('ритейл')
    draft = json.loads((C / '2026-10-08-обложка-indonesia.json').read_text(encoding='utf-8'))['slides'][0]
    cover(d, **{k: draft[k] for k in ('tag', 'topright', 'logos', 'box_text', 'box_right', 'footer')})
    slide(d, 'layers')['items'][1]['text'] = 'Transmart, Matahari, AEON, Ace Hardware'
    day_text(d, 2, 'Transmart — крупнейший оператор гипермаркетов; Matahari — крупнейшая сеть универмагов.',
             'Transmart ·\nMatahari')
    day_text(d, 3, 'AEON — подразделение японской группы; Ace Hardware — сеть Kawan Lama, с 2025 года Azko.')
    day_text(d, 4, 'Ranch Market — первые премиальные супермаркеты; Blibli — e-commerce модели O2O.')
    card(d, 'Indomaret', [f('store', '~23 000', 'магазинов', '2025 год'), f('building', '37', 'распределительных центров'),
                          f('package', '27', 'депо'), f('trending', '№1', 'сеть минимаркетов Индонезии')])
    card(d, 'Alfamart', [f('store', '17 000+', 'точек'), f('smartphone', 'Alfagift', 'приложение', 'участников +30% в год'),
                         f('star', 'Poinku', 'приложение лояльности'), cal(1)])
    card(d, 'Erajaya', [f('store', '1000+', 'магазинов', 'Erafone, iBox, Samsung'), f('flag', '1996', 'год основания'),
                        f('chart', 'ERAA', 'тикер на бирже Индонезии'), cal(2)],
         why='Один из крупнейших дистрибьюторов смартфонов в Индонезии: свыше 1000 магазинов Erafone, iBox и Samsung.')
    card(d, 'Transmart', [f('trending', '№1', 'оператор гипермаркетов страны'), f('flag', '2013', 'полный контроль над активами Carrefour'),
                          f('handshake', 'CT Corp', 'в составе группы'), cal(3)],
         why='Формат сочетает гипермаркет с модой, развлечениями и общепитом — крупнейший оператор гипермаркетов страны.',
         learn='CT Corp выкупила индонезийские активы Carrefour (полный контроль — январь 2013) и провела ребрендинг в Transmart.')
    card(d, 'Matahari', [f('store', '143', 'магазина', 'март 2025'), f('trending', '№1', 'сеть универмагов Индонезии'),
                         f('smartphone', 'Matahari.com', 'платформа'), f('star', 'Shop&Talk', 'лайв-стриминг и соцкоммерция')],
         why='Крупнейшая сеть универмагов Индонезии: под давлением e-commerce оптимизирует сеть и тестирует новые форматы.',
         learn='Инвестирует в платформу Matahari.com и приложение лайв-стриминга Shop&Talk, объединяя офлайн- и онлайн-розницу.')
    card(d, 'AEON', [f('building', '~177 000 м²', 'AEON Mall BSD City', 'Тангеранг'), f('flag', '2015', 'выход на рынок'),
                     f('star', 'Daiso', 'японская концепция'), cal(4)],
         why='Подразделение японской группы AEON: флагманский молл AEON Mall BSD City в Тангеранге.')
    card(d, 'Ace Hardware', [f('store', '~240–248', 'магазинов', 'на пике'), f('calendar', '29 лет', 'по лицензии Kawan Lama'),
                             f('star', 'Azko', 'новый бренд Kawan Lama', 'с марта 2025'), cal(4)],
         why='29 лет работала в Индонезии по лицензии группы Kawan Lama и выросла примерно до 240–248 магазинов.',
         learn='В 2024 году Kawan Lama не продлила лицензию; к марту 2025 года магазины переименованы в собственный бренд Azko.')
    card(d, 'Ranch Market', [f('store', '43', 'точки', 'конец 2019 года'), f('flag', '1998', 'работает с'),
                             f('package', '4', 'бренда сети', 'включая Farmers Market'), cal(5)],
         why='Первая сеть премиальных супермаркетов Индонезии — для верхнего среднего класса и экспатов.',
         learn='Импортные продукты, мясная лавка, пекарня и деликатесы; доставка через WhatsApp и BBQ-мероприятия в магазинах.')
    card(d, 'Blibli', **BLIBLI)
    save('ритейл', d)


BLIBLI = dict(
    facts=[f('users', '100+ тыс', 'партнёров'), f('briefcase', '~$509 млн', 'оценка при IPO', 'конец 2022'),
           f('flag', '2011', 'год основания', '15 августа'), f('handshake', 'Djarum', 'в составе группы', 'через GDP Venture')],
    why='Индонезийская e-commerce платформа: в 2022 году провела IPO и стала третьим «единорогом» страны.',
    learn='Работает по модели O2O (B2C, B2B, B2B2C) с 100+ тыс. партнёров; в портфеле — tiket.com и Ranch Market.')

GRAB = dict(
    why='Сингапурский супер-апп: GrabFood — один из лидеров доставки еды в Индонезии наряду с GoFood и ShopeeFood.',
    learn='В райд-хейлинге делит индонезийский рынок с Gojek примерно поровну; по ЮВА доля Grab в мобильности и доставке — ~72%.')


def grab_facts(day):
    return [f('trending', '~50/50', 'рынок райд-хейлинга с Gojek'), f('trending', '~72%', 'доля в мобильности и доставке', 'по ЮВА'),
            f('flag', '2012', 'год основания', 'MyTeksi, Малайзия'), cal(day)]


# ---------------------------------------------------------------- еда
def food():
    d = load('еда')
    cover(d, tag='Бизнес-делегация · Еда и молоко Индонезии',
          box_text='От Indomie до пионера UHT Ultrajaya —\n8 компаний, 6 дней, 6 ночей')
    for c in slide(d, 'route')['cities']:
        if c['name'] in ('Чикаранг', 'Бандунг'):
            c['leg']['icon'] = 'car'
    card(d, 'Indofood', [f('chart', '~9,13 трлн рупий', 'выручка молочного бизнеса', '2023 год'),
                         f('star', 'Indomie', 'бренд', 'с 1972 года'), f('flag', '1968', 'история с', 'лапшичный бизнес'),
                         f('handshake', 'Indolakto', 'молочная компания группы', 'контроль с 2008 года')])
    card(d, 'Frisian Flag', [f('building', '25,4 га', 'завод в Чикаранге', 'открыт в июле 2024'),
                             f('briefcase', '€257 млн', 'инвестиции в завод'), f('chart', '400 000 кг', 'молока в сутки'),
                             f('flag', '1922', 'на рынке Индонезии')],
         why='Дочка FrieslandCampina: завод в Чикаранге — крупнейшая инвестиция группы в новое производство за всю историю.',
         learn='Мощность — до 400 000 кг молока в сутки (700 млн кг продукции в год); выпускает жидкое и сгущённое молоко.')
    card(d, 'Kalbe Nutritionals', [f('flag', '1982', 'история с', 'с продукта Prenagen'), f('star', 'Morinaga', 'лицензия на смеси', 'с 1994 года'),
                                   f('handshake', 'Kalbe Farma', 'в составе группы', 'с 1996 года'), cal(2)],
         why='Подразделение Kalbe Farma: питание для всех этапов жизни — от беременности до диетического питания при заболеваниях.',
         learn='Портфель: Prenagen, Morinaga, Zee, Hydro Coco, Fitbar, Entrasol и Diabetasol.')
    card(d, 'Cimory', [f('flag', '1992', 'год основания', 'Чисаруа, Западная Ява'), f('star', '2006', 'создала категорию йогурта'),
                       f('building', 'Dairyland', 'агротуризм и производство'), cal(3)],
         why='Cimory Dairyland сочетает переработку молока с агротуризмом — посетители видят ферму и производство йогурта.',
         learn='Основана, чтобы помочь местным фермерам сбывать молоко; в 2006 году фактически создала категорию йогурта в Индонезии.')
    card(d, 'Ultrajaya', [f('star', 'UHT', 'первой в Индонезии', 'с асептической упаковкой Tetra Pak'),
                          f('flag', '1975', 'год основания', 'в Бандунге'), pin('Бандунг', 4), cal(4)],
         learn='Остаётся пионером и одним из крупнейших производителей молочной продукции длительного хранения; акции — на бирже Индонезии.')
    card(d, 'Mayora', [f('chart', '~30,7 трлн рупий', 'выручка', '2022 год'), f('star', 'Kopiko', '№1 в мире по кофейным леденцам', 'с 1982 года'),
                       f('star', 'Torabika', 'бренд кофе', 'с 1990 года'), f('flag', '1977', 'год основания', 'история с 1948 года')])
    card(d, 'Nestlé', [f('building', '4', 'завода в Индонезии'), f('flag', '1971', 'в Индонезии с'),
                       f('users', '~3400', 'сотрудников'), f('star', 'DANCOW', 'молочные продукты', 'а также Milo, Nescafé')],
         why='Работает в Индонезии с 1971 года: четыре завода — молочные продукты, растворимый кофе и кондитерские изделия.',
         learn='Kejayan — DANCOW и Bear Brand, Panjang — Nescafé, Cikupa — Fox\'s, Polo, Crunch, Karawang — DANCOW, Milo, Cerelac.')
    card(d, 'Garudafood', [f('package', '6', 'брендов', 'Garuda, Gery, Chocolatos…'), f('globe', '20+', 'стран экспорта'),
                           f('flag', '1979', 'история с', 'Пати, Центральная Ява'), f('chart', 'GOOD', 'тикер на бирже')],
         why='Печенье, орехи, снеки, молочные напитки и сыр под брендами Garuda, Gery, Chocolatos, Clevo, Prochiz, TopChiz.',
         learn='Экспорт — более чем в 20 стран, включая АСЕАН, Китай и Индию.')
    save('еда', d)


# ---------------------------------------------------------------- доставка
def delivery():
    d = load('доставка')
    cover(d, tag='Бизнес-делегация · Dark Kitchen и доставка еды',
          box_text='От GoTo (GoFood) до Yummy Corp —\n10 компаний, 6 дней, 6 ночей',
          box_right='Джакарта —\nвся доставка еды без перелётов')
    day_text(d, 1, 'Yummy — крупнейший оператор облачных кухонь; Everplate — инфраструктура облачных кухонь.')
    card(d, 'GoTo', [f('flag', '2015', 'запуск GoFood', 'вместе с Gojek'), f('star', 'GoKitchen', 'сеть cloud-kitchen партнёрств'),
                     pin('Джакарта', 1), cal(1)],
         why='GoFood — сервис доставки еды GoTo (Gojek), одна из крупнейших O2O food-delivery платформ Индонезии.',
         learn='Прогнозирует спрос и динамически ценообразует по данным миллионов пользователей; через GoKitchen помогает ресторанам масштабироваться.')
    card(d, 'Grab', grab_facts(1), **GRAB)
    card(d, 'Yummy', [f('building', '70+', 'кухонь', 'Yummykitchen'), f('users', '50+', 'партнёрских брендов'),
                      f('briefcase', '$12 млн', 'Series B', 'SoftBank Ventures Asia, 2020'), f('trending', '№1', 'оператор облачных кухонь Индонезии')])
    card(d, 'Everplate', [f('briefcase', 'от ~6 млн', 'рупий в месяц', 'аренда кухни'), f('users', '150+', 'F&B-партнёров'),
                          f('flag', '2020', 'год основания', 'январь'), pin('Джакарта', 2)])
    card(d, 'Hangry', [f('package', '18', 'брендов'), f('store', '117', 'точек'), f('briefcase', '$49+ млн', 'привлечено всего'),
                       f('flag', '2019', 'год основания')],
         why='Мультибрендовый cloud-kitchen стартап: 18 брендов и 117 точек, в топ-10 операторов GrabFood, GoFood и ShopeeFood.',
         learn='В октябре 2025 г. привлёк $10,5 млн на модернизацию кухонь и выход в Малайзию — первый зарубежный рынок.')
    card(d, 'Legit', [f('store', '30+', 'локаций'), f('package', '4', 'delivery-only бренда'),
                      f('briefcase', '$13,7 млн', 'Series A', 'MDI Ventures и др.'), f('flag', '2021', 'год основания')],
         why='Индонезийский консолидатор облачных кухонь: четыре delivery-only бренда в 30+ локациях без офлайн-точек.',
         learn='Создан в партнёрстве с Ismaya Group, Yummy Corp и GK Hebat; привлёк $3 млн seed (East Ventures, 2021).')
    card(d, 'ShopeeFood', [f('trending', '~18%', 'доля рынка', '2024 год'), f('chart', '$2,3 млрд', 'GMV', 'против $1,9 млрд у GoFood'),
                           f('trending', '50%+', 'рост GMV за год'), f('flag', '2020', 'запуск в Индонезии', '2020–2021')],
         learn='Благодаря базе пользователей Shopee к 2024 году GMV превысил GoFood ($2,3 млрд против $1,9 млрд).')
    card(d, 'Wahyoo', [f('briefcase', '$6,5 млн', 'Series B'), f('briefcase', '~$38,9 млн', 'оценка компании'),
                       f('briefcase', '$5 млн', 'Series A', 'Intudo Ventures, 2020'), f('flag', '2017', 'год основания')],
         why='Стартап цифровизации уличных закусочных-варунгов (warteg/warung) в Джакарте.',
         learn='Маркетинг, лояльность, онлайн-заказ ингредиентов, финансы и обучение (Wahyoo Academy); среди инвесторов — Coca-Cola.')
    save('доставка', d)


# ---------------------------------------------------------------- интернет
def internet():
    d = load('интернет')
    cover(d, box_text='От кампуса GoTo до LLM Sahabat-AI —\n9 компаний, 6 дней, 6 ночей',
          box_right='Джакарта —\nвесь tech-стек Индонезии')
    slide(d, 'layers')['items'][0]['text'] = 'GoTo, Grab, Blibli'
    day_text(d, 2, 'Kata.ai — NLP-чат-боты на индонезийском; Nodeflux — компьютерное зрение (Vision AI).')
    day_text(d, 3, 'Prosa.ai — речь и тексты на бахаса Индонезия; Sahabat-AI — открытая LLM Индонезии.')
    day_text(d, 4, 'Shopee — лидер e-commerce по GMV; Bukalapak — пионер e-commerce, ушёл в цифровые продукты.')
    card(d, 'GoTo', [f('briefcase', '~$18 млрд', 'сделка слияния', 'Gojek + Tokopedia'), f('briefcase', '$1,1 млрд', 'привлечено на IPO', 'апрель 2022'),
                     f('flag', '2021', 'год образования', '17 мая'), f('handshake', 'TikTok Shop', 'СП с Tokopedia', 'с 2024 года')])
    card(d, 'Grab', grab_facts(2), **GRAB)
    card(d, 'Blibli', **BLIBLI)
    card(d, 'Kata.ai', [f('flag', '2015', 'год основания', '2015–2016, Джакарта'), f('star', 'HeyKuya', 'покупка', '2016'),
                        f('handshake', 'Kanari AI', 'партнёр', '2024'), cal(3)],
         why='Строит NLP-чат-ботов на индонезийском языке для крупных корпоративных клиентов, включая Unilever и Telkomsel.',
         learn='В 2016 году купила филиппинский стартап HeyKuya; в 2024 году — партнёрство с Kanari AI для выхода в ЮВА и на Ближний Восток.')
    card(d, 'Nodeflux', [f('trending', 'Топ-15%', 'тест NIST FRVT', 'среди 140+ участников'), f('trending', '№1', 'Vision AI в Индонезии'),
                         f('flag', '2016', 'год основания', 'в Джакарте'), cal(3)],
         learn='Первой из индонезийских компаний прошла тест NIST по распознаванию лиц (FRVT) и вошла в топ-15% мирового рейтинга.')
    card(d, 'Prosa.ai', [f('star', 'AntiHoaks', 'чат-бот с Минсвязи', 'против дезинформации'), f('flag', '2018', 'год основания', 'в Бандунге'),
                         pin('Джакарта', 4), cal(4)])
    card(d, 'Sahabat-AI', [f('flag', '2024', 'запуск', '14 ноября, Indonesia AI Day'), f('handshake', 'Indosat · GoTo', 'консорциум', 'при участии NVIDIA'),
                           f('cpu', 'NeMo', 'платформа NVIDIA'), cal(4)],
         why='Открытая экосистема LLM для бахаса Индонезия и региональных языков от консорциума Indosat Ooredoo Hutchison и GoTo.',
         learn='Модель обучена с AI Singapore и Tech Mahindra на NVIDIA NeMo; цель — цифровой суверенитет и открытое ИИ-сообщество.')
    card(d, 'Shopee', [f('briefcase', '$1,5 млрд', 'вложила ByteDance', 'январь 2024'), f('trending', '75,01%', 'доля в Tokopedia'),
                       f('users', '~450', 'сокращённых рабочих мест'), f('trending', '№1', 'Shopee по GMV')],
         learn='ByteDance объединила Tokopedia с TikTok Shop в СП «TikTok Shop by Tokopedia» после запрета соцкоммерции (сентябрь 2023).')
    card(d, 'Bukalapak', [f('briefcase', '$1,5 млрд', 'IPO 2021', 'крупнейшее в истории страны'), f('trending', '−85%+', 'акции от цены IPO'),
                          f('trending', '<3%', 'физтовары в выручке', 'III кв. 2024'), cal(5)],
         learn='В начале 2025 года свернул маркетплейс физических товаров и перешёл на цифровые продукты — оплату счетов и услуг.')
    save('интернет', d)


# ---------------------------------------------------------------- красота
def beauty():
    d = load('красота')
    cv = slide(d, 'cover')
    cv['logos'] = [l for l in cv['logos'] if 'kahf' not in l.get('logo', '') and l['name'] != 'Kahf']
    if not any(l['name'] == 'Rose All Day' for l in cv['logos']):
        cv['logos'].append({'name': 'Rose All Day', 'logo': L + 'косметика/rose-all-day.png'})
    for l in cv['logos']:
        if l['name'].startswith('Paragon'):
            l['name'] = 'Paragon'
    cover(d, box_text='От halal-tech центра Paragon до Avoskin —\n10 компаний, 6 дней, 6 ночей')
    rt = slide(d, 'route')
    rt['cities'][0]['companies'] = 'Paragon\nKahf'
    rt['cities'][1]['leg'] = {'icon': 'car', 'text': '~1 ч'}
    slide(d, 'layers')['items'][0]['text'] = 'Paragon, Kahf, Martha Tilaar, Mustika Ratu'
    day_text(d, 0, 'Трансфер в Тангеранг (~1 ч от Джакарты): Paragon — крупнейший производитель косметики страны.', 'Paragon ·\nKahf')
    day_text(d, 1, 'Martha Tilaar — бьюти-конгломерат на основе джаму; Mustika Ratu — рецепты дворца Кератон.')
    day_text(d, 2, 'Somethinc — skincare с научным подходом; Base — digital-first skincare со Smart Skin Test.')
    card(d, 'Paragon', [f('chart', '135+ млн', 'halal-единиц в год'), f('trending', '№1', 'производитель косметики'),
                        f('star', 'Wardah', 'первая halal-косметика', 'с 1995 года'), f('package', '4', 'бренда', 'Wardah, Make Over, Emina, Kahf')],
         why='Крупнейший производитель косметики в Индонезии: 135+ млн halal-единиц в год под брендами Wardah, Make Over, Emina и Kahf.',
         learn='Основана фармацевтом Нурхаяти Субакат; по данным на начало 2025 года остаётся частной, без планов IPO.',
         logo=L + 'косметика/paragon-technology-innovation.png')
    card(d, 'Kahf', [f('flag', '2020', 'год запуска'), f('star', 'HydroBalance', 'фирменная технология'),
                     f('handshake', 'Paragon', 'в составе группы'), cal(1)],
         why='Бренд halal-ухода для мужчин от Paragon — цель создателей повторить успех Wardah в мужском сегменте.',
         learn='Умывание, уход за кожей, солнцезащита, парфюмерия, волосы и тело — без спирта и компонентов животного происхождения.',
         logo=None)
    card(d, 'Martha Tilaar', [f('building', '10 га', 'сад Kampoeng Djamoe Organik', 'Чикаранг'), f('star', '500–650', 'видов растений', 'для рецептур джаму'),
                              pin('Джакарта', 2), cal(2)],
         why='Бьюти-конгломерат: комплекс Kampoeng Djamoe Organik в Чикаранге совмещает R&D, агротуризм и природоохранную зону.',
         learn='Принцип «Beauty Green»: сад выращивает растения для рецептур на основе джаму; есть учебный центр для женщин из деревень.')
    card(d, 'Mustika Ratu', [f('flag', '1975', 'год основания'), f('building', '1981', 'открыта фабрика'),
                             f('chart', '1995', 'листинг на бирже Индонезии'), cal(2)],
         why='Косметика и джаму по рецептам дворца Кератон Суракарты; основательница — потомок королевской семьи.',
         learn='Мурьяти Судибьо начинала с продаж из гаража; сегодня PT Mustika Ratu Tbk экспортирует косметику на основе джаму.')
    card(d, 'Somethinc', why='Доступный skincare и макияж с научным подходом для кожи жителей ЮВА; один из лидеров продаж skincare в e-commerce.',
         learn='Входит в BeautyHaul Group — первую отечественную бьюти-платформу e-commerce Индонезии (2014); формулы с halal-сертификацией.')
    card(d, 'Base', [f('flag', '2019', 'год основания'), f('star', 'Smart Skin Test', 'онлайн-тест кожи'), pin('Джакарта', 3), cal(3)])
    card(d, 'Avoskin', [f('flag', '2014', 'год запуска', 'в Джокьякарте'), f('star', '2020', 'лучший локальный бренд', 'по версии Female Daily'),
                        f('trending', 'Топ-3', 'по доле цифровых продаж'), f('globe', 'Вьетнам', 'выход через Sociolla')],
         why='Быстрорастущий индонезийский бренд skincare: очищающие средства, сыворотки, тканевые маски, солнцезащита.')
    card(d, 'ESQA', [f('briefcase', '$6 млн', 'Series A', '2022 год'), f('briefcase', '~$10 млн', 'привлечено всего', '~$4 млн — Unilever Ventures'),
                     f('star', 'Первый', 'веганский бренд косметики Индонезии'), f('flag', '2016', 'год основания')],
         learn='Продаётся через Sociolla, Sephora и Watsons во Вьетнаме, Сингапуре и Малайзии.')
    card(d, 'MS Glow', [f('star', '2022', 'выигран спор о товарном знаке', 'с PS Glow'), f('briefcase', '~38 млрд рупий', 'компенсация по спору'),
                        pin('Джакарта', 5), cal(5)],
         why='Индонезийский косметический бренд; соучредители — Шанди Пурнамасари и Гиланг Видья Прамана («Джураган 99»).',
         learn='В 2022 году суд встал на сторону MS Glow в споре о товарном знаке с PS Glow.')
    card(d, 'Rose All Day', [f('flag', '2017', 'год основания'), f('briefcase', '~$5,4 млн', 'Series A', 'DSG Consumer Partners'),
                             f('star', 'Back-to-basics', 'философия бренда'), cal(5)])
    save('красота', d)


# ---------------------------------------------------------------- лонгевити
def longevity():
    d = load('лонгевити')
    cover(d, tag='Бизнес-делегация · Лонгевити Индонезии',
          box_text='От GMP-кампуса Kalbe Farma до клиники на Бали —\n8 компаний, 6 дней, 6 ночей',
          box_right='Джакарта + Бали\n(Бали — опционально)')
    day_text(d, 2, 'KG Bio — биотех-СП Kalbe и Genexine; Prodia — крупнейшая сеть клинических лабораторий.')
    day_text(d, 3, 'Biothera — клиника клеточной терапии; Bio Farma — госхолдинг фармацевтики.')
    card(d, 'Kalbe', [f('chart', 'до 80 млрд', 'клеток в год', 'Regenic, аллогенные'), f('chart', '15 000 л', 'секретома в год'),
                      f('star', 'GMP', 'первое производство стволовых клеток', 'Regenic, с 2012 года'), f('flag', '2006', 'Институт стволовых клеток и рака')],
         why='Кампус KBIC объединяет Regenic — первое в Индонезии GMP-производство стволовых клеток — и Институт стволовых клеток и рака.',
         learn='Мощность Regenic — до 80 млрд аллогенных клеток и 15 000 литров секретома в год.')
    card(d, 'Prodia StemCell', [f('briefcase', '100+ млрд рупий', 'инвестиции во вторую очередь'), f('flag', '2010', 'год основания'),
                                f('building', 'ACT-PLab', 'лаборатория в Джакарте', 'одна из крупнейших в Азии'), cal(2)],
         why='Пионер клеточной терапии в Индонезии: ISO 9001:2015 и сертификация CPOB (GMP) от BPOM.',
         learn='Лаборатория обрабатывает и хранит стволовые клетки; проводила клинические исследования при диабете и остеоартрите.')
    card(d, 'KalGen', [f('flag', '2012', 'год основания'), f('star', 'GEN-ME', 'потребительский ДНК-тест'),
                       f('target', 'IVD', 'тесты: ВПЧ, SARS-CoV-2, туберкулёз'), cal(2)],
         why='Совместное предприятие Bifarma Adiluhung (Kalbe Farma) и малайзийской DNA Laboratories Sdn. Bhd.',
         learn='Производит IVD-тесты для молекулярной диагностики онкологических и инфекционных заболеваний и ДНК-тест GEN-ME.')
    card(d, 'KG Bio', [f('flag', '2016', 'год создания'), f('handshake', 'Kalbe · Genexine', 'совместное предприятие'),
                       f('star', 'Efepoetin alfa', 'первое одобрение BPOM', 'октябрь 2023'), cal(3)],
         why='Клинико-стадийная биотех-компания, СП Kalbe Farma и корейской Genexine: инновационные биопрепараты в онкологии.',
         learn='Выводит биопрепараты на рынки за пределами США, Западной Европы и Китая; в 2023 году — одобрение Efepoetin alfa от BPOM.')
    card(d, 'Prodia', [f('trending', '№1', 'сеть клинических лабораторий'), f('flag', '1973', 'год основания', 'в Соло'),
                       f('star', 'CAP', 'единственная аккредитация в стране', 'с 2012 года'), f('chart', 'PRDA', 'тикер на бирже')],
         why='Крупнейшая сеть клинических лабораторий Индонезии; развивает healthy aging и биомаркерные исследования.')
    card(d, 'Biothera', [f('target', 'NK-клетки', 'терапия', 'а также стволовые клетки, секретом, экзосомы'),
                         f('building', 'PIK2', 'комплекс в Джакарте'), pin('Джакарта', 4), cal(4)],
         why='Клиника клеточной терапии: стволовые клетки, секретом, экзосомы и NK-клетки для программ здорового старения.',
         learn='Медицинское руководство — д-р Ади Виджаянто (стволовые клетки, PhD) и д-р Винченциус Февриянти (иммуномодуляция).')
    card(d, 'Bio Farma', [f('star', 'Stemxera', 'продукт Kimia Farma', '2026 год'), f('flag', '2013', 'начало разработки'),
                          f('handshake', 'Kimia Farma', 'и Indofarma в холдинге'), cal(4)],
         learn='Stemxera на основе стволовых клеток и секретома разработана в GMP-лаборатории больницы RSCM (Cipto Mangunkusumo).')
    card(d, 'Regeneratia', [f('calendar', '2–3 дня', 'подготовка терапии'), f('building', 'CELLTECH', 'лаборатория в Джакарте', 'сертификация WOCPM'),
                            pin('Бали', 5), cal(5, 'опциональный выезд')],
         why='Anti-aging и регенеративный центр на Бали: персонализированная клеточная терапия по образцу крови пациента.',
         learn='Образец обрабатывают в лаборатории CELLTECH в Джакарте: ИИ и закрытая система культивации, затем внутривенное введение.')
    save('лонгевити', d)


# ---------------------------------------------------------------- чай-кофе
def tea():
    d = load('чай-кофе')
    cover(d, box_text='От единорога Kopi Kenangan до Chatime —\n9 компаний, 6 дней, 6 ночей',
          box_right='Джакарта —\nкофе и чай в одном маршруте')
    day_text(d, 1, 'Kopi Janji Jiwa — крупнейшая по числу точек кофейная сеть; Tomoro — 600+ точек к 2024 году.')
    day_text(d, 3, 'Haus! — напитки make-to-order для молодёжи; Point Coffee — кофе в магазинах Indomaret.')
    card(d, 'Fore', [f('store', '300+', 'точек', 'включая Сингапур'), f('briefcase', '353+ млрд рупий', 'привлечено на IPO', 'март 2025'),
                     f('flag', '2018', 'год основания'), cal(1)])
    card(d, 'Kopi Janji Jiwa', [f('store', '~800–900', 'точек', '2020–2022'), f('globe', '100+', 'городов'),
                                f('flag', '2018', 'год основания', '15 мая, Джакарта'), f('handshake', 'Jiwa Group', 'в составе группы')],
         why='Крупнейшая по числу точек кофейная сеть Индонезии: около 800–900 точек в 100+ городах.',
         learn='Первая точка в ТЦ ITC Kuningan продавала около 10 стаканов в день; формат grab-and-go, кофе с пальмовым сахаром.')
    card(d, 'Tomoro', [f('store', '600+', 'точек', 'октябрь 2024'), f('flag', '2022', 'год основания'),
                       f('briefcase', 'ATM Capital', 'инвестор'), cal(2)],
         why='Стремительный рост: свыше 600 точек в Индонезии к октябрю 2024 года; сеть сравнивают с китайской Mixue.',
         learn='Поддержана китайским фондом ATM Capital (связан с основателем J&T Express); экспансия в Китай, Сингапур и Филиппины.')
    card(d, 'Chatime', [f('store', '460+', 'точек'), f('globe', '60+', 'городов'),
                        f('trending', '39,3%', 'самый популярный бабл-ти', 'опрос 2022 года'), f('flag', '2011', 'в Индонезии с')],
         why='Самый популярный бренд бабл-ти в Индонезии: свыше 460 точек в 60+ городах.',
         learn='Тайваньский бренд (2005) пришёл в Индонезию через F&B ID — структуру ритейл-конгломерата Kawan Lama Group.')
    card(d, 'Esteh', [f('flag', '2018', 'год основания'), f('store', '1×2 м', 'первая точка', 'Блок М, Джакарта'),
                      f('store', 'Тысячи', 'точек по стране'), cal(3)],
         learn='Делает акцент на местном «чае Нусантара» с разными вкусами: Es Teh Manis, Es Teh Lemon, Thai Tea.')
    card(d, 'Haus', why='Сеть напитков make-to-order — чай, молочный чай, шоколад, кофе — для миллениалов и поколения Z по доступной цене.',
         learn='После Series A ($2 млн, BRI Ventures, 2020) — Series B1; свыше 220 точек в 18 городах Явы.')
    card(d, 'Point Coffee', [f('flag', '2016', 'год запуска', '30 мая'), f('store', '1000–1200', 'точек', 'к 2022 году'),
                             f('handshake', 'Indomaret', 'в составе сети'), f('star', 'RTD', 'готовые напитки')],
         why='Специализированный кофе прямо в магазинах Indomaret: формат «на заказ» дошёл и до удалённых регионов.',
         learn='Идея бариста Хендри Курниавана — встроить кофе в сеть Indomaret вместо отдельных кофеен; ребрендинг в Point Coffee — 2019 год.')
    card(d, 'Kenangan Coffee', [f('globe', '3', 'зарубежных рынка', 'Малайзия, Филиппины, Индия'), f('flag', '2021', 'запуск Chigo'),
                                pin('Джакарта', 5), cal(5)],
         why='Kenangan Coffee — международное развитие бренда Kopi Kenangan: Малайзия, Филиппины, Индия.',
         learn='В 2021 году запущен Chigo (Chicken on the Go) — сеть жареной курицы в Джаботабеке и Медане в портфеле Kenangan Brands.')
    save('чай-кофе', d)


if __name__ == '__main__':
    for fn in (retail, food, delivery, internet, beauty, longevity, tea):
        fn()
    if '--build' in sys.argv:
        for n in NAMES:
            subprocess.run([sys.executable, str(ROOT / 'презентации/шаблон/build.py'), str(path(n))], check=True)
