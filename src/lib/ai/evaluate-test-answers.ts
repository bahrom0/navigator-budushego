import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { DevelopmentPlan, PlanTestAnswer, PlanTestEvaluation } from "@/types/plan"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный эксперт. Оценивай ответы пользователя по плану развития. Отвечай только валидный JSON без markdown.",
}

export async function evaluateTestAnswers(
  plan: DevelopmentPlan,
  answers: PlanTestAnswer[],
): Promise<PlanTestEvaluation> {
  const stagesText = plan.stages
    .map((s) => `- ${s.title}: ${s.description}. Навыки: ${s.skills.join(", ")}`)
    .join("\n")

  const answersText = answers
    .map((a) => `Вопрос: ${a.question}\nОтвет: ${a.answer}`)
    .join("\n\n")

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Направление: ${plan.nctTitle} (${plan.nctCode})`,
      "Этапы плана:",
      stagesText,
      "",
      "Ответы пользователя:",
      answersText,
      "",
      "Оцени ответы. Если пользователь показал понимание материала (хотя бы 3 из 5 ответов удовлетворительные), passed=true.",
      "Если passed=true и текущий уровень beginner, установи newLevel='intermediate'.",
      "Если passed=true и текущий уровень intermediate, newLevel='advanced'.",
      "Если passed=false, newLevel не указывай.",
      "",
      "Ответь JSON строго по схеме:",
      `{ "passed": boolean, "message": "строка с пояснением" }`,
      "Если passed=true, добавь newLevel: 'intermediate' или 'advanced'.",
      "ВАЖНО: строго валидный JSON, без markdown.",
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 1024,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  try {
    const parsed = JSON.parse(cleaned)
    return {
      passed: parsed.passed === true,
      message: typeof parsed.message === "string" ? parsed.message : "Результат проверен",
      newLevel: ["beginner", "intermediate", "advanced"].includes(parsed.newLevel as string)
        ? (parsed.newLevel as PlanTestEvaluation["newLevel"])
        : undefined,
    }
  } catch {
    return { passed: false, message: "Не удалось оценить ответы" }
  }
}
