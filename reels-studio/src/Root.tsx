import React from "react";
import {Composition} from "remotion";
import {VIDEO} from "./theme";
import {Reel, reelSchema, type ReelProps} from "./compositions/Reel";
import {TextReel, textReelSchema, type TextReelProps} from "./compositions/TextReel";
import {TalkReel, talkReelSchema, type TalkReelProps} from "./compositions/TalkReel";
import {sampleReel, sampleTextReel} from "./data/sample";
import talkSample from "../props/2026-10-07-byt-tehnika.json";
import {SiteLogoPreview} from "./components/SiteLogo";
import {AuraPreview} from "./components/AuraPreview";
import {FlagTest} from "./components/FlagTest";
import {Carousel, carouselSchema, type CarouselProps} from "./compositions/Carousel";
import carouselSample from "../props/carousels/пример-gtt.json";
import {TalkReelPro, talkReelProSchema, type TalkReelProProps} from "./compositions/TalkReelPro";
import talkProSample from "../props/2026-10-07-byt-tehnika-v3.json";
import {StoryAnnounce, storyAnnounceSchema, type StoryAnnounceProps} from "./compositions/StoryAnnounce";
import announceSample from "../props/announces/пример-gtt.json";

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
        id="Carousel"
        component={Carousel}
        width={1080}
        height={1350}
        fps={1}
        durationInFrames={7}
        schema={carouselSchema}
        defaultProps={carouselSample as CarouselProps}
        calculateMetadata={({props}: {props: CarouselProps}) => ({durationInFrames: props.slides.length})}
      />
      <Composition
        id="StoryAnnounce"
        component={StoryAnnounce}
        width={1080}
        height={1920}
        fps={1}
        durationInFrames={1}
        schema={storyAnnounceSchema}
        defaultProps={announceSample as StoryAnnounceProps}
        calculateMetadata={({props}: {props: StoryAnnounceProps}) => ({durationInFrames: props.stories.length})}
      />
      <Composition id="FlagTest" component={FlagTest} width={1080} height={1920} fps={30} durationInFrames={300} />
      <Composition id="AuraPreview" component={AuraPreview} width={VIDEO.width} height={VIDEO.height} fps={VIDEO.fps} durationInFrames={VIDEO.fps * 15} />
      <Composition
        id="TalkReelPro"
        component={TalkReelPro}
        width={VIDEO.width}
        height={VIDEO.height}
        fps={VIDEO.fps}
        durationInFrames={VIDEO.fps * 20}
        schema={talkReelProSchema}
        defaultProps={talkProSample as unknown as TalkReelProProps}
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
