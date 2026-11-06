// ATS version of Ostap Dotsenko's CV in Word (.docx), English: same content as index.html in this folder.
// English translation of ../2026-11-06-resume-ats/make_docx.js (same structure and styles; only the language changes).
// One column, no tables or text boxes; real headings (Title, Heading 1, Heading 2), bullet lists via numbering,
// links as hyperlinks, photo as a picture at the top (text wraps on the left). Facts: ../RESUME-MASTER.md only.
// Run: node make_docx.js -> ../../готовые/2026-11-06-ostap-resume-ats-en.docx
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
const OUT = path.join(HERE, '..', '..', 'готовые', '2026-11-06-ostap-resume-ats-en.docx');
const PHOTO = path.join(HERE, '..', '2026-11-06-resume-ats', 'img', 'portrait.jpg');
const FONT = 'Arial';
const LINKEDIN = 'https://www.linkedin.com/in/ostapdot%D1%81enko/';
const LINKEDIN_TEXT = 'linkedin.com/in/ostapdotсenko'; // the address contains a Cyrillic "с" (U+0441)

// text with hyperlinks: ['plain text', ['visible text', 'https://…'], …]
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
  data: fs.readFileSync(PHOTO),
  transformation: { width: 88, height: 110 },
  altText: { title: 'Photo', description: 'Ostap Dotsenko, portrait', name: 'portrait' },
  floating: {
    horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, align: HorizontalPositionAlign.RIGHT },
    verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, align: VerticalPositionAlign.TOP },
    wrap: { type: TextWrappingType.SQUARE, side: TextWrappingSide.LEFT },
    margins: { left: 182880, bottom: 91440 },
  },
});

const job = (title, meta, ctx, bullets) => [H2(title), META(meta), ...(ctx ? [P(ctx)] : []), ...bullets.map(LI)];

