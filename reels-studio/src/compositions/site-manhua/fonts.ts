// Шрифты манхуа-ролика: тяжёлый гротеск Dela Gothic One (заголовки-удары), Rubik Glitch (смена языка), Press Start 2P
// (экран «выбери язык», как в игре), Caveat (пометки от руки), Oswald (плашки рассказчика), Unbounded и Golos Text
// (язык профиля), JetBrains Mono (адреса), ZCOOL QingKe HuangYou (крупный китайский: 第一话), кисть Ma Shan Zheng — локально.
import {loadFont as loadDela} from "@remotion/google-fonts/DelaGothicOne";
import {loadFont as loadGlitch} from "@remotion/google-fonts/RubikGlitch";
import {loadFont as loadPixel} from "@remotion/google-fonts/PressStart2P";
import {loadFont as loadCaveat} from "@remotion/google-fonts/Caveat";
import {loadFont as loadOswald} from "@remotion/google-fonts/Oswald";
import {loadFont as loadUnbounded} from "@remotion/google-fonts/Unbounded";
import {loadFont as loadGolos} from "@remotion/google-fonts/GolosText";
import {loadFont as loadMono} from "@remotion/google-fonts/JetBrainsMono";
import {loadFont as loadZcool} from "@remotion/google-fonts/ZCOOLQingKeHuangYou";

export const FONT = {
  dela: loadDela("normal", {weights: ["400"], subsets: ["cyrillic", "latin"]}).fontFamily,
  glitch: loadGlitch("normal", {weights: ["400"], subsets: ["cyrillic", "latin"]}).fontFamily,
  pixel: loadPixel("normal", {weights: ["400"], subsets: ["cyrillic", "latin"]}).fontFamily,
  hand: loadCaveat("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]}).fontFamily,
  oswald: loadOswald("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]}).fontFamily,
  unb: loadUnbounded("normal", {weights: ["900"], subsets: ["cyrillic", "latin"]}).fontFamily,
  golos: loadGolos("normal", {weights: ["600", "800"], subsets: ["cyrillic", "latin"]}).fontFamily,
  mono: loadMono("normal", {weights: ["700"], subsets: ["cyrillic", "latin"]}).fontFamily,
  zcool: loadZcool("normal", {weights: ["400"], subsets: ["chinese-simplified", "latin"]}).fontFamily,
};
