import { nctCodes } from "@/lib/ai/nct-match"
import type { RouteSimulation } from "@/types/strategy"

interface RouteInput {
  categories: string[]
  topCodes: { code: string; title: string; institution: string }[]
}

export function simulateRoute(input: RouteInput): RouteSimulation {
  const { categories, topCodes } = input

  const clusterMapping: Record<string, number> = {
    "информационные технологии": 1, "it": 1, "инженерия": 1,
    "экономика": 2, "бизнес": 2, "менеджмент": 2,
    "педагогика": 3, "образование": 3,
    "медицина": 4, "здравоохранение": 4,
    "искусство": 5, "дизайн": 5,
    "право": 6, "юриспруденция": 6,
    "гуманитарные": 7, "лингвистика": 7, "языки": 7,
  }

  const joined = categories.join(" ").toLowerCase()
  let primaryClusterId: number | null = null
  for (const [key, cluster] of Object.entries(clusterMapping)) {
    if (joined.includes(key)) {
      primaryClusterId = cluster
      break
    }
  }

  const clusters = new Map<number, typeof nctCodes>()
  for (const c of nctCodes) {
    if (!clusters.has(c.cluster)) clusters.set(c.cluster, [])
    clusters.get(c.cluster)!.push(c)
  }

  const primaryCluster = primaryClusterId ? clusters.get(primaryClusterId) ?? [] : []
  const primaryClusterName = primaryCluster.length > 0 ? primaryCluster[0].cluster_name_ru : ""

  const allClusterIds = Array.from(clusters.keys()).filter((id) => id !== primaryClusterId)
  const backupClusterId = allClusterIds.length > 0
    ? allClusterIds.reduce((best, id) => {
        const codes = clusters.get(id)!
        return codes.length > (clusters.get(best)?.length ?? 0) ? id : best
      })
    : null

  const backupCluster = backupClusterId ? clusters.get(backupClusterId) ?? [] : []
  const backupClusterName = backupCluster.length > 0 ? backupCluster[0].cluster_name_ru : ""

  const primaryCodes = primaryCluster
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4)
    .map((c) => ({
      code: c.code,
      title: c.title_ru,
      reason: topCodes.some((t) => t.code === c.code)
        ? "Совпадает с вашими интересами"
        : "Надёжный вариант в выбранном кластере",
    }))

  const backupCodes = backupCluster
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
    .map((c) => ({
      code: c.code,
      title: c.title_ru,
      reason: "Запасной вариант с хорошими шансами поступления",
    }))

  const tips = buildPreparationTips(primaryClusterId, backupClusterId)

  const reasoning = primaryClusterId
    ? `Ваш основной маршрут — кластер "${primaryClusterName}". Это направление наиболее соответствует вашим интересам и имеет ${primaryCodes.length} рекомендованных специальностей. В качестве запасного варианта рекомендуется кластер "${backupClusterName}".`
    : "На основе ваших интересов мы подобрали оптимальные маршруты поступления."

  return {
    primaryCluster: primaryClusterId ? { id: primaryClusterId, name: primaryClusterName } : null,
    primaryCodes,
    backupCluster: backupClusterId ? { id: backupClusterId, name: backupClusterName } : null,
    backupCodes,
    preparationTips: tips,
    reasoning,
  }
}

function buildPreparationTips(primaryClusterId: number | null, backupClusterId: number | null): string[] {
  const tips: string[] = [
    "Начните подготовку к вступительным экзаменам заранее",
    "Изучите требования выбранных вузов к абитуриентам",
  ]

  if (primaryClusterId === 4) {
    tips.push("Обратите внимание на профильные предметы: биология, химия")
  } else if (primaryClusterId === 1) {
    tips.push("Уделите внимание математике и физике — ключевые предметы для инженерных направлений")
  }

  if (backupClusterId) {
    tips.push(`Рассмотрите запасной кластер как дополнительный вариант подачи документов`)
  }

  tips.push("Проверьте сроки подачи документов в выбранные вузы")
  tips.push("Подготовьте пакет необходимых документов заранее")

  return tips
}
