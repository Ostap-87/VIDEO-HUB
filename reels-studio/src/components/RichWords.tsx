import React from "react";
import {spring, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";
import {body, display} from "../fonts";
import {parseRich} from "../lib/rich";

// headline: Unbounded 700, акцент синим тем же шрифтом.
// body: Inter 400, акцент Inter 700 синим. Слова появляются по очереди.
export const RichWords: React.FC<{
  text: string;
  variant: "headline" | "body";
  size?: number;
  delay?: number;
  stagger?: number;
}> = ({text, variant, size, delay = 0, stagger = 3}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const head = variant === "headline";

  return (
    <div
      style={{
        fontFamily: head ? display.fontFamily : body.fontFamily,
        fontWeight: head ? 700 : 400,
        fontSize: size ?? (head ? 96 : 56),
        lineHeight: head ? 1.04 : 1.36,
        color: theme.colors.text,
      }}
    >
      {parseRich(text).map((tk, i) => {
        const s = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: theme.motion.snappy,
        });
        return (
          <React.Fragment key={i}>
            <span
              style={{
                display: "inline-block",
                opacity: s,
                transform: `translateY(${(1 - s) * 40}px)`,
                color: tk.accent ? theme.colors.accent : undefined,
                fontWeight: tk.accent ? 700 : undefined,
              }}
            >
              {tk.text}
            </span>{" "}
          </React.Fragment>
        );
      })}
    </div>
  );
};
