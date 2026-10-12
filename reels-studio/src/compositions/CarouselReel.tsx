// Reels из карусели (решение пользователя 12.10.2026: «сразу публиковать карусель в Рилс») — к карусели можно поставить
// музыку только так: API Instagram не добавляет музыку к каруселям. 1080×1920, 30 fps.
// Слайды — PNG видео-версии карусели (`video: true`, без стрелки «листай»), их рендерит scripts/carousel_reel.py.
// Без робота: слайд 4:5 шириной 952 px (поля 64 px), сверху 300 px; смена — «пролистывание» влево, как в карусели.
// С роботом Aura (`host: true`, решение пользователя 12.10.2026: «маскот выдвигает картинки из угла экрана, вытаскивает
// из-за экрана»): слайд 860 px, сверху 256 px, под ним «пол», на нём 3D-робот. Перед каждым слайдом робот подходит к левому
// краю и жестом pull «вытаскивает» новый слайд из-за края, старый уезжает вправо; на обложке машет, между слайдами кивает,
// осматривается и показывает на слайд, на финале — на кнопку сайта и машет на прощание.
// Всё лежит в безопасной зоне Reels (сверху 250, снизу 380) и в кадре ленты 4:5 (y 285–1635). Первый кадр — обложка Reels.
import React from "react";
import {AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {STYLES} from "./carousel/kit";
import {AuraMascot, GESTURE_DUR, type GestureKind, type MascotPlan, type MascotStay} from "../components/AuraMascot";

export const carouselReelSchema = z.object({
  brand: z.enum(["gtt", "aura"]),
  slides: z.array(z.object({src: z.string(), seconds: z.number()})), // PNG 1080×1350 (путь от корня репозитория) и сколько секунд на экране
  host: z.boolean().optional(), // робот Aura под слайдом вытаскивает слайды из-за левого края
  music: z.object({src: z.string(), volume: z.number(), fadeOut: z.number().optional()}).optional(),
  swipeSfx: z.string().optional(), // звук пролистывания (whoosh из @remotion/sfx)
  guides: z.boolean().optional(), // показать безопасную зону Reels и кадр ленты 4:5
});
export type CarouselReelProps = z.infer<typeof carouselReelSchema>;

// gap: соседний слайд целиком за кадром, без полоски у края
export const REEL_CARD = {w: 952, h: 1190, top: 300, gap: 96};
export const HOST_CARD = {w: 860, h: 1075, top: 256, gap: 140};
const SWIPE = 0.5; // секунд на пролистывание (последние 0,5 с слайда)
const PULL_SWIPE = 0.6; // с роботом слайд едет чуть дольше — в такт рывку
const FLOOR = 1535; // ступни робота: под слайдом, выше подписи Instagram
const HOST = {x: 190, y: FLOOR, face: 0.3}; // дом: слева под слайдом, чуть повернут к слайду
const EDGE = {x: 118, y: FLOOR, face: -1.15}; // у левого края, лицом к краю
const ROBOT_SCALE = 0.9; // голова чуть заходит на нижнее поле слайда (там пусто), текст не закрывает

export const reelSeconds = (p: CarouselReelProps) => p.slides.reduce((a, s) => a + s.seconds, 0);

// план робота: начала слайдов (с) → где стоит и что делает
export const hostPlan = (starts: number[], secs: number[]): MascotPlan => {
  const stays: MascotStay[] = [{at: -10, ...HOST}];
  const gestures: MascotPlan["gestures"] = [{at: 0.15, kind: "wave"}];
  const idle: GestureKind[] = ["nod", "pointUp", "scan"];
  let n = 0;
  starts.forEach((start, i) => {
    if (i === 0) return;
    const tug = start - PULL_SWIPE; // слайд начинает ехать — рывок на себя
    const pull = tug - 0.39; // рывок жеста pull начинается на 35 % его длины
    stays.push({at: pull - 0.05, ...EDGE}, {at: start + 0.7, ...HOST});
    gestures.push({at: pull, kind: "pull"});
    const from = start + 0.8; // вернулся домой
    if (i === starts.length - 1) {
      gestures.push({at: from, kind: "pointUp"}, {at: from + GESTURE_DUR.pointUp + 0.2, kind: "wave"});
      return;
    }
    const room = start + secs[i] - PULL_SWIPE - 0.95 - from; // до ухода к краю за следующим слайдом
    const fit = [...idle.slice(n % idle.length), ...idle].find((k) => GESTURE_DUR[k] <= room);
    if (fit) {
      gestures.push({at: from, kind: fit});
      n++;
    }
  });
  return {stays, gestures};
};

export const CarouselReel: React.FC<CarouselReelProps> = ({brand, slides, host, music, swipeSfx, guides}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width} = useVideoConfig();
  const s = STYLES[brand];
  const t = frame / fps;
  const robot = Boolean(host) && brand === "aura";
  const card = robot ? HOST_CARD : REEL_CARD;
  const swipe = robot ? PULL_SWIPE : SWIPE;
  const dir = robot ? -1 : 1; // с роботом новый слайд приходит слева (из-за края, где стоит робот)
  // начало каждого слайда; пролистывание k → k+1 идёт в последние swipe секунд слайда k
  const starts = slides.reduce<number[]>((a, sl, i) => [...a, i === 0 ? 0 : a[i - 1] + slides[i - 1].seconds], []);
  const swipes = starts.slice(1);
  let pos = 0;
  let lift = 0;
  swipes.forEach((end) => {
    const k = interpolate(t, [end - swipe, end], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1)});
    pos += k;
    lift = Math.max(lift, Math.sin(Math.PI * k));
  });
  const step = card.w + card.gap;
  const left = (width - card.w) / 2;
  const plan = robot ? hostPlan(starts, slides.map((sl) => sl.seconds)) : null;
  return (
    <AbsoluteFill style={s.bg}>
      <AbsoluteFill style={s.pattern} />
      {slides.map((sl, i) =>
        Math.abs(i - pos) < 1.5 ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + dir * (i - pos) * step,
              top: card.top,
              width: card.w,
              height: card.h,
              borderRadius: s.marker ? 18 : 28,
              overflow: "hidden",
              border: s.marker ? "2px solid #D9D7D5" : "2px solid rgba(255,255,255,0.16)",
              boxShadow: s.marker ? "0 24px 60px rgba(38,38,38,0.16)" : "0 30px 70px rgba(0,0,0,0.35)",
              scale: String(1 - 0.045 * lift),
            }}
          >
            <Img src={staticFile(sl.src)} style={{width: "100%", height: "100%", display: "block"}} />
          </div>
        ) : null,
      )}
      {plan ? <AuraMascot scale={ROBOT_SCALE} plan={plan} /> : null}
      {music ? (
        <Audio
          src={staticFile(music.src)}
          volume={(f) =>
            interpolate(f, [0, 0.25 * fps, durationInFrames - (music.fadeOut ?? 1.6) * fps, durationInFrames - 1], [0, music.volume, music.volume, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
      {swipeSfx
        ? swipes.map((end, i) => (
            <Sequence key={i} from={Math.round((end - swipe - 0.05) * fps)} durationInFrames={fps} premountFor={fps}>
              <Audio src={staticFile(swipeSfx)} volume={0.28} />
            </Sequence>
          ))
        : null}
      {guides ? (
        <>
          <div style={{position: "absolute", left: 0, right: 0, top: 0, height: 250, background: "rgba(255,0,120,0.25)"}} />
          <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 380, background: "rgba(255,0,120,0.25)"}} />
          <div style={{position: "absolute", left: 0, right: 0, top: 285, height: 1350, border: "4px dashed #00B4FF"}} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
