import { z } from "zod"

export const RecommendationsRequestSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    }),
  ),
  keywords: z.array(z.string()).optional(),
  topK: z.coerce.number().int().min(1).max(20).default(8),
  minConfidence: z.coerce.number().min(0).max(1).default(0.5),
})

export type RecommendationsRequest = z.infer<
  typeof RecommendationsRequestSchema
>

export const RecommendationsResponseSchema = z.object({
  status: z.enum(["success", "error"]),
  data: z.object({
    matches: z.array(
      z.object({
        code: z.string(),
        title_ru: z.string(),
        institution: z.string(),
        city: z.string(),
        confidence: z.number(),
        career_matches: z.array(z.string()),
        matchScore: z.number(),
        matchedKeywords: z.array(z.string()),
        finalScore: z.number(),
      }),
    ),
    ranked: z.array(
      z.object({
        code: z.string(),
        title_ru: z.string(),
        institution: z.string(),
        city: z.string(),
        confidence: z.number(),
        career_matches: z.array(z.string()),
        matchScore: z.number(),
        matchedKeywords: z.array(z.string()),
        rank: z.number(),
        finalScore: z.number(),
        reasoning: z.string(),
      }),
    ),
    overallConfidence: z.number(),
  }),
  error: z.string().optional(),
})

export type RecommendationsResponse = z.infer<
  typeof RecommendationsResponseSchema
>
