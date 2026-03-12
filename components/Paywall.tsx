"use client"

import { DAILY_ANALYSIS_LIMIT } from "@/lib/usage-limit"

type Props = {
  /** Called when the user clicks "Come back tomorrow". */
  onDismiss?: () => void
  /** Destination for the upgrade CTA. Defaults to "/upgrade". */
  upgradeUrl?: string
}

const PRO_FEATURES = [
  "Unlimited daily analyses",
  "Priority AI processing",
  "Full PDF audit reports",
]

export default function Paywall({ onDismiss, upgradeUrl = "/upgrade" }: Props) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* ── Card ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">

          {/* Top accent bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500" />

          <div className="px-8 pb-8 pt-8">

            {/* ── Icon ── */}
            <div className="mb-6 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-6 w-6 text-orange-400"
                >
                  <path
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* ── Usage dots ── */}
            <div className="mb-6 flex items-center justify-center gap-2">
              {Array.from({ length: DAILY_ANALYSIS_LIMIT }).map((_, i) => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-orange-500"
                  aria-hidden="true"
                />
              ))}
              <span className="ml-1 text-xs font-medium text-slate-500">
                {DAILY_ANALYSIS_LIMIT}/{DAILY_ANALYSIS_LIMIT} used today
              </span>
            </div>

            {/* ── Title ── */}
            <h2 className="mb-3 text-center text-xl font-bold tracking-tight text-white">
              You&rsquo;ve reached the free limit
            </h2>

            {/* ── Body ── */}
            <p className="mb-7 text-center text-sm leading-relaxed text-slate-400">
              You can analyze {DAILY_ANALYSIS_LIMIT} landing pages per day for free.
              Upgrade to Pro for unlimited analyses and priority results.
            </p>

            {/* ── Pro features ── */}
            <ul className="mb-8 space-y-2.5">
              {PRO_FEATURES.map((feat) => (
                <li key={feat} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
                      <path d="M4.5 12.75l6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-sm text-slate-300">{feat}</span>
                </li>
              ))}
            </ul>

            {/* ── CTAs ── */}
            <div className="space-y-3">
              <a
                href={upgradeUrl}
                className="block w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:from-orange-400 hover:to-amber-400 active:scale-[0.98]"
              >
                Upgrade to Pro
              </a>

              <button
                onClick={onDismiss}
                className="block w-full rounded-xl border border-slate-700 px-6 py-3 text-center text-sm font-medium text-slate-400 transition hover:border-slate-600 hover:text-slate-300"
              >
                Come back tomorrow
              </button>
            </div>

          </div>
        </div>

        {/* ── Footer note ── */}
        <p className="mt-4 text-center text-xs text-slate-600">
          Free limit resets at midnight · No credit card required to start
        </p>

      </div>
    </div>
  )
}
