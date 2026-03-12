import type { AnalysisResponse } from "./analyzeLanding"
import type { RoastCta, RoastAnalysis } from "./roasts"

type StoredLocalRoast = {
  id: string
  url: string
  title?: string
  headline?: string
  ctas?: RoastCta[]
  analysis: RoastAnalysis
  createdAt: string
}

const STORAGE_KEY = "landingroast-shared-roasts-v1"

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

function readStore() {
  if (!canUseStorage()) return {} as Record<string, StoredLocalRoast>

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, StoredLocalRoast>) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, StoredLocalRoast>) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function generateRoastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function saveLocalRoastFromAnalysis(result: AnalysisResponse, url: string) {
  if (!result.analysis || !canUseStorage()) return null

  const id = generateRoastId()
  const store = readStore()

  store[id] = {
    id,
    url,
    title: result.title,
    headline: result.headline,
    ctas: result.ctas,
    analysis: result.analysis,
    createdAt: new Date().toISOString(),
  }

  writeStore(store)
  return id
}

export function getLocalRoastById(id: string) {
  const store = readStore()
  return store[id] ?? null
}
