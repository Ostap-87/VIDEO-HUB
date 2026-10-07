import React from "react";
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";
import {display} from "../fonts";
import {TextArea} from "./Frame";

export type Word = {text: string; start: number; end: number}; // секунды

const WORDS_PER_PAGE = 3;

// Субтитры по словам: Unbounded 700, текущее слово синим.
// from / until (секунды) ограничивают окно показа.
export const Captions: React.FC<{words: Word[]; from?: number; until?: number}> = ({
  words,
  from = 0,
  until = Infinity,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  if (t < from || t >= until) return null;

  const shown = words.filter((w) => w.end > from);
  const pages: Word[][] = [];
  for (let i = 0; i < shown.length; i += WORDS_PER_PAGE) {
    pages.push(shown.slice(i, i + WORDS_PER_PAGE));
  }

  let pageIndex = -1;
  pages.forEach((p, i) => {
    if (p[0].start <= t) pageIndex = i;
  });
  if (pageIndex < 0) return null;

  const page = pages[pageIndex];
  if (t > page[page.length - 1].end + 0.4) return null;

  const pop = spring({
    frame: frame - Math.round(page[0].start * fps),
    fps,
    config: theme.motion.snappy,
    durationInFrames: 10,
  });
  const current = page.reduce((acc, w, i) => (w.start <= t ? i : acc), 0);

  return (
    <AbsoluteFill>
      <TextArea>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0 20px",
            opacity: pop,
            transform: `scale(${0.92 + 0.08 * pop})`,
            transformOrigin: "left bottom",
          }}
        >
          {page.map((w, i) => (
            <span
              key={`${pageIndex}-${i}`}
              style={{
                fontFamily: display.fontFamily,
                fontWeight: 700,
                fontSize: 72,
                lineHeight: 1.2,
                color: i === current ? theme.colors.accent : theme.colors.text,
              }}
            >
              {w.text}
            </span>
          ))}
        </div>
      </TextArea>
    </AbsoluteFill>
  );
};
