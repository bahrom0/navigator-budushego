import { z } from "zod"

export const InterviewStartSchema = z.object({
  nctCode: z.string(),
  nctTitle: z.string(),
  userInterests: z.array(z.string()).optional(),
})

export type InterviewStartRequest = z.infer<typeof InterviewStartSchema>
export type InterviewStartResponse = {
  status: "success" | "error"
  data?: {
    questions: {
      id: string
      question: string
      type: "choice" | "text"
      options?: string[]
    }[]
  }
  error?: string
}

export const InterviewAnswerSchema = z.object({
  nctCode: z.string(),
  question: z.string(),
  answer: z.string(),
  questionIndex: z.number().int().nonnegative(),
  nctTitle: z.string().optional(),
  previousAnswers: z.array(z.object({ questionId: z.string(), question: z.string(), answer: z.string() })),
})

export type InterviewAnswerRequest = z.infer<typeof InterviewAnswerSchema>
export type InterviewAnswerResponse = {
  status: "success" | "error"
  data?: {
    nextQuestion: {
      id: string
      question: string
      type: "choice" | "text"
      options?: string[]
    } | null
    isComplete: boolean
    summary?: string
  }
  error?: string
}
