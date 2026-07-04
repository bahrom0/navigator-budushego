const TOKEN_RE = /[a-zа-я0-9]+/g
const MULTISPACE_RE = /\s+/g
const CODE_RE = /^(?:\d{6,}|[a-z]?\d{6,}|\d{2}(?:\.\d{2}){1,2})$/i

const STOP_WORDS = new Set([
  "и",
  "или",
  "в",
  "во",
  "на",
  "по",
  "для",
  "с",
  "со",
  "к",
  "от",
  "из",
  "при",
  "под",
  "над",
  "об",
  "о",
  "а",
  "но",
  "the",
  "of",
  "and",
  "for",
  "to",
  "in",
])

const TOKEN_ALIASES: Record<string, string> = {
  ai: "информатика",
  ml: "информатика",
  data: "данные",
  science: "наука",
  software: "программирование",
  developer: "программирование",
  development: "программирование",
  medicine: "медицина",
  medical: "медицина",
  health: "медицина",
  healthcare: "медицина",
  doctor: "медицина",
  clinic: "медицина",
  dentistry: "стоматология",
  dental: "стоматология",
  pharmacy: "фармация",
  pharmacist: "фармация",
  biology: "биология",
  veterinary: "ветеринария",
  business: "бизнес",
  finance: "финансы",
  accounting: "бухгалтерия",
  management: "менеджмент",
  marketing: "маркетинг",
  design: "дизайн",
  art: "искусство",
  law: "право",
  legal: "право",
  teacher: "педагогика",
  education: "образование",
  psychology: "психология",
  engineering: "инженерия",
  construction: "строительство",
  architecture: "архитектура",
  energy: "энергетика",
  agriculture: "агрономия",
  agronomy: "агрономия",
  translation: "лингвистика",
  language: "лингвистика",
  journalism: "журналистика",
}

export function normalizeText(value: string): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/['"’"«»„“”]/g, " ")
    .replace(/[^a-zа-я0-9.\s-]+/gi, " ")
    .replace(/[-/]+/g, " ")
    .replace(MULTISPACE_RE, " ")
    .trim()
}

export function tokenize(value: string): string[] {
  const normalized = normalizeText(value)
  const tokens = normalized.match(TOKEN_RE) ?? []
  const result: string[] = []

  for (const token of tokens) {
    const canonical = canonicalizeToken(token)
    if (canonical.length > 1 && !STOP_WORDS.has(canonical)) {
      result.push(canonical)
    }
  }

  return result
}

export function canonicalizeToken(token: string): string {
  const normalized = normalizeText(token)
  if (!normalized) return ""

  if (TOKEN_ALIASES[normalized]) return TOKEN_ALIASES[normalized]
  return normalized
}

export function uniqueTokens(tokens: string[]): string[] {
  return [...new Set(tokens.filter(Boolean))]
}

export function extractPhrases(value: string): string[] {
  const normalized = normalizeText(value)
  if (!normalized) return []

  const phrases = new Set<string>()
  const segments = normalized
    .split(/[,.!?;:()]+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 2)

  for (const segment of segments) {
    phrases.add(segment)
    const parts = tokenize(segment)
    if (parts.length >= 2) {
      phrases.add(parts.slice(0, 2).join(" "))
    }
    if (parts.length >= 3) {
      phrases.add(parts.slice(0, 3).join(" "))
    }
  }

  return [...phrases]
}

export function buildTokenNGrams(tokens: string[], sizes: number[] = [2, 3]): string[] {
  const grams = new Set<string>()

  for (const size of sizes) {
    if (size < 2 || tokens.length < size) continue

    for (let index = 0; index <= tokens.length - size; index += 1) {
      grams.add(tokens.slice(index, index + size).join(" "))
    }
  }

  return [...grams]
}

export function normalizeCity(city: string): string {
  return normalizeText(city).replace(/^город\s+/, "").trim()
}

export function isCodeQuery(value: string): boolean {
  const normalized = normalizeText(value).replace(/\s+/g, "")
  return CODE_RE.test(normalized)
}
