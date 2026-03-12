"use client"

import Link from "next/link"

const FEATURES = [
  {
    title: "URL Analysis",
    description: "Paste any landing page URL and get an instant conversion-focused audit.",
  },
  {
    title: "Live Screenshot Preview",
    description: "Visual snapshot of the analyzed page with a clean scrollable preview window.",
  },
  {
    title: "AI Conversion Report",
    description: "Actionable feedback on messaging, CTA strength, trust signals, and design hierarchy.",
  },
  {
    title: "UX Suggestions",
    description: "Top high-impact fixes prioritized to improve clarity and click-through rate.",
  },
]

const STEPS = [
  "Submit landing page URL",
  "AI scans content + UX structure",
  "Get score, insights, and conversion fixes",
]

export default function HomePage() {
  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:py-14">
        <header className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 px-5 py-4 backdrop-blur">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white">
            LandingRoast
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Dashboard
            </Link>
            <Link
              href="/analyze"
              className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              Start Analysis
            </Link>
          </div>
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">
              AI Landing Page Analyzer
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Find conversion leaks in minutes, not weeks.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
              LandingRoast audits your page with an AI conversion reviewer and returns practical fixes your team can ship immediately.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/analyze"
                className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Analyze a URL
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Open Dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm font-semibold text-slate-200">How it works</p>
            <ol className="mt-4 space-y-3">
              {STEPS.map((step, i) => (
                <li key={step} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">Step {i + 1}</p>
                  <p className="mt-1 text-sm text-slate-200">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-base font-semibold text-white">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
