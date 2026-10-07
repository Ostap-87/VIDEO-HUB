import type {Word} from "../components/Captions";

// Быстрая разметка субтитров без транскрибации:
// время слова зависит от его длины. Для точных таймингов
// подставьте свои слова с метками времени (например, из Whisper).
export const autoWords = (
  text: string,
  startSec = 0.4,
  secPerChar = 0.065,
  gap = 0.05
): Word[] => {
  let t = startSec;
  return text
    .trim()
    .split(/\s+/)
    .map((w) => {
      const letters = w.replace(/[^\p{L}\p{N}]/gu, "").length;
      const dur = Math.max(0.25, letters * secPerChar);
      const word = {text: w, start: t, end: t + dur};
      t += dur + gap;
      return word;
    });
};
