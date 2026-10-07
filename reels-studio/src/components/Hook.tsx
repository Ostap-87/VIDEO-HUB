import React from "react";
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";
import {body, mono} from "../fonts";
import {parseRich} from "../lib/rich";
import {TextArea} from "./Frame";
import {RichWords} from "./RichWords";

// Обложка: кикер (моно, акцент) + заголовок Unbounded + подзаголовок (muted).
// Если задан seconds, блок гаснет в конце.
export const Hook: React.FC<{kicker?: string; text: string; sub?: string; seconds?: number}> = ({
  kicker,
  text,
  sub,
  seconds,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const n = parseRich(text).length;
  const out = seconds
    ? interpolate(frame, [seconds * fps - 8, seconds * fps], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;
  const kick = spring({frame, fps, config: theme.motion.soft, durationInFrames: 14});
  const subIn = spring({frame: frame - 10 - n * 3, fps, config: theme.motion.soft, durationInFrames: 16});

  return (
    <AbsoluteFill style={{opacity: out}}>
      <TextArea>
        {kicker ? (
          <div
            style={{
              fontFamily: mono.fontFamily,
              fontWeight: 500,
              fontSize: 30,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: theme.colors.accent,
              marginBottom: 24,
              opacity: kick,
            }}
          >
            {kicker}
          </div>
        ) : null}
        <RichWords text={text} variant="headline" />
        {sub ? (
          <div
            style={{
              fontFamily: body.fontFamily,
              fontWeight: 400,
              fontSize: 44,
              lineHeight: 1.35,
              color: theme.colors.muted,
              marginTop: 36,
              opacity: subIn,
            }}
          >
            {sub}
          </div>
        ) : null}
      </TextArea>
    </AbsoluteFill>
  );
};
