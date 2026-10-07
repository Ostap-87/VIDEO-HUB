import React from "react";
import {Composition} from "remotion";
import {VIDEO} from "./theme";
import {Reel, reelSchema, type ReelProps} from "./compositions/Reel";
import {TextReel, textReelSchema, type TextReelProps} from "./compositions/TextReel";
import {TalkReel, talkReelSchema, type TalkReelProps} from "./compositions/TalkReel";
import {sampleReel, sampleTextReel} from "./data/sample";
import talkSample from "../props/2026-10-07-byt-tehnika.json";
import {SiteLogoPreview} from "./components/SiteLogo";
import {TalkReelPro, talkReelProSchema, type TalkReelProProps} from "./compositions/TalkReelPro";
import talkProSample from "../props/2026-10-07-byt-tehnika-v2.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Reel"
        component={Reel}
        width={VIDEO.width}
        height={VIDEO.height}
        fps={VIDEO.fps}
        durationInFrames={VIDEO.fps * 20}
        schema={reelSchema}
        defaultProps={sampleReel}
        calculateMetadata={({props}: {props: ReelProps}) => ({
          durationInFrames: Math.round(props.durationInSeconds * VIDEO.fps),
        })}
      />
      <Composition
        id="TextReel"
        component={TextReel}
        width={VIDEO.width}
        height={VIDEO.height}
        fps={VIDEO.fps}
        durationInFrames={VIDEO.fps * 12}
        schema={textReelSchema}
        defaultProps={sampleTextReel}
        calculateMetadata={({props}: {props: TextReelProps}) => ({
          durationInFrames: Math.round(props.slides.length * props.secondsPerSlide * VIDEO.fps),
        })}
      />
      <Composition
        id="TalkReel"
        component={TalkReel}
        width={VIDEO.width}
        height={VIDEO.height}
        fps={VIDEO.fps}
        durationInFrames={VIDEO.fps * 20}
        schema={talkReelSchema}
        defaultProps={talkSample as TalkReelProps}
        calculateMetadata={({props}: {props: TalkReelProps}) => ({
          durationInFrames: Math.round((props.speechSeconds + props.ctaSeconds) * VIDEO.fps),
        })}
      />
      <Composition
        id="TalkReelPro"
        component={TalkReelPro}
        width={VIDEO.width}
        height={VIDEO.height}
        fps={VIDEO.fps}
        durationInFrames={VIDEO.fps * 20}
        schema={talkReelProSchema}
        defaultProps={talkProSample as TalkReelProProps}
        calculateMetadata={({props}: {props: TalkReelProProps}) => ({
          durationInFrames: Math.round((props.speechSeconds + props.ctaSeconds) * VIDEO.fps),
        })}
      />
      <Composition
        id="GTTLogo"
        component={SiteLogoPreview}
        width={900}
        height={220}
        fps={VIDEO.fps}
        durationInFrames={VIDEO.fps * 8}
        defaultProps={{scale: 1, glass: true}}
      />
    </>
  );
};
