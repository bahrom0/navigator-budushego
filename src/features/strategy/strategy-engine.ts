import { nctCodes } from "@/lib/ai/nct-match"
import type { StrategyOption, StrategyResult, StrategyType } from "@/types/strategy"

interface StrategyEngineInput {
  categories: string[]
  level?: string
  interviewResult?: { summary?: string; level?: string }
}

export function generateStrategy(input: StrategyEngineInput): StrategyResult {
  const { categories, level = "beginner", interviewResult } = input

  const clusterCodes = groupByCluster()
  const clusterScores = scoreClusters(clusterCodes)
  const userCluster = findUserCluster(categories)

  const sortedClusters = [...clusterScores.entries()]
    .sort((a, b) => b[1].popularity - a[1].popularity)

  const safeCodes = extractTopCodes(sortedClusters, 0.3, clusterCodes)
  const balancedCodes = extractTopCodes(sortedClusters, 0.5, clusterCodes)
  const ambitiousCodes = extractTopCodes(sortedClusters, 0.8, clusterCodes)

  const userLevel = interviewResult?.level ?? level

  const strategies: StrategyOption[] = [
    buildStrategy("safe", "Безопасная стратегия",
      "Маршрут с высокой вероятностью поступления. Рекомендуемые направления с низким конкурсом и большим количеством мест.",
      "Низкий", "Высокая", safeCodes, balancedCodes, userCluster),
    buildStrategy("balanced", "Сбалансированная стратегия",
      "Оптимальный маршрут, сочетающий надёжные варианты и перспективные направления. Подходит большинству абитуриентов.",
      "Средний", "Средняя", balancedCodes, safeCodes, userCluster),
    buildStrategy("ambitious", "Амбициозная стратегия",
      "Максимальные цели. Направления с высоким конкурсом и престижем. Требует высокой подготовки.",
      "Высокий", "Низкая", ambitiousCodes, balancedCodes, userCluster),
  ]

  return {
    strategies,
    userLevel,
    userInterests: categories,
  }
}

function groupByCluster(): Map<number, typeof nctCodes> {
  const map = new Map<number, typeof nctCodes>()
  for (const code of nctCodes) {
    const cluster = code.cluster
    if (!map.has(cluster)) map.set(cluster, [])
    map.get(cluster)!.push(code)
  }
  return map
}

function scoreClusters(clusters: Map<number, typeof nctCodes>): Map<number, { popularity: number; avgConfidence: number }> {
  const scores = new Map<number, { popularity: number; avgConfidence: number }>()
  const maxCount = Math.max(...Array.from(clusters.values()).map((c) => c.length), 1)

  for (const [id, codes] of clusters) {
    const popularity = codes.length / maxCount
    const avgConfidence = codes.reduce((s, c) => s + c.confidence, 0) / codes.length
    scores.set(id, { popularity, avgConfidence })
  }
  return scores
}

function findUserCluster(categories: string[]): number | null {
  const clusterMapping: Record<string, number> = {
    "информационные технологии": 1, "it": 1, "инженерия": 1, "технические": 1,
    "экономика": 2, "бизнес": 2, "менеджмент": 2, "управление": 2,
    "педагогика": 3, "образование": 3, "преподавание": 3,
    "медицина": 4, "здравоохранение": 4, "фармация": 4,
    "искусство": 5, "дизайн": 5, "творчество": 5,
    "право": 6, "юриспруденция": 6,
    "гуманитарные": 7, "лингвистика": 7, "языки": 7,
    "психология": 7, "архитектура": 1, "маркетинг": 2, "строительство": 1,
    "энергетика": 1, "аграрные": 1, "агрономия": 1,
  }

  const joined = categories.join(" ").toLowerCase()
  for (const [key, cluster] of Object.entries(clusterMapping)) {
    if (joined.includes(key)) return cluster
  }
  return null
}

function extractTopCodes(
  sortedClusters: [number, { popularity: number; avgConfidence: number }][],
  threshold: number,
  allCodes: Map<number, typeof nctCodes>,
): { code: string; title: string; cluster: string; institution: string }[] {
  const selectedClusters = sortedClusters.filter(([, s]) => s.popularity <= threshold)
  if (selectedClusters.length === 0) {
    const mid = sortedClusters[Math.min(Math.floor(sortedClusters.length / 2), sortedClusters.length - 1)]
    return takeFromCluster(mid[0], allCodes, 4)
  }

  const result: { code: string; title: string; cluster: string; institution: string }[] = []
  const perCluster = Math.max(1, Math.floor(4 / selectedClusters.length))

  for (const [id] of selectedClusters) {
    const taken = takeFromCluster(id, allCodes, perCluster)
    result.push(...taken)
  }

  return result.slice(0, 6)
}

function takeFromCluster(
  clusterId: number,
  allCodes: Map<number, typeof nctCodes>,
  count: number,
): { code: string; title: string; cluster: string; institution: string }[] {
  const codes = allCodes.get(clusterId) ?? []
  const clusterName = codes.length > 0 ? codes[0].cluster_name_ru : `Кластер ${clusterId}`

  return codes
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, count)
    .map((c) => ({
      code: c.code,
      title: c.title_ru,
      cluster: clusterName,
      institution: c.institution,
    }))
}

function buildStrategy(
  type: StrategyType,
  title: string,
  description: string,
  risk: string,
  successProbability: string,
  recommended: { code: string; title: string; cluster: string; institution: string }[],
  fallback: { code: string; title: string; cluster: string; institution: string }[],
  userCluster: number | null,
): StrategyOption {
  const recommendedCodes = recommended.length > 0
    ? recommended
    : fallback.slice(0, 3)

  const fallbackCodes = userCluster
    ? takeFromCluster(userCluster, groupByCluster(), 3)
    : fallback.slice(0, 3)

  return {
    type,
    title,
    description,
    risk,
    successProbability,
    recommendedCodes: recommendedCodes.slice(0, 4),
    fallbackCodes: fallbackCodes.slice(0, 3),
  }
}
