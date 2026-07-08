import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek";

export interface InterestCategoryInput {
  id: string;
  name: string;
  description?: string;
}

export interface InterestProfileContext {
  userCity?: string;
  studyCity?: string;
  userType?: string;
  educationLevel?: string;
  interests?: string[];
}

export interface InterestProfileAnalysis {
  interests: string[];
  keywords: string[];
  professions: string[];
  directions: string[];
  searchIntents: string[];
  reasoning: string;
  usedFallback: boolean;
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты анализируешь профиль абитуриента и возвращаешь только JSON. Не выбирай коды НЦТ. Выдели профессии, направления и поисковые намерения для следующего шага локального поиска.",
};

const CATEGORY_FALLBACKS: Record<
  string,
  { professions: string[]; directions: string[]; intents: string[] }
> = {
  it: {
    professions: ["frontend-разработчик", "backend-разработчик", "аналитик данных"],
    directions: ["разработка ПО", "информационные технологии", "data-направления"],
    intents: ["программирование", "веб-разработка", "данные", "алгоритмы"],
  },
  medicine: {
    professions: ["врач", "фармацевт", "медицинский лаборант"],
    directions: ["клиническая медицина", "фармация", "диагностика"],
    intents: ["биология", "химия", "здоровье", "лечение"],
  },
  pedagogy: {
    professions: ["учитель", "методист", "педагог-психолог"],
    directions: ["образование", "педагогика", "воспитательная работа"],
    intents: ["обучение", "работа с детьми", "методика преподавания"],
  },
  economics: {
    professions: ["экономист", "финансовый аналитик", "бухгалтер"],
    directions: ["экономика", "финансы", "бизнес-аналитика"],
    intents: ["финансы", "бизнес", "аналитика", "управление"],
  },
  law: {
    professions: ["юрист", "правовед", "судебный специалист"],
    directions: ["юриспруденция", "правовое сопровождение", "госслужба"],
    intents: ["право", "закон", "документы", "регулирование"],
  },
  engineering: {
    professions: ["инженер", "технолог", "проектировщик"],
    directions: ["инженерные системы", "производство", "техническое проектирование"],
    intents: ["техника", "конструирование", "производство", "физика"],
  },
  art: {
    professions: ["дизайнер", "иллюстратор", "медиа-специалист"],
    directions: ["дизайн", "визуальные коммуникации", "творческие индустрии"],
    intents: ["дизайн", "медиа", "визуал", "творчество"],
  },
  linguistics: {
    professions: ["переводчик", "лингвист", "преподаватель языков"],
    directions: ["языки", "перевод", "межкультурная коммуникация"],
    intents: ["языки", "перевод", "коммуникация"],
  },
  agronomy: {
    professions: ["агроном", "эколог", "специалист по агробизнесу"],
    directions: ["сельское хозяйство", "агротехнологии", "экология"],
    intents: ["агро", "экология", "биология", "природопользование"],
  },
  psychology: {
    professions: ["психолог", "консультант", "HR-специалист"],
    directions: ["психология", "консультирование", "поведенческие науки"],
    intents: ["психология", "консультирование", "коммуникация"],
  },
  architecture: {
    professions: ["архитектор", "урбанист", "дизайнер среды"],
    directions: ["архитектура", "проектирование", "городская среда"],
    intents: ["проектирование", "чертежи", "пространство", "дизайн среды"],
  },
  marketing: {
    professions: ["маркетолог", "бренд-менеджер", "SMM-специалист"],
    directions: ["маркетинг", "брендинг", "digital-коммуникации"],
    intents: ["продвижение", "бренд", "digital", "коммуникации"],
  },
  construction: {
    professions: ["строитель", "инженер ПГС", "менеджер проекта"],
    directions: ["строительство", "инфраструктура", "управление проектами"],
    intents: ["строительство", "инфраструктура", "сметы", "технологии строительства"],
  },
  energy: {
    professions: ["энергетик", "электроинженер", "специалист по ВИЭ"],
    directions: ["энергетика", "электротехника", "возобновляемая энергия"],
    intents: ["электричество", "энергия", "сети", "техника"],
  },
  management: {
    professions: ["менеджер", "операционный руководитель", "project manager"],
    directions: ["менеджмент", "операционное управление", "лидерство"],
    intents: ["управление", "команды", "процессы", "лидерство"],
  },
};

