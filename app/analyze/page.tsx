"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import type { AnalysisResponse } from "@/lib/analyzeLanding"
import type { RoastAnalysis } from "@/lib/roasts"
import UrlInput from "@/components/UrlInput"

function displayUrl(url: string) {
  try {
    const { hostname, pathname } = new URL(url)
    const path = pathname === "/" ? "" : pathname.length > 24 ? `${pathname.slice(0, 24)}…` : pathname
    return `${hostname}${path}`
  } catch {
    return url.slice(0, 36)
  }
}

function gradeInfo(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "#22c55e" }
  if (score >= 65) return { label: "Good", color: "#84cc16" }
  if (score >= 50) return { label: "Fair", color: "#eab308" }
  if (score >= 35) return { label: "Needs Work", color: "#f97316" }
  return { label: "Poor", color: "#ef4444" }
}

function valueColor(v: number) {
  if (v > 60) return "text-emerald-400"
  if (v >= 40) return "text-blue-300"
  return "text-red-400"
}

function breakdownStatus(v: number): { label: "Good" | "Needs Improvement" | "Needs Attention"; barClass: string; textClass: string } {
  if (v > 60) {
    return { label: "Good", barClass: "bg-green-500", textClass: "text-green-400" }
  }
  if (v >= 40) {
    return { label: "Needs Improvement", barClass: "bg-blue-500", textClass: "text-blue-300" }
  }
  return { label: "Needs Attention", barClass: "bg-red-500", textClass: "text-red-400" }
}

function metricIssueLabel(metric: keyof RoastAnalysis["score_breakdown"]) {
  if (metric === "cta_strength") return "weak CTA clarity"
  if (metric === "trust_signals") return "missing trust signals"
  if (metric === "hero_clarity") return "unclear value proposition"
  if (metric === "design_hierarchy") return "confusing visual hierarchy"
  if (metric === "copywriting") return "ineffective copywriting"
  return "high conversion friction"
}

function buildConversionSummary(analysis: RoastAnalysis) {
  const entries = Object.entries(analysis.score_breakdown) as Array<[keyof RoastAnalysis["score_breakdown"], number]>
  const weakest = entries
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([key]) => metricIssueLabel(key))

  return `Your landing page is likely losing conversions due to ${weakest.join(", ")}.`
}

function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let frameId = 0
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.round(target * progress))
      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [target, duration])

  return value
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
      {children}
    </section>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-white tracking-tight">{children}</h2>
}

