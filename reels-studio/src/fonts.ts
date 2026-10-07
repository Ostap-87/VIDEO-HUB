import {loadFont as loadDisplay} from "@remotion/google-fonts/Unbounded";
import {loadFont as loadBody} from "@remotion/google-fonts/Inter";
import {loadFont as loadMono} from "@remotion/google-fonts/JetBrainsMono";

// Заголовки: Unbounded 700. Основной текст: Inter 400 / 700 (акцент).
// Моноширинный: плашка сайта, счётчик, кикер (в гайде не назван, взят JetBrains Mono).
export const display = loadDisplay("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]});
export const body = loadBody("normal", {weights: ["400", "700"], subsets: ["cyrillic", "latin"]});
export const mono = loadMono("normal", {weights: ["500"], subsets: ["cyrillic", "latin"]});
