import React from "react";
import {
  Img,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {Backdrop} from "./Backdrop";

const isVideo = (s: string) => /\.(mp4|mov|webm|m4v)$/i.test(s);

// Видео или фото из /public. Фото медленно приближается.
export const Media: React.FC<{src?: string}> = ({src}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  if (!src) return <Backdrop />;
  if (isVideo(src)) {
    return (
      <OffthreadVideo
        src={staticFile(src)}
        style={{width: "100%", height: "100%", objectFit: "cover"}}
      />
    );
  }
  const zoom = 1 + 0.08 * (frame / durationInFrames);
  return (
    <Img
      src={staticFile(src)}
      style={{width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})`}}
    />
  );
};
