import { z } from "zod"

export const ExplainRequestSchema = z.object({
  code: z.string(),
  title_ru: z.string(),
  career_matches: z.array(z.string()),
  userInterests: z.array(z.string()),
  selectedCategories: z.array(z.string()),
})

export type ExplainRequest = z.infer<typeof ExplainRequestSchema>

export const ExplanationSchema = z.object({
  whyItFits: z.string(),
  matchedInterests: z.array(z.string()),
  matchedCareers: z.array(z.string()),
  similarCodes: z.array(
    z.object({
      code: z.string(),
      title_ru: z.string(),
      reason: z.string(),
    }),
  ),
})

export type Explanation = z.infer<typeof ExplanationSchema>

export const ExplainResponseSchema = z.object({
  status: z.enum(["success", "error"]),
  data: z.object({
    explanation: ExplanationSchema,
  }),
  error: z.string().optional(),
})

export type ExplainResponse = z.infer<typeof ExplainResponseSchema>
