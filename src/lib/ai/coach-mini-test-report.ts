import { z } from "zod"
import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek"
import type { CoachMiniTest, CoachMiniTestResult } from "@/types/coach"

const ReportSchema = z.object({
  reply: z.string().min(1),
})

function buildPrompt(miniTest: CoachMiniTest, result: CoachMiniTestResult): DeepSeekMessage[] {
  const review = result.review ?? []

  const lines = [
    "Ты анализируешь результаты мини-теста ученика.",
    "Верни только валидный JSON без markdown-кодовых блоков.",
    "Поле reply ОБЯЗАТЕЛЬНО.",
    "Внутри reply используй красивый markdown: заголовки, списки, выделение жирным.",
    'Формат JSON: {"reply":"# Отчет ..."}',
    "",
    `Предмет: ${miniTest.subject || result.subject || "Не указан"}`,
    `Результат: ${result.correctAnswers}/${result.totalQuestions}`,
    "",
    "Вопросы и ошибки:",
  ]

  miniTest.questions.forEach((question, index) => {
    const item = review[index]
    lines.push(`Вопрос ${index + 1}: ${question.question}`)
    lines.push(`Правильный ответ: ${question.options[question.correctIndex] ?? ""}`)
    lines.push(`Ответ пользователя: ${item?.selectedAnswer ?? "Нет ответа"}`)
    lines.push(`Верно: ${item?.isCorrect ? "да" : "нет"}`)
    if (question.explanation) {
      lines.push(`Объяснение: ${question.explanation}`)
    }
    lines.push("")
  })

  lines.push(
    "Сделай краткий, но полезный отчет:",
    "1. Короткий итог по сильным и слабым местам.",
    "2. Блок 'Где были ошибки'.",
    "3. Блок 'Почему так могло случиться'.",
    "4. Блок 'Как исправить' с 2-4 конкретными шагами.",
    "5. Если ошибок нет, похвали и дай 1 следующий шаг.",
  )

  return [{ role: "system", content: lines.join("\n") }]
}

export async function generateCoachMiniTestReport(
  miniTest: CoachMiniTest,
  result: CoachMiniTestResult,
): Promise<string> {
  const raw = await deepseekChat(buildPrompt(miniTest, result), {
    model: "deepseek-chat",
    temperature: 0.2,
    maxTokens: 2048,
    responseFormat: { type: "json_object" },
  })

  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
  if (!cleaned) {
    throw new Error("AI mini test report is empty")
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error("Failed to parse mini test report JSON")
  }

  const replyCandidate =
    typeof parsed.reply === "string" && parsed.reply.trim()
      ? parsed.reply.trim()
      : typeof parsed.message === "string" && parsed.message.trim()
        ? parsed.message.trim()
        : typeof parsed.text === "string" && parsed.text.trim()
          ? parsed.text.trim()
          : ""

  const validated = ReportSchema.safeParse({ reply: replyCandidate })
  if (!validated.success) {
    throw new Error("Mini test report missing reply text")
  }

  return validated.data.reply
}
