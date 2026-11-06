// ATS-версия резюме Остапа Доценко в Word (.docx) — то же содержание, что index.html этой папки.
// Одна колонка, без таблиц и надписей; настоящие заголовки (Title, Heading 1, Heading 2), маркированные списки через numbering,
// ссылки — гиперссылки, фото — картинка в начале документа (обтекание справа). Факты — только из ../RESUME-MASTER.md.
// Запуск: node make_docx.js → ../../готовые/2026-11-06-ostap-resume-ats.docx
const fs = require('fs');
const path = require('path');
let docx;
for (const p of ['docx', '/opt/node-tools/node_modules/docx']) { try { docx = require(p); break; } catch (e) {} }
const {
  Document, Packer, Paragraph, TextRun, ExternalHyperlink, ImageRun, HeadingLevel, AlignmentType, LevelFormat, BorderStyle,
  HorizontalPositionRelativeFrom, HorizontalPositionAlign, VerticalPositionRelativeFrom, VerticalPositionAlign,
  TextWrappingType, TextWrappingSide, Footer, PageNumber,
} = docx;

const HERE = __dirname;
const OUT = path.join(HERE, '..', '..', 'готовые', '2026-11-06-ostap-resume-ats.docx');
const FONT = 'Arial';
const LINKEDIN = 'https://www.linkedin.com/in/ostapdot%D1%81enko/';
const LINKEDIN_TEXT = 'linkedin.com/in/ostapdotсenko'; // в адресе кириллическая «с»

// текст с гиперссылками: ['обычный текст', ['видимый текст', 'https://…'], …]
const runs = (parts, opts = {}) => (Array.isArray(parts) ? parts : [parts]).map((x) =>
  Array.isArray(x)
    ? new ExternalHyperlink({ link: x[1], children: [new TextRun({ text: x[0], color: '0B3D91', underline: {}, ...opts })] })
    : new TextRun({ text: x, ...opts }));
const P = (parts, o = {}) => new Paragraph({ children: runs(parts, o.run), spacing: { after: 40 }, ...o.par });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const META = (t) => new Paragraph({ children: [new TextRun({ text: t, italics: true, color: '333333' })], spacing: { after: 40 } });
const LI = (parts) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: runs(parts), spacing: { after: 20 } });

const photo = new ImageRun({
  type: 'jpg',
  data: fs.readFileSync(path.join(HERE, 'img', 'portrait.jpg')),
  transformation: { width: 88, height: 110 },
  altText: { title: 'Фото', description: 'Остап Доценко, портрет', name: 'portrait' },
  floating: {
    horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, align: HorizontalPositionAlign.RIGHT },
    verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, align: VerticalPositionAlign.TOP },
    wrap: { type: TextWrappingType.SQUARE, side: TextWrappingSide.LEFT },
    margins: { left: 182880, bottom: 91440 },
  },
});

const job = (title, meta, ctx, bullets) => [H2(title), META(meta), ...(ctx ? [P(ctx)] : []), ...bullets.map(LI)];

