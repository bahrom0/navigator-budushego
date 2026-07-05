import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  AudioWaveform,
  BadgeCheck,
  BookOpenCheck,
  Bot,
  ChartNoAxesColumn,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Layers3,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  SearchCheck,
  Sparkles,
  Target,
  Waypoints,
} from "lucide-react";

export type MarketingNavLink = {
  href: string;
  label: string;
};

export type MarketingFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  eyebrow?: string;
};

export type MarketingStep = {
  number: string;
  title: string;
  description: string;
};

export type MarketingStat = {
  value: string;
  label: string;
  detail: string;
};

export type MarketingTestimonial = {
  quote: string;
  author: string;
  role: string;
};

export const marketingNavLinks: MarketingNavLink[] = [
  { href: "/#about", label: "О проекте" },
  { href: "/how-it-works", label: "Как это работает" },
  { href: "/features", label: "Возможности" },
];

export const heroHighlights = [
  "Подбор кодов НЦТ",
  "Сравнение вариантов",
  "Персональный план подготовки",
];

export const landingFeatures: MarketingFeature[] = [
  {
    icon: SearchCheck,
    title: "Подбор кодов НЦТ",
    description:
      "Платформа учитывает интересы, цели и сильные стороны, чтобы сузить выбор до реально подходящих направлений.",
    href: "/features",
    eyebrow: "Точный старт",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Сравнение направлений",
    description:
      "Сравнивайте варианты по проходным баллам, профилю обучения и перспективам без лишней путаницы.",
    href: "/how-it-works",
    eyebrow: "Понятное сравнение",
  },
  {
    icon: ClipboardList,
    title: "План подготовки",
    description:
      "Собирайте пошаговый маршрут подготовки с темами, дедлайнами и понятными контрольными точками.",
    href: "/features",
    eyebrow: "Поддержка в процессе",
  },
];

export const processSteps: MarketingStep[] = [
  {
    number: "1",
    title: "Расскажите о себе",
    description:
      "Ответьте на короткие вопросы о классе, интересах, целях и желаемом темпе подготовки.",
  },
  {
    number: "2",
    title: "Получите рекомендации",
    description:
      "Сервис подберёт коды НЦТ и объяснит, почему именно эти направления совпадают с вашим профилем.",
  },
  {
    number: "3",
    title: "Сравните варианты",
    description:
      "Смотрите различия между направлениями, отсеивайте лишнее и сохраняйте самые сильные варианты.",
  },
  {
    number: "4",
    title: "Двигайтесь по плану",
    description:
      "Переходите к персональному плану подготовки и держите фокус на своём поступлении.",
  },
];

export const landingStats: MarketingStat[] = [
  {
    value: "10 000+",
    label: "учеников",
    detail: "используют платформу для выбора направления и подготовки",
  },
  {
    value: "200+",
    label: "кодов НЦТ",
    detail: "собрано в базе с пояснениями и логикой подбора",
  },
  {
    value: "30+",
    label: "вузов",
    detail: "можно сравнить по условиям поступления и перспективам",
  },
];

export const landingTestimonial: MarketingTestimonial = {
  quote:
    "NCT Navigator помог мне быстро понять, какие направления действительно подходят, и дал спокойный, понятный план подготовки без перегруза.",
  author: "Мухаммад А.",
  role: "11 класс",
};

export const featureCatalog: MarketingFeature[] = [
  {
    icon: SearchCheck,
    title: "Умный подбор кодов",
    description:
      "Рекомендации строятся не по одному ответу, а по общей картине: интересы, цели, способности и ваш уровень.",
    eyebrow: "Поиск без шума",
  },
  {
    icon: Lightbulb,
    title: "Объяснение выбора",
    description:
      "Каждая рекомендация сопровождается понятным объяснением, чтобы выбор был осознанным, а не случайным.",
    eyebrow: "Прозрачная логика",
  },
  {
    icon: Layers3,
    title: "Сравнение вариантов",
    description:
      "Сравнивайте направления, проходные баллы и нагрузку по обучению в одном аккуратном интерфейсе.",
    eyebrow: "Быстрая навигация",
  },
  {
    icon: ListChecks,
    title: "Подготовка по шагам",
    description:
      "Личный план помогает двигаться маленькими этапами и не терять темп в течение учебного года.",
    eyebrow: "Фокус на результате",
  },
  {
    icon: Bot,
    title: "AI Coach",
    description:
      "Помогает не бросать подготовку, подсказывает следующий шаг и возвращает в рабочий ритм.",
    eyebrow: "Поддержка рядом",
  },
  {
    icon: BadgeCheck,
    title: "История и сохранение",
    description:
      "Сохраняйте найденные направления, возвращайтесь к ним позже и отслеживайте прогресс без хаоса.",
    eyebrow: "Личный контекст",
  },
];

