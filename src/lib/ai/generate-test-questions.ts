import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { DevelopmentPlan, PlanTestQuestion } from "@/types/plan"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный эксперт. Составляй проверочные вопросы по плану развития. Отвечай только валидный JSON без markdown.",
}

export async function generateTestQuestions(plan: DevelopmentPlan): Promise<PlanTestQuestion[]> {
  const stagesText = plan.stages
    .map(
      (s) =>
        `- ${s.title}: ${s.description}. Навыки: ${s.skills.join(", ")}. Рекомендации: ${s.recommendations.join("; ")}`,
    )
    .join("\n")

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Направление: ${plan.nctTitle} (${plan.nctCode})`,
      `Уровень пользователя: ${plan.level}`,
      "Этапы плана:",
      stagesText,
      "",
      "Цели:",
      ...plan.goals.map((g) => `- ${g.title}: ${g.description}`),
      "",
      "Сгенерируй 5 проверочных вопросов на основе этого плана.",
      "Вопросы должны проверять реальное понимание материала, а не просто память.",
      "Каждый вопрос должен быть практическим — как бы пользователь применил полученные знания.",
      "",
      "Ответь JSON строго по схеме:",
      `{ "questions": [{ "id": "q1", "question": "..." }] }`,
      "ВАЖНО: строго валидный JSON, без markdown.",
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.5,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  try {
    const parsed = JSON.parse(cleaned)
    const questions = Array.isArray(parsed.questions) ? parsed.questions : []
    return questions
      .filter((q: unknown): q is Record<string, unknown> => typeof (q as Record<string, unknown>).id === "string" && typeof (q as Record<string, unknown>).question === "string")
      .map((q: Record<string, unknown>) => ({
        id: q.id as string,
        question: q.question as string,
      }))
  } catch {
    return []
  }
}
