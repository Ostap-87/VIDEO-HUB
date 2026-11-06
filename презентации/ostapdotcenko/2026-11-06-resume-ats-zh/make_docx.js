// ATS version of Ostap Dotsenko's resume in Simplified Chinese, Word (.docx): same content as index.html in this folder.
// One column, no tables or text boxes; real headings (Title, Heading 1, Heading 2), bullet lists via numbering,
// links as hyperlinks, photo floating at the top right. East Asian text: Microsoft YaHei (eastAsia font slot), Latin: Arial.
// Facts only from ../RESUME-MASTER.md; wording from ostapdotcenko.ru (zh.ts) and the glossary in ../RESUME-I18N.md.
// Run: node make_docx.js -> ../../готовые/2026-11-06-ostap-resume-ats-zh.docx
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
const OUT = path.join(HERE, '..', '..', 'готовые', '2026-11-06-ostap-resume-ats-zh.docx');
const PHOTO = path.join(HERE, '..', '2026-11-06-resume-ats', 'img', 'portrait.jpg');
const FONT = { ascii: 'Arial', hAnsi: 'Arial', cs: 'Arial', eastAsia: 'Microsoft YaHei' };
const LANG = { value: 'en-US', eastAsia: 'zh-CN' };
const LINKEDIN = 'https://www.linkedin.com/in/ostapdot%D1%81enko/';
const LINKEDIN_TEXT = 'linkedin.com/in/ostapdotсenko'; // the address really has a Cyrillic "с"

// text with hyperlinks: ['plain text', ['visible text', 'https://…'], …]
const runs = (parts, opts = {}) => (Array.isArray(parts) ? parts : [parts]).map((x) =>
  Array.isArray(x)
    ? new ExternalHyperlink({ link: x[1], children: [new TextRun({ text: x[0], color: '0B3D91', underline: {}, ...opts })] })
    : new TextRun({ text: x, ...opts }));
const P = (parts, o = {}) => new Paragraph({ children: runs(parts, o.run), spacing: { after: 40 }, ...o.par });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const META = (t) => new Paragraph({ children: [new TextRun({ text: t, color: '444444' })], spacing: { after: 40 } });
const LI = (parts) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: runs(parts), spacing: { after: 20 } });

const photo = new ImageRun({
  type: 'jpg',
  data: fs.readFileSync(PHOTO),
  transformation: { width: 88, height: 110 },
  altText: { title: '照片', description: '奥斯塔普·多增科，肖像', name: 'portrait' },
  floating: {
    horizontalPosition: { relative: HorizontalPositionRelativeFrom.MARGIN, align: HorizontalPositionAlign.RIGHT },
    verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, align: VerticalPositionAlign.TOP },
    wrap: { type: TextWrappingType.SQUARE, side: TextWrappingSide.LEFT },
    margins: { left: 182880, bottom: 91440 },
  },
});

const job = (title, meta, ctx, bullets) => [H2(title), META(meta), ...(ctx ? [P(ctx)] : []), ...bullets.map(LI)];

