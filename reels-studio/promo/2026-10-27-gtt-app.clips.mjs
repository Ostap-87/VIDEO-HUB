// Клипы экрана для рекламного ролика о приложении GTT (сценарий — 2026-10-27-gtt-app.json).
// Каждый клип: путь в веб-сборке, демо-данные (seed — ключи из seeds) и действия; метки (mark / tap / scroll)
// сводятся со словами диктора в scripts/promo_build.py. Между действиями — запас времени: лишнее срежется при сведении.
// Люди, визитки и чеки — вымышленные (как и всё демо приложения).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = '2026-10-27-gtt-app-promo';
const IMG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../source-videos', name, 'img');
const img = (f) => `data:image/jpeg;base64,${fs.readFileSync(path.join(IMG, f)).toString('base64')}`;

const now = Date.now();
const profileFull = {
  diets: ['pork'], algOn: true, alg: ['shellfish'], algOther: '', severe: true, room: 'double', mate: 'd7', eng: 'basic',
  msg: 'Telegram', interests: ['Собственные марки', 'Доставка', 'Логистика и склады'], health: [], healthNote: '',
  consent: true, keep: true, saved: true,
};
const profileFresh = { ...profileFull, diets: [], algOn: false, alg: [], severe: false, saved: false, consent: false };

const notes = {
  jd: [
    { id: 'n3', at: 'Вт 10 · 11:52', kind: 'text', text: 'Договорились: менеджер пришлёт презентацию по складской автоматизации до конца ноября.' },
    { id: 'n2', at: 'Вт 10 · 11:20', kind: 'voice', sec: 34 },
    { id: 'n1', at: 'Вт 10 · 10:48', kind: 'text', text: 'Склад: сборщик стоит на месте, полки приезжают к нему сами. Спросить, сколько стоит такая автоматизация для нашего склада.' },
  ],
  meituan: [{ id: 'm1', at: 'Вт 10 · 15:50', kind: 'text', text: 'Курьеров распределяет алгоритм: маршрут и время доставки считаются автоматически. Идея для нашей доставки.' }],
};

const card = (id, visit, name, latin, title, titleRu, company, companyRu, photo) => ({
  id, at: 'Вт 10 · 12:05', visit, photo, raw: '', name, latin, title, titleRu, company, companyRu,
  phones: ['+86 138 0000 0000'], email: 'wang.xm@zhilian-demo.cn', wechat: 'zhilian_wang', site: '', address: '北京市大兴区物流园 8 号',
});

const exp = (id, amount, cat, note, photo) => ({
  id, at: new Date(now - 3600e3).toISOString(), trip: 'demo', amount, cur: 'CNY', sym: '¥', rate: 12.068,
  rateNote: 'курс ЦБ РФ', cat, note, photo,
});

const live = (id, kind, title, note, until, options, questions = []) => ({
  id, kind, title, note, until, options, questions, status: 'live', showResults: true, votes: {}, startedAt: now - 50000,
  ...(kind === 'questions' ? { visitId: 'hema' } : {}),
});

export const seeds = {
  base: { 'trip.profile': profileFull, 'trip.pStep': 3, 'visits.notes': notes },
  fresh: { 'trip.profile': profileFresh, 'trip.pStep': 1 },
  cards: {
    'visits.cards': [
      card('c1', 'jd', '王晓明', 'Wang Xiaoming', '海外销售总监', 'директор по зарубежным продажам', '智联物流科技有限公司', 'Чжилянь, логистические технологии', img('vizitka-small.jpg')),
      { ...card('c2', 'jd', '李娜', 'Li Na', '合作伙伴经理', 'менеджер по работе с партнёрами', '智联物流科技有限公司', 'Чжилянь, логистические технологии'), email: 'li.na@zhilian-demo.cn' },
      { ...card('c3', 'hema', '陈伟', 'Chen Wei', '生鲜采购负责人', 'руководитель закупок свежих продуктов', '鲜果供应链有限公司', 'Сяньго, поставки свежих продуктов'), email: 'chen.w@xianguo-demo.cn' },
    ],
  },
  expenses: {
    'trip.expenses': [
      exp('e3', 120, 'net', 'Туристический пакет связи на 7 дней', img('chek-svyaz.jpg')),
      exp('e2', 268, 'food', 'Обед с партнёрами — утка по-пекински', img('chek-obed.jpg')),
      exp('e1', 86, 'taxi', 'Такси DiDi: отель → JD.com', img('chek-taksi.jpg')),
    ],
  },
  guide: { 'coord.guideLive': true },
  polls: {
    'polls.enabled': true,
    'polls.list': [
      live('p1', 'restaurant', 'Ужин в среду: куда идём?', 'Бронь подтверждаем в 16:00 — ответьте до 15:00.', '15:00',
        [{ id: 'o1', text: 'Шанхайская кухня и сяолунбао' }, { id: 'o2', text: 'Хого — горячий котёл' }, { id: 'o3', text: 'Европейская кухня с видом на Бунд' }]),
      live('p2', 'questions', 'Вопросы к Hema (Freshippo) перед визитом', 'Пишите свои и поддерживайте чужие — 5 самых популярных координатор отправит компании по-китайски.', 'вт 20:00', [],
        [['d4', 'Какая доля онлайн-заказов доставляется за 30 минут?'], ['d9', 'Как устроена логистика живой рыбы и морепродуктов?'], ['d6', 'Сколько позиций в магазине и как часто меняется ассортимент?'], ['d12', 'Какие собственные марки продаются лучше всего?']]
          .map(([by, text], i) => ({ id: `q${i + 1}`, text, by, at: '09:00', likes: [] }))),
    ],
  },
  sos: {
    'geo.sos': [{ id: 's1', whoId: 'd1', who: 'Анна Смирнова', fix: { lat: 39.7895, lng: 116.5702, acc: 14, at: now - 120000 }, at: '10:41', delivered: false, status: 'new' }],
    'geo.consent': { on: true, at: '27.10.2026 10:02' },
  },
  consent: { 'geo.consent': { on: true, at: '27.10.2026 10:02' } },
};

