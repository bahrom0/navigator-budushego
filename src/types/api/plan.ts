import { z } from "zod"
import type { SkillLevel } from "@/types/plan"

export const SkillLevelSchema = z.enum(["beginner", "intermediate", "advanced"])

export const GeneratePlanSchema = z.object({
  nctCode: z.string(),
  nctTitle: z.string(),
  userInterests: z.array(z.string()).optional(),
  assessment: z
    .object({
      level: SkillLevelSchema,
      skills: z.array(z.string()),
      strengths: z.array(z.string()),
      gaps: z.array(z.string()),
    })
    .optional(),
  previousAnswers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional(),
})

export type GeneratePlanRequest = z.infer<typeof GeneratePlanSchema>

export const PlanStageSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  skills: z.array(z.string()),
  recommendations: z.array(z.string()),
})

export const DevelopmentPlanSchema = z.object({
  nctCode: z.string(),
  nctTitle: z.string(),
  level: SkillLevelSchema,
  goals: z.array(z.object({ title: z.string(), description: z.string() })),
  stages: z.array(PlanStageSchema),
})

export type DevelopmentPlan = z.infer<typeof DevelopmentPlanSchema>

export type GeneratePlanResponse = {
  status: "success" | "error"
  data?: DevelopmentPlan
  error?: string
}

export const SavePlanSchema = z.object({
  nctCode: z.string(),
  nctTitle: z.string(),
  level: SkillLevelSchema,
  goals: z.array(z.object({ title: z.string(), description: z.string() })),
  stages: z.array(PlanStageSchema),
  sessionId: z.string().optional(),
})

export type SavePlanRequest = z.infer<typeof SavePlanSchema>

export type SavePlanResponse = {
  status: "success" | "error"
  data?: { id: string }
  error?: string
}
