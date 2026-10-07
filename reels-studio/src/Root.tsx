import React from "react";
import {Composition} from "remotion";
import {VIDEO} from "./theme";
import {Reel, reelSchema} from "./compositions/Reel";
import {TextReel, textReelSchema} from "./compositions/TextReel";
import {sampleReel, sampleTextReel} from "./data/sample";

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
        calculateMetadata={({props}) => ({
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
        calculateMetadata={({props}) => ({
          durationInFrames: Math.round(props.slides.length * props.secondsPerSlide * VIDEO.fps),
        })}
      />
    </>
  );
};
