export interface DiagnosticApiQuestion {
  id: string
  subject: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  difficulty: "easy" | "medium" | "hard"
}

export interface DiagnosticAnswer {
  questionId: string
  selectedIndex: number | null
  isCorrect: boolean
  skipped: boolean
}

export interface DiagnosticResult {
  questions: DiagnosticApiQuestion[]
  answers: DiagnosticAnswer[]
  correctCount: number
  totalCount: number
}
