import type { RoastAnalysis } from "@/lib/roasts"

type Props = {
  analysis: Pick<RoastAnalysis, "score_breakdown">
}

const METRICS = [
  { key: "hero_clarity" as const, label: "Hero Clarity" },
  { key: "cta_strength" as const, label: "CTA Strength" },
  { key: "trust_signals" as const, label: "Trust Signals" },
  { key: "copywriting" as const, label: "Copywriting" },
  { key: "design_hierarchy" as const, label: "Design Hierarchy" },
  { key: "friction" as const, label: "Friction" },
]

function getColor(value: number): { bar: string; text: string } {
  if (value >= 75) return { bar: "bg-green-500", text: "text-green-400" }
  if (value >= 60) return { bar: "bg-yellow-400", text: "text-yellow-400" }
  if (value >= 45) return { bar: "bg-orange-400", text: "text-orange-400" }
  return { bar: "bg-red-500", text: "text-red-400" }
}

export default function ScoreBreakdown({ analysis }: Props) {
  return (
    <section className="flex flex-col justify-center rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p className="mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
        Score Breakdown
      </p>

      <div className="space-y-5">
        {METRICS.map(({ key, label }) => {
          const value = analysis.score_breakdown[key]
          const { bar, text } = getColor(value)

          return (
            <div key={key}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-200">
                  {label}
                </span>
                <span
                  className={`text-sm font-semibold tabular-nums ${text}`}
                >
                  {value}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${bar}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
