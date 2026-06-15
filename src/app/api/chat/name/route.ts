import { NextResponse } from "next/server"
import { z } from "zod"
import { deepseekChat } from "@/lib/ai/deepseek"

export const dynamic = "force-dynamic"

const NameChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = NameChatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ status: "error", error: parsed.error.message }, { status: 400 })
    }

    const conversation = parsed.data.messages
      .map((m) => `${m.role === "user" ? "Пользователь" : "Ассистент"}: ${m.content}`)
      .join("\n")

    const systemPrompt = `Ты — AI, который даёт короткие названия диалогам на русском языке. На основе сообщений ниже придумай короткое название (3-5 слов), отражающее тему разговора. Ответь только названием, без кавычек и пояснений.`

    const raw = await deepseekChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: conversation },
    ], {
      model: "deepseek-chat",
      temperature: 0.3,
      maxTokens: 50,
    })

    const title = raw.trim().replace(/^["'„]|["'“]$/g, "").substring(0, 200)

    return NextResponse.json({ status: "success", data: { title } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ status: "error", error: message, data: null }, { status: 500 })
  }
}
