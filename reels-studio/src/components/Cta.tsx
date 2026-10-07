import React from "react";
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {theme} from "../theme";
import {body} from "../fonts";
import {TextArea} from "./Frame";
import {RichWords} from "./RichWords";

// Синяя плашка (как «листай →»), справа-снизу
export const CtaPill: React.FC<{text: string; delay?: number}> = ({text, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: theme.motion.snappy});
  return (
    <div
      style={{
        alignSelf: "flex-end",
        opacity: s,
        transform: `translateY(${(1 - s) * 80}px)`,
        background: theme.colors.accent,
        color: "#FFFFFF",
        fontFamily: body.fontFamily,
        fontWeight: 700,
        fontSize: 44,
        padding: "26px 44px",
        borderRadius: 999,
      }}
    >
      {text}
    </div>
  );
};

export const Cta: React.FC<{title?: string; text: string}> = ({title, text}) => (
  <AbsoluteFill>
    <TextArea>
      {title ? (
        <div style={{marginBottom: 48}}>
          <RichWords text={title} variant="headline" size={84} />
        </div>
      ) : null}
      <CtaPill text={text} delay={6} />
    </TextArea>
  </AbsoluteFill>
);
