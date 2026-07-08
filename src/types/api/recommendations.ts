import { z } from "zod"

const OnboardingSchema = z.object({
  userCity: z.string().optional(),
  studyCity: z.string().optional(),
  userType: z.string().optional(),
  educationLevel: z.enum(["after_9", "after_11", "applicant", ""]).optional(),
  interests: z.array(z.string()).optional(),
})

export const RecommendationsRequestSchema = z.object({
  categories: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().optional(),
    }),
  ),
  keywords: z.array(z.string()).optional(),
  topK: z.coerce.number().int().min(1).max(20).default(8),
  minConfidence: z.coerce.number().min(0).max(1).default(0.5),
  onboarding: OnboardingSchema.optional(),
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
        cluster: z.number().optional(),
        cluster_name_ru: z.string().optional(),
        study_form: z.array(z.string()).optional(),
        study_type: z.array(z.string()).optional(),
        taxonomyPath: z.array(z.string()).optional(),
        matchedTaxonomyNodeIds: z.array(z.string()).optional(),
        primaryTaxonomyNodeId: z.string().optional(),
        rootTaxonomyNodeIds: z.array(z.string()).optional(),
        branchKey: z.string().optional(),
        lexicalScore: z.number().optional(),
        semanticScore: z.number().optional(),
        taxonomyScore: z.number().optional(),
        facetScore: z.number().optional(),
        qualityScore: z.number().optional(),
        searchIntent: z
          .enum(["broad", "narrow", "facet", "code", "comparison"])
          .optional(),
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
        cluster: z.number().optional(),
        cluster_name_ru: z.string().optional(),
        study_form: z.array(z.string()).optional(),
        study_type: z.array(z.string()).optional(),
        taxonomyPath: z.array(z.string()).optional(),
        matchedTaxonomyNodeIds: z.array(z.string()).optional(),
        primaryTaxonomyNodeId: z.string().optional(),
        rootTaxonomyNodeIds: z.array(z.string()).optional(),
        branchKey: z.string().optional(),
        lexicalScore: z.number().optional(),
        semanticScore: z.number().optional(),
        taxonomyScore: z.number().optional(),
        facetScore: z.number().optional(),
        qualityScore: z.number().optional(),
        searchIntent: z
          .enum(["broad", "narrow", "facet", "code", "comparison"])
          .optional(),
        matchedInterests: z.array(z.string()).optional(),
        matchedCareers: z.array(z.string()).optional(),
      }),
    ),
    overallConfidence: z.number(),
    decisionContext: z.object({
      categories: z.array(z.object({ id: z.string(), name: z.string() })),
      keywords: z.array(z.string()),
      onboarding: OnboardingSchema.nullable(),
      overallConfidence: z.number(),
      generatedAt: z.string(),
      pipeline: z.object({
        completedSteps: z.array(
          z.enum([
            "submitting_request",
            "analyzing_interests",
            "searching_nct_codes",
            "forming_recommendations",
          ]),
        ),
        usedFallbacks: z.array(z.string()),
        professions: z.array(z.string()),
        directions: z.array(z.string()),
        searchIntents: z.array(z.string()),
      }),
    }),
  }),
  error: z.string().optional(),
})

export type RecommendationsResponse = z.infer<
  typeof RecommendationsResponseSchema
>