const B = ['base'];
export const clips = {
  // «Сегодня» сразу после запуска (стартовый 3D-экран в облаке рисуется 2 к/с — вместо него иконка на главном экране в ролике)
  start: {
    path: '/trip', seed: B,
    run: async (ui) => {
      await ui.mark('open'); await ui.wait(2600);
      await ui.scroll('scroll', { dy: 420, ms: 1100 }); await ui.wait(1600);
      await ui.scroll('back', { dy: -420, ms: 900 }); await ui.wait(400);
      await ui.mark('hero', { focus: 'ВЫЕЗД В' }); await ui.wait(1800);
    },
  },
  plan: {
    path: '/trip', seed: B,
    run: async (ui) => {
      await ui.wait(600);
      await ui.tap('plan', { role: 'tab', name: /План/ }); await ui.wait(2200);
      await ui.tap('day', { exact: '12' }); await ui.wait(2200);
    },
  },
  route: { path: '/route', seed: B, settle: 300, run: async (ui) => { await ui.mark('open'); await ui.wait(5200); } },
  prep: {
    path: '/trip/prep', seed: B,
    run: async (ui) => {
      await ui.wait(600);
      await ui.scroll('docs', { toText: 'Подготовка', to: 120 }); await ui.wait(1800);
      await ui.scroll('remind', { toText: 'Напоминания', to: 120 }); await ui.wait(1800);
      await ui.scroll('apps', { toText: 'Приложения для', to: 120 }); await ui.wait(1800);
      await ui.scroll('memo', { toText: 'связь, оплата', to: 160 }); await ui.wait(2000);
    },
  },
  profile: {
    path: '/profile', seed: ['fresh'],
    run: async (ui) => {
      await ui.wait(700);
      await ui.tap('diet', 'Без свинины'); await ui.wait(1500);
      await ui.tap('alg0', 'Есть'); await ui.wait(700);
      await ui.scroll(null, { toText: 'На что', to: 200, ms: 600 }); await ui.wait(300);
      await ui.tap('alg', 'Креветки, крабы'); await ui.wait(1500);
      await ui.scroll(null, { toText: 'Назад', to: 700, ms: 500 }); await ui.tap('back', { exact: 'Назад' }); await ui.wait(1300);
      await ui.tap('lang', 'Свободно'); await ui.wait(1800);
    },
  },
  waiter: { path: '/waiter', seed: B, run: async (ui) => { await ui.mark('idle'); await ui.wait(3500); } },
  bus: {
    path: '/trip', seed: B,
    run: async (ui) => { await ui.wait(1600); await ui.tap('tap', 'Я в автобусе'); await ui.wait(2200); },
  },
  coord: {
    path: '/coord', seed: B,
    run: async (ui) => {
      await ui.mark('idle'); await ui.wait(1800);
      await ui.scroll('gather', { toText: 'Сбор группы', to: 110 }); await ui.wait(400);
      await ui.mark('gatherFocus', { focus: 'Сбор группы' }); await ui.wait(1800);
      await ui.scroll('legs', { toText: 'Переезды', to: 110 }); await ui.wait(2200);
    },
  },
  company: {
    path: '/company/jd', seed: B,
    run: async (ui) => {
      await ui.mark('idle'); await ui.wait(1800);
      await ui.scroll('notes', { toText: 'Мои заметки', to: 110 }); await ui.wait(2600);
    },
  },
  guide: { path: '/guide', seed: [...B, 'guide'], run: async (ui) => { await ui.mark('idle'); await ui.wait(900); await ui.tap('listen', { exact: 'Слушать' }); await ui.wait(4500); } },
  card: { path: '/card-scan?visit=jd&id=c1', seed: [...B, 'cards'], run: async (ui) => { await ui.mark('idle'); await ui.wait(1500); await ui.scroll('fields', { dy: 260 }); await ui.wait(2500); } },
  cards: { path: '/cards', seed: [...B, 'cards'], run: async (ui) => { await ui.mark('idle'); await ui.wait(3000); } },
  mindmap: {
    path: '/mindmap?day=1', seed: B,
    run: async (ui) => {
      await ui.wait(500);
      await ui.tap('example', 'Пример'); await ui.wait(2000);
      await ui.tap('zoom', 'Крупно'); await ui.wait(2500);
    },
  },
  report: { path: '/report', seed: [...B, 'cards'], run: async (ui) => { await ui.mark('idle'); await ui.wait(1200); await ui.scroll('down', { dy: 300 }); await ui.wait(1500); } },
  city: {
    path: '/city', seed: B,
    run: async (ui) => {
      await ui.mark('idle'); await ui.wait(1600);
      await ui.scroll('conv', { toText: 'Юани в рубли', to: 140, ms: 700 }); await ui.wait(1800);
    },
  },
  translator: {
    path: '/translator', seed: B,
    run: async (ui) => { await ui.wait(500); await ui.tap('zh', '中文'); await ui.wait(1600); await ui.tap('ru', 'Русский'); await ui.wait(1600); },
  },
  driver: { path: `/driver?zh=${encodeURIComponent('北京市东城区王府井大街')}&ru=${encodeURIComponent('Отель у улицы Ванфуцзин')}`, seed: B, run: async (ui) => { await ui.mark('idle'); await ui.wait(2500); } },
  around: {
    path: '/around', seed: B,
    run: async (ui) => { await ui.wait(500); await ui.tap('show', 'Показать ближайшие'); await ui.wait(2500); },
  },
  pharmacy: {
    path: '/pharmacy', seed: B,
    run: async (ui) => { await ui.wait(400); await ui.scroll(null, { toText: 'Покажите фармацевту', to: 120, ms: 600 }); await ui.tap('card', 'Головная боль'); await ui.wait(2500); },
  },
  fruit: { path: '/fruit', seed: B, run: async (ui) => { await ui.mark('idle'); await ui.wait(1200); await ui.scroll('down', { dy: 380 }); await ui.wait(1600); } },
  offline: {
    path: '/offline-map', seed: B,
    run: async (ui) => { await ui.mark('idle'); await ui.wait(2200); await ui.tap('hotel', 'Отель у улицы Ванфуцзин'); await ui.wait(2600); },
  },
  sos: {
    path: '/help', seed: [...B, 'consent'],
    run: async (ui) => { await ui.wait(700); await ui.tap('hold', 'SOS', { hold: 1700 }); await ui.wait(2400); },
  },
  groupmap: { path: '/group-map', seed: [...B, 'sos'], run: async (ui) => { await ui.mark('idle'); await ui.wait(3500); } },
  chat: {
    path: '/chat', seed: B,
    run: async (ui) => {
      await ui.wait(500);
      await ui.tap('field', { css: 'textarea, input[type="text"]' }); await ui.type('Буду через 5 минут, я у входа в JD', 40);
      await ui.tap('send', { css: '[aria-label="Отправить"]' }); await ui.wait(2600);
    },
  },
  poll: {
    path: '/poll/p1', seed: [...B, 'polls'],
    run: async (ui) => { await ui.wait(700); await ui.tap('vote', 'Хого'); await ui.wait(2600); },
  },
  pollq: {
    path: '/poll/p2', seed: [...B, 'polls'],
    run: async (ui) => { await ui.wait(400); await ui.scroll(null, { toText: 'Поддержите лучшие', to: 120, ms: 500 }); await ui.tap('like', { css: '[aria-label="Поддержать вопрос"]' }); await ui.wait(2400); },
  },
  expenses: {
    path: '/expenses', seed: [...B, 'expenses'],
    run: async (ui) => { await ui.mark('idle'); await ui.wait(1500); await ui.scroll('list', { toText: 'Обед с партнёрами', to: 260 }); await ui.wait(2500); },
  },
  followup: {
    path: '/followup', seed: B,
    run: async (ui) => { await ui.mark('idle'); await ui.wait(1500); await ui.tap('pick', 'Переговоры о поставках'); await ui.wait(1200); await ui.tap('pick2', 'Повторная встреча'); await ui.wait(1800); },
  },
  food: { path: '/food-summary', seed: B, run: async (ui) => { await ui.mark('idle'); await ui.wait(3000); } },
  rooming: { path: '/rooming', seed: B, run: async (ui) => { await ui.mark('idle'); await ui.wait(3000); } },
};
