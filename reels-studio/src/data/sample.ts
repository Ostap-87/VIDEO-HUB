import type {ReelProps} from "../compositions/Reel";
import type {TextReelProps} from "../compositions/TextReel";
import {autoWords} from "../lib/autoWords";

const script =
  "Закрытые визиты на производства, куда обычному туристу не попасть. С переводом и подготовленными вопросами к инженерам и топ-менеджменту. Маршрут: Шэньчжэнь, Шанхай.";

export const sampleReel: ReelProps = {
  mediaSrc: "", // положите файл в source-videos/ и впишите имя, например "clip.mp4"
  tone: "light",
  counter: "",
  kicker: "Экспедиция · Робототехника Китая",
  hook: "Ваши конкуренты уже видели **это своими глазами**",
  hookSub: "Пока вы читаете отчёты аналитиков — они стоят у сборочной линии гуманоидов",
  hookSeconds: 3,
  ctaTitle: "**12 компаний** за 5 дней",
  cta: "Подробности на сайте",
  ctaSeconds: 3,
  durationInSeconds: 20,
  words: autoWords(script, 3.2),
  showSafeZone: false,
};

export const sampleTextReel: TextReelProps = {
  slides: [
    {
      kind: "cover",
      kicker: "Экспедиция · Робототехника Китая",
      text: "Ваши конкуренты уже видели **это своими глазами**",
      sub: "Пока вы читаете отчёты аналитиков — они стоят у сборочной линии гуманоидов",
    },
    {
      kind: "body",
      text: "Закрытые визиты на производства, куда обычному туристу **не попасть** — с переводом и подготовленными вопросами к инженерам и топ-менеджменту.",
    },
    {
      kind: "body",
      tone: "dark",
      text: "Маршрут: Шэньчжэнь → Шанхай. **12 компаний за 5 дней** — от гуманоидов, которые ещё не вышли на рынок, до серийных производств.",
    },
  ],
  secondsPerSlide: 4,
  cta: "Подробности на сайте",
};
