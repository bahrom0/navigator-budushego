import { analyzeInterestProfile } from "@/lib/ai/analyze-interest-profile";
import { finalizeRecommendationsWithAI } from "@/lib/ai/finalize-recommendations";
import { matchNCTByCluster, matchNCTByKeywords, type PrefilterOptions } from "@/lib/ai/nct-match";
import { calculateOverallConfidence, rankNCTResults } from "@/lib/ai/rank-nct";
import type { AnalysisStep } from "@/types/analysis";
import type { NCTMatchResult, RankedNCT } from "@/types/nct";
import type { RecommendationResultSet } from "@/types/recommendations";

export interface BuildRecommendationsInput {
  categories: { id: string; name: string; description?: string }[];
  keywords?: string[];
  topK: number;
  minConfidence: number;
  onboarding?: {
    userCity?: string;
    studyCity?: string;
    userType?: string;
    educationLevel?: "after_9" | "after_11" | "applicant" | "";
    interests?: string[];
  };
}

export interface BuildRecommendationsOptions {
  onProgress?: (step: AnalysisStep) => Promise<void> | void;
}

export async function buildRecommendations(
  input: BuildRecommendationsInput,
  options: BuildRecommendationsOptions = {},
): Promise<RecommendationResultSet> {
  const { categories, keywords = [], topK, minConfidence, onboarding } = input;
  const completedSteps: AnalysisStep[] = [];
  const usedFallbacks: string[] = [];

  async function mark(step: AnalysisStep) {
    completedSteps.push(step);
    await options.onProgress?.(step);
  }

  await mark("submitting_request");

  await mark("analyzing_interests");
  const analysis = await analyzeInterestProfile(categories, onboarding);
  if (analysis.usedFallback) {
    usedFallbacks.push("interest-analysis");
  }

  const combinedKeywords = dedupeStrings([
    ...(onboarding?.interests ?? []),
    ...keywords,
    ...analysis.keywords,
    ...analysis.searchIntents,
    ...analysis.professions,
    ...analysis.directions,
  ]);

  const educationLevel =
    onboarding?.educationLevel === "applicant"
      ? ("after_11" as const)
      : onboarding?.educationLevel || "";

  await mark("searching_nct_codes");
  const matches = await buildCandidatePool({
    categories,
    topK,
    combinedKeywords,
    analysis,
    onboarding,
    educationLevel,
  });

  const locallyRanked = rankNCTResults(matches, {
    topK: Math.max(topK, 12),
    minConfidence: Math.min(minConfidence, 0.3),
    diversify: true,
    maxPerCluster: 2,
  });

  await mark("forming_recommendations");
  const ranked = await applyFinalRanking({
    locallyRanked,
    topK,
    minConfidence,
    analysis,
    onboarding,
    usedFallbacks,
  });

  const overallConfidence = calculateOverallConfidence(ranked);

  return {
    matches,
    ranked,
    overallConfidence,
    decisionContext: {
      categories: categories.map(({ id, name }) => ({ id, name })),
      keywords: combinedKeywords,
      onboarding: onboarding ?? null,
      overallConfidence,
      generatedAt: new Date().toISOString(),
      pipeline: {
        completedSteps,
        usedFallbacks,
        professions: analysis.professions,
        directions: analysis.directions,
        searchIntents: analysis.searchIntents,
      },
    },
  };
}