function SeverityBadge({ level }: { level: "High" | "Medium" | "Low" }) {
  const classes =
    level === "High"
      ? "border-red-500/40 bg-red-500/10 text-red-300"
      : level === "Medium"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${classes}`}>
      {level}
    </span>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-5 py-4">
      <p className="text-sm text-red-400">{message}</p>
    </div>
  )
}

function UrlInputPanel({
  value,
  onChange,
  onSubmit,
  loading,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  loading: boolean
}) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-white">Analyze a landing page</h2>
      <p className="text-sm text-slate-400">Paste a URL to generate your report.</p>
      <UrlInput value={value} onChange={onChange} onSubmit={onSubmit} variant="dark" disabled={loading} />
    </Card>
  )
}

const ANALYSIS_STEPS = [
  "Analyzing headline clarity...",
  "Checking call-to-action strength...",
  "Scanning trust signals...",
  "Evaluating design hierarchy...",
  "Calculating conversion score...",
  "Generating recommendations...",
]

function LoadingState({ url }: { url: string }) {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex((current) => Math.min(current + 1, ANALYSIS_STEPS.length - 1))
    }, 700)
    return () => clearInterval(id)
  }, [url])

  return (
    <Card>
      <SectionTitle>AI Analysis In Progress</SectionTitle>
      <div className="space-y-3">
        {ANALYSIS_STEPS.map((step, index) => {
          const done = index < stepIndex
          const active = index === stepIndex
          return (
            <div key={step} className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-4 py-3">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                  done ? "bg-emerald-500/20 text-emerald-400" : active ? "bg-blue-500/20 text-blue-300" : "bg-slate-800 text-slate-500"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <p className={`text-sm ${active ? "text-slate-100" : "text-slate-400"}`}>{step}</p>
              {active && <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-blue-400" />}
            </div>
          )
        })}
      </div>
      <div className="relative h-8 w-8">
        <span className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-slate-400" />
      </div>
      <p className="text-xs text-slate-500">Analyzing {url ? displayUrl(url) : "landing page"}</p>
    </Card>
  )
}

function LandingPageScoreSection({ score }: { score: number }) {
  const { label, color } = gradeInfo(score)
  const animatedScore = useAnimatedNumber(score, 1200)
  const clamped = Math.max(0, Math.min(100, animatedScore))

  return (
    <Card>
      <SectionTitle>Landing Page Score</SectionTitle>
      <div className="mt-3 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
        <div
          className="text-4xl font-bold sm:text-5xl"
          style={{ color }}
        >
          {animatedScore}
        </div>
        <div className="flex-1">
          <div className="h-3 w-full rounded-full bg-slate-800">
            <div
              className="h-3 rounded-full"
              style={{
                width: `${clamped}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              Based on UX, copywriting, trust signals, and conversion heuristics.
            </p>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {label}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function StickyTopSummary({ analysis }: { analysis: RoastAnalysis }) {
  const quickMetrics = [
    { label: "Hero Clarity", value: analysis.score_breakdown.hero_clarity },
    { label: "CTA Strength", value: analysis.score_breakdown.cta_strength },
    { label: "Trust Signals", value: analysis.score_breakdown.trust_signals },
  ]

  return (
    <div className="sticky top-4 z-20 rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-xl shadow-black/25 backdrop-blur">
      <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Overall Score</p>
          <p className="mt-1 text-4xl font-bold text-white">{analysis.conversion_score}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {quickMetrics.map((metric) => {
            const status = breakdownStatus(metric.value)
            return (
              <div key={metric.label} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs text-slate-400">{metric.label}</p>
                  <p className={`text-xs font-semibold ${status.textClass}`}>{metric.value}</p>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800">
                  <div className={`h-1.5 rounded-full ${status.barClass}`} style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SnapshotImage({ snapshotUrl }: { snapshotUrl: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Landing Page Snapshot</h2>
        <span className="text-sm text-gray-500">Scrollable preview</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
          <div className="ml-3 text-xs text-gray-500">Page preview</div>
        </div>

        <div className="h-[650px] overflow-y-auto bg-white">
          <img
            src={snapshotUrl}
            alt="Landing page snapshot"
            className={`w-full object-top transition-opacity duration-300 ${
              state === "loaded" ? "opacity-100" : "opacity-0"
            }`}
            loading="lazy"
            onLoad={() => setState("loaded")}
            onError={() => setState("error")}
          />
        </div>
      </div>
      {state === "loading" && <p className="mt-3 text-sm text-slate-400">Capturing landing page snapshot...</p>}
      {state === "error" && <p className="mt-3 text-sm text-slate-400">Snapshot unavailable for this analysis.</p>}
    </div>
  )
}

function SnapshotSection({ snapshot }: { snapshot?: string }) {
  return (
    snapshot ? (
      <SnapshotImage key={snapshot} snapshotUrl={snapshot} />
    ) : (
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Landing Page Snapshot</h2>
          <span className="text-sm text-gray-500">Scrollable preview</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <div className="h-3 w-3 rounded-full bg-green-400" />
            <div className="ml-3 text-xs text-gray-500">Page preview</div>
          </div>
          <div className="h-[650px] overflow-y-auto bg-white p-4">
            <p className="text-sm text-slate-500">Snapshot unavailable for this analysis.</p>
          </div>
        </div>
      </div>
    )
  )
}

function TopFixesSection({ fixes }: { fixes: string[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Top 3 Fixes to Improve Conversion</SectionTitle>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          High Impact
        </span>
      </div>
      <ol className="space-y-3">
        {fixes.map((fix, i) => (
          <li key={i} className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-blue-500/40 hover:bg-neutral-900">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-700 text-xs font-semibold text-slate-300">
              {i + 1}
            </span>
            <span className="mt-0.5 text-blue-300" aria-hidden="true">
              ✦
            </span>
            <p className="text-sm leading-relaxed text-slate-200">{fix}</p>
          </li>
        ))}
      </ol>
    </Card>
  )
}

function ConversionSummarySection({ analysis }: { analysis: RoastAnalysis }) {
  return (
    <Card>
      <SectionTitle>AI Conversion Summary</SectionTitle>
      <p className="text-sm leading-relaxed text-slate-300">{buildConversionSummary(analysis)}</p>
    </Card>
  )
}

const BREAKDOWN_METRICS = [
  { key: "hero_clarity" as const, label: "Hero Clarity" },
  { key: "cta_strength" as const, label: "CTA Strength" },
  { key: "trust_signals" as const, label: "Trust Signals" },
  { key: "copywriting" as const, label: "Copywriting" },
  { key: "design_hierarchy" as const, label: "Design Hierarchy" },
  { key: "friction" as const, label: "Friction" },
]

function BreakdownSection({ analysis }: { analysis: RoastAnalysis }) {
  return (
    <Card>
      <SectionTitle>Score Breakdown</SectionTitle>
      <div className="space-y-4">
        {BREAKDOWN_METRICS.map(({ key, label }) => {
          const value = analysis.score_breakdown[key]
          const status = breakdownStatus(value)
          return (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">{label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${status.textClass}`}>{status.label}</span>
                  <span className={`text-sm font-bold tabular-nums ${valueColor(value)}`}>{value}/100</span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${status.barClass}`} style={{ width: `${value}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function KeyInsightsSection({ analysis }: { analysis: RoastAnalysis }) {
  return (
    <Card>
      <SectionTitle>Key Insights</SectionTitle>
      <div className="space-y-3">
        {(analysis.key_insights ?? []).map((insight, i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-slate-500">Insight {i + 1}</p>
              <SeverityBadge level={i === 0 ? "High" : i === 1 ? "Medium" : "Low"} />
            </div>
            <p className="text-sm leading-relaxed text-slate-200">{insight}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ConversionFixesSection({ fixes }: { fixes: RoastAnalysis["conversion_fixes"] }) {
  return (
    <Card>
      <SectionTitle>Conversion Fixes</SectionTitle>
      <div className="space-y-4">
        {fixes.map((fix, i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-semibold text-white">{fix.title}</p>
              <SeverityBadge level={i < 2 ? "High" : i < 4 ? "Medium" : "Low"} />
            </div>
            <p className="text-sm text-slate-400">Problem: {fix.problem}</p>
            <p className="text-sm text-slate-300">Solution: {fix.solution}</p>
            <p className="text-sm text-emerald-300">Impact: {fix.expected_conversion_impact}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function RoastSection({ roast }: { roast: string }) {
  return (
    <Card>
      <SectionTitle>Roast</SectionTitle>
      <p className="text-base italic leading-relaxed text-amber-200/90">&ldquo;{roast}&rdquo;</p>
    </Card>
  )
}

function AnalyzePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchUrl = searchParams.get("url") ?? ""

  const [result, setResult] = useState<AnalysisResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inputUrl, setInputUrl] = useState(searchUrl)
  const [activeUrl, setActiveUrl] = useState(searchUrl)
  const [isLoading, setIsLoading] = useState(Boolean(searchUrl))

  useEffect(() => {
    setInputUrl(searchUrl)
    setActiveUrl(searchUrl)
    setIsLoading(Boolean(searchUrl))
  }, [searchUrl])

  useEffect(() => {
    if (!activeUrl) return

    const controller = new AbortController()
    let cancelled = false

    async function analyze() {
      setIsLoading(true)
      setError(null)
      setResult(null)

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: activeUrl, roastMode: false }),
          signal: controller.signal,
        })

        const data: AnalysisResponse & { rateLimited?: boolean } = await res.json()

        if (!res.ok || !data.success) {
          setError(data.error ?? "Something went wrong. Please try again.")
          setResult(null)
          return
        }

        setResult(data)
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return
        setError("Couldn't connect. Check your internet and try again.")
        setResult(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    analyze()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [activeUrl])

  function handleAnalyze() {
    const next = inputUrl.trim()
    if (!next) return
    setError(null)
    setResult(null)
    setActiveUrl(next)
    setIsLoading(true)
    router.replace(`/analyze?url=${encodeURIComponent(next)}`)
  }

  const analysis = result?.analysis

  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="text-lg font-semibold tracking-tight text-white transition hover:text-slate-300">
              LandingRoast
            </Link>
            {activeUrl && <p className="max-w-[50%] truncate text-xs text-slate-500">{displayUrl(activeUrl)}</p>}
          </div>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
          >
            Dashboard
          </Link>
        </header>

        <div className="space-y-6">
          <UrlInputPanel value={inputUrl} onChange={setInputUrl} onSubmit={handleAnalyze} loading={isLoading} />

          {error && <ErrorBanner message={error} />}

          {isLoading ? (
            <LoadingState key={activeUrl} url={activeUrl} />
          ) : analysis ? (
            <div className="space-y-6">
              <StickyTopSummary analysis={analysis} />
              <LandingPageScoreSection score={analysis.conversion_score} />
              <SnapshotSection snapshot={analysis.page_snapshot || result?.page_snapshot} />
              <ConversionSummarySection analysis={analysis} />
              <TopFixesSection fixes={(analysis.top_fixes && analysis.top_fixes.length === 3) ? analysis.top_fixes : analysis.improvements.slice(0, 3)} />
              <BreakdownSection analysis={analysis} />
              <KeyInsightsSection analysis={analysis} />
              <ConversionFixesSection fixes={analysis.conversion_fixes} />
              <RoastSection roast={analysis.roast} />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      }
    >
      <AnalyzePageContent />
    </Suspense>
  )
}