export async function analyzeInterestProfile(
  categories: InterestCategoryInput[],
  context?: InterestProfileContext,
): Promise<InterestProfileAnalysis> {
  try {
    const raw = await deepseekChat(
      [SYSTEM_PROMPT, buildUserPrompt(categories, context)],
      {
        temperature: 0.2,
        maxTokens: 2048,
        responseFormat: { type: "json_object" },
      },
    );

    return parseInterestProfile(raw);
  } catch {
    return buildFallbackAnalysis(categories, context);
  }
}

function buildUserPrompt(
  categories: InterestCategoryInput[],
  context?: InterestProfileContext,
): DeepSeekMessage {
  const categoryBlock = categories
    .map((category) =>
      [category.name, category.description].filter(Boolean).join(" — "),
    )
    .join("\n");

  const profileParts: string[] = [];
  if (context?.userCity) profileParts.push(`Город проживания: ${context.userCity}`);
  if (context?.studyCity) profileParts.push(`Желаемый город обучения: ${context.studyCity}`);
  if (context?.userType) profileParts.push(`Тип пользователя: ${context.userType}`);
  if (context?.educationLevel) {
    profileParts.push(`Уровень поступления: ${context.educationLevel}`);
  }
  if (context?.interests?.length) {
    profileParts.push(`Дополнительные интересы: ${context.interests.join(", ")}`);
  }

  return {
    role: "user",
    content: `Профиль абитуриента:
${profileParts.length > 0 ? profileParts.join("\n") : "Нет дополнительных данных"}

Выбранные направления:
${categoryBlock}

Верни строго JSON такого вида:
{
  "interests": ["3-8 кратких интересов пользователя"],
  "keywords": ["6-12 поисковых ключевых слов"],
  "professions": ["4-8 возможных профессий"],
  "directions": ["3-6 образовательных направлений"],
  "searchIntents": ["4-8 поисковых намерений или формулировок"],
  "reasoning": "краткое объяснение в 2-3 предложениях"
}

Не выбирай коды НЦТ. Не добавляй markdown.`,
  };
}

function parseInterestProfile(raw: string): InterestProfileAnalysis {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<InterestProfileAnalysis>;

  return {
    interests: asStringArray(parsed.interests),
    keywords: asStringArray(parsed.keywords),
    professions: asStringArray(parsed.professions),
    directions: asStringArray(parsed.directions),
    searchIntents: asStringArray(parsed.searchIntents),
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    usedFallback: false,
  };
}

function buildFallbackAnalysis(
  categories: InterestCategoryInput[],
  context?: InterestProfileContext,
): InterestProfileAnalysis {
  const professions = new Set<string>();
  const directions = new Set<string>();
  const searchIntents = new Set<string>();
  const keywords = new Set<string>();
  const interests = new Set<string>(context?.interests ?? []);

  for (const category of categories) {
    interests.add(category.name);
    for (const token of splitTerms(category.description)) {
      keywords.add(token);
    }

    const mapped = CATEGORY_FALLBACKS[category.id];
    if (mapped) {
      mapped.professions.forEach((item) => professions.add(item));
      mapped.directions.forEach((item) => directions.add(item));
      mapped.intents.forEach((item) => searchIntents.add(item));
    } else {
      professions.add(category.name);
      directions.add(category.name);
      searchIntents.add(category.name);
    }
  }

  for (const rawInterest of context?.interests ?? []) {
    splitTerms(rawInterest).forEach((item) => keywords.add(item));
    searchIntents.add(rawInterest);
  }

  return {
    interests: take(interests, 8),
    keywords: take(new Set([...keywords, ...searchIntents]), 12),
    professions: take(professions, 8),
    directions: take(directions, 6),
    searchIntents: take(searchIntents, 8),
    reasoning:
      "AI-анализ был недоступен, поэтому использован локальный разбор выбранных направлений и интересов.",
    usedFallback: true,
  };
}

function splitTerms(value?: string): string[] {
  return (value ?? "")
    .split(/[,.()/:;-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function take(items: Set<string>, limit: number): string[] {
  return [...items].slice(0, limit);
}
