import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek";
import type { Category } from "@/types/categories";

export interface CategoryAnalysisResult {
  interests: string[];
  keywords: string[];
  recommendedFields: string[];
  reasoning: string;
}

export interface AnalysisContext {
  userCity?: string
  studyCity?: string
  userType?: string
  educationLevel?: string
}

const ANALYSIS_PROMPT: DeepSeekMessage = {
  role: "system",
  content: `Ты — профориентационный ассистент для абитуриентов Таджикистана.
Твоя задача — проанализировать выбранные категории и выдать структурированный результат.
Ответь только JSON без markdown и пояснений.`,
};

export async function analyzeCategories(
  categories: Category[],
  context?: AnalysisContext,
): Promise<CategoryAnalysisResult> {
  const categoryList = categories
    .map((c) => c.name)
    .join(", ");

  let contextBlock = ""
  if (context) {
    const parts: string[] = []
    if (context.userCity) parts.push(`Город проживания: ${context.userCity}`)
    if (context.studyCity) parts.push(`Желаемый город обучения: ${context.studyCity}`)
    if (context.educationLevel === "after_9") parts.push("Уровень образования: после 9 класса")
    else if (context.educationLevel === "after_11") parts.push("Уровень образования: после 11 класса")
    else if (context.educationLevel === "applicant") parts.push("Уровень образования: абитуриент")
    if (context.userType) {
      const typeLabels: Record<string, string> = { schoolboy: "Школьник", applicant: "Абитуриент", student: "Студент", working: "Работающий", other: "Другое" }
      parts.push(`Тип пользователя: ${typeLabels[context.userType] ?? context.userType}`)
    }
    if (parts.length > 0) {
      contextBlock = `\n\nДополнительная информация о пользователе:\n${parts.join("\n")}`
    }
  }

  const userPrompt: DeepSeekMessage = {
    role: "user",
    content: `Абитуриент выбрал следующие направления: ${categoryList}.${contextBlock}

Проанализируй выбор и верни JSON с такой структурой:
{
  "interests": ["список ключевых интересов пользователя, 5-7 пунктов"],
  "keywords": ["ключевые слова для поиска специальностей, 7-10 слов"],
  "recommendedFields": ["предлагаемые области, 3-5 штук"],
  "reasoning": "краткое объяснение, 2-3 предложения о том, почему эти направления могут подойти"
}

ВАЖНО: ответ должен быть строго валидным JSON.`,
  };

  const raw = await deepseekChat([ANALYSIS_PROMPT, userPrompt], {
    temperature: 0.3,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  });

  return parseAnalysisResult(raw);
}

function parseAnalysisResult(raw: string): CategoryAnalysisResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      recommendedFields: Array.isArray(parsed.recommendedFields)
        ? parsed.recommendedFields
        : [],
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : "",
    };
  } catch {
    throw new Error("Failed to parse category analysis result");
  }
}
