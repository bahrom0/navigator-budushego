export interface InterviewAnswer {
  questionId: string
  question: string
  answer: string
  timestamp: number
}

export interface InterviewState {
  nctCode: string
  nctTitle: string
  currentStep: "loading" | "active" | "completed"
  currentQuestionIndex: number
  questions: InterviewQuestion[]
  answers: InterviewAnswer[]
  error: string | null
  isLoading: boolean
}

export interface InterviewQuestion {
  id: string
  question: string
  type: "choice" | "text"
  options?: string[]
}