async function buildCandidatePool(args: {
  categories: { id: string; name: string; description?: string }[];
  topK: number;
  combinedKeywords: string[];
  analysis: {
    professions: string[];
    directions: string[];
    searchIntents: string[];
  };
  onboarding?: BuildRecommendationsInput["onboarding"];
  educationLevel: "after_9" | "after_11" | "";
}): Promise<NCTMatchResult[]> {
  const { categories, topK, combinedKeywords, analysis, onboarding, educationLevel } = args;

  const basePrefilter: PrefilterOptions | undefined = onboarding
    ? {
        categoryNames: categories.map((category) => category.name),
        educationLevel,
        studyCity: onboarding.studyCity,
        interests: combinedKeywords,
      }
    : undefined;

  const directMatches = await matchNCTByCluster(categories, {
    topK: topK * 4,
    minScore: 0.05,
    keywords: combinedKeywords,
    prefilter: basePrefilter,
  });

  const expandedKeywords = dedupeStrings([
    ...combinedKeywords,
    ...analysis.professions,
    ...analysis.directions,
    ...analysis.searchIntents,
  ]);

  const expandedMatches =
    directMatches.length >= topK
      ? []
      : await matchNCTByKeywords(expandedKeywords, {
          topK: topK * 5,
          minScore: 0.04,
          keywords: expandedKeywords,
          prefilter: {
            categoryNames: categories.map((category) => category.name),
            educationLevel,
            studyCity: undefined,
            interests: expandedKeywords,
            query: expandedKeywords.join(" "),
          },
        });

  return mergeMatches([...directMatches, ...expandedMatches], topK * 6);
}

async function applyFinalRanking(args: {
  locallyRanked: RankedNCT[];
  topK: number;
  minConfidence: number;
  analysis: {
    interests: string[];
    keywords: string[];
    professions: string[];
    directions: string[];
    searchIntents: string[];
  };
  onboarding?: BuildRecommendationsInput["onboarding"];
  usedFallbacks: string[];
}): Promise<RankedNCT[]> {
  const { locallyRanked, topK, minConfidence, analysis, onboarding, usedFallbacks } = args;
  const shortlist = locallyRanked.slice(0, Math.max(topK + 4, 10));

  try {
    const aiRanked = await finalizeRecommendationsWithAI(
      shortlist.map((item) => ({ ...item, candidateKey: toCandidateKey(item) })),
      { ...analysis, usedFallback: false, reasoning: "" },
      onboarding,
    );

    const aiMap = new Map(aiRanked.map((item, index) => [item.candidateKey, { ...item, index }]));

    const reranked = shortlist
      .map((item) => {
        const candidateKey = toCandidateKey(item);
        const ai = aiMap.get(candidateKey);
        const aiScore = ai?.fitScore ?? item.confidence;
        const orderBonus = ai ? Math.max(0, 0.08 - ai.index * 0.01) : 0;
        return {
          ...item,
          finalScore: Number(
            Math.min(1, item.finalScore * 0.72 + aiScore * 0.28 + orderBonus).toFixed(4),
          ),
          reasoning: ai?.whyItFits ?? item.reasoning,
          matchedInterests: ai?.matchedInterests ?? item.matchedKeywords.slice(0, 4),
          matchedCareers: ai?.matchedCareers ?? item.career_matches.slice(0, 4),
        };
      })
      .filter((item) => item.confidence >= minConfidence)
      .sort((left, right) => right.finalScore - left.finalScore)
      .slice(0, topK)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    if (reranked.length > 0) {
      return reranked;
    }
  } catch {
    usedFallbacks.push("final-ai-ranking");
  }

  return locallyRanked
    .filter((item) => item.confidence >= minConfidence)
    .slice(0, topK)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      matchedInterests: item.matchedKeywords.slice(0, 4),
      matchedCareers: item.career_matches.slice(0, 4),
    }));
}

function mergeMatches(matches: NCTMatchResult[], limit: number): NCTMatchResult[] {
  const merged = new Map<string, NCTMatchResult>();

  for (const match of matches) {
    const key = `${match.code}::${match.institution}::${match.city}`;
    const current = merged.get(key);

    if (!current || current.finalScore < match.finalScore) {
      merged.set(key, {
        ...match,
        matchedKeywords: dedupeStrings([
          ...(current?.matchedKeywords ?? []),
          ...match.matchedKeywords,
        ]),
        career_matches: dedupeStrings([
          ...(current?.career_matches ?? []),
          ...match.career_matches,
        ]),
      });
    }
  }

  return [...merged.values()]
    .sort((left, right) => right.finalScore - left.finalScore)
    .slice(0, limit);
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function toCandidateKey(item: Pick<RankedNCT, "code" | "institution" | "city">): string {
  return `${item.code}::${item.institution}::${item.city}`;
}
