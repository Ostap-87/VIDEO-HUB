// Монтажный лист (EDL) в шаблоне: ролик склеивается из кусков нескольких исходников прямо в предпросмотре Монтажной
// (решение пользователя 22.10.2026: «добавлять несколько роликов и потом на основе их склеивать видео… очищать от пауз
// и эканий»). Куски идут встык: кусок i начинается в ролике там, где кончился кусок i−1.
// Везде, где шаблон показывает видео спикера (кадр, карточка в углу, финал, размытый фон), вместо одного файла
// mediaSrc играет SpeakerVideo — он сам раскладывает куски по времени. Без EDL — обычный OffthreadVideo.
// В рендере движка EDL нет: движок склеивает куски заранее (montazh/engine/edl.py) в один файл.
import React from "react";
import {OffthreadVideo, Sequence, staticFile, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";

export type EdlSeg = {src: string; from: number; to: number; audio?: string};
type Placed = EdlSeg & {at: number};

export const EdlCtx = React.createContext<{media: string; segs: Placed[]} | null>(null);

// куски → куски с местом в ролике (секунды)
export function placeEdl(segs: EdlSeg[]): Placed[] {
  let at = 0;
  return segs.map((s) => {
    const p = {...s, at};
    at += Math.max(0, s.to - s.from);
    return p;
  });
}

export const edlSeconds = (segs: EdlSeg[]) => segs.reduce((n, s) => n + Math.max(0, s.to - s.from), 0);

// видео спикера: trimBefore — с какого кадра ролика начинается показ (как у OffthreadVideo, например в финале)
export const SpeakerVideo: React.FC<{src: string; style?: React.CSSProperties; trimBefore?: number; transparent?: boolean}> = ({
  src,
  style,
  trimBefore = 0,
  transparent,
}) => {
  const ctx = React.useContext(EdlCtx);
  const {fps} = useVideoConfig();
  if (!ctx || src !== ctx.media) return <OffthreadVideo src={staticFile(src)} muted transparent={transparent} trimBefore={trimBefore || undefined} style={style} />;
  return (
    <>
      {ctx.segs.map((s, i) => {
        const len = Math.max(1, Math.round((s.to - s.from) * fps));
        const from = Math.round(s.at * fps) - trimBefore;
        if (from + len <= 0) return null;
        return (
          <Sequence key={i} from={from} durationInFrames={len} premountFor={fps} name={`Кусок ${i + 1}`}>
            <OffthreadVideo src={staticFile(s.src)} muted trimBefore={Math.round(s.from * fps)} style={style} />
          </Sequence>
        );
      })}
    </>
  );
};

// голос по монтажному листу: у каждого куска свой файл звука (чистый голос) или звук самого ролика
export const EdlAudio: React.FC = () => {
  const ctx = React.useContext(EdlCtx);
  const {fps} = useVideoConfig();
  if (!ctx) return null;
  return (
    <>
      {ctx.segs.map((s, i) => (
        <Sequence key={i} from={Math.round(s.at * fps)} durationInFrames={Math.max(1, Math.round((s.to - s.from) * fps))} premountFor={fps}>
          <Audio src={staticFile(s.audio || s.src)} trimBefore={Math.round(s.from * fps)} />
        </Sequence>
      ))}
    </>
  );
};
