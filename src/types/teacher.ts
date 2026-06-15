import { z } from "zod"

export type MessageStatus = "sending" | "sent" | "failed"

export interface TeacherMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  type?: "text" | "reminder" | "quiz" | "progress"
  status?: MessageStatus
}

export interface TeacherQuiz {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export const TeacherChatRequestSchema = z.object({
  message: z.string().min(1, "Сообщение не может быть пустым"),
})

export type TeacherChatRequest = z.infer<typeof TeacherChatRequestSchema>

export const TeacherChatResponseSchema = z.object({
  reply: z.string(),
  type: z.enum(["text", "reminder", "quiz", "progress"]).optional(),
})

export type TeacherChatResponse = z.infer<typeof TeacherChatResponseSchema>

export type TeacherChatApiResponse = {
  status: "success" | "error"
  data?: TeacherChatResponse
  error?: string
}
