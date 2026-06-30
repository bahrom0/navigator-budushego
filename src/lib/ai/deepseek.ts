const REQUEST_TIMEOUT_MS = 60_000

export type AIProvider = "deepseek" | "openai"

export interface ModelConfig {
  provider: AIProvider
  model: string
  apiKey: string
  baseUrl: string
}

export interface AIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AIChatOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: "json_object" }
}

let cachedConfig: ModelConfig | null = null

export function getModelConfig(): ModelConfig {
  if (cachedConfig) return cachedConfig

  const provider = (process.env.AI_PROVIDER ?? "deepseek") as AIProvider
  const model = process.env.AI_MODEL ?? "deepseek-chat"
  const apiKey = process.env.AI_API_KEY ?? process.env.DEEPSEEK_API_KEY ?? ""
  const baseUrl = process.env.AI_BASE_URL ?? "https://api.deepseek.com/v1"

  if (!apiKey) {
    throw new Error("AI_API_KEY (or DEEPSEEK_API_KEY) is not configured")
  }

  cachedConfig = { provider, model, apiKey, baseUrl }
  return cachedConfig
}

export function resetModelConfig(): void {
  cachedConfig = null
}

export async function chat(
  messages: AIMessage[],
  options: AIChatOptions = {},
): Promise<string> {
  const config = getModelConfig()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  const url = `${config.baseUrl.replace(/\/+$/, "")}/chat/completions`

  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model ?? config.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.responseFormat,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`AI request timed out after ${REQUEST_TIMEOUT_MS}ms`)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `AI API error ${response.status} (${config.provider}): ${errorText.slice(0, 200)}`,
    )
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }

  return data.choices[0]?.message?.content ?? ""
}

export { chat as deepseekChat }
export type { ModelConfig as DeepSeekOptions }
export type { AIMessage as DeepSeekMessage }