const body = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [photo, new TextRun('奥斯塔普·多增科（Ostap Dotsenko）')] }),
  P('业务拓展与市场营销负责人', { run: { bold: true, size: 24 } }),
  P('业务拓展 | B2B 市场营销 | 电子商务 | 俄罗斯、中国、东南亚'),
  P('电话：+86 137 6171 6355；+7 985 874-49-58（WhatsApp）', { par: { spacing: { after: 0 } } }),
  P(['微信：ostap10081987 | 邮箱：', ['norbanking@gmail.com', 'mailto:norbanking@gmail.com'], ' | Telegram：', ['@ostapdotcenko', 'https://t.me/ostapdotcenko']], { par: { spacing: { after: 0 } } }),
  P(['LinkedIn：', [LINKEDIN_TEXT, LINKEDIN], '（1.1万+关注者）'], { par: { spacing: { after: 0 } } }),
  P(['网站：', ['ostapdotcenko.ru', 'https://ostapdotcenko.ru'], ' | 城市：上海 · 莫斯科（混合办公）']),

  H1('求职意向'),
  P('CBDO、CMO 或国际业务拓展总监：俄罗斯 — 中国 — 东南亚。'),

  H1('职业概述'),
  P('13+ 年业务拓展与市场营销经验，深耕俄罗斯、中国与东南亚市场。曾任 Megamarket（俄罗斯第三大电商平台，Sber 生态）B2B 市场负责人、' +
    'AliExpress 俄罗斯与独联体（阿里巴巴集团）O2O 业务负责人；2025年起在上海创业，任公司所有者。管理团队最多40人，年营销预算超过10亿卢布，' +
    '在 Megamarket、阿里巴巴及自有企业均负责损益（P&L）。主导联邦级项目，与银行、电信运营商及政府部门建立合作。' +
    '足迹遍及20+个国家，掌握5种语言，包括中文（B2+）。'),

  H1('核心业绩'),
  ...[
    '卖家数量同比 +350%，平台卖家达5万家（Megamarket）。',
    '我主导的项目带来30亿卢布净利润（2023年第四季度）（Megamarket）。',
    '与俄罗斯经济发展部合作的联邦级项目，覆盖86个地区（Megamarket）。',
    '“俄罗斯制造”项目参与企业从0增长到2000家，2024年（Megamarket）。',
    'GMV 4800万美元，同比 +100%；新买家 +185%（AliExpress 俄罗斯与独联体）。',
    '平均投放 ROI 25倍；120+ 家媒体集团合作伙伴（阿里巴巴集团，2020–2022）。',
    '一站式承办 Megamarket（Sber）深圳企业论坛，1200+人（自有企业）。',
  ].map(LI),

  H1('工作经历'),
  ...job('所有者与项目创始人 —— 上海拼那克了科技有限公司（Shanghai Pinnacle Technology Co., Ltd.）', '2025 — 至今 | 中国上海',
    'GlobalTechTour —— 聚焦中国与东南亚的标杆考察与技术探访之旅；Aura Robotics —— 机器人与自动化，直接从中国制造商选型采购机器人。' +
    '作为所有者承担损益。', [
      '为 Megamarket（Sber）在深圳一站式承办1200+人企业论坛：物流、场地、商务日程全程负责。',
      '组织代表团参观 BYD、小米、百度、美团、得物、Leju Robotics 的工厂与研发中心；为 Aura 客户直接对接机器人厂商管理层与研发团队。',
      'BelMol 在 Kepler 工厂仅用2小时会谈即解决乳品生产自动化问题；SolarTek 在5天内走访 Leju Robotics、Robotera、AgiBot 和 Kepler。',
    ]),
  ...job('B2B 市场负责人（Head of B2B Marketing）—— Megamarket（Sber 生态）', '2023 — 2025 | 俄罗斯',
    '俄罗斯第三大电商平台。团队16–40人（直接管理及通过下属主管），年营销预算超过10亿卢布，负责业务线损益（P&L）。', [
      '搭建卖家招募 B2B 营销体系：卖家数量同比 +350%，平台卖家达5万家；我主导的项目带来30亿卢布净利润（2023年第四季度）。',
      '与俄罗斯经济发展部联合推出联邦级企业家扶持项目，依托86个地区的“我的事业”创业服务中心：从零搭建获客战略、营销物料与区域传播。',
      '操盘“Megasreda”全国创业马拉松，覆盖20座城市——从概念、物流到内容与公关；100万+次观看。',
      '推出“俄罗斯制造”项目：品牌计划、入驻体系、视频推广——参与企业从0增长到2000家。',
      '面向残障生产者的社会公益市集：定位、UX、公关活动。',
    ]),
  ...job('独立顾问（Independent Adviser）—— AdTech / MarTech / EduTech', '2022 — 2023 | 乌兹别克斯坦、哈萨克斯坦、东南亚', null, [
    '为企业提供咨询，包括 MyDars 和 HiTarget（印度尼西亚）：20+ 合作伙伴，面向东南亚的产品本地化。',
  ]),
  ...job('O2O 与新业务负责人（Head of O2O & New Business）—— 阿里巴巴集团（AliExpress 俄罗斯与独联体）', '2020 — 2022 | 俄罗斯与独联体',
    '团队最多5人，负责 O2O 业务线损益（P&L）。', [
      '与 Alfa 银行、Tinkoff、MTS 银行、Megafon、Beeline、俄罗斯石油公司及120+ 家媒体集团建立 O2O 合作。',
      'GMV 4800万美元（同比 +100%），新买家 +185%，平均投放 ROI 25倍。',
    ]),
  ...job('联合创始人（Co-founder）—— O.F.D 创意机构（O.F.D Creative Agency）', '2017 — 2020（2017年为筹备与启动期）| 上海、香港',
    '作为所有者承担损益。', [
      '中俄联合团队项目：为企业开拓中俄两国市场提供广告推广方案。',
      '客户：FOREO、DECATHLON、中国银行、WWE、CDEK。',
    ]),
  ...job('商务与业务拓展负责人（Head of Commerce & BD）—— Data Centric Alliance', '2015 — 2017 | 莫斯科、上海', null, [
    '负责媒体采购与亚洲市场业务拓展；合作伙伴：Google 香港、Yahoo 香港、腾讯、携程、百度。',
  ]),
  ...job('业务拓展经理（中国 / 东南亚）—— CityAds Media', '2013 — 2015 | 中国、东南亚', null, [
    '在中国及东南亚市场开展效果营销与联盟营销（CPA / CPC / CPL）；客户包括 Sasa（香港）。',
  ]),

  H1('核心技能'),
  ...[
    '业务拓展：市场进入战略、合作伙伴与战略联盟、与企业一把手谈判、亚洲与独联体市场拓展、开拓新业务方向。',
    '市场营销：B2B 市场营销、需求挖掘、Performance Marketing、产品营销、销售赋能、品牌项目。',
    '技术与数据：电子商务与电商平台、AdTech / MarTech、营销自动化、CRM 与数据分析、O2O。',
    '传播与公关：政府关系与国家项目、联邦级活动、公关；俄罗斯与独联体50+场展会与论坛。',
  ].map(LI),

  H1('语言能力'),
  LI('俄语（母语）· 英语 C1 · 中文 B2+ · 乌兹别克语 B1 · 韩语 A2。'),

  H1('教育背景'),
  LI('国际大学 —— 民法专业。'),
  LI('塔什干国立东方学学院附属中学 —— 韩语教师。'),

  H1('媒体报道与演讲'),
  ...[
    'RBC —— 专访“最重要的是懂行，并且敢于行动”；RBC Industries。',
    'Sber Business —— 专家指南《电商平台：完整盈利指南》。',
    '塔斯社 —— 乌里扬诺夫斯克州与 Megamarket 共建地方商品展示平台；“我的事业” —— “Megasreda”马拉松，100万+次观看。',
    '演讲：Russian Retail Show 2024（演讲嘉宾）、Amber Forum 2024（圆桌讨论）、“制造商峰会”，伊尔库茨克，2024（圆桌讨论）、' +
      'Russian Retail Week 2025、上合组织论坛 2025、“Megasreda”全国创业马拉松。',
  ].map(LI),

  H1('联系方式与链接'),
  LI(['电话：+86 137 6171 6355；+7 985 874-49-58（WhatsApp）。微信：ostap10081987。邮箱：', ['norbanking@gmail.com', 'mailto:norbanking@gmail.com']]),
  LI(['网站：', ['ostapdotcenko.ru', 'https://ostapdotcenko.ru'], '（俄语、英语、中文）；博客：', ['ostapdotcenko.ru/blog', 'https://ostapdotcenko.ru/blog'], ' —— 每日更新']),
  LI(['LinkedIn：', [LINKEDIN_TEXT, LINKEDIN], ' —— 1.1万+关注者']),
  LI(['Telegram：', ['@ostapdotcenko', 'https://t.me/ostapdotcenko'], '；Instagram：', ['@ostap.dotsenko', 'https://www.instagram.com/ostap.dotsenko/'], '；Facebook：Ostap Dotsenko']),
  LI(['项目：', ['globaltechtour.ru', 'https://globaltechtour.ru'], '（及博客）；', ['aura-robotics.ru', 'https://aura-robotics.ru'], '（及博客）']),
  P('推荐人信息可应要求提供。', { par: { spacing: { before: 80 } } }),
];

const doc = new Document({
  creator: '奥斯塔普·多增科（Ostap Dotsenko）',
  title: '奥斯塔普·多增科 — 简历',
  description: '简历，ATS 版本（简体中文）',
  styles: {
    default: {
      document: { run: { font: FONT, size: 19, language: LANG }, paragraph: { spacing: { line: 264 } } },
      title: { run: { font: FONT, size: 40, bold: true, color: '111111' }, paragraph: { spacing: { before: 0, after: 40 }, keepNext: true } },
      heading1: {
        run: { font: FONT, size: 22, bold: true, color: '111111' },
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
        children: [new TextRun('奥斯塔普·多增科 —— 简历，第 '), new TextRun({ children: [PageNumber.CURRENT] }),
          new TextRun(' 页，共 '), new TextRun({ children: [PageNumber.TOTAL_PAGES] }), new TextRun(' 页')] })] }),
    },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(OUT, buf); console.log('DOCX', OUT, buf.length, 'bytes'); });
