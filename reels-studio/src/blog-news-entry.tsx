// Отдельный вход для «多 NEWS» (06.11.2026): только BlogNews, BlogNewsPreview и BlogNewsCovers. Сборка в разы меньше общего
// src/index.ts и не ломается, пока параллельно правятся другие ролики (общий вход собирает все композиции разом).
// Рендер: npx remotion render src/blog-news-entry.tsx BlogNews <out.mp4> --props=props/blog-news/NNN-<slug>.json …
import React from "react";
import {Composition, registerRoot} from "remotion";
import {BlogNews, BlogNewsPreview, bnFrames, type BlogNewsProps} from "./compositions/BlogNews";
import {BlogNewsCovers} from "./compositions/BlogNewsCovers";
import blogNewsSample from "../props/blog-news/001-coffee-with-hint-audit.json";

const BlogNewsRoot: React.FC = () => (
  <>
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
    <Composition id="BlogNewsCovers" component={BlogNewsCovers} width={1080} height={1920} fps={30} durationInFrames={30} />
  </>
);

registerRoot(BlogNewsRoot);
