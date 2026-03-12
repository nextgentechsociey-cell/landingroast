"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"
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

function barColor(v: number) {
  if (v >= 75) return "bg-green-500"
  if (v >= 60) return "bg-yellow-400"
  if (v >= 45) return "bg-orange-400"
  return "bg-red-500"
}

function valueColor(v: number) {
  if (v >= 75) return "text-green-400"
  if (v >= 60) return "text-yellow-400"
  if (v >= 45) return "text-orange-400"
  return "text-red-400"
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
      {children}
    </section>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-white">{children}</h2>
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

function LoadingState({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative h-8 w-8">
        <span className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-slate-400" />
      </div>
      <p className="text-sm text-slate-300">Analyzing landing page...</p>
      {url && <p className="max-w-sm truncate text-xs text-slate-500">{url}</p>}
    </div>
  )
}

function ScoreSection({ score }: { score: number }) {
  const { label, color } = gradeInfo(score)

  return (
    <Card>
      <SectionTitle>Score</SectionTitle>
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="h-44 w-44">
          <CircularProgressbar
            value={score}
            maxValue={100}
            text={`${score}`}
            styles={buildStyles({
              pathColor: color,
              trailColor: "#262626",
              textColor: "#f8fafc",
              textSize: "20px",
              pathTransitionDuration: 0.8,
            })}
          />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color }}>
          {label}
        </p>
      </div>
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
          return (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">{label}</span>
                <span className={`text-sm font-bold tabular-nums ${valueColor(value)}`}>{value}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${barColor(value)}`} style={{ width: `${value}%` }} />
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
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
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
            <p className="text-base font-semibold text-white">{fix.title}</p>
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
          <Link href="/" className="text-lg font-semibold tracking-tight text-white transition hover:text-slate-300">
            LandingRoast
          </Link>
          {activeUrl && <p className="max-w-[50%] truncate text-xs text-slate-500">{displayUrl(activeUrl)}</p>}
        </header>

        <div className="space-y-6">
          <UrlInputPanel value={inputUrl} onChange={setInputUrl} onSubmit={handleAnalyze} loading={isLoading} />

          {error && <ErrorBanner message={error} />}

          {isLoading ? (
            <LoadingState url={activeUrl} />
          ) : analysis ? (
            <div className="space-y-6">
              <ScoreSection score={analysis.conversion_score} />
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
