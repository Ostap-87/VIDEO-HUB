// Бренды шаблона TalkReelPro: одни и те же эффекты, разный стиль.
// gtt  — GlobalTechTour (синий акцент, Unbounded, тёмно-синий финал, стеклянная пирамида);
// aura — Aura Robotics (aura-robotics.ru): тёплый «пергамент» #F8F6F3, графит #262626, лимонный акцент #FFF65D
//        (как маркер-выделение на сайте), шрифты Inter и JetBrains Mono, круглый логотип-печать и 3D-маскот.
// od   — личный сайт ostapdotcenko.ru (решение пользователя 10.10.2026: «костяной» фон, как на сайте; брендбук —
//        POST-HUB OSTAPDOTCENKO/BRAND/BRAND.md): кость #EDEAE2, бумага #F7F4EC, чернила #191922, маркер #FFD92E,
//        штамп #FF4A1F; Unbounded / Golos Text / JetBrains Mono; квадратные углы, рамки 2 px, жёсткие тени без размытия.
import React from "react";
import {loadFont as loadInter} from "@remotion/google-fonts/Inter";
import {loadFont as loadGolos} from "@remotion/google-fonts/GolosText";
import {body, display, mono} from "./fonts";

const inter = loadInter("normal", {weights: ["500", "600", "700", "800"], subsets: ["cyrillic", "latin"]});
const golos = loadGolos("normal", {weights: ["400", "600", "700"], subsets: ["cyrillic", "latin"]});

export type BrandId = "gtt" | "aura" | "od";

export type Brand = {
  id: BrandId;
  site: string;
  accent: string; // текущее слово субтитров, акцентные слова, крупные цифры
  accentGlow: string; // свечение крупных цифр
  accentInk: string; // цвет текста поверх акцента
  captionFont: string;
  captionWeight: number;
  captionStroke: string; // тёмная обводка белых субтитров
  captionShadow?: string; // своя тень субтитров (od — жёсткая офсетная тень вместо обводки)
  square?: boolean; // od: никаких скруглений (маркер, плашки, карточки, кнопка)
  frameBorder: string; // рамка спикера-«экрана» и карточки финала
  highlighter: boolean; // текущее слово — маркер-выделение (как на aura-robotics.ru)
  chip: {bg: string; text: string; font: string; weight: number; radius: number; dot?: string; border?: string; shadow?: string};
  numberFont: string;
  number?: {stroke?: string; shadow?: string}; // крупная цифра: обводка и тень вместо свечения
  tick: {bg: string; stroke: string; idle: string};
  paper: string; // планшет чек-листа
  clip: string; // зажим планшета
  listTitle: {font: string; weight: number; color: string};
  veil: string; // rgb «пелены» под панелями, без альфы: "8,14,32"
  veilSolid: string;
  kicker: string; // подпись «Маршрут · 1/4» на панели городов
  finale: {
    bg: string; title: string; titleFont: string; titleWeight: number; button: string; buttonText: string; buttonGlow: string;
    grid?: string; // тонкая сетка (Aura)
    dots?: string; // точечная сетка (od, как на сайте)
    buttonShadow?: string; // жёсткая тень кнопки вместо свечения (od)
  };
  bodyFont: string;
  monoFont: string;
};

