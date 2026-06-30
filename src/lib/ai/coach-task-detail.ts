import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"

const DetailStepSchema = z.object({
  title: z.string(),
  description: z.string(),
})

const TaskDetailResponseSchema = z.object({
  steps: z.array(DetailStepSchema).min(1).max(8),
})

export interface GenerateTaskDetailOptions {
  taskTitle: string
  taskType: string
  taskDescription: string
  nctTitle: string
  weekTitle: string
}

export interface TaskDetailStep {
  title: string
  description: string
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content: [
    "Ты — персональный наставник по подготовке к поступлению.",
    "Пользователь видит задачу на день и хочет понять, что именно изучать.",
    "Разбей задачу на 3-6 конкретных подшагов с понятными описаниями.",
    "Каждый шаг должен быть actionable: пользователь должен понимать, что делать.",
    "Не используй общие фразы. Только конкретные темы и действия.",
    "Отвечай только валидный JSON без markdown.",
  ].join(" "),
}

export async function generateTaskDetail(
  options: GenerateTaskDetailOptions,
): Promise<TaskDetailStep[]> {
  const { taskTitle, taskType, taskDescription, nctTitle, weekTitle } = options

  const typeLabel: Record<string, string> = {
    study: "изучение теории",
    practice: "практические задачи",
    review: "повторение материала",
    test: "проверка знаний",
  }

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Специальность: ${nctTitle}`,
      `Неделя: ${weekTitle}`,
      "",
      `Задача: "${taskTitle}"`,
      `Тип: ${typeLabel[taskType] ?? taskType}`,
      `Описание: ${taskDescription}`,
      "",
      "Разбей эту задачу на конкретные подшаги (3-6).",
      "Каждый подшаг — это конкретная тема или действие.",
      "Например, если задача 'Изучить логарифмы':",
      "1. 'Определение логарифма' — 'Разобрать, что такое логарифм, основное логарифмическое тождество'",
      "2. 'Свойства логарифмов' — 'Изучить свойства: логарифм произведения, частного, степени'",
      "",
      "Ответь JSON строго по схеме:",
      "{",
      '  "steps": [',
      "    {",
      '      "title": "Краткий заголовок шага",',
      '      "description": "Что конкретно сделать в этом шаге"',
      "    }",
      "  ]",
      "}",
      "ВАЖНО: строго валидный JSON, без markdown.",
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.3,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) }
      catch { throw new Error("Failed to parse task detail JSON") }
    } else { throw new Error("Failed to parse task detail JSON") }
  }

  const result = TaskDetailResponseSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(
      `Task detail validation failed: ${result.error.issues[0]?.message}`,
    )
  }

  return result.data.steps
}
