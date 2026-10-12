// Reels из карусели (решение пользователя 12.10.2026: «сразу публиковать карусель в Рилс») — к карусели можно поставить
// музыку только так: API Instagram не добавляет музыку к каруселям. 1080×1920, 30 fps.
// Слайды — PNG видео-версии карусели (`video: true`, без стрелки «листай»), их рендерит scripts/carousel_reel.py.
// Без робота: слайд 4:5 шириной 952 px (поля 64 px), сверху 300 px; смена — «пролистывание» влево, как в карусели.
// С роботом Aura (`host: true`, решение пользователя 12.10.2026: «маскот выдвигает картинки из угла экрана, вытаскивает
// из-за экрана»): слайд 860 px, сверху 256 px, под ним «пол», на нём 3D-робот справа. Каждый слайд, начиная с первого, робот
// «вытаскивает» из-за правого края жестом pull — слайды идут вперёд, как при листании карусели (справа налево), старый
// уезжает влево. После обложки робот машет,
// между слайдами кивает, осматривается и показывает на слайд, на финале — на кнопку сайта и машет на прощание.
// Вступление (решение пользователя 12.10.2026): первый кадр — большой робот на весь экран машет, рядом небольшая робособака
// (AuraDog), за ними крутится печать Aura Robotics (AuraBadge); печать исчезает, робот с собакой уменьшаются и переходят
// под слайд — и робот начинает вытаскивать слайды. Собака остаётся рядом и подпрыгивает на каждом новом слайде.
// Всё лежит в безопасной зоне Reels (сверху 250, снизу 380) и в кадре ленты 4:5 (y 285–1635). Первый кадр — обложка Reels
// (с роботом — большой робот машет на фоне печати, без робота — первый слайд).
import React from "react";
import {AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {STYLES} from "./carousel/kit";
import {AuraMascot, GESTURE_DUR, smooth, type GestureKind, type MascotPlan, type MascotStay} from "../components/AuraMascot";
import {AuraBadge} from "../components/AuraBadge";
import {AuraDog} from "../components/AuraDog";
import {AuraHumanoidSpot, type HumanoidSpotPlan} from "../components/AuraHumanoidSpot";
import {H_DUR, type HumanoidGesture} from "../components/aura3d/AuraHumanoid";

export const carouselReelSchema = z.object({
  brand: z.enum(["gtt", "aura"]),
  slides: z.array(z.object({src: z.string(), seconds: z.number()})), // PNG 1080×1350 (путь от корня репозитория) и сколько секунд на экране
  host: z.boolean().optional(), // робот Aura под слайдом вытаскивает слайды из-за правого края
  hostModel: z.enum(["humanoid", "mascot"]).optional(), // кто ведущий: новый гуманоид из 3D-арсенала (по умолчанию) или маскот сайта
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
const HOST = {x: 890, y: FLOOR, face: -0.3}; // дом: справа под слайдом, чуть повернут к слайду (левее кнопок Instagram)
const EDGE = {x: 962, y: FLOOR, face: 1.15}; // у правого края, лицом к краю
const ROBOT_SCALE = 1.08; // голова заходит на нижний правый угол слайда — там пусто (стрелки «листай» в видео нет)
const HERO = 3.1; // вступление: большой робот, собака и печать; к этому моменту робот уже маленький у правого края
const INTRO = HERO + 0.95; // робот сразу тянет первый слайд
const HERO_BOT = {x: 540, y: 1540, scale: 4}; // большой робот: голова у верха безопасной зоны
const DOG_HERO = {x: 245, y: 1540, scale: 2.6, face: -0.7}; // собака слева у ног робота, мордой к нему и к зрителю
const DOG_HOME = {x: 760, y: FLOOR, scale: 0.95, face: -0.6}; // под слайдом левее робота
const BADGE = {x: 540, y: 720, size: 900}; // печать за роботом (верх — у края безопасной зоны)
const SHRINK: [number, number] = [2.4, HERO]; // робот и собака уменьшаются и переходят под слайд
const BADGE_OUT: [number, number] = [2.1, 2.7];
// гуманоид-ведущий (решение пользователя 12.10.2026: «использовать нового гуманоида и новую робособаку в самом начале»):
// стоит на месте под правым углом слайда и только поворачивается — к краю (тянет слайд правой рукой) и к зрителю
const H_HOST = {x: 905, edge: -0.3, home: -Math.PI / 2 - 0.35, scale: 1.08};
const H_HERO = {x: 540, y: 1540, scale: 3.7}; // большой гуманоид: поднятая в приветствии рука — у верха кадра
const H_TURN = 0.6; // поворот на месте (pathAt в AuraHumanoid)

const hasHost = (p: {host?: boolean; brand: string}) => Boolean(p.host) && p.brand === "aura";
export const reelSeconds = (p: CarouselReelProps) => p.slides.reduce((a, s) => a + s.seconds, 0) + (hasHost(p) ? INTRO : 0);

// план робота: начала слайдов (с) → где стоит и что делает
export const hostPlan = (starts: number[], secs: number[]): MascotPlan => {
  const stays: MascotStay[] = [{at: -10, ...EDGE}]; // в начале уже у края — сразу тянет первый слайд
  const gestures: MascotPlan["gestures"] = [];
  const idle: GestureKind[] = ["nod", "pointUp", "scan"];
  let n = 0;
  starts.forEach((start, i) => {
    const tug = start - PULL_SWIPE; // слайд начинает ехать — рывок на себя
    const pull = Math.max(0, tug - 0.39); // рывок жеста pull начинается на 35 % его длины
    if (i > 0) stays.push({at: pull - 0.05, ...EDGE});
    stays.push({at: start + 0.7, ...HOST});
    gestures.push({at: pull, kind: "pull"});
    const from = start + 0.8; // вернулся домой
    if (i === 0) {
      gestures.push({at: from, kind: "wave"});
      return;
    }
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

// тот же сценарий для гуманоида: поворот к краю → pull → поворот к зрителю → жест; жесты маскота → жесты гуманоида
export const humanoidHostPlan = (starts: number[], secs: number[]): HumanoidSpotPlan => {
  const stays: HumanoidSpotPlan["stays"] = [{at: -10, x: H_HOST.x, face: H_HOST.edge}];
  const gestures: HumanoidGesture[] = [];
  const idle: HumanoidGesture["kind"][] = ["nod", "point", "look"];
  let n = 0;
  starts.forEach((start, i) => {
    const pull = Math.max(0, start - PULL_SWIPE - 0.39);
    if (i > 0) stays.push({at: pull - 0.05, x: H_HOST.x, face: H_HOST.edge});
    const back = pull + H_DUR.pull + H_TURN;
    stays.push({at: back, x: H_HOST.x, face: H_HOST.home});
    gestures.push({at: pull, kind: "pull"});
    const from = back + 0.05;
    if (i === 0) {
      gestures.push({at: from, kind: "wave"});
      return;
    }
    if (i === starts.length - 1) {
      gestures.push({at: from, kind: "pointUp"}, {at: from + H_DUR.pointUp + 0.2, kind: "wave"});
      return;
    }
    const room = start + secs[i] - PULL_SWIPE - 0.39 - H_TURN - 0.1 - from; // до поворота к краю за следующим слайдом
    const fit = [...idle.slice(n % idle.length), ...idle].find((k) => H_DUR[k] <= room);
    if (fit) {
      gestures.push({at: from, kind: fit});
      n++;
    }
  });
  return {stays, gestures};
};

export const CarouselReel: React.FC<CarouselReelProps> = ({brand, slides, host, hostModel, music, swipeSfx, guides}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width} = useVideoConfig();
  const s = STYLES[brand];
  const t = frame / fps;
  const robot = hasHost({host, brand});
  const human = robot && (hostModel ?? "humanoid") === "humanoid";
  const card = robot ? HOST_CARD : REEL_CARD;
  const swipe = robot ? PULL_SWIPE : SWIPE;
  // начало каждого слайда; пролистывание k → k+1 идёт в последние swipe секунд слайда k; с роботом и первый слайд въезжает
  const intro = robot ? INTRO : 0;
  const starts = slides.reduce<number[]>((a, sl, i) => [...a, i === 0 ? intro : a[i - 1] + slides[i - 1].seconds], []);
  const swipes = robot ? starts : starts.slice(1);
  let pos = robot ? -1 : 0;
  let lift = 0;
  swipes.forEach((end) => {
    const k = interpolate(t, [end - swipe, end], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.65, 0, 0.35, 1)});
    pos += k;
    lift = Math.max(lift, Math.sin(Math.PI * k));
  });
  const step = card.w + card.gap;
  const left = (width - card.w) / 2;
  const plan = robot && !human ? hostPlan(starts, slides.map((sl) => sl.seconds)) : null;
  const hplan = human ? humanoidHostPlan(starts, slides.map((sl) => sl.seconds)) : null;
  const shrink = smooth(interpolate(t, SHRINK, [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}));
  return (
    <AbsoluteFill style={s.bg}>
      <AbsoluteFill style={s.pattern} />
      {slides.map((sl, i) =>
        Math.abs(i - pos) < 1.5 ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + (i - pos) * step,
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
      {robot && t < BADGE_OUT[1] ? (
        // печать: уже «проштампована» к первому кадру (время сдвинуто на 1,5 с), уходит — уменьшается и тает
        <Sequence from={-45} layout="none">
          <div
            style={{
              position: "absolute",
              left: BADGE.x - BADGE.size / 2,
              top: BADGE.y - BADGE.size / 2,
              opacity: interpolate(t, BADGE_OUT, [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}),
              scale: String(interpolate(t, BADGE_OUT, [1, 0.55], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic)})),
              rotate: `${interpolate(t, BADGE_OUT, [0, 50], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic)})}deg`,
            }}
          >
            <AuraBadge size={BADGE.size} />
          </div>
        </Sequence>
      ) : null}
      {robot && t < HERO ? (
        // большой робот и собака: рисуются крупно, уменьшаются CSS-масштабом от точки ступней и едут под слайд
        <>
          {human ? (
            <AbsoluteFill
              style={{
                transformOrigin: `${H_HERO.x}px ${H_HERO.y}px`,
                scale: String(interpolate(shrink, [0, 1], [1, H_HOST.scale / H_HERO.scale])),
                translate: `${(H_HOST.x - H_HERO.x) * shrink}px ${(FLOOR - H_HERO.y) * shrink - Math.sin(Math.PI * shrink) * 90}px`,
              }}
            >
              <AuraHumanoidSpot
                y={H_HERO.y}
                scale={H_HERO.scale}
                dpr={1}
                plan={{
                  stays: [{at: -10, x: H_HERO.x, face: -Math.PI / 2 + (H_HOST.edge + Math.PI / 2) * shrink}],
                  gestures: [{at: -0.6, kind: "wave"}, {at: 2.05, kind: "nod"}],
                }}
              />
            </AbsoluteFill>
          ) : (
          <AbsoluteFill
            style={{
              transformOrigin: `${HERO_BOT.x}px ${HERO_BOT.y}px`,
              scale: String(interpolate(shrink, [0, 1], [1, ROBOT_SCALE / HERO_BOT.scale])),
              translate: `${(EDGE.x - HERO_BOT.x) * shrink}px ${(EDGE.y - HERO_BOT.y) * shrink - Math.sin(Math.PI * shrink) * 90}px`,
            }}
          >
            <AuraMascot
              scale={HERO_BOT.scale}
              dpr={1}
              plan={{
                stays: [{at: -10, x: HERO_BOT.x, y: HERO_BOT.y, face: EDGE.face * shrink}],
                gestures: [{at: -0.6, kind: "wave"}, {at: 1.95, kind: "nod"}],
              }}
            />
          </AbsoluteFill>
          )}
          <AbsoluteFill
            style={{
              transformOrigin: `${DOG_HERO.x}px ${DOG_HERO.y}px`,
              scale: String(interpolate(shrink, [0, 1], [1, DOG_HOME.scale / DOG_HERO.scale])),
              translate: `${(DOG_HOME.x - DOG_HERO.x) * shrink}px ${(DOG_HOME.y - DOG_HERO.y) * shrink - Math.sin(Math.PI * shrink) * 60}px`,
            }}
          >
            <AuraDog
              x={DOG_HERO.x}
              y={DOG_HERO.y}
              scale={DOG_HERO.scale}
              dpr={1}
              face={DOG_HERO.face + (DOG_HOME.face - DOG_HERO.face) * shrink}
              hops={human ? [] : [0.9, 1.9]}
              stands={human ? [{at: -0.4, dur: 2.5}] : []}
            />
          </AbsoluteFill>
        </>
      ) : null}
      {robot && t >= HERO ? <AuraDog x={DOG_HOME.x} y={DOG_HOME.y} scale={DOG_HOME.scale} face={DOG_HOME.face} hops={[...starts, starts[starts.length - 1] + 3.1]} /> : null}
      {plan && t >= HERO ? <AuraMascot scale={ROBOT_SCALE} plan={plan} /> : null}
      {hplan && t >= HERO ? <AuraHumanoidSpot y={FLOOR} scale={H_HOST.scale} plan={hplan} /> : null}
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
      {swipeSfx && robot ? (
        <Sequence from={Math.round((SHRINK[0] - 0.1) * fps)} durationInFrames={fps} premountFor={fps}>
          <Audio src={staticFile(swipeSfx)} volume={0.32} />
        </Sequence>
      ) : null}
      {swipeSfx
        ? swipes.map((end, i) => (
            <Sequence key={i} from={Math.max(0, Math.round((end - swipe - 0.05) * fps))} durationInFrames={fps} premountFor={fps}>
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