const body = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [photo, new TextRun('Остап Доценко')] }),
  P('Руководитель по развитию бизнеса и маркетингу', { run: { bold: true, size: 24 } }),
  P('Business Development | B2B Marketing | E-commerce | Россия, Китай, Юго-Восточная Азия'),
  P('Телефон: +86 137 6171 6355; +7 985 874-49-58 (WhatsApp)', { par: { spacing: { after: 0 } } }),
  P(['E-mail: ', ['norbanking@gmail.com', 'mailto:norbanking@gmail.com'], ' | Telegram: ', ['@ostapdotcenko', 'https://t.me/ostapdotcenko']], { par: { spacing: { after: 0 } } }),
  P(['LinkedIn: ', [LINKEDIN_TEXT, LINKEDIN], ' (11 000+ подписчиков)'], { par: { spacing: { after: 0 } } }),
  P(['Сайт: ', ['ostapdotcenko.ru', 'https://ostapdotcenko.ru'], ' | Город: Шанхай, Москва (гибридный формат)']),

  H1('Цель'),
  P('CBDO, CMO или директор по международному развитию: Россия — Китай — Юго-Восточная Азия.'),

  H1('Профиль'),
  P('13+ лет в развитии бизнеса и маркетинге на стыке России, Китая и Юго-Восточной Азии. Руководил B2B-маркетингом Мегамаркета ' +
    '(e-commerce №3 в России, экосистема Сбера) и направлением O2O в AliExpress Россия и СНГ (Alibaba Group); с 2025 года — собственник ' +
    'компании в Шанхае. Команды до 40 человек, маркетинговый бюджет больше 1 млрд руб. в год, P&L в Мегамаркете, Alibaba и своём бизнесе. ' +
    'Федеральные программы, партнёрства с банками, телекомом и госструктурами. 20+ стран, 5 языков, включая китайский (B2+).'),

  H1('Ключевые результаты'),
  ...[
    '+350% продавцов год к году, 50 000 продавцов на платформе (Мегамаркет).',
    '3 млрд руб. чистой прибыли — эффект моих программ, Q4 2023 (Мегамаркет).',
    'Федеральная программа с Минэкономразвития России в 86 регионах (Мегамаркет).',
    'С 0 до 2 000 компаний в программе «Сделано в России», 2024 (Мегамаркет).',
    'GMV $48M, +100% год к году; новые покупатели +185% (AliExpress Россия и СНГ).',
    'Средний ROI кампаний 25x; 120+ медиахолдингов-партнёров (Alibaba Group, 2020–2022).',
    'Корпоративный форум Мегамаркета (Сбер) в Шэньчжэне на 1 200+ участников — под ключ (собственный бизнес).',
  ].map(LI),

  H1('Опыт работы'),
  ...job('Собственник и основатель — Shanghai Pinnacle Technology Co., Ltd.', '2025 — настоящее время | Шанхай, Китай',
    'GlobalTechTour — технологические экспедиции и бенчмарк-туры в Китай и ЮВА; Aura Robotics — робототехника и автоматизация, ' +
    'подбор роботов напрямую у китайских производителей. P&L собственника.', [
      'Организовал под ключ корпоративный форум Мегамаркета (Сбер) в Шэньчжэне на 1 200+ участников: логистика, площадка, деловая программа.',
      'Организую визиты делегаций на заводы и в R&D BYD, Xiaomi, Baidu, Meituan, Poizon, Leju Robotics; клиентам Aura — прямой доступ к руководству и R&D производителей роботов.',
      'БелМол решил вопрос автоматизации молочного производства за 2 часа переговоров на заводе Kepler; СоларТек за 5 дней посетил Leju Robotics, Robotera, AgiBot и Kepler.',
    ]),
  ...job('Head of B2B Marketing — Мегамаркет (экосистема Сбера)', '2023 — 2025 | Россия',
    'E-commerce №3 в России. Команда 16–40 человек (прямо и через руководителей), маркетинговый бюджет больше 1 млрд руб. в год, P&L направления.', [
      'Выстроил B2B-маркетинг привлечения продавцов: +350% продавцов год к году, 50 000 продавцов на платформе; эффект моих программ — 3 млрд руб. чистой прибыли (Q4 2023).',
      'Запустил с Минэкономразвития России федеральную программу поддержки предпринимателей на базе центров «Мой бизнес» в 86 регионах: стратегия привлечения, материалы, региональная коммуникация — с нуля.',
      'Провёл федеральный марафон «Мегасреда» в 20 городах — от концепции и логистики до контента и PR; 1 млн+ просмотров.',
      'Запустил «Сделано в России»: бренд-программа, онбординг, видеокампания — с 0 до 2 000 компаний.',
      'Социальный маркетплейс для производителей с ограниченными физическими возможностями: позиционирование, UX, PR-кампания.',
    ]),
  ...job('Independent Adviser — AdTech / MarTech / EduTech', '2022 — 2023 | Узбекистан, Казахстан, Юго-Восточная Азия', null, [
    'Консультировал компании, в том числе MyDars и HiTarget (Индонезия): 20+ партнёров, локализация продуктов для ЮВА.',
  ]),
  ...job('Head of O2O & New Business — Alibaba Group (AliExpress Россия и СНГ)', '2020 — 2022 | Россия и СНГ',
    'Команда до 5 человек, P&L направления O2O.', [
      'Построил O2O-партнёрства с Альфа-Банком, Тинькофф, МТС Банком, МегаФоном, Билайном, Роснефтью и 120+ медиахолдингами.',
      'GMV $48M (+100% год к году), новые покупатели +185%, средний ROI кампаний 25x.',
    ]),
  ...job('Co-founder — O.F.D Creative Agency', '2017 — 2020 (2017 — подготовка и запуск) | Шанхай, Гонконг', 'P&L собственника.', [
    'Совместный проект китайской и российской команд: рекламные решения для продвижения бизнеса на рынках Китая и России.',
    'Клиенты: FOREO, DECATHLON, Bank of China, WWE, CDEK.',
  ]),
  ...job('Head of Commerce & BD — Data Centric Alliance', '2015 — 2017 | Москва, Шанхай', null, [
    'Руководил медиазакупками и развитием бизнеса в Азии; партнёры — Google HK, Yahoo HK, Tencent, Ctrip, Baidu.',
  ]),
  ...job('BD Manager (КНР / ЮВА) — CityAds Media', '2013 — 2015 | Китай, Юго-Восточная Азия', null, [
    'Развивал performance- и аффилиат-маркетинг (CPA / CPC / CPL) на рынках Китая и ЮВА; клиенты — в том числе Sasa (Гонконг).',
  ]),

  H1('Ключевые навыки'),
  ...[
    'Business Development: стратегия выхода на рынки, партнёрства и альянсы, переговоры с первыми лицами, BD Asia & CIS, запуск новых направлений.',
    'Маркетинг: B2B Marketing, Demand Generation, Performance Marketing, Product Marketing, Sales Enablement, бренд-программы.',
    'Технологии и данные: e-commerce и маркетплейсы, AdTech / MarTech, Marketing Automation, CRM & Analytics, O2O.',
    'Коммуникации: GR и госпрограммы, федеральные мероприятия, PR; 50+ выставок и форумов в России и СНГ.',
  ].map(LI),

  H1('Языки'),
  LI('Русский — родной; английский — C1; китайский — B2+; узбекский — B1; корейский — A2.'),

  H1('Образование'),
  LI('МИУ — гражданское право.'),
  LI('Лицей при ТашГИВ — преподаватель корейского языка.'),

  H1('Публикации и выступления'),
  ...[
    'РБК — интервью «Главное — знать матчасть и не бояться»; РБК Отрасли.',
    'Сбер Бизнес — экспертный гайд «Маркетплейсы: большая инструкция по заработку».',
    'ТАСС — Ульяновская область и Мегамаркет развивают региональную витрину; «Мой бизнес» — марафон «Мегасреда», 1 млн+ просмотров.',
    'Выступления: Russian Retail Show 2024 (спикер), Amber Forum 2024 (панельная дискуссия), «Саммит производителей», Иркутск, 2024 (панель), Russian Retail Week 2025, форум ШОС 2025, федеральный марафон «Мегасреда».',
  ].map(LI),

  H1('Контакты и ссылки'),
  LI(['Телефон: +86 137 6171 6355; +7 985 874-49-58 (WhatsApp). E-mail: ', ['norbanking@gmail.com', 'mailto:norbanking@gmail.com']]),
  LI(['Сайт: ', ['ostapdotcenko.ru', 'https://ostapdotcenko.ru'], ' (русский, английский, китайский); блог: ', ['ostapdotcenko.ru/blog', 'https://ostapdotcenko.ru/blog'], ' — статьи каждый день']),
  LI(['LinkedIn: ', [LINKEDIN_TEXT, LINKEDIN], ' — 11 000+ подписчиков']),
  LI(['Telegram: ', ['@ostapdotcenko', 'https://t.me/ostapdotcenko'], '; Instagram: ', ['@ostap.dotsenko', 'https://www.instagram.com/ostap.dotsenko/'], '; Facebook: Ostap Dotsenko']),
  LI(['Проекты: ', ['globaltechtour.ru', 'https://globaltechtour.ru'], ' (и блог); ', ['aura-robotics.ru', 'https://aura-robotics.ru'], ' (и блог)']),
  P('Рекомендации — по запросу.', { par: { spacing: { before: 80 } } }),
];

