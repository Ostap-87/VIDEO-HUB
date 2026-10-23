// Предпросмотр «как на телефоне» (решение пользователя 23.10.2026: «сбоку прототип экрана телефона, как делали для
// приложения GTT, чтобы в моменте видеть, как на телефоне это будет выглядеть»). Рамка iPhone как у PhonePreview
// кабинета GTT-PLATFORM; экран 9:19,5: строка состояния, ролик 9:16, снизу панель Instagram. Поверх ролика по желанию —
// интерфейс Reels или Stories (кнопки справа, ник и подпись, полоски Stories): сразу видно, что закроют кнопки соцсети.
// Размер телефона задаёт CSS (--ph — высота от высоты окна), подписи — в долях этой высоты.
import React from "react";
import {BRANDS} from "./brands";
import type {Brand} from "./types";

const HANDLE: Record<Brand, string> = {gtt: "globaltechtour", aura: "aura_robotics", od: "ostap.dotsenko"};

const P = {
  heart: "M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.6 5c2.1 0 3.6 1.2 4.4 2.6h2C13.8 6.2 15.3 5 17.4 5 21 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21z",
  comment: "M20.5 12a8.5 8.5 0 1 1-3.4-6.8A8.4 8.4 0 0 1 20.5 12c0 1.6-.4 3-1.2 4.3l1.2 4.2-4.3-1.2",
  send: "M22 3 9.5 13.5M22 3l-7 18-4.5-7.5L3 9z",
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  search: "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15zm5.3-2.2L21 21",
  plus: "M4 4h16v16H4zM12 8v8M8 12h8",
  reels: "M4 4h16v16H4zM4 8.5h16M9 4l2.5 4.5M14 4l2.5 4.5M10.5 11.5v6l5-3z",
  camera: "M3 8h4l2-3h6l2 3h4v11H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
};
const Ico: React.FC<{d: string; fill?: boolean}> = ({d, fill}) => (
  <svg viewBox="0 0 24 24" fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={fill ? 0 : 1.9} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const PhoneFrame: React.FC<{brand: Brand; view: "reels" | "stories"; ui: boolean; progress: number; children: React.ReactNode}> = ({brand, view, ui, progress, children}) => {
  const handle = HANDLE[brand];
  const initial = BRANDS[brand].title.slice(0, 1).toUpperCase();
  const stories = view === "stories";
  return (
    <div className={`phone ${stories ? "st" : "rl"}`}>
      <span className="pbtn l1" />
      <span className="pbtn l2" />
      <span className="pbtn r1" />
      <div className="pscreen">
        <div className="pstatus">
          <b>9:41</b>
          <i className="island" />
          <span>
            <svg viewBox="0 0 18 12">
              <rect x="0" y="8" width="3" height="4" rx="1" />
              <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
              <rect x="10" y="3" width="3" height="9" rx="1" />
              <rect x="15" y="0" width="3" height="12" rx="1" />
            </svg>
            <em>5G</em>
            <i className="bat" />
          </span>
        </div>
        <div className="pvideo">
          {children}
          {ui && !stories ? (
            <div className="igui">
              <div className="igtop">
                <b>Reels</b>
                <Ico d={P.camera} />
              </div>
              <div className="igright">
                <span>
                  <Ico d={P.heart} />
                  1,2 тыс.
                </span>
                <span>
                  <Ico d={P.comment} />
                  48
                </span>
                <span>
                  <Ico d={P.send} />
                  31
                </span>
                <span className="dots">•••</span>
                <i className={`ava b-${brand}`}>{initial}</i>
              </div>
              <div className="igbottom">
                <div className="who">
                  <i className={`ava b-${brand}`}>{initial}</i>
                  <b>{handle}</b>
                  <em>Подписаться</em>
                </div>
                <p>Подпись к ролику… ещё</p>
                <p className="aud">♫ {handle} · Оригинальный звук</p>
              </div>
            </div>
          ) : null}
          {ui && stories ? (
            <div className="igui">
              <div className="stbars">
                <i>
                  <u style={{width: `${Math.round(progress * 100)}%`}} />
                </i>
                <i />
                <i />
              </div>
              <div className="sthead">
                <i className={`ava b-${brand}`}>{initial}</i>
                <b>{handle}</b>
                <em>2 ч</em>
                <span className="sp" />
                <span>•••</span>
                <span>✕</span>
              </div>
            </div>
          ) : null}
        </div>
        <div className="pnav">
          {ui && stories ? (
            <div className="streply">
              <span>Отправить сообщение</span>
              <Ico d={P.heart} />
              <Ico d={P.send} />
            </div>
          ) : ui ? (
            <div className="ignav">
              <Ico d={P.home} />
              <Ico d={P.search} />
              <Ico d={P.plus} />
              <Ico d={P.reels} />
              <i className={`ava b-${brand}`}>{initial}</i>
            </div>
          ) : null}
          <i className="homebar" />
        </div>
      </div>
    </div>
  );
};
