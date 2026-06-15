import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { StrategyResult } from "@/types/strategy"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный эксперт по стратегии поступления в вузы. " +
    "Анализируй интересы пользователя и предлагай стратегию выбора направлений. " +
    "Отвечай только валидный JSON без markdown.",
}

export interface GenerateStrategyOptions {
  categories: string[]
  level?: string
  interviewSummary?: string
  availableClusters: { id: number; name: string; codeCount: number }[]
}

export async function generateStrategyAI(
  options: GenerateStrategyOptions,
): Promise<StrategyResult | null> {
  const { categories, level = "beginner", interviewSummary, availableClusters } = options

  const clusterInfo = availableClusters
    .map((c) => `- Кластер ${c.id}: ${c.name} (${c.codeCount} направлений)`)
    .join("\n")

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Интересы пользователя: ${categories.join(", ")}`,
      `Уровень подготовки: ${level}`,
      interviewSummary ? `Результаты интервью: ${interviewSummary}` : "",
      "",
      "Доступные кластеры:",
      clusterInfo,
      "",
      "Сгенерируй три стратегии поступления:",
      "- safe: безопасная, высокая вероятность поступления",
      "- balanced: сбалансированная, оптимальное соотношение риска и шансов",
      "- ambitious: амбициозная, максимальные цели",
      "",
      "Для каждой стратегии укажи:",
      "- type: safe | balanced | ambitious",
      "- title: название стратегии",
      "- description: описание на русском (2-3 предложения)",
      "- risk: 'Низкий' | 'Средний' | 'Высокий'",
      "- successProbability: 'Высокая' | 'Средняя' | 'Низкая'",
      "- recommendedCodes: массив рекомендуемых направлений с code, title, cluster, institution",
      "- fallbackCodes: массив запасных вариантов с code, title, cluster, institution",
      "",
      "В recommendedCodes и fallbackCodes используй реалистичные коды и названия направлений.",
      "Ответь строго валидный JSON, без markdown.",
    ].filter(Boolean).join("\n"),
  }

  try {
    const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
      temperature: 0.4,
      maxTokens: 2048,
      responseFormat: { type: "json_object" },
    })

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const parsed = JSON.parse(cleaned)

    if (parsed.strategies && Array.isArray(parsed.strategies)) {
      return parsed as StrategyResult
    }

    return null
  } catch {
    return null
  }
}
