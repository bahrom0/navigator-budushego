import { deepseekChat, type DeepSeekMessage } from "@/lib/ai/deepseek";
import type { InterestProfileAnalysis, InterestProfileContext } from "@/lib/ai/analyze-interest-profile";
import type { RankedNCT } from "@/types/nct";

export interface RecommendationCandidateAIResult {
  candidateKey: string;
  fitScore: number;
  whyItFits: string;
  matchedInterests: string[];
  matchedCareers: string[];
}

const SYSTEM_PROMPT: DeepSeekMessage = {
  role: "system",
  content:
    "Ты ранжируешь только уже найденный shortlist кандидатов. Нельзя придумывать новые коды. Верни только JSON.",
};

export async function finalizeRecommendationsWithAI(
  shortlist: Array<RankedNCT & { candidateKey: string }>,
  analysis: InterestProfileAnalysis,
  context?: InterestProfileContext,
): Promise<RecommendationCandidateAIResult[]> {
  const raw = await deepseekChat(
    [SYSTEM_PROMPT, buildPrompt(shortlist, analysis, context)],
    {
      temperature: 0.2,
      maxTokens: 3072,
      responseFormat: { type: "json_object" },
    },
  );

  return parseResponse(raw);
}

function buildPrompt(
  shortlist: Array<RankedNCT & { candidateKey: string }>,
  analysis: InterestProfileAnalysis,
  context?: InterestProfileContext,
): DeepSeekMessage {
  const candidates = shortlist.map((item) => ({
    candidateKey: item.candidateKey,
    code: item.code,
    title: item.title_ru,
    institution: item.institution,
    city: item.city,
    cluster: item.cluster_name_ru ?? item.cluster,
    confidence: Number(item.confidence.toFixed(3)),
    studyForm: item.study_form ?? [],
    studyType: item.study_type ?? [],
    taxonomyPath: item.taxonomyPath ?? [],
    matchedKeywords: item.matchedKeywords,
    localReasoning: item.reasoning,
  }));

  const profile = {
    interests: analysis.interests,
    keywords: analysis.keywords,
    professions: analysis.professions,
    directions: analysis.directions,
    searchIntents: analysis.searchIntents,
    studyCity: context?.studyCity,
    userCity: context?.userCity,
    educationLevel: context?.educationLevel,
  };

  return {
    role: "user",
    content: `Профиль пользователя:
${JSON.stringify(profile)}

Shortlist кандидатов:
${JSON.stringify(candidates)}

Верни строго JSON вида:
{
  "ranked": [
    {
      "candidateKey": "один из candidateKey из shortlist",
      "fitScore": 0.0,
      "whyItFits": "1-2 предложения без воды",
      "matchedInterests": ["2-4 интереса"],
      "matchedCareers": ["2-4 подходящих карьерных направления"]
    }
  ]
}

Правила:
- Используй только candidateKey из shortlist.
- Не добавляй новые коды и университеты.
- fitScore должен быть от 0 до 1.
- Отсортируй ranked от лучшего к худшему.`,
  };
}

function parseResponse(raw: string): RecommendationCandidateAIResult[] {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as {
    ranked?: RecommendationCandidateAIResult[];
  };

  if (!Array.isArray(parsed.ranked)) {
    throw new Error("AI ranking did not return ranked candidates");
  }

  return parsed.ranked
    .filter((item): item is RecommendationCandidateAIResult => {
      return (
        typeof item?.candidateKey === "string" &&
        typeof item?.whyItFits === "string" &&
        typeof item?.fitScore === "number"
      );
    })
    .map((item) => ({
      candidateKey: item.candidateKey,
      fitScore: clamp(item.fitScore),
      whyItFits: item.whyItFits,
      matchedInterests: Array.isArray(item.matchedInterests)
        ? item.matchedInterests.filter((value): value is string => typeof value === "string")
        : [],
      matchedCareers: Array.isArray(item.matchedCareers)
        ? item.matchedCareers.filter((value): value is string => typeof value === "string")
        : [],
    }));
}

function clamp(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
