"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import type { RoastAnalysis } from "@/lib/roasts"
import { getLocalRoastById } from "@/lib/localRoasts"

type LocalRoast = {
  id: string
  url: string
  title?: string
  headline?: string
  ctas?: { cta: string; type: "primary" | "secondary" | "navigation" }[]
  analysis: RoastAnalysis
  createdAt: string
}

const BREAKDOWN_LABELS: {
  key: keyof RoastAnalysis["score_breakdown"]
  label: string
}[] = [
  { key: "hero_clarity", label: "Hero Clarity" },
  { key: "cta_strength", label: "CTA Strength" },
  { key: "trust_signals", label: "Trust Signals" },
  { key: "copywriting", label: "Copywriting" },
  { key: "design_hierarchy", label: "Design Hierarchy" },
  { key: "friction", label: "Friction" },
]

function barColor(value: number) {
  if (value >= 75) return "bg-green-500"
  if (value >= 60) return "bg-yellow-400"
  if (value >= 45) return "bg-orange-400"
  return "bg-red-500"
}

function scoreColor(score: number) {
  if (score >= 75) return "text-green-400"
  if (score >= 60) return "text-yellow-400"
  if (score >= 45) return "text-orange-400"
  return "text-red-400"
}

function displayUrl(url: string) {
  try {
    const { hostname, pathname } = new URL(url)
    return pathname === "/" ? hostname : `${hostname}${pathname}`
  } catch {
    return url
  }
}

export default function SharedRoastPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  if (!id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading report...
      </main>
    )
  }

  const roast = getLocalRoastById(id) as LocalRoast | null

  if (!roast) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="mb-2 text-lg font-semibold text-white">Roast not found</p>
          <p className="mb-6 text-sm text-slate-400">
            This shared roast does not exist in local storage on this browser.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Go to LandingRoast
          </Link>
        </div>
      </main>
    )
  }

  const { analysis } = roast

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur sm:p-8">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Public Roast Report
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {displayUrl(roast.url)}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            ID: {roast.id} · {new Date(roast.createdAt).toLocaleString()}
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Landing Page Audit
          </p>
          <dl className="space-y-4">
            <div>
              <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Title</dt>
              <dd className="text-sm text-slate-200">{roast.title ?? "Not available"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Headline</dt>
              <dd className="text-sm text-slate-200">{roast.headline ?? "Not available"}</dd>
            </div>
            <div>
              <dt className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">CTA Buttons</dt>
              {roast.ctas && roast.ctas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {roast.ctas.map((cta, i) => (
                    <span
                      key={`${cta.cta}-${i}`}
                      className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200"
                    >
                      {cta.cta} · {cta.type}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No CTA buttons extracted</p>
              )}
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Conversion Score
          </p>
          <div className="flex items-end gap-3">
            <span className={`text-5xl font-bold tabular-nums ${scoreColor(analysis.conversion_score)}`}>
              {analysis.conversion_score}
            </span>
            <span className="pb-1 text-lg text-slate-500">/100</span>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Score Breakdown
          </p>
          <div className="space-y-4">
            {BREAKDOWN_LABELS.map(({ key, label }) => {
              const value = analysis.score_breakdown[key]
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-semibold text-slate-200">{value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className={`h-full rounded-full ${barColor(value)}`} style={{ width: `${value}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Key Insights
          </p>
          <div className="space-y-3">
            {(analysis.key_insights ?? []).map((insight, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-200">{insight}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Conversion Fixes
          </p>
          <div className="space-y-4">
            {analysis.conversion_fixes.map((fix, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="mb-1 text-sm font-semibold text-white">{fix.title}</p>
                <p className="mb-2 text-xs text-slate-400">Problem: {fix.problem}</p>
                <p className="mb-2 text-xs text-slate-300">Solution: {fix.solution}</p>
                <p className="text-xs font-medium text-emerald-300">Impact: {fix.expected_conversion_impact}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Suggested Improvements
          </p>
          <ul className="space-y-2.5">
            {analysis.improvements.map((improvement, i) => (
              <li key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                {improvement}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Improved Headlines
          </p>
          <ul className="space-y-2.5">
            {analysis.improved_headlines.map((headline, i) => (
              <li key={i} className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                {headline}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 sm:p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Improved CTAs
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.improved_ctas.map((cta, i) => (
              <span key={i} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200">
                {cta}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
            Rewritten Hero
          </p>
          <blockquote className="border-l-2 border-indigo-500 pl-4 text-sm italic text-slate-300">
            {analysis.rewritten_hero_paragraph}
          </blockquote>
        </section>

        <section className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-6 sm:p-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-500">The Roast 🔥</p>
          <p className="text-sm italic leading-relaxed text-amber-200/90">&ldquo;{analysis.roast}&rdquo;</p>
        </section>
      </div>
    </main>
  )
}