const doc = new Document({
  creator: 'Остап Доценко',
  title: 'Остап Доценко — резюме',
  description: 'Резюме, ATS-версия',
  styles: {
    default: {
      document: { run: { font: FONT, size: 19, language: { value: 'ru-RU' } }, paragraph: { spacing: { line: 240 } } },
      title: { run: { font: FONT, size: 40, bold: true, color: '111111' }, paragraph: { spacing: { before: 0, after: 40 }, keepNext: true } },
      heading1: {
        run: { font: FONT, size: 22, bold: true, allCaps: true, color: '111111' },
        paragraph: { spacing: { before: 180, after: 70 }, keepNext: true,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '111111', space: 1 } } },
      },
      heading2: { run: { font: FONT, size: 20, bold: true, color: '111111' }, paragraph: { spacing: { before: 120, after: 10 }, keepNext: true } },
    },
    paragraphStyles: [{ id: 'FooterSmall', name: 'Footer Small', basedOn: 'Normal', run: { font: FONT, size: 16, color: '555555' } }],
  },
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 340, hanging: 220 } } } }],
    }],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 760, bottom: 760, left: 920, right: 920, footer: 360 } } },
    footers: {
      default: new Footer({ children: [new Paragraph({ style: 'FooterSmall', alignment: AlignmentType.RIGHT,
        children: [new TextRun('Остап Доценко — резюме, стр. '), new TextRun({ children: [PageNumber.CURRENT] }),
          new TextRun(' из '), new TextRun({ children: [PageNumber.TOTAL_PAGES] })] })] }),
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log('DOCX', OUT, buf.length, 'байт'); });
