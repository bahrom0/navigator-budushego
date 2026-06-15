import { create } from "zustand"
import type { InterviewState, InterviewAnswer, InterviewQuestion } from "@/types/interview"

interface InterviewStore extends InterviewState {
  setNctContext: (code: string, title: string) => void
  setLoading: () => void
  setActive: (questions: InterviewQuestion[]) => void
  setCompleted: (summary: string) => void
  setError: (error: string) => void
  nextQuestion: () => void
  addAnswer: (answer: InterviewAnswer) => void
  reset: () => void
}

const INITIAL_STATE: InterviewState = {
  nctCode: "",
  nctTitle: "",
  currentStep: "loading",
  currentQuestionIndex: 0,
  questions: [],
  answers: [],
  error: null,
  isLoading: false,
}

export const useInterviewStore = create<InterviewStore>((set, get) => ({
  ...INITIAL_STATE,

  setNctContext: (code, title) =>
    set({ nctCode: code, nctTitle: title }),

  setLoading: () =>
    set({ currentStep: "loading", error: null, isLoading: true }),

  setActive: (questions) =>
    set({ questions, currentStep: "active", currentQuestionIndex: 0, answers: [], error: null, isLoading: false }),

  setCompleted: (summary) =>
    set({ currentStep: "completed", error: null, isLoading: false }),

  setError: (error) =>
    set({ error, isLoading: false }),

  nextQuestion: () =>
    set((state) => ({
      currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1),
    })),

  addAnswer: (answer) =>
    set((state) => ({
      answers: [...state.answers, answer],
    })),

  reset: () => set(INITIAL_STATE),
}))
