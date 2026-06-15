import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты — профориентационный ассистент. Задавай пошагово вопросы, чтобы оценить уровень и интересы абитуриента. Отвечай только валидный JSON без markdown.",
}

export interface GenerateQuestionsOptions {
  nctCode: string
  nctTitle: string
  userInterests?: string[]
  count?: number
}

export async function generateInterviewQuestions(
  options: GenerateQuestionsOptions,
): Promise<
  { id: string; question: string; type: "choice" | "text"; options?: string[] }[]
> {
  const { nctCode, nctTitle, userInterests = [], count = 5 } = options

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Направление: ${nctTitle} (код ${nctCode})`,
      userInterests.length > 0 ? `Интересы абитуриента: ${userInterests.join(", ")}` : "",
      `Сгенерируй ${count} вопросов для оценки уровня абитуриента для этого направления.`,
      "Строго верни JSON массив:",
      `[`,
      `  {"id": "q1", "question": "...", "type": "choice", "options": ["вариант 1", "вариант 2", "вариант 3"]},`,
      `  {"id": "q2", "question": "...", "type": "text", "options": null},`,
      `]`,
      `Тип "choice" — с вариантами ответа, "text" — свободный ответ.`,
      `ВАЖНО: строго валидный JSON, без markdown.`,
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.4,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    return getFallbackQuestions(nctTitle)
  }

  if (!Array.isArray(parsed)) return getFallbackQuestions(nctTitle)

  return parsed
    .filter(
      (q: unknown): q is { id: string; question: string; type: string; options?: string[] | null } =>
        typeof (q as Record<string, unknown>).id === "string" &&
        typeof (q as Record<string, unknown>).question === "string" &&
        ["choice", "text"].includes((q as Record<string, unknown>).type as string),
    )
    .map((q) => ({
      id: q.id,
      question: q.question,
      type: q.type as "choice" | "text",
      options: Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string") : undefined,
    }))
}

export interface EvaluateAnswerOptions {
  nctCode: string
  nctTitle: string
  question: string
  answer: string
  previousQA: { question: string; answer: string }[]
  questionIndex: number
  totalQuestions: number
}

export async function evaluateAndGetNextQuestion(
  options: EvaluateAnswerOptions,
): Promise<{
  nextQuestion: { id: string; question: string; type: "choice" | "text"; options?: string[] } | null
  isComplete: boolean
  summary: string
}> {
  const { nctCode, nctTitle, question, answer, previousQA, questionIndex, totalQuestions } = options
  const isLast = questionIndex >= totalQuestions - 1

  const historyBlock = previousQA.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}`).join("\n\n")

  const prompt: DeepSeekMessage = {
    role: "user",
    content: [
      `Направление: ${nctTitle} (код ${nctCode})`,
      `Вопрос: ${question}`,
      `Ответ абитуриента: ${answer}`,
      historyBlock ? `\nИстория:\n${historyBlock}` : "",
      isLast
        ? "Это последний вопрос. Дай краткое резюме и оценку уровня абитуриента."
        : `Это вопрос ${questionIndex + 1} из ${totalQuestions}. Придумай следующий уточняющий вопрос.`,
      "Ответь JSON:",
      isLast
        ? '{"isComplete": true, "summary": "текст summary"}'
        : '{"isComplete": false, "nextQuestion": {"id": "qN", "question": "...", "type": "choice", "options": [...], "summary": ""}}',
      "ВАЖНО: строго валидный JSON.",
    ].join("\n"),
  }

  const raw = await deepseekChat([SYSTEM_PROMPT, prompt], {
    model: "deepseek-chat",
    temperature: 0.4,
    maxTokens: 1024,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    if (isLast) {
      return { nextQuestion: null, isComplete: true, summary: "Интервью завершено." }
    }
    return { nextQuestion: getFallbackSingleQuestion(questionIndex), isComplete: false, summary: "" }
  }

  if (typeof parsed.isComplete === "boolean" && parsed.isComplete) {
    return {
      nextQuestion: null,
      isComplete: true,
      summary: typeof parsed.summary === "string" ? parsed.summary : "Интервью завершено.",
    }
  }

  const nq = parsed.nextQuestion as Record<string, unknown> | undefined
  if (nq && typeof nq.id === "string" && typeof nq.question === "string" && ["choice", "text"].includes(nq.type as string)) {
    return {
      nextQuestion: {
        id: nq.id,
        question: nq.question,
        type: nq.type as "choice" | "text",
        options: Array.isArray(nq.options)
          ? nq.options.filter((o): o is string => typeof o === "string")
          : undefined,
      },
      isComplete: false,
      summary: typeof nq.summary === "string" ? nq.summary : "",
    }
  }

  if (isLast) {
    return { nextQuestion: null, isComplete: true, summary: "Интервью завершено." }
  }

  return { nextQuestion: getFallbackSingleQuestion(questionIndex), isComplete: false, summary: "" }
}

function getFallbackQuestions(nctTitle: string) {
  return [
    { id: "q1", question: `Почему вас интересует направление «${nctTitle}»?`, type: "text" as const },
    { id: "q2", question: "Есть ли у вас опыт в этой области?", type: "choice" as const, options: ["Да, был практический опыт", "Только теоретическая база", "Пока нет, только интерес"] },
    { id: "q3", question: "Какие навыки вы считаете своими сильными?", type: "text" as const },
  ]
}

function getFallbackSingleQuestion(index: number) {
  const fallbacks = [
    { id: `q${index + 1}`, question: "Расскажите о своих академических достижениях.", type: "text" as const },
    { id: `q${index + 1}`, question: "Как вы относитесь к командной работе?", type: "choice" as const, options: ["Легко работаю в команде", "Предпочитаю индивидуальную работу", "Оба варианта меня устраивают"] },
  ]
  return fallbacks[index % fallbacks.length]
}
