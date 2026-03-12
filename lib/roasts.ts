import { promises as fs } from "fs"
import path from "path"

export type ScoreBreakdown = {
  hero_clarity: number
  cta_strength: number
  trust_signals: number
  copywriting: number
  design_hierarchy: number
  friction: number
}

export type ConversionFix = {
  title: string
  problem: string
  solution: string
  expected_conversion_impact: string
}

export type CategoryScore = {
  score: number
  reason: string
}

export type RoastAnalysis = {
  conversion_score: number
  score_breakdown: ScoreBreakdown
  missing_conversion_elements: string[]
  weak_elements: string[]
  strong_elements: string[]
  key_insights: string[]
  top_fixes?: string[]
  headline_feedback: string
  cta_feedback: string
  trust_feedback: string
  copy_feedback: string
  messaging_feedback: string
  design_feedback: string
  improvements: string[]
  conversion_fixes: ConversionFix[]
  improved_headlines: string[]
  improved_ctas: string[]
  rewritten_hero_paragraph: string
  roast: string
  structured_scores?: {
    clarity: CategoryScore
    value_proposition: CategoryScore
    cta_strength: CategoryScore
    trust_signals: CategoryScore
    visual_hierarchy: CategoryScore
    friction: CategoryScore
  }
  structured_rewrites?: {
    headline: string
    hero: string
    cta: string
    value_prop: string
  }
}

export type CtaType = "primary" | "secondary" | "navigation"

export type RoastCta = {
  cta: string
  type: CtaType
}

export type StoredRoast = {
  slug: string
  url: string
  title: string
  headline: string
  ctas: RoastCta[]
  analysis: RoastAnalysis
  createdAt: string
}

const ROASTS_DIR = path.join(process.cwd(), "data", "roasts")
const CACHE_INDEX_FILE = path.join(process.cwd(), "data", "roast-cache.json")

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "landing-page"
}

export async function ensureRoastsDir() {
  await fs.mkdir(ROASTS_DIR, { recursive: true })
}

async function ensureDataDir() {
  await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true })
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url.trim())
    const pathname = parsed.pathname.replace(/\/+$/, "") || "/"
    const search = parsed.search
    return `${parsed.protocol}//${parsed.host}${pathname}${search}`.toLowerCase()
  } catch {
    return url.trim().toLowerCase()
  }
}

export function generateRoastSlug(url: string) {
  const base = slugify(url)
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `${base}-${suffix}`
}

export async function saveRoast(roast: StoredRoast) {
  await ensureRoastsDir()
  const filePath = path.join(ROASTS_DIR, `${roast.slug}.json`)
  await fs.writeFile(filePath, JSON.stringify(roast, null, 2), "utf8")
}

async function readCacheIndex() {
  try {
    const content = await fs.readFile(CACHE_INDEX_FILE, "utf8")
    return JSON.parse(content) as Record<string, string>
  } catch {
    return {}
  }
}

export async function setCachedRoast(url: string, slug: string) {
  await ensureDataDir()
  const index = await readCacheIndex()
  index[normalizeUrl(url)] = slug
  await fs.writeFile(CACHE_INDEX_FILE, JSON.stringify(index, null, 2), "utf8")
}

export async function getCachedRoastByUrl(url: string) {
  const index = await readCacheIndex()
  const slug = index[normalizeUrl(url)]

  if (!slug) {
    return null
  }

  return getRoast(slug)
}

export async function getRoast(slug: string) {
  try {
    const filePath = path.join(ROASTS_DIR, `${slug}.json`)
    const content = await fs.readFile(filePath, "utf8")
    return JSON.parse(content) as StoredRoast
  } catch {
    return null
  }
}
