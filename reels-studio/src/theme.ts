// СТИЛЬ GlobalTechTour: светлый «framed»-шаблон (закреплено 21.09.2026).
// Все цвета и размеры берутся отсюда.

export const VIDEO = {width: 1080, height: 1920, fps: 30};

export const theme = {
  site: "globaltechtour.ru",
  colors: {
    primary: "#EEEEF2", // фон сцены
    accent: "#2563EB", // акцент, ссылки, плашка CTA
    text: "#17171D", // основной текст
    muted: "#6B6B76", // подписи
    surface: "#FFFFFF", // карточки, плашки
    line: "#D5D5DD", // рамки, разделители
  },
  // Безопасная зона Reels: интерфейс Instagram перекрывает края кадра
  safe: {top: 250, bottom: 380, side: 64},
  // Карточка с фото/видео внутри сцены
  frame: {x: 48, top: 200, bottom: 200, radius: 64},
  pad: 72, // внутренний отступ текста от края карточки
  motion: {
    snappy: {damping: 18, stiffness: 180, mass: 0.8},
    soft: {damping: 200},
  },
};

// Текст не опускается ниже безопасной зоны Instagram
export const textInsetBottom = theme.safe.bottom - theme.frame.bottom;
