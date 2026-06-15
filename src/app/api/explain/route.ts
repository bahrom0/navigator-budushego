import { NextResponse } from "next/server"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import { nctCodes } from "@/lib/ai/nct-match"
import {
  ExplainRequestSchema,
  type ExplainRequest,
  type Explanation,
} from "@/types/api/explain"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный ассистент для абитуриентов Узбекистана. " +
    "Твоя задача — детально объяснить, почему конкретное направление подходит пользователю, " +
    "и предложить похожие специальности. Отвечай только валидный JSON без markdown.",
}

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = ExplainRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", error: parsed.error.message, data: null },
        { status: 400 },
      )
    }

    const { code, title_ru, career_matches, userInterests, selectedCategories }: ExplainRequest =
      parsed.data

    const explanation = await generateExplanation(
      code,
      title_ru,
      career_matches,
      userInterests,
      selectedCategories,
    )

    return NextResponse.json({
      status: "success",
      data: { explanation },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { status: "error", error: message, data: null },
      { status: 500 },
    )
  }
}

async function generateExplanation(
  code: string,
  title_ru: string,
  careerMatches: string[],
  userInterests: string[],
  selectedCategories: string[],
): Promise<Explanation> {
  const normalised = decodeURIComponent(code).replace(/[\s-]+/g, "").toUpperCase()
  const lookupCode = normalised
  const lookup = nctCodes.find((c) => c.code.replace(/[\s-]+/g, "").toUpperCase() === lookupCode)
  const lookupTitle = lookup?.title_ru || title_ru

  const similar = findSimilarCodes(lookupCode, selectedCategories)

  const userPrompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Специальность: ${lookupTitle}`,
      `Код НЦТ: ${code}`,
      `Возможные профессии: ${careerMatches.join(", ")}`,
      `Интересы абитуриента: ${userInterests.join(", ")}`,
      `Выбранные категории: ${selectedCategories.join(", ")}`,
      ``,
      `Сгенерируй JSON с полями:`,
      `- "whyItFits": краткое объяснение (2-3 предложения), почему эта специальность подходит`,
      `- "matchedInterests": массив из 2-4 интересов, совпадающих с направлением`,
      `- "matchedCareers": массив из 2-3 карьерных направлений, подходящих абитуриенту`,
      `- "similarCodes": массив из 1-3 похожих направлений формата [{"code": "...", "title_ru": "...", "reason": "..."}]`,
      ``,
      `Похожие коды из базы: ${similar.map((s) => `${s.code} ${s.title_ru}`).join(", ")}`,
      ``,
      `Пример ответа:`,
      `{`,
      `  "whyItFits": "Это направление сочетает ваши интересы...",`,
      `  "matchedInterests": ["программирование", "анализ данных"],`,
      `  "matchedCareers": ["разработчик ПО", "аналитик"],`,
      `  "similarCodes": [{"code": "6B06101", "title_ru": "Компьютерные науки", "reason": "Смежное направление"}]`,
      `}`,
      ``,
      `ВАЖНО: строго валидный JSON без markdown.`,
    ].join("\n"),
  }

  try {
    const raw = await deepseekChat([SYSTEM_PROMPT, userPrompt], {
      model: "deepseek-chat",
      temperature: 0.3,
      maxTokens: 1024,
      responseFormat: { type: "json_object" },
    })

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

    const parsed = JSON.parse(cleaned)

    return {
      whyItFits:
        typeof parsed.whyItFits === "string"
          ? parsed.whyItFits
          : `Направление ${title_ru} соответствует вашим интересам и имеет высокий рейтинг совпадений.`,
      matchedInterests: Array.isArray(parsed.matchedInterests)
        ? parsed.matchedInterests
        : userInterests.slice(0, 3),
      matchedCareers: Array.isArray(parsed.matchedCareers)
        ? parsed.matchedCareers
        : careerMatches.slice(0, 3),
      similarCodes: Array.isArray(parsed.similarCodes)
        ? parsed.similarCodes.slice(0, 3)
        : similar.slice(0, 2).map((s) => ({ code: s.code, title_ru: s.title_ru, reason: "Смежное направление" })),
    }
  } catch {
    return {
      whyItFits: `Направление ${title_ru} соответствует вашим интересам и имеет высокий рейтинг совпадений.`,
      matchedInterests: userInterests.slice(0, 3),
      matchedCareers: careerMatches.slice(0, 3),
      similarCodes: similar.slice(0, 2).map((s) => ({ code: s.code, title_ru: s.title_ru, reason: "Смежное направление" })),
    }
  }
}

function findSimilarCodes(
  currentCode: string,
  selectedCategories: string[],
): { code: string; title_ru: string }[] {
  const current = nctCodes.find((c) => c.code === currentCode)
  if (!current) return []

  const selectedLower = selectedCategories.map((c) => c.toLowerCase())

  return nctCodes
    .filter((c) => c.code !== currentCode && c.cluster === current.cluster)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map((c) => ({ code: c.code, title_ru: c.title_ru }))
}
