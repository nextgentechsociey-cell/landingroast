export const DAILY_ANALYSIS_LIMIT = 3

const STORAGE_KEY = "landingroast-usage"

type UsageRecord = {
  date: string
  count: number
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

function isDevelopmentHost() {
  if (typeof window === "undefined") {
    return false
  }

  const host = window.location.hostname.toLowerCase()
  return host === "localhost" || host === "127.0.0.1" || host === "::1"
}

function readUsage(): UsageRecord {
  if (typeof window === "undefined") {
    return { date: getToday(), count: 0 }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { date: getToday(), count: 0 }
    }

    const parsed = JSON.parse(raw) as Partial<UsageRecord>
    if (parsed.date !== getToday()) {
      return { date: getToday(), count: 0 }
    }

    return {
      date: getToday(),
      count: typeof parsed.count === "number" ? parsed.count : 0,
    }
  } catch {
    return { date: getToday(), count: 0 }
  }
}

function writeUsage(record: UsageRecord) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
}

export function getRemainingAnalyses() {
  if (isDevelopmentHost()) {
    return Number.POSITIVE_INFINITY
  }

  const usage = readUsage()
  return Math.max(0, DAILY_ANALYSIS_LIMIT - usage.count)
}

export function canRunAnalysis() {
  return getRemainingAnalyses() > 0
}

export function consumeAnalysis() {
  if (isDevelopmentHost()) {
    return Number.POSITIVE_INFINITY
  }

  const usage = readUsage()
  const nextRecord = {
    date: getToday(),
    count: Math.min(DAILY_ANALYSIS_LIMIT, usage.count + 1),
  }

  writeUsage(nextRecord)
  return Math.max(0, DAILY_ANALYSIS_LIMIT - nextRecord.count)
}

export function refundAnalysis() {
  if (isDevelopmentHost()) {
    return Number.POSITIVE_INFINITY
  }

  const usage = readUsage()
  const nextRecord = {
    date: getToday(),
    count: Math.max(0, usage.count - 1),
  }

  writeUsage(nextRecord)
  return Math.max(0, DAILY_ANALYSIS_LIMIT - nextRecord.count)
}