const body = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [photo, new TextRun('Ostap Dotsenko')] }),
  P('Business Development & Marketing Leader', { run: { bold: true, size: 24 } }),
  P('Business Development | B2B Marketing | E-commerce | Russia, China, Southeast Asia'),
  P('Phone: +86 137 6171 6355; +7 985 874-49-58 (WhatsApp)', { par: { spacing: { after: 0 } } }),
  P(['E-mail: ', ['norbanking@gmail.com', 'mailto:norbanking@gmail.com'], ' | Telegram: ', ['@ostapdotcenko', 'https://t.me/ostapdotcenko']], { par: { spacing: { after: 0 } } }),
  P(['LinkedIn: ', [LINKEDIN_TEXT, LINKEDIN], ' (11,000+ followers)'], { par: { spacing: { after: 0 } } }),
  P(['Website: ', ['ostapdotcenko.ru', 'https://ostapdotcenko.ru'], ' | Location: Shanghai, Moscow (hybrid)']),

  H1('Target role'),
  P('CBDO, CMO or Head of International Expansion: Russia — China — Southeast Asia.'),

  H1('Profile'),
  P('13+ years in business development and marketing at the crossroads of Russia, China and Southeast Asia. Led B2B marketing at Megamarket ' +
    '(Russia’s #3 e-commerce, Sber ecosystem) and the O2O business at AliExpress Russia & CIS (Alibaba Group); since 2025, owner ' +
    'of a company in Shanghai. Teams of up to 40, a marketing budget of over RUB 1 bn a year, P&L at Megamarket, Alibaba and my own business. ' +
    'Federal programs, partnerships with banks, telecoms and government bodies. 20+ countries, 5 languages, including Chinese (B2+).'),

  H1('Key results'),
  ...[
    '+350% sellers year over year, 50,000 sellers on the platform (Megamarket).',
    'RUB 3 bn net profit — my programs’ impact, Q4 2023 (Megamarket).',
    'Federal program with the Ministry of Economic Development of Russia in 86 regions (Megamarket).',
    'From 0 to 2,000 companies in the “Made in Russia” program, 2024 (Megamarket).',
    'GMV $48M, +100% year over year; new buyers +185% (AliExpress Russia & CIS).',
    'Average campaign ROI 25x; 120+ media holding partners (Alibaba Group, 2020–2022).',
    'Turnkey corporate forum for Megamarket (Sber) in Shenzhen with 1,200+ attendees (own business).',
  ].map(LI),

  H1('Work experience'),
  ...job('Owner & Founder — Shanghai Pinnacle Technology Co., Ltd.', '2025 — present | Shanghai, China',
    'GlobalTechTour — tech expeditions and benchmark tours across China and SEA; Aura Robotics — robotics and automation, ' +
    'sourcing robots directly from Chinese manufacturers. Owner’s P&L.', [
      'Delivered a turnkey corporate forum for Megamarket (Sber) in Shenzhen with 1,200+ attendees: logistics, venue and business program.',
      'Organize delegation visits to the factories and R&D centers of BYD, Xiaomi, Baidu, Meituan, Poizon, Leju Robotics; Aura clients get direct access to the leadership and R&D of robot manufacturers.',
      'BelMol closed a dairy-automation deal in a 2-hour meeting at the Kepler factory; SolarTek toured Leju Robotics, Robotera, AgiBot and Kepler in 5 days.',
    ]),
  ...job('Head of B2B Marketing — Megamarket (Sber ecosystem)', '2023 — 2025 | Russia',
    'Russia’s #3 e-commerce. Team of 16–40 (direct and through leads), marketing budget of over RUB 1 bn a year, P&L ownership for the business line.', [
      'Built B2B seller-acquisition marketing: +350% sellers year over year, 50,000 sellers on the platform; my programs’ impact — RUB 3 bn net profit (Q4 2023).',
      'Launched a federal entrepreneur support program with the Ministry of Economic Development of Russia, run through “My Business” centers in 86 regions: acquisition strategy, materials and regional communications built from scratch.',
      'Ran the federal Megasreda marathon in 20 cities — from concept and logistics to content and PR; 1M+ views.',
      'Launched “Made in Russia”: brand program, onboarding and video campaign — from 0 to 2,000 companies.',
      'Inclusive marketplace for producers with disabilities: positioning, UX, PR campaign.',
    ]),
  ...job('Independent Adviser — AdTech / MarTech / EduTech', '2022 — 2023 | Uzbekistan, Kazakhstan, Southeast Asia', null, [
    'Advised companies including MyDars and HiTarget (Indonesia): 20+ partners, product localization for SEA.',
  ]),
  ...job('Head of O2O & New Business — Alibaba Group (AliExpress Russia & CIS)', '2020 — 2022 | Russia and CIS',
    'Team of up to 5, P&L ownership for the O2O business line.', [
      'Built O2O partnerships with Alfa-Bank, Tinkoff, MTS Bank, MegaFon, Beeline, Rosneft and 120+ media holdings.',
      'GMV $48M (+100% year over year), new buyers +185%, average campaign ROI 25x.',
    ]),
  ...job('Co-founder — O.F.D Creative Agency', '2017 — 2020 (2017 — preparation and launch) | Shanghai, Hong Kong', 'Owner’s P&L.', [
    'Joint Chinese-Russian team project: advertising solutions that promote businesses in the Chinese and Russian markets.',
    'Clients: FOREO, DECATHLON, Bank of China, WWE, CDEK.',
  ]),
  ...job('Head of Commerce & BD — Data Centric Alliance', '2015 — 2017 | Moscow, Shanghai', null, [
    'Led media buying and business development in Asia; partners — Google HK, Yahoo HK, Tencent, Ctrip, Baidu.',
  ]),
  ...job('BD Manager (China / SEA) — CityAds Media', '2013 — 2015 | China, Southeast Asia', null, [
    'Grew performance and affiliate marketing (CPA / CPC / CPL) in China and Southeast Asia; clients included Sasa (Hong Kong).',
  ]),

  H1('Key skills'),
  ...[
    'Business Development: market-entry strategy, partnerships and alliances, C-level negotiations, BD Asia & CIS, launching new business lines.',
    'Marketing: B2B Marketing, Demand Generation, Performance Marketing, Product Marketing, Sales Enablement, brand programs.',
    'Technology and data: e-commerce and marketplaces, AdTech / MarTech, Marketing Automation, CRM & Analytics, O2O.',
    'Communications: GR and government programs, federal events, PR; 50+ expos and forums in Russia and the CIS.',
  ].map(LI),

  H1('Languages'),
  LI('Russian — native; English — C1; Chinese — B2+; Uzbek — B1; Korean — A2.'),

  H1('Education'),
  LI('MIU — Civil Law.'),
  LI('Lyceum under TashSIL — Korean Language Teacher.'),

  H1('Media and speaking'),
  ...[
    'RBC — interview “The key is to know your fundamentals and not be afraid”; RBC Industries.',
    'Sber Business — expert guide “Marketplaces: the complete guide to earning”.',
    'TASS — Ulyanovsk region and Megamarket develop a regional product showcase; “My Business” — Megasreda marathon, 1M+ views.',
    'Speaking: Russian Retail Show 2024 (speaker), Amber Forum 2024 (panel discussion), Manufacturers’ Summit, Irkutsk, 2024 (panel), Russian Retail Week 2025, SCO Forum 2025, federal Megasreda marathon.',
  ].map(LI),

  H1('Contact and links'),
  LI(['Phone: +86 137 6171 6355; +7 985 874-49-58 (WhatsApp). E-mail: ', ['norbanking@gmail.com', 'mailto:norbanking@gmail.com']]),
  LI(['Website: ', ['ostapdotcenko.ru', 'https://ostapdotcenko.ru'], ' (Russian, English, Chinese); blog: ', ['ostapdotcenko.ru/blog', 'https://ostapdotcenko.ru/blog'], ' — new articles daily']),
  LI(['LinkedIn: ', [LINKEDIN_TEXT, LINKEDIN], ' — 11,000+ followers']),
  LI(['Telegram: ', ['@ostapdotcenko', 'https://t.me/ostapdotcenko'], '; Instagram: ', ['@ostap.dotsenko', 'https://www.instagram.com/ostap.dotsenko/'], '; Facebook: Ostap Dotsenko']),
  LI(['Projects: ', ['globaltechtour.ru', 'https://globaltechtour.ru'], ' (and blog); ', ['aura-robotics.ru', 'https://aura-robotics.ru'], ' (and blog)']),
  P('References available on request.', { par: { spacing: { before: 80 } } }),
];

const doc = new Document({
  creator: 'Ostap Dotsenko',
  title: 'Ostap Dotsenko — CV',
  description: 'CV, ATS version',
  styles: {
    default: {
      document: { run: { font: FONT, size: 19, language: { value: 'en-US' } }, paragraph: { spacing: { line: 240 } } },
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
        children: [new TextRun('Ostap Dotsenko — CV, page '), new TextRun({ children: [PageNumber.CURRENT] }),
          new TextRun(' of '), new TextRun({ children: [PageNumber.TOTAL_PAGES] })] })] }),
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log('DOCX', OUT, buf.length, 'bytes'); });
