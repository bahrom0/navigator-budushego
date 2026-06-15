import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { SkillAssessment, SkillLevel } from "@/types/plan"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный эксперт. Оценивай уровень абитуриента на основе ответов. Отвечай только валидный JSON без markdown.",
}

export interface AssessSkillOptions {
  nctCode: string
  nctTitle: string
  previousQA: { question: string; answer: string }[]
  summary?: string
}

export async function assessSkill(options: AssessSkillOptions): Promise<SkillAssessment> {
  const { nctCode, nctTitle, previousQA, summary } = options

  const historyBlock = previousQA
    .map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`)
    .join("\n\n")

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Направление: ${nctTitle} (код ${nctCode})`,
      summary ? `Резюме интервью: ${summary}` : "",
      historyBlock ? `История ответов:\n${historyBlock}` : "Ответов нет.",
      "Определи уровень абитуриента для этого направления: beginner, intermediate или advanced.",
      "Также выдели ключевые навыки, сильные стороны и зоны роста.",
      "Ответь JSON:",
      "{",
      '  "level": "beginner|intermediate|advanced",',
      '  "skills": ["навык 1", "навык 2"],',
      '  "strengths": ["сильная сторона 1"],',
      '  "gaps": ["зона роста 1"]',
      "}",
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

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return getFallbackAssessment()
  }

  const levelRaw = parsed.level
  const level: SkillLevel = ["beginner", "intermediate", "advanced"].includes(levelRaw as string)
    ? (levelRaw as SkillLevel)
    : "beginner"

  const skills = Array.isArray(parsed.skills)
    ? parsed.skills.filter((s: unknown): s is string => typeof s === "string")
    : []

  const strengths = Array.isArray(parsed.strengths)
    ? parsed.strengths.filter((s: unknown): s is string => typeof s === "string")
    : []

  const gaps = Array.isArray(parsed.gaps)
    ? parsed.gaps.filter((s: unknown): s is string => typeof s === "string")
    : []

  return { level, skills, strengths, gaps }
}

function getFallbackAssessment(): SkillAssessment {
  return {
    level: "beginner",
    skills: ["Базовые знания"],
    strengths: ["Интерес к направлению"],
    gaps: ["Необходимо углубить знания"],
  }
}