export const BRANDS: Record<BrandId, Brand> = {
  gtt: {
    id: "gtt",
    site: "globaltechtour.ru",
    accent: "#3D7BFF",
    accentGlow: "rgba(61,123,255,0.85)",
    accentInk: "#FFFFFF",
    captionFont: display.fontFamily,
    captionWeight: 700,
    captionStroke: "rgba(10,12,20,0.55)",
    highlighter: false,
    frameBorder: "#FFFFFF",
    chip: {bg: "#FFFFFF", text: "#17171D", font: display.fontFamily, weight: 700, radius: 16},
    numberFont: display.fontFamily,
    tick: {bg: "#16A34A", stroke: "#FFFFFF", idle: "#E5E7EB"},
    paper: "#FFFFFF",
    clip: "linear-gradient(180deg, #3B4254, #1C2130)",
    listTitle: {font: display.fontFamily, weight: 700, color: "#17171D"},
    veil: "8,14,32",
    veilSolid: "#070B18",
    kicker: "#BAE6FD",
    finale: {
      bg: "radial-gradient(ellipse 70% 45% at 30% 38%, rgba(37,99,235,0.35), rgba(37,99,235,0) 70%), linear-gradient(180deg, #0A1022 0%, #050814 100%)",
      title: "#E9EEF8",
      titleFont: display.fontFamily,
      titleWeight: 700,
      button: "#2563EB",
      buttonText: "#FFFFFF",
      buttonGlow: "59,130,246",
    },
    bodyFont: body.fontFamily,
    monoFont: mono.fontFamily,
  },
  aura: {
    id: "aura",
    site: "aura-robotics.ru",
    accent: "#FFF65D",
    accentGlow: "rgba(255,246,93,0.7)",
    accentInk: "#262626",
    captionFont: inter.fontFamily,
    captionWeight: 800,
    captionStroke: "rgba(20,20,20,0.6)",
    highlighter: true,
    frameBorder: "#262626",
    chip: {bg: "#F8F6F3", text: "#262626", font: inter.fontFamily, weight: 600, radius: 24, dot: "#FFF65D"},
    numberFont: inter.fontFamily,
    tick: {bg: "#262626", stroke: "#FFF65D", idle: "#D9D7D5"},
    paper: "#F8F6F3",
    clip: "linear-gradient(180deg, #2D2D2D, #000000)",
    listTitle: {font: inter.fontFamily, weight: 600, color: "#262626"},
    veil: "20,20,20",
    veilSolid: "#111111",
    kicker: "#FFF65D",
    finale: {
      // как первый экран сайта: тёплый фон, тонкая сетка, графитовая кнопка-«пилюля»
      bg: "radial-gradient(ellipse 60% 40% at 28% 40%, rgba(255,246,93,0.35), rgba(255,246,93,0) 70%), linear-gradient(180deg, #F8F6F3 0%, #EFECE7 100%)",
      title: "#262626",
      titleFont: inter.fontFamily,
      titleWeight: 600,
      button: "#000000",
      buttonText: "#FFFFFF",
      buttonGlow: "255,246,93",
      grid: "rgba(38,38,38,0.07)",
    },
    bodyFont: inter.fontFamily,
    monoFont: mono.fontFamily,
  },
  od: {
    id: "od",
    site: "ostapdotcenko.ru",
    accent: "#FFD92E", // маркер
    accentGlow: "rgba(255,217,46,0.6)",
    accentInk: "#191922",
    captionFont: display.fontFamily,
    captionWeight: 700,
    captionStroke: "rgba(25,25,34,0)",
    // субтитры белые с тенью, не с обводкой (обводка на кириллице съедает «щ», «ж», «ю» — разбор референса, OSTAPDOTCENKO/VIDEO.md)
    captionShadow: "5px 5px 0 rgba(25,25,34,0.92), 0 4px 18px rgba(0,0,0,0.35)",
    highlighter: true,
    square: true,
    frameBorder: "#191922",
    chip: {bg: "#F7F4EC", text: "#191922", font: display.fontFamily, weight: 700, radius: 0, dot: "#FF4A1F", border: "3px solid #191922", shadow: "8px 8px 0 #191922"},
    numberFont: display.fontFamily,
    number: {stroke: "5px #191922", shadow: "10px 10px 0 #191922"},
    tick: {bg: "#191922", stroke: "#FFD92E", idle: "#D5D1C4"},
    paper: "#F7F4EC",
    clip: "linear-gradient(180deg, #2A2A38, #12121A)",
    listTitle: {font: display.fontFamily, weight: 700, color: "#191922"},
    veil: "18,18,26",
    veilSolid: "#12121A",
    kicker: "#FFD92E",
    finale: {
      // как светлые секции сайта: «кость» с точечной сеткой, чернильная кнопка с жёлтой жёсткой тенью
      bg: "#EDEAE2",
      title: "#191922",
      titleFont: display.fontFamily,
      titleWeight: 700,
      button: "#191922",
      buttonText: "#EDEAE2",
      buttonGlow: "255,217,46",
      dots: "rgba(25,25,34,0.16)",
      buttonShadow: "10px 10px 0 #FFD92E",
    },
    bodyFont: golos.fontFamily,
    monoFont: mono.fontFamily,
  },
};

export const BrandCtx = React.createContext<Brand>(BRANDS.gtt);
export const useBrand = () => React.useContext(BrandCtx);
