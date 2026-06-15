const PREFIX = "nct-nav:v1:"

function storageKey(key: string): string {
  return `${PREFIX}${key}`
}

export function cacheGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(storageKey(key))
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function cacheSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(value))
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

export function cacheRemove(key: string): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(storageKey(key))
}

export function clearAllCache(): void {
  if (typeof window === "undefined") return
  const keys: string[] = []
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const k = window.sessionStorage.key(i)
    if (k?.startsWith(PREFIX)) keys.push(k)
  }
  keys.forEach((k) => window.sessionStorage.removeItem(k))
}