export const featurePillars: MarketingFeature[] = [
  {
    icon: Target,
    title: "Для тех, кто пока не уверен",
    description:
      "Если вы ещё сомневаетесь, платформа мягко помогает сузить выбор и увидеть понятный вектор движения.",
  },
  {
    icon: Waypoints,
    title: "Для тех, кто уже определился",
    description:
      "Если цель уже есть, NCT Navigator помогает превратить её в структурированный маршрут поступления.",
  },
  {
    icon: MessagesSquare,
    title: "Для тех, кому нужна ясность",
    description:
      "Вместо перегруженных таблиц вы получаете объяснения, аккуратные сравнения и человеческий язык.",
  },
];

export const howItWorksDetails: MarketingFeature[] = [
  {
    icon: AudioWaveform,
    title: "Диалог вместо анкеты",
    description:
      "Путь начинается с короткого и понятного сценария вопросов, который не утомляет и быстро собирает важный контекст.",
  },
  {
    icon: Sparkles,
    title: "Смысловые рекомендации",
    description:
      "После ответов сервис объединяет сигналы и подбирает направления, которые действительно похожи на ваш профиль.",
  },
  {
    icon: BookOpenCheck,
    title: "Осознанный выбор",
    description:
      "Каждое направление можно разобрать подробнее: понять нагрузку, перспективы и почему оно оказалось в подборке.",
  },
  {
    icon: CheckCircle2,
    title: "Следующий шаг без провала",
    description:
      "Когда выбор сделан, система переводит вас из режима поиска в режим подготовки, без пустых экранов и ручной пересборки.",
  },
];

export const footerLinks: MarketingNavLink[] = [
  { href: "/#about", label: "О проекте" },
  { href: "/how-it-works", label: "Как работает" },
  { href: "/features", label: "Возможности" },
];

export const showcaseSignals = [
  "Учусь в 11 классе",
  "Интересуюсь IT и технологиями",
  "Хочу поступить в сильный вуз",
];

export const workflowMetrics = [
  {
    title: "Меньше хаоса",
    description: "Вместо десятков вкладок у вас один маршрут: выбор, сравнение, подготовка.",
  },
  {
    title: "Быстрее решение",
    description: "Первые полезные рекомендации появляются уже после короткого стартового сценария.",
  },
  {
    title: "Больше уверенности",
    description: "Вы понимаете не только что выбрать, но и почему это решение вам подходит.",
  },
];

export const comparisonPoints = [
  "Осознанный выбор вместо случайного списка кодов",
  "Поддержка до и после подбора, а не только на первом шаге",
  "Аккуратный интерфейс без визуального шума и перегруза",
];

export const primaryCta = {
  href: "/onboarding",
  label: "Начать подбор",
};

export const secondaryCta = {
  href: "/how-it-works",
  label: "Как это работает?",
};

export const brandName = "NCT Navigator";
export const brandTagline = "Ваш навигатор в мир НЦТ";
export const footerCaption = "Подбор направлений, объяснение выбора и спокойный путь к поступлению.";
export const showcaseTitle = "Добро пожаловать!";
export const showcaseSubtitle =
  "Расскажите о себе, и мы подберём лучшие направления для вас.";
export const landingEyebrow = "Ваш навигатор в мир НЦТ";
export const landingTitle = "Найдите своё направление. Постройте будущее.";
export const landingDescription =
  "Подбор кодов НЦТ, объяснение выбора, план подготовки и поддержка на каждом этапе на основе ваших интересов и целей.";
