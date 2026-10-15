// Пробник эффектов-хуков (HookTitle) на куске говорящей головы: видео → текст → вырезка спикера поверх (текст «за головой»).
import React from "react";
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useVideoConfig} from "remotion";
import {Audio} from "@remotion/media";
import {z} from "zod";
import {HookTitle, hookClicks} from "../components/HookTitle";

export const hookTitleDemoSchema = z.object({
  src: z.string(),
  cutoutSrc: z.string().optional(),
  from: z.number().default(0),
  seconds: z.number(),
  variant: z.enum(["wall", "behind", "mix"]),
  lines: z.array(z.object({text: z.string(), at: z.number(), kind: z.enum(["bold", "italic"]).optional()})),
  columns: z.array(z.object({text: z.string(), at: z.number(), side: z.enum(["left", "right"]), step: z.number().optional()})).optional(),
  click: z.string().optional(), // звук щелчка на каждую букву столбиков
});
export type HookTitleDemoProps = z.infer<typeof hookTitleDemoSchema>;

export const HookTitleDemo: React.FC<HookTitleDemoProps> = ({src, cutoutSrc, from, seconds, variant, lines, columns, click}) => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: "#000"}}>
      <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(from * fps)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
      <HookTitle variant={variant} lines={lines} until={seconds} columns={columns} />
      {click
        ? hookClicks(columns).map((at, i) => (
            <Sequence key={`click-${i}`} from={Math.round(at * fps)} durationInFrames={fps} premountFor={fps}>
              <Audio src={staticFile(click)} volume={0.5} />
            </Sequence>
          ))
        : null}
      {cutoutSrc ? (
        <AbsoluteFill>
          <OffthreadVideo src={staticFile(cutoutSrc)} transparent muted trimBefore={Math.round(from * fps)} style={{width: "100%", height: "100%", objectFit: "cover"}} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
