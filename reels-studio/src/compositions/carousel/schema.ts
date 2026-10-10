// Схема карусели Instagram (props/carousels/<имя>.json). Описание полей — reels-studio/CLAUDE.md, раздел «Карусели Instagram».
import {z} from "zod";

// Фото: путь от корня репозитория или объект с настройками кадра
export const picSchema = z.union([
  z.string(),
  z.object({
    src: z.string(),
    focus: z.string().optional(), // какая часть фото важнее при обрезке, как object-position: "50% 30%"
    zoom: z.number().optional(), // приблизить кадр: 1.2
    label: z.string().optional(), // photoPair: плашка на фото («Обычно», «С нами»)
    caption: z.string().optional(), // подпись под фото
    logo: z.union([z.string(), z.array(z.string())]).optional(), // логотип бренда на фото (id из brands.json или путь)
  }),
]);

export const slideSchema = z.object({
  kind: z.enum([
    "cover",
    "text",
    "list",
    "stat",
    "photo",
    "quote",
    "steps",
    "compare",
    "logos",
    "cta",
    // фото-слайды (решение пользователя 10.10.2026): фото главное
    "photoCover",
    "photoCard",
    "photoFull",
    "photoPair",
    "photoStat",
    "photoCta",
  ]),
  kicker: z.string().optional(), // надпись над заголовком (капсом, моно)
  title: z.string().optional(), // **слова** — акцент
  text: z.string().optional(),
  image: z.string().optional(), // путь от корня репозитория
  focus: z.string().optional(), // для image: "50% 30%" — что оставить в кадре при обрезке
  zoom: z.number().optional(), // для image: приближение
  images: z.array(picSchema).optional(), // photoPair (2), photoCta (2–3)
  caption: z.string().optional(), // подпись к фото (что в кадре)
  source: z.string().optional(), // источник цифры или факта
  logo: z.union([z.string(), z.array(z.string())]).optional(), // логотип бренда на фото: "ubtech" или ["huawei", "tencent"]
  layout: z.enum(["card", "full", "row", "column"]).optional(), // photoCover: card | full, photoPair: row | column
  pair: z.enum(["compare", "story"]).optional(), // photoPair: сравнение (по умолчанию) или два кадра одной истории
  items: z.array(z.string()).optional(), // list, steps
  value: z.string().optional(), // stat, photoStat: «1000+»
  author: z.string().optional(), // quote
  left: z.object({title: z.string(), items: z.array(z.string())}).optional(), // compare
  right: z.object({title: z.string(), items: z.array(z.string())}).optional(),
  logos: z.array(z.object({src: z.string(), name: z.string().optional()})).optional(),
  button: z.string().optional(), // cta, photoCta: текст кнопки (по умолчанию сайт бренда)
  mascot: z.enum(["wave", "point", "pointUp", "present", "jump", "tick", "none"]).optional(), // только aura
});

export const carouselSchema = z.object({
  brand: z.enum(["gtt", "aura"]),
  guides: z.boolean().optional(), // проверочная версия: поля безопасности, обрезка сетки профиля, нарушения
  slides: z.array(slideSchema),
});

export type CarouselProps = z.infer<typeof carouselSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Pic = {src: string; focus?: string; zoom?: number; label?: string; caption?: string; logo?: string | string[]};
