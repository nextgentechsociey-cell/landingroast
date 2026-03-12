"use client"

import RadarSection from "@/components/RadarSection"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"
import {
  canRunAnalysis,
  consumeAnalysis,
  getRemainingAnalyses,
  refundAnalysis,
} from "@/lib/usage-limit"
import type { AnalysisResponse, CompetitorSnapshot } from "@/lib/analyzeLanding"
import type { RoastAnalysis } from "@/lib/roasts"
import { generatePdfReport } from "@/lib/generatePdfReport"
import { generateSocialImage } from "@/lib/generateSocialImage"
import { saveLocalRoastFromAnalysis } from "@/lib/localRoasts"
import UrlInput from "@/components/UrlInput"
import Paywall from "@/components/Paywall"

// ─── Store helpers ─────────────────────────────────────────────────────────────

function subscribeUsage() { return () => {} }
function getServerRemaining() { return null }

// ─── Formatting ───────────────────────────────────────────────────────────────

function displayUrl(url: string) {
  try {
    const { hostname, pathname } = new URL(url)
    const path = pathname === "/" ? "" : pathname.length > 24 ? pathname.slice(0, 24) + "…" : pathname
    return `${hostname}${path}`
  } catch {
    return url.slice(0, 36)
  }
}

function getTweetUrl(score: number, roastUrl?: string) {
  const link = roastUrl
    ? `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://landingroast.com"}${roastUrl}`
    : "https://landingroast.com"
  const text = `My landing page scored ${score}/100 on LandingRoast 🔥\n\nSee the roast: ${link}`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
}

function remainingLabel(remaining: number) {
  if (remaining > 0) {
    return `${remaining} free ${remaining === 1 ? "analysis" : "analyses"} remaining today`
  }
  return "You have reached the free limit of 3 analyses for today."
}

// ─── Design tokens ─────────────────────────────────────────────────────────────

function gradeInfo(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Excellent", color: "#22c55e" }
  if (score >= 65) return { label: "Good",      color: "#84cc16" }
  if (score >= 50) return { label: "Fair",       color: "#eab308" }
  if (score >= 35) return { label: "Needs Work", color: "#f97316" }
  return               { label: "Poor",          color: "#ef4444" }
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

// ─── Shared primitives ─────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-neutral-800 bg-neutral-900 p-6 space-y-4 ${className}`}>
      {children}
    </section>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-white">
      {children}
    </h2>
  )
}

// ─── Loading state ─────────────────────────────────────────────────────────────

const LOADING_STEPS = [
  "Fetching your page…",
  "Reading your copy…",
  "Scoring your funnel…",
  "Writing your roast…",
]

function LoadingState({ url }: { url: string }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 2500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-28 text-center">
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 rounded-full border-2 border-slate-800" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-slate-400" />
      </div>
      <div>
        <p className="text-base font-medium text-slate-200">{LOADING_STEPS[step]}</p>
        {url && <p className="mt-1.5 max-w-xs truncate text-xs text-slate-500">{url}</p>}
      </div>
      <div className="flex gap-1.5">
        {LOADING_STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i <= step ? "w-4 bg-slate-400" : "w-1.5 bg-slate-700"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-slate-600">Usually takes 5–10 seconds</p>
    </div>
  )
}

// ─── Error banner ──────────────────────────────────────────────────────────────

