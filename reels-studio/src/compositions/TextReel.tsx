import React from "react";
import {
  AbsoluteFill,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {z} from "zod";
import {theme} from "../theme";
import {CtaPill} from "../components/Cta";
import {Frame, TextArea} from "../components/Frame";
import {Hook} from "../components/Hook";
import {Media} from "../components/Media";
import {RichWords} from "../components/RichWords";

export const textReelSchema = z.object({
  slides: z.array(
    z.object({
      kind: z.enum(["cover", "body"]), // cover: кикер + заголовок, body: обычный текст
      text: z.string(), // **слова** будут синими
      kicker: z.string().optional(),
      sub: z.string().optional(),
      image: z.string().optional(), // файл из /public
      tone: z.enum(["light", "dark"]).optional(),
    })
  ),
  secondsPerSlide: z.number().min(1).max(10),
  cta: z.string(), // плашка на последнем слайде. Пусто = скрыть
});
export type TextReelProps = z.infer<typeof textReelSchema>;
type SlideData = TextReelProps["slides"][number];

const OVERLAP = 14; // кадров: новый слайд «наезжает» поверх предыдущего

const SlideView: React.FC<{
  slide: SlideData;
  index: number;
  total: number;
  cta: string;
}> = ({slide, index, total, cta}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const last = index === total - 1;
  const enter =
    index === 0
      ? 1
      : spring({frame, fps, config: theme.motion.soft, durationInFrames: OVERLAP});

  return (
    <AbsoluteFill style={{transform: `translateX(${(1 - enter) * 110}%)`}}>
      <Frame
        media={<Media src={slide.image} />}
        tone={slide.tone ?? "light"}
        counter={`${index + 1} / ${total}`}
      >
        {slide.kind === "cover" ? (
          <Hook kicker={slide.kicker} text={slide.text} sub={slide.sub} />
        ) : (
          <AbsoluteFill>
            <TextArea>
              <RichWords text={slide.text} variant="body" stagger={2} />
              {last && cta ? (
                <div style={{alignSelf: "stretch", marginTop: 56, display: "flex", flexDirection: "column"}}>
                  <CtaPill text={cta} delay={30} />
                </div>
              ) : null}
            </TextArea>
          </AbsoluteFill>
        )}
      </Frame>
    </AbsoluteFill>
  );
};

export const TextReel: React.FC<TextReelProps> = ({slides, secondsPerSlide, cta}) => {
  const {fps} = useVideoConfig();
  const frames = Math.round(secondsPerSlide * fps);

  return (
    <AbsoluteFill style={{backgroundColor: theme.colors.primary}}>
      {slides.map((slide, i) => (
        <Sequence
          key={i}
          from={i * frames}
          durationInFrames={i === slides.length - 1 ? frames : frames + OVERLAP}
        >
          <SlideView slide={slide} index={i} total={slides.length} cta={cta} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
