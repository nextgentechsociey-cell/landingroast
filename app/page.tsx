"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useSyncExternalStore } from "react"
import { canRunAnalysis, getRemainingAnalyses } from "@/lib/usage-limit"
import UrlInput from "@/components/UrlInput"

function subscribeUsage() {
  return () => {}
}

function getServerRemainingAnalyses() {
  return null
}

function remainingLabel(remaining: number) {
  if (remaining > 0) {
    return `${remaining} free ${remaining === 1 ? "analysis" : "analyses"} remaining today`
  }
  return "You have reached the free limit of 3 analyses for today."
}

const FEATURES = [
  {
    title: "Weighted Conversion Score",
    description:
      "Get a 0-100 score across clarity, CTA strength, trust, copywriting, design hierarchy, and friction.",
  },
  {
    title: "Actionable Conversion Fixes",
    description:
      "Receive specific fixes with problem, solution, and expected impact so you can prioritize what to ship.",
  },
  {
    title: "AI Copy Rewrites",
    description:
      "Generate improved headlines, CTA text, and a rewritten hero paragraph built from your page content.",
  },
  {
    title: "Share-Ready Roast Report",
    description:
      "Export PDF, social image, and public share links to present insights to your team in minutes.",
  },
]

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="group rounded-2xl border border-slate-800/90 bg-slate-900/70 p-6 transition hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-slate-900">
      <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">{description}</p>
    </article>
  )
}

function ExampleReportPreview() {
  return (
    <div className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-6 shadow-2xl shadow-black/30">
      <div className="mb-5 flex items-center justify-between">
        <p className="font-mono text-xs text-slate-500">example.com</p>
        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">Live preview</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-500">Score</p>
          <p className="mt-1 text-4xl font-bold text-amber-400">74</p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
              <span>Hero Clarity</span>
              <span>78</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 w-[78%] rounded-full bg-emerald-400" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
              <span>CTA Strength</span>
              <span>62</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 w-[62%] rounded-full bg-yellow-400" />
            </div>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
              <span>Trust Signals</span>
              <span>55</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div className="h-2 w-[55%] rounded-full bg-orange-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <p className="mb-1 text-xs uppercase tracking-wider text-slate-500">Key Insight</p>
          <p className="text-sm text-slate-300">
            Your value proposition sounds broad and premium, but the real outcome is not obvious in 3 seconds.
          </p>
        </div>
        <div className="rounded-xl border border-amber-700/40 bg-amber-950/25 p-4">
          <p className="mb-1 text-xs uppercase tracking-wider text-amber-500">Roast</p>
          <p className="text-sm italic text-amber-100/90">
            This page has good ingredients, but the recipe is chaos. One clear promise and one strong CTA will do more than ten fancy sections.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [remainingOverride, setRemainingOverride] = useState<number | null>(null)
  const router = useRouter()

  const syncedRemaining = useSyncExternalStore(
    subscribeUsage,
    getRemainingAnalyses,
    getServerRemainingAnalyses,
  )
  const remaining = remainingOverride ?? syncedRemaining

  function handleAnalyze() {
    const next = url.trim()
    if (!next) return

    if (!canRunAnalysis()) {
      setError("You have reached the free limit of 3 analyses for today.")
      setRemainingOverride(0)
      return
    }

    setError(null)
    router.push(`/analyze?url=${encodeURIComponent(next)}`)
  }

  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-6 sm:px-8 sm:pb-20 sm:pt-8">
        <nav className="mb-12 flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/55 px-4 py-3 backdrop-blur sm:mb-16 sm:px-5">
          <p className="text-sm font-semibold tracking-tight text-white sm:text-base">LandingRoast</p>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400 sm:inline-flex">
              AI CRO audit
            </span>
            <Link
              href="/analyze"
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:text-white sm:text-sm"
            >
              Open analyzer
            </Link>
          </div>
        </nav>

        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Conversion feedback in 10 seconds
            </p>
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn landing page confusion into clear conversion wins.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
              Paste any URL and get a structured CRO report with weighted scoring, top bottlenecks, and high-impact rewrites.
            </p>

            <div className="mt-7 rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 sm:p-6">
              <UrlInput value={url} onChange={setUrl} onSubmit={handleAnalyze} variant="dark" />
              <div className="mt-3 text-xs text-slate-500">
                {error ? (
                  <span className="text-amber-400">{error}</span>
                ) : remaining !== null ? (
                  <span className={remaining > 0 ? "" : "text-amber-400"}>{remainingLabel(remaining)}</span>
                ) : (
                  <span>No signup required. Analyze immediately.</span>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/65 p-3">
                <p className="text-xs text-slate-500">Free tier</p>
                <p className="text-sm font-semibold text-white">3 analyses/day</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/65 p-3">
                <p className="text-xs text-slate-500">Output quality</p>
                <p className="text-sm font-semibold text-white">Structured JSON + cards</p>
              </div>
              <div className="rounded-xl border border-slate-800/80 bg-slate-900/65 p-3">
                <p className="text-xs text-slate-500">Shareability</p>
                <p className="text-sm font-semibold text-white">PDF + social image + link</p>
              </div>
            </div>
          </div>

          <ExampleReportPreview />
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="mb-6 sm:mb-8">
            <p className="text-xs uppercase tracking-widest text-slate-500">What you get</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Everything needed to ship a better page fast
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} title={feature.title} description={feature.description} />
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 text-center sm:mt-20 sm:p-8">
          <p className="text-xs uppercase tracking-widest text-slate-500">Ready to ship</p>
          <h3 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Run your next analysis now
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400 sm:text-base">
            Use the report as your implementation checklist for copy, layout, trust elements, and CTA strategy.
          </p>
          <div className="mx-auto mt-6 max-w-2xl">
            <UrlInput value={url} onChange={setUrl} onSubmit={handleAnalyze} variant="dark" />
          </div>
        </section>
      </div>
    </main>
  )
}
