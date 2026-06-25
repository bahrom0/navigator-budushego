export interface NewDbRecord {
  code: string
  specialty_name: string
  university_name: string
  location: string
  education_form: string
  education_type: string
  tuition_fee: string
  language: string
  admission_plan: number
  cluster: number
  education_level: "after_9" | "after_11"
  source_document: string
  source_page: number
}

export interface NewDbDatabase {
  records: NewDbRecord[]
}

export interface PrefilterParams {
  educationLevel?: "after_9" | "after_11" | ""
  studyCity?: string
  clusters?: number[]
  interests?: string[]
  query?: string
}

export const EDUCATION_LEVEL_LABELS: Record<string, string> = {
  after_9: "После 9 класса",
  after_11: "После 11 класса",
}

export const CLUSTER_NAMES: Record<number, string> = {
  1: "IT и технологии",
  2: "Медицина и здравоохранение",
  3: "Экономика и бизнес",
  4: "Педагогика и образование",
  5: "Право и юриспруденция",
  6: "Сельское хозяйство",
  7: "Строительство и архитектура",
  8: "Транспорт и логистика",
  9: "Искусство и дизайн",
  10: "Другое",
}

export const CLUSTER_EXAMS: Record<number, string[]> = {
  1: ["Математика", "Физика", "Информатика"],
  2: ["Биология", "Химия", "Физика"],
  3: ["Математика", "География", "Английский язык"],
  4: ["Родной язык", "Математика", "История"],
  5: ["История", "Обществознание", "Родной язык"],
  6: ["Биология", "Химия", "География"],
  7: ["Математика", "Физика", "Черчение"],
  8: ["Математика", "Физика", "География"],
  9: ["Творческий экзамен", "История искусства", "Родной язык"],
  10: ["Математика", "Родной язык", "Обществознание"],
}
