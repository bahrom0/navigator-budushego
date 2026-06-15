// const DEEPSEEK_API_BASE = "https://api.deepseek.com/v1";

// export interface DeepSeekMessage {
//   role: "system" | "user" | "assistant";
//   content: string;
// }

// export interface DeepSeekOptions {
//   model?: string;
//   temperature?: number;
//   maxTokens?: number;
//   responseFormat?: { type: "json_object" };
// }

// let cachedApiKey: string | null = null;

// async function getApiKey(): Promise<string> {
//   if (cachedApiKey) return cachedApiKey;
//   const key = process.env.DEEPSEEK_API_KEY;
//   if (!key || key.length === 0) {
//     throw new Error("DEEPSEEK_API_KEY is not configured");
//   }
//   cachedApiKey = key;
//   return key;
// }

// export async function deepseekChat(
//   messages: DeepSeekMessage[],
//   options: DeepSeekOptions = {},
// ): Promise<string> {
//   const apiKey = await getApiKey();
//   const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${apiKey}`,
//     },
//     body: JSON.stringify({
//       model: options.model ?? "deepseek-chat",
//       messages,
//       temperature: options.temperature ?? 0.2,
//       max_tokens: options.maxTokens ?? 4096,
//       response_format: options.responseFormat,
//     }),
//   });

//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(
//       `DeepSeek API error ${response.status}: ${errorText.slice(0, 200)}`,
//     );
//   }

//   const data = (await response.json()) as {
//     choices: { message: { content: string } }[];
//   };
//   return data.choices[0]?.message?.content ?? "";
// }


const DEEPSEEK_API_BASE = "https://api.deepseek.com/v1";

const DEEPSEEK_API_KEY = "sk-ed64314094594fedb535cb4077cc5cfa";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" };
}

let cachedApiKey: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;

  const key = DEEPSEEK_API_KEY;

  if (!key || key.length === 0) {
    throw new Error("DEEPSEEK_API_KEY is not configured");
  }

  cachedApiKey = key;
  return key;
}

export async function deepseekChat(
  messages: DeepSeekMessage[],
  options: DeepSeekOptions = {},
): Promise<string> {
  const apiKey = await getApiKey();

  const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model ?? "deepseek-chat",
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 4096,
      response_format: options.responseFormat,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DeepSeek API error ${response.status}: ${errorText.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0]?.message?.content ?? "";
}