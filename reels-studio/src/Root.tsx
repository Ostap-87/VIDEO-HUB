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
import {TalkReelPro, bumperFrames, talkReelProSchema, type TalkReelProProps} from "./compositions/TalkReelPro";
import talkProSample from "../props/2026-10-07-byt-tehnika-v3.json";
import {StoryAnnounce, storyAnnounceSchema, type StoryAnnounceProps} from "./compositions/StoryAnnounce";
import {StoryReel, storyReelSchema, type StoryReelProps} from "./compositions/StoryReel";
import announceSample from "../props/announces/пример-gtt.json";
import {CarouselReel, carouselReelSchema, reelSeconds, type CarouselReelProps} from "./compositions/CarouselReel";
import carouselReelSample from "../props/carousel-reels/пример-aura.json";
import {Aura3DShowcase, showcaseSeconds} from "./compositions/Aura3DShowcase";
import {AuraCast, castFrames} from "./compositions/AuraCast";
import {AuraDarkClip, AuraDarkStills, AuraScenes, AuraScenesPreview, DARK_STILLS, SCENES as AURA_SCENES, scenesSeconds} from "./compositions/AuraScenes";
import {GttIntro, gttIntroSchema, gttIntroSeconds, type GttIntroProps} from "./compositions/GttIntro";
import {ReelCover, reelCoverSchema, type ReelCoverProps} from "./compositions/ReelCover";
import {CoverIdeas, coverIdeasSchema, type CoverIdeasProps} from "./compositions/CoverIdeas";
import {CoverLab, coverLabSchema, type CoverLabProps} from "./compositions/CoverLab";
import {CoverGtt, coverGttSchema, type CoverGttProps} from "./compositions/CoverGtt";
import {CoverBottle, coverBottleSchema, type CoverBottleProps} from "./compositions/CoverBottle";
import {HookTitleDemo, hookTitleDemoSchema, type HookTitleDemoProps} from "./compositions/HookTitleDemo";
import {AppPromo, appPromoFrames, appPromoSchema, type AppPromoProps} from "./compositions/AppPromo";
import appPromoSample from "../props/2026-10-27-gtt-app-promo.json";
import {DeskPromo, deskPromoFrames, deskPromoSchema, type DeskPromoProps} from "./compositions/DeskPromo";
import {SiteManhua, SiteManhuaPreview, SITE_MANHUA_FRAMES} from "./compositions/SiteManhua";
import {BlogNews, BlogNewsPreview, bnFrames, type BlogNewsProps} from "./compositions/BlogNews";
import {BlogNewsCovers} from "./compositions/BlogNewsCovers";
import {RobokitaiEpisode, RobokitaiPreview, rkFrames, type RobokitaiProps} from "./compositions/RobokitaiEpisode";
import robokitaiSample from "../props/robokitai/001-hangzhou.json";
import {RobokitaiDrama, RobokitaiDramaPreview, rdFrames, type RobokitaiDramaProps} from "./compositions/RobokitaiDrama";
import robokitaiDramaSample from "../props/robokitai/001-hangzhou-v2.json";
import blogNewsSample from "../props/blog-news/001-coffee-with-hint-audit.json";
import {SiteManhuaEn, SiteManhuaEnPreview, SITE_MANHUA_EN_FRAMES} from "./compositions/SiteManhuaEn";
import {AuraSiteManhua, AuraSiteManhuaPreview, AURA_MANHUA_FRAMES} from "./compositions/AuraSiteManhua";
import {AuraSiteManhuaEn, AuraSiteManhuaEnPreview, AURA_MANHUA_EN_FRAMES} from "./compositions/AuraSiteManhuaEn";
import {GttSiteManhua, GttSiteManhuaPreview, GTT_MANHUA_FRAMES} from "./compositions/GttSiteManhua";
import {GttSiteManhuaEn, GttSiteManhuaEnPreview, GTT_MANHUA_EN_FRAMES} from "./compositions/GttSiteManhuaEn";
import {ManhuaCovers, MANHUA_COVERS} from "./compositions/ManhuaCovers";
import deskPromoSample from "../props/2026-10-27-sibdoc-promo.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* пробник эффектов-хуков по референсам 15.10.2026: стена в 3D, заголовок за головой, смешение шрифтов */}
      <Composition
        id="HookTitleDemo"
        component={HookTitleDemo}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={100}
        schema={hookTitleDemoSchema}
        defaultProps={{src: "source-videos/2026-10-14-od-1/_work/od1.cut.mp4", from: 0, seconds: 3.3, variant: "behind", lines: [{text: "Мои", at: 0.1}, {text: "соцсети", at: 0.4}]} as HookTitleDemoProps}
        calculateMetadata={({props}: {props: HookTitleDemoProps}) => ({durationInFrames: Math.round(props.seconds * 30)})}
      />
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
      <Composition
        id="ReelCover"
        component={ReelCover}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={1}
        schema={reelCoverSchema}
        defaultProps={{brand: "gtt", title: "**Обложка** Reels", layout: "speaker"} as ReelCoverProps}
      />
      <Composition
        id="CoverBottle"
        component={CoverBottle}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={60}
        schema={coverBottleSchema}
        defaultProps={{} as CoverBottleProps}
      />
      <Composition
        id="CoverGtt"
        component={CoverGtt}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={6}
        schema={coverGttSchema}
        defaultProps={{} as CoverGttProps}
      />
      <Composition
        id="CoverLab"
        component={CoverLab}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={10}
        schema={coverLabSchema}
        defaultProps={{} as CoverLabProps}
      />
      <Composition
        id="CoverIdeas"
        component={CoverIdeas}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={5}
        schema={coverIdeasSchema}
        defaultProps={{tour: "Тур", title: "**Обложка**", hook: {lead: "", value: "100", unit: "штук"}, facts: [], route: [], logos: [], days: 5, companies: 6, cities: 5, to: "SHA", toCity: "Шанхай", frame: "", cut: ""} as CoverIdeasProps}
      />
      <Composition
        id="StoryReel"
        component={StoryReel}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={300}
        schema={storyReelSchema}
        defaultProps={{brand: "aura", video: "finished-videos/2026-10-12-foto-aura-intro-reels.mp4", seconds: 48.5, title: "Роботы **без посредников**", note: "Смотри в профиле"} as StoryReelProps}
        calculateMetadata={({props}: {props: StoryReelProps}) => ({durationInFrames: Math.round(props.seconds * 30)})}
      />
      <Composition
        id="CarouselReel"
        component={CarouselReel}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={30 * 20}
        schema={carouselReelSchema}
        defaultProps={carouselReelSample as CarouselReelProps}
        calculateMetadata={({props}: {props: CarouselReelProps}) => ({durationInFrames: Math.round(reelSeconds(props) * 30)})}
      />
      <Composition
        id="GttIntro"
        component={GttIntro}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={54}
        schema={gttIntroSchema}
        defaultProps={{variant: "shards", mode: "intro"} as GttIntroProps}
        calculateMetadata={({props}: {props: GttIntroProps}) => ({durationInFrames: Math.round(gttIntroSeconds(props.mode) * 30)})}
      />
      <Composition id="Aura3DShowcase" component={Aura3DShowcase} width={1080} height={1920} fps={30} durationInFrames={Math.round(showcaseSeconds() * 30)} />
      {/* персонажи Aura (05.11.2026): кадр N = портрет N, последний — общий состав; 1080×1350 */}
      <Composition id="AuraCast" component={AuraCast} width={1080} height={1350} fps={30} durationInFrames={castFrames()} defaultProps={{dpr: 2}} />
      {/* сцены применения Aura: конвейер, поддон, DarkScan, дроны; превью — кадр N = сцена N */}
      <Composition id="AuraScenes" component={AuraScenes} width={1080} height={1920} fps={30} durationInFrames={Math.round(scenesSeconds() * 30)} />
      <Composition id="AuraScenesPreview" component={AuraScenesPreview} width={1080} height={1920} fps={30} durationInFrames={AURA_SCENES.length} defaultProps={{dpr: 2}} />
      {/* Скаут в темноте (05.11.2026): ролик 7 с — склад или пещера (props kind), кадры превью — кадр N = DARK_STILLS[N] */}
      <Composition id="AuraDarkClip" component={AuraDarkClip} width={1080} height={1920} fps={30} durationInFrames={210} defaultProps={{kind: "warehouse" as const, dpr: 1}} />
      <Composition id="AuraDarkStills" component={AuraDarkStills} width={1080} height={1920} fps={30} durationInFrames={DARK_STILLS.length} defaultProps={{dpr: 2}} />
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
        calculateMetadata={({props}: {props: TalkReelProProps}) => {
          // + фирменная заставка GTT в начале и конце (у Aura и при bumper: false — нет)
          const b = bumperFrames(props);
          return {durationInFrames: Math.round((props.speechSeconds + props.ctaSeconds) * VIDEO.fps) + b.lead + b.tail};
        }}
      />
      <Composition
        id="AppPromo"
        component={AppPromo}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={300}
        schema={appPromoSchema}
        defaultProps={appPromoSample as unknown as AppPromoProps}
        calculateMetadata={({props}: {props: AppPromoProps}) => ({
          durationInFrames: appPromoFrames(props),
          width: props.format === "h" ? 1920 : 1080,
          height: props.format === "h" ? 1080 : 1920,
        })}
      />
      {/* рекламный ролик о программе для компьютера (SibDoc): монитор с браузером и MacBook, курсор, наезды */}
      <Composition
        id="DeskPromo"
        component={DeskPromo}
        width={1920}
        height={1080}
        fps={30}
        durationInFrames={300}
        schema={deskPromoSchema}
        defaultProps={deskPromoSample as unknown as DeskPromoProps}
        calculateMetadata={({props}: {props: DeskPromoProps}) => ({
          durationInFrames: deskPromoFrames(props),
          width: props.format === "h" ? 1920 : 1080,
          height: props.format === "h" ? 1080 : 1920,
        })}
      />
      <Composition id="ManhuaCovers" component={ManhuaCovers} width={1080} height={1920} fps={30} durationInFrames={MANHUA_COVERS} />
      <Composition id="GttSiteManhua" component={GttSiteManhua} width={1080} height={1920} fps={30} durationInFrames={GTT_MANHUA_FRAMES} defaultProps={{clean: true}} />
      <Composition
        id="GttSiteManhuaPreview"
        component={GttSiteManhuaPreview}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={GTT_MANHUA_FRAMES}
        defaultProps={{step: 30, start: 15, clean: true}}
      />
      <Composition id="AuraSiteManhua" component={AuraSiteManhua} width={1080} height={1920} fps={30} durationInFrames={AURA_MANHUA_FRAMES} defaultProps={{clean: true}} />
      <Composition
        id="AuraSiteManhuaPreview"
        component={AuraSiteManhuaPreview}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={AURA_MANHUA_FRAMES}
        defaultProps={{step: 30, start: 15, clean: true}}
      />
      <Composition id="SiteManhua" component={SiteManhua} width={1080} height={1920} fps={30} durationInFrames={SITE_MANHUA_FRAMES} />
      <Composition
        id="SiteManhuaPreview"
        component={SiteManhuaPreview}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={SITE_MANHUA_FRAMES}
        defaultProps={{step: 30, start: 15}}
      />
      {/* «多 NEWS» — манхуа-новости по статьям блога ostapdotcenko.ru (04.11.2026); props — reels-studio/props/blog-news/NNN-<slug>.json */}
      <Composition
        id="BlogNews"
        component={BlogNews}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={bnFrames(blogNewsSample as BlogNewsProps)}
        defaultProps={blogNewsSample as BlogNewsProps}
        calculateMetadata={({props}: {props: BlogNewsProps}) => ({durationInFrames: bnFrames(props)})}
      />
      <Composition
        id="BlogNewsPreview"
        component={BlogNewsPreview}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={bnFrames(blogNewsSample as BlogNewsProps)}
        defaultProps={{...(blogNewsSample as BlogNewsProps), step: 30, start: 15}}
        calculateMetadata={({props}: {props: BlogNewsProps}) => ({durationInFrames: bnFrames(props)})}
      />
      {/* «Робокитай · 机器人中国» — сериал Aura (05.11.2026); props — reels-studio/props/robokitai/NNN-<город>.json */}
      <Composition
        id="RobokitaiEpisode"
        component={RobokitaiEpisode}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={rkFrames(robokitaiSample as RobokitaiProps)}
        defaultProps={robokitaiSample as RobokitaiProps}
        calculateMetadata={({props}: {props: RobokitaiProps}) => ({durationInFrames: rkFrames(props)})}
      />
      <Composition
        id="RobokitaiPreview"
        component={RobokitaiPreview}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={rkFrames(robokitaiSample as RobokitaiProps)}
        defaultProps={{...(robokitaiSample as RobokitaiProps), step: 30, start: 15}}
        calculateMetadata={({props}: {props: RobokitaiProps}) => ({durationInFrames: rkFrames(props)})}
      />
      {/* «Робокитай» v2 — серия с драматургией (05.11.2026); props — reels-studio/props/robokitai/NNN-<город>-v2.json */}
      <Composition
        id="RobokitaiDrama"
        component={RobokitaiDrama}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={rdFrames(robokitaiDramaSample as unknown as RobokitaiDramaProps)}
        defaultProps={robokitaiDramaSample as unknown as RobokitaiDramaProps}
        calculateMetadata={({props}: {props: RobokitaiDramaProps}) => ({durationInFrames: rdFrames(props)})}
      />
      <Composition
        id="RobokitaiDramaPreview"
        component={RobokitaiDramaPreview}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={rdFrames(robokitaiDramaSample as unknown as RobokitaiDramaProps)}
        defaultProps={{...(robokitaiDramaSample as unknown as RobokitaiDramaProps), step: 30, start: 15}}
        calculateMetadata={({props}: {props: RobokitaiDramaProps}) => ({durationInFrames: rdFrames(props)})}
      />
      {/* обложки выпусков «多 NEWS»: кадр N = выпуск N / 3 × раскладка (journal, shout, page) */}
      <Composition id="BlogNewsCovers" component={BlogNewsCovers} width={1080} height={1920} fps={30} durationInFrames={30} />
      {/* английские версии (04.11.2026) */}
      <Composition id="GttSiteManhuaEn" component={GttSiteManhuaEn} width={1080} height={1920} fps={30} durationInFrames={GTT_MANHUA_EN_FRAMES} defaultProps={{clean: true}} />
      <Composition id="GttSiteManhuaEnPreview" component={GttSiteManhuaEnPreview} width={1080} height={1920} fps={30} durationInFrames={GTT_MANHUA_EN_FRAMES} defaultProps={{step: 30, start: 15, clean: true}} />
      <Composition id="AuraSiteManhuaEn" component={AuraSiteManhuaEn} width={1080} height={1920} fps={30} durationInFrames={AURA_MANHUA_EN_FRAMES} defaultProps={{clean: true}} />
      <Composition id="AuraSiteManhuaEnPreview" component={AuraSiteManhuaEnPreview} width={1080} height={1920} fps={30} durationInFrames={AURA_MANHUA_EN_FRAMES} defaultProps={{step: 30, start: 15, clean: true}} />
      <Composition id="SiteManhuaEn" component={SiteManhuaEn} width={1080} height={1920} fps={30} durationInFrames={SITE_MANHUA_EN_FRAMES} />
      <Composition id="SiteManhuaEnPreview" component={SiteManhuaEnPreview} width={1080} height={1920} fps={30} durationInFrames={SITE_MANHUA_EN_FRAMES} defaultProps={{step: 30, start: 15}} />
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