function ErrorBanner({
  message, isRateLimit, onRetry,
}: {
  message: string
  isRateLimit: boolean
  onRetry?: () => void
}) {
  return (
    <div className={`rounded-xl border px-5 py-4 ${
      isRateLimit ? "border-amber-900/40 bg-amber-950/20" : "border-red-900/40 bg-red-950/20"
    }`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-sm ${isRateLimit ? "text-amber-400" : "text-red-400"}`}>{message}</p>
        {onRetry && !isRateLimit && (
          <button
            onClick={onRetry}
            className="shrink-0 rounded-lg border border-red-800/60 px-4 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-700 hover:text-red-300"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

// ─── URL input panel ───────────────────────────────────────────────────────────

type AnalysisGoal =
  | "lead_gen"
  | "saas_trial"
  | "checkout"
  | "waitlist"
  | "other"

const GOAL_LABELS: Record<AnalysisGoal, string> = {
  lead_gen: "Capture leads / demo requests",
  saas_trial: "Drive SaaS signups / trials",
  checkout: "Increase purchases / checkouts",
  waitlist: "Grow waitlist / newsletter",
  other: "General: improve overall conversions",
}

function UrlInputPanel({
  value,
  onChange,
  onSubmit,
  goal,
  onGoalChange,
  fullSite,
  onFullSiteChange,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  goal: AnalysisGoal
  onGoalChange: (goal: AnalysisGoal) => void
  fullSite: boolean
  onFullSiteChange: (next: boolean) => void
}) {
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="mb-1 text-lg font-semibold text-white">Analyze a landing page</h2>
      <p className="mb-6 text-sm text-slate-400">
        Paste your URL to get an AI-powered CRO audit in seconds.
      </p>
      <UrlInput value={value} onChange={onChange} onSubmit={onSubmit} variant="dark" />
      <div className="mt-4 space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Primary goal for this page
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-sm text-xs text-slate-500">
            The AI will prioritise insights and fixes to improve this specific conversion goal.
          </p>
          <select
            value={goal}
            onChange={(e) => onGoalChange(e.target.value as AnalysisGoal)}
            className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-slate-100 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {(
              ["lead_gen", "saas_trial", "checkout", "waitlist", "other"] as AnalysisGoal[]
            ).map((key) => (
              <option key={key} value={key}>
                {GOAL_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={fullSite}
            onChange={(e) => onFullSiteChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-amber-500"
          />
          <span className="text-xs font-medium text-slate-200">
            Include a short full-site pass (up to 5 key pages)
          </span>
        </label>
        <p className="hidden text-[11px] text-slate-500 sm:block">
          We&apos;ll briefly crawl same-domain pages like pricing, features, and docs to inform the audit.
        </p>
      </div>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Conversion Score ──────────────────────────────────────────────────────

function ScoreSection({ score }: { score: number }) {
  const { label, color } = gradeInfo(score)

  return (
    <Card>
      <SectionTitle>1. Conversion Score</SectionTitle>
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="h-48 w-48">
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

// ─── 2. Score Breakdown ───────────────────────────────────────────────────────

const BREAKDOWN_METRICS = [
  { key: "hero_clarity" as const, label: "Hero Clarity" },
  { key: "cta_strength" as const, label: "CTA Strength" },
  { key: "trust_signals" as const, label: "Trust Signals" },
  { key: "copywriting"  as const, label: "Copywriting" },
  { key: "design_hierarchy" as const, label: "Design Hierarchy" },
  { key: "friction" as const, label: "Friction" },
]

function BreakdownSection({ analysis }: { analysis: RoastAnalysis }) {
  return (
    <Card>
      <SectionTitle>2. Score Breakdown</SectionTitle>
      <div className="space-y-5">
        {BREAKDOWN_METRICS.map(({ key, label }) => {
          const value = analysis.score_breakdown[key]
          return (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">{label}</span>
                <span className={`text-sm font-bold tabular-nums ${valueColor(value)}`}>
                  {value}
                  <span className="ml-0.5 text-slate-600 font-normal">/100</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor(value)}`}
                  style={{ width: `${value}%` }}
                />
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
      <SectionTitle>3. Key Insights</SectionTitle>
      <div className="space-y-3">
        {(analysis.key_insights ?? []).map((insight, i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm leading-relaxed text-slate-200">{insight}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Headline Feedback</p>
          <p className="text-sm leading-relaxed text-slate-300">{analysis.headline_feedback}</p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">CTA Feedback</p>
          <p className="text-sm leading-relaxed text-slate-300">{analysis.cta_feedback}</p>
        </div>
      </div>
    </Card>
  )
}

// ─── 5. Conversion Fixes ──────────────────────────────────────────────────────

function ConversionFixesSection({
  fixes,
}: {
  fixes: RoastAnalysis["conversion_fixes"]
}) {
  return (
    <Card>
      <SectionTitle>4. Conversion Fixes</SectionTitle>
      <div className="space-y-4">
        {fixes.map((fix, i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              Fix Title
            </p>
            <p className="mb-4 text-base font-semibold text-white">{fix.title}</p>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Problem
            </p>
            <p className="mb-4 text-sm leading-relaxed text-slate-300">{fix.problem}</p>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Solution
            </p>
            <p className="mb-4 text-sm leading-relaxed text-slate-300">{fix.solution}</p>

            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Impact
            </p>
            <p className="text-sm leading-relaxed text-emerald-200/90">
              {fix.expected_conversion_impact}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── 4. Top Actions (summary) ────────────────────────────────────────────────────

function TopActionsSection({ improvements }: { improvements: RoastAnalysis["improvements"] }) {
  if (!improvements || improvements.length === 0) return null

  const effortLabel = (index: number) => {
    if (index === 0) return "High impact · Medium effort"
    if (index === 1) return "High impact · Low–medium effort"
    return "Quick win · Low effort"
  }

  return (
    <Card>
      <SectionTitle>0. Top 3 Actions</SectionTitle>
      <p className="mb-4 text-sm text-slate-400">
        Start with these changes for the biggest conversion lift. Treat them as your next 14‑day implementation plan.
      </p>
      <ol className="space-y-4">
        {improvements.map((item, index) => (
          <li key={index} className="flex gap-3">
            <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">
              {index + 1}
            </span>
            <div className="space-y-1">
              <p className="text-sm leading-relaxed text-slate-200">{item}</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-400">
                {effortLabel(index)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// ─── 5. Improved Headlines ────────────────────────────────────────────────────

function ImprovedHeadlinesSection({ headlines }: { headlines: string[] }) {
  return (
    <Card>
      <SectionTitle>5. Improved Headlines</SectionTitle>
      <ul className="space-y-2.5">
        {headlines.map((h, i) => (
          <li key={i} className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm text-slate-200">
            {h}
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ─── 6. Improved CTAs ─────────────────────────────────────────────────────────

function ImprovedCtasSection({ ctas }: { ctas: string[] }) {
  return (
    <Card>
      <SectionTitle>6. Improved CTAs</SectionTitle>
      <div className="flex flex-wrap gap-2.5">
        {ctas.map((cta, i) => (
          <span
            key={i}
            className="rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm font-medium text-slate-200"
          >
            {cta}
          </span>
        ))}
      </div>
    </Card>
  )
}

// ─── 7. Rewritten Hero ────────────────────────────────────────────────────────

function RewrittenHeroSection({ text }: { text: string }) {
  return (
    <Card>
      <SectionTitle>7. Rewritten Hero</SectionTitle>
      <blockquote className="border-l-2 border-indigo-500 pl-5">
        <p className="text-sm italic leading-relaxed text-slate-300">{text}</p>
      </blockquote>
    </Card>
  )
}

// ─── 8. Rewrite Suggestions ───────────────────────────────────────────────────

function CopyBox({
  label,
  text,
}: {
  label: string
  text: string
}) {
  if (!text) return null

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-slate-500 hover:text-white"
        >
          Copy
        </button>
      </div>
      <p className="text-sm leading-relaxed text-slate-200">{text}</p>
    </div>
  )
}

function RewriteSection({ analysis }: { analysis: RoastAnalysis }) {
  const structured = analysis.structured_rewrites

  const headline =
    structured?.headline || analysis.improved_headlines?.[0] || ""
  const hero =
    structured?.hero || analysis.rewritten_hero_paragraph || ""
  const cta =
    structured?.cta || analysis.improved_ctas?.[0] || ""
  const valueProp =
    structured?.value_prop || analysis.key_insights?.[0] || ""

  if (!headline && !hero && !cta && !valueProp) return null

  return (
    <Card>
      <SectionTitle>8. Rewrite Suggestions</SectionTitle>
      <p className="mb-4 text-sm text-slate-400">
        Drop these directly into your page or use them as starting points for A/B tests.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <CopyBox label="Headline" text={headline} />
        <CopyBox label="Primary CTA" text={cta} />
        <CopyBox label="Hero Paragraph" text={hero} />
        <CopyBox label="Value Proposition" text={valueProp} />
      </div>
    </Card>
  )
}

// ─── 9. The Roast ─────────────────────────────────────────────────────────────

function RoastSection({ roast }: { roast: string }) {
  return (
    <Card className="border-amber-800/40 bg-amber-950/20">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg leading-none">🔥</span>
        <h2 className="text-lg font-semibold text-amber-400">9. The Roast</h2>
      </div>
      <p className="text-base italic leading-relaxed text-amber-200/80">
        &ldquo;{roast}&rdquo;
      </p>
    </Card>
  )
}

// ─── 10. Competitor Comparison ────────────────────────────────────────────────

function CompetitorComparisonSection({ competitors }: { competitors?: CompetitorSnapshot[] }) {
  if (!competitors || competitors.length === 0) return null

  const rows = competitors.filter(
    (c) => c.url || c.headline || c.cta || c.keyDifference,
  )
  if (!rows.length) return null

  const displayHost = (url: string) => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  }

  return (
    <Card>
      <SectionTitle>9. Competitor Comparison</SectionTitle>
      <p className="mb-4 text-sm text-slate-400">
        How your page stacks up against nearby alternatives in headline, CTA, and positioning.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs text-slate-300">
          <thead>
            <tr className="border-b border-slate-800/80">
              <th className="py-2 pr-4 font-semibold text-slate-400">Site</th>
              <th className="py-2 pr-4 font-semibold text-slate-400">Headline</th>
              <th className="py-2 pr-4 font-semibold text-slate-400">CTA</th>
              <th className="py-2 pr-4 font-semibold text-slate-400">Key Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, index) => (
              <tr key={index} className="border-b border-slate-900/60 align-top">
                <td className="py-2 pr-4">
                  {c.url ? (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-amber-300 hover:text-amber-200"
                    >
                      {displayHost(c.url)}
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">Unknown</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <p className="text-xs text-slate-200">{c.headline || "—"}</p>
                </td>
                <td className="py-2 pr-4">
                  <p className="text-xs text-slate-200">{c.cta || "—"}</p>
                </td>
                <td className="py-2 pr-4">
                  <p className="text-xs text-slate-300">{c.keyDifference || "—"}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ─── 10. Actions bar ──────────────────────────────────────────────────────────

function ActionsBar({
  roastUrl,
  tweetUrl,
  reportId,
  onDownload,
  onShareRoast,
  onReset,
}: {
  roastUrl: string | undefined
  tweetUrl: string
  reportId?: string
  onDownload: () => void
  onShareRoast: () => void
  onReset: () => void
}) {
  async function handleShareReport() {
    if (!reportId) return
    try {
      const origin =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : ""
      const link = origin ? `${origin}/report/${reportId}` : `/report/${reportId}`
      await navigator.clipboard.writeText(link)
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download Report
        </button>

        {reportId && (
          <button
            onClick={handleShareReport}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/60 bg-emerald-600/10 px-5 py-2.5 text-sm font-medium text-emerald-300 transition hover:border-emerald-500 hover:text-emerald-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
              <path
                d="M7 10.75L12 5.75L17 10.75M12 6V18.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Share Report
          </button>
        )}

        <button
          onClick={onShareRoast}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-700/60 bg-indigo-600/10 px-5 py-2.5 text-sm font-medium text-indigo-300 transition hover:border-indigo-500 hover:text-indigo-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
            <path d="M12 16V4m0 0-4 4m4-4 4 4M4 14v3.75A2.25 2.25 0 006.25 20h11.5A2.25 2.25 0 0020 17.75V14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Share Roast
        </button>

        {roastUrl && (
          <a
            href={roastUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
              <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Public Roast Page
          </a>
        )}

        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.857L1.255 2.25H8.08l4.265 5.635L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </a>

        <button
          onClick={onReset}
          className="ml-auto rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          Analyze Another
        </button>
      </div>
    </Card>
  )
}

// ─── Result dashboard ──────────────────────────────────────────────────────────

function ResultDashboard({
  analysis,
  roastUrl,
  competitors,
  onDownload,
  onShareRoast,
  onReset,
}: {
  analysis: RoastAnalysis
  roastUrl: string | undefined
  competitors?: CompetitorSnapshot[]
  onDownload: () => void
  onShareRoast: () => void
  onReset: () => void
}) {
  const tweetUrl = getTweetUrl(analysis.conversion_score, roastUrl)

  return (
    <div className="space-y-6">
      <TopActionsSection improvements={analysis.improvements} />
      <ScoreSection score={analysis.conversion_score} />
       {/* Structured categories + visual radar */}
      <RadarSection analysis={analysis} />
      <BreakdownSection analysis={analysis} />
      <KeyInsightsSection analysis={analysis} />
      <ConversionFixesSection fixes={analysis.conversion_fixes} />
      <ImprovedHeadlinesSection headlines={analysis.improved_headlines} />
      <ImprovedCtasSection ctas={analysis.improved_ctas} />
      <RewrittenHeroSection text={analysis.rewritten_hero_paragraph} />
      <RewriteSection analysis={analysis} />
      <RoastSection roast={analysis.roast} />
      <CompetitorComparisonSection competitors={competitors} />
      <ActionsBar
        roastUrl={roastUrl}
        tweetUrl={tweetUrl}
        reportId={analysis?.reportId}
        onDownload={onDownload}
        onShareRoast={onShareRoast}
        onReset={onReset}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

function AnalyzePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchUrl = searchParams.get("url") ?? ""

  const [result,        setResult]        = useState<AnalysisResponse | null>(null)
  const [error,         setError]         = useState<string | null>(null)
  const [isRateLimit,   setIsRateLimit]   = useState(false)
  const [inputUrl,      setInputUrl]      = useState(searchUrl)
  const [activeUrl,     setActiveUrl]     = useState(searchUrl)
  const [isLoading,     setIsLoading]     = useState(Boolean(searchUrl))
  const [lastFailedUrl, setLastFailedUrl] = useState<string | null>(null)

  const [remainingOverride, setRemainingOverride] = useState<number | null>(null)
  const syncedRemaining = useSyncExternalStore(subscribeUsage, getRemainingAnalyses, getServerRemaining)
  const remaining = remainingOverride ?? syncedRemaining
  const urlInputRef = useRef<HTMLDivElement | null>(null)

  const [goal, setGoal] = useState<AnalysisGoal>("lead_gen")
  const [fullSite, setFullSite] = useState(false)

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
      let consumed = false

      if (!canRunAnalysis()) {
        setIsRateLimit(true)
        setRemainingOverride(0)
        setResult(null)
        setActiveUrl("")
        setIsLoading(false)
        router.replace("/analyze")
        return
      }

      setIsLoading(true)
      setError(null)
      setIsRateLimit(false)
      setResult(null)
      setRemainingOverride(consumeAnalysis())
      consumed = true

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: activeUrl,
            roastMode: false,
            goal: GOAL_LABELS[goal],
            fullSite,
          }),
          signal: controller.signal,
        })

        const data: AnalysisResponse & { rateLimited?: boolean } = await res.json()

        if (res.status === 429 || data.rateLimited) {
          if (consumed) {
            setRemainingOverride(refundAnalysis())
            consumed = false
          }
          setIsRateLimit(true)
          setRemainingOverride(0)
          setActiveUrl("")
          router.replace("/analyze")
          return
        }

        if (!res.ok || !data.success) {
          if (consumed) {
            setRemainingOverride(refundAnalysis())
            consumed = false
          }
          setError(data.error ?? "Something went wrong. Please try again.")
          setLastFailedUrl(activeUrl)
          setResult(null)
          return
        }

        const shareId = saveLocalRoastFromAnalysis(data, activeUrl)
        const withShareUrl = shareId
          ? { ...data, roastUrl: `/r/${shareId}` }
          : data

        setResult(withShareUrl)
        setLastFailedUrl(null)
      } catch (error) {
        if (consumed) {
          setRemainingOverride(refundAnalysis())
          consumed = false
        }
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        setError("Couldn't connect. Check your internet and try again.")
        setLastFailedUrl(activeUrl)
        setResult(null)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    analyze()
    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl, goal, fullSite, router])

  function handleAnalyze() {
    const next = inputUrl.trim()
    if (!next) return
    if (!canRunAnalysis()) {
      setIsRateLimit(true)
      setRemainingOverride(0)
      return
    }
    setResult(null)
    setError(null)
    setIsRateLimit(false)
    setLastFailedUrl(null)
    setActiveUrl(next)
    setIsLoading(true)
    router.replace(`/analyze?url=${encodeURIComponent(next)}`)
  }

  function handleRetry() {
    const url = lastFailedUrl ?? inputUrl.trim()
    if (!url) return
    setInputUrl(url)
    setActiveUrl(url)
    setError(null)
    setIsRateLimit(false)
    setIsLoading(true)
    router.replace(`/analyze?url=${encodeURIComponent(url)}`)
  }

  function handleReset() {
    setResult(null)
    setError(null)
    setIsRateLimit(false)
    setActiveUrl("")
    setInputUrl("")
    setIsLoading(false)
    setLastFailedUrl(null)
    router.replace("/analyze")
  }

  function handleDownloadReport() {
    if (!result) return
    generatePdfReport(result, activeUrl)
  }

  function handleScrollToInput() {
    urlInputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    const input = urlInputRef.current?.querySelector("input")
    if (input instanceof HTMLInputElement) {
      window.setTimeout(() => input.focus(), 250)
    }
  }

  async function handleShareRoast() {
    if (!result?.analysis) return

    const imageUrl = await generateSocialImage({
      url: activeUrl,
      analysis: result.analysis,
    })

    if (!imageUrl) return
    window.open(imageUrl, "_blank", "noopener,noreferrer")
    window.setTimeout(() => URL.revokeObjectURL(imageUrl), 60_000)
  }

  const analysis  = result?.analysis
  const hasResult = analysis != null

  // Show Paywall when the limit was just hit (isRateLimit) OR when the
  // client has hydrated and already has 0 remaining from a previous session.
  // null  → not yet hydrated (SSR), don't show yet
  // Infinity → localhost dev bypass, never show
  const showPaywall = isRateLimit || (remaining !== null && remaining <= 0)

  return (
    <main className="min-h-screen text-slate-100">
      <div className={`mx-auto w-full px-4 py-8 transition-[max-width] duration-500 sm:px-6 sm:py-10 ${
        hasResult ? "max-w-4xl" : "max-w-2xl"
      }`}>

        {/* ── Header ── */}
        <header className="mb-7 flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 backdrop-blur">
          <div className="min-w-0">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-white transition hover:text-slate-300"
            >
              LandingRoast
            </Link>
            {hasResult && activeUrl && (
              <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                {displayUrl(activeUrl)}
              </p>
            )}
          </div>

          {remaining !== null && (
            <div className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              remaining > 0
                ? "border-slate-700 text-slate-400"
                : "border-amber-900/40 text-amber-500"
            }`}>
              {remainingLabel(remaining)}
            </div>
          )}
        </header>

        {hasResult && (
          <div className="sticky top-4 z-20 mb-5 flex justify-end">
            <button
              onClick={handleScrollToInput}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 backdrop-blur transition hover:border-amber-400/50 hover:text-amber-100"
            >
              Analyze Another Page
            </button>
          </div>
        )}

        {/* ── Content states ── */}
        {showPaywall ? (
          <Paywall onDismiss={handleReset} />
        ) : isLoading ? (
          <LoadingState url={activeUrl} />
        ) : analysis ? (
          <>
            <div ref={urlInputRef} className="mb-5">
              <UrlInputPanel
                value={inputUrl}
                onChange={setInputUrl}
                onSubmit={handleAnalyze}
                goal={goal}
                onGoalChange={setGoal}
                fullSite={fullSite}
                onFullSiteChange={setFullSite}
              />
            </div>
            <ResultDashboard
              analysis={analysis}
              roastUrl={result?.roastUrl}
              competitors={result?.competitors}
              onDownload={handleDownloadReport}
              onShareRoast={handleShareRoast}
              onReset={handleReset}
            />
          </>
        ) : (
          <>
            {error && (
              <div className="mb-5">
                <ErrorBanner
                  message={error}
                  isRateLimit={false}
                  onRetry={handleRetry}
                />
              </div>
            )}
            <div ref={urlInputRef}>
              <UrlInputPanel
                value={inputUrl}
                onChange={setInputUrl}
                onSubmit={handleAnalyze}
                goal={goal}
                onGoalChange={setGoal}
                fullSite={fullSite}
                onFullSiteChange={setFullSite}
              />
            </div>
          </>
        )}

      </div>
    </main>
  )
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-8 w-8">
              <span className="absolute inset-0 rounded-full border-2 border-slate-800" />
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-slate-400" />
            </div>
            <p className="text-xs text-slate-500">Loading…</p>
          </div>
        </div>
      }
    >
      <AnalyzePageContent />
    </Suspense>
  )
}
