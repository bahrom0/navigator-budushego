import { Briefcase, GraduationCap, School, User, Users } from "lucide-react"

export type OnboardingStep = "location" | "profile"

export const ONBOARDING_STEPS: OnboardingStep[] = ["location", "profile"]

export type EducationLevel = "after_9" | "after_11" | "applicant" | ""
export type WorkingGoal = "second_education" | "for_interest" | ""

export interface OnboardingData {
  userCity: string
  studyCity: string
  userType: string
  educationLevel: EducationLevel
  workingGoal: WorkingGoal
  interests: string[]
}

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  userCity: "",
  studyCity: "",
  userType: "",
  educationLevel: "",
  workingGoal: "",
  interests: [],
}

export const CITIES = [
  "Душанбе",
  "Худжанд",
  "Бохтар",
  "Куляб",
  "Турсунзаде",
  "Истаравшан",
  "Канибадам",
  "Пенджикент",
  "Исфара",
  "Вахдат",
  "Гиссар",
  "Нурек",
  "Дангара",
  "Хорог",
  "Рогун",
] as const

export const STUDY_REGIONS = [
  "Душанбе",
  "Худжанд",
  "Бохтар",
  "Куляб",
  "Турсунзаде",
  "Истаравшан",
  "Канибадам",
  "Пенджикент",
  "Исфара",
  "Вахдат",
  "Гиссар",
  "Нурек",
  "Дангара",
  "Хорог",
  "Рогун",
] as const

export const USER_TYPES = [
  { id: "schoolboy", label: "Школьник", icon: School },
  { id: "applicant", label: "Абитуриент", icon: GraduationCap },
  { id: "student", label: "Студент", icon: Users },
  { id: "working", label: "Работающий", icon: Briefcase },
  { id: "other", label: "Другое", icon: User },
] as const
