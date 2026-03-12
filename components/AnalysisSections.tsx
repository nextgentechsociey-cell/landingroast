import type { RoastAnalysis } from "@/lib/roasts"

type Props = {
  analysis: RoastAnalysis
}

const FALLBACK = "No feedback available."

function safe(value?: string | null) {
  return value?.trim() || FALLBACK
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
      {children}
    </p>
  )
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-slate-800 bg-slate-900 p-6 ${className}`}
    >
      {children}
    </div>
  )
}

// ─── Section 3: AI Feedback grid ─────────────────────────────────────────────

const FEEDBACK = [
  { key: "headline_feedback" as const, label: "Headline Feedback" },
  { key: "cta_feedback" as const, label: "CTA Feedback" },
  { key: "messaging_feedback" as const, label: "Messaging Feedback" },
  { key: "design_feedback" as const, label: "Design Feedback" },
]

function FeedbackGrid({ analysis }: { analysis: RoastAnalysis }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {FEEDBACK.map(({ key, label }) => (
        <Card key={key}>
          <Label>{label}</Label>
          <p className="text-sm leading-relaxed text-slate-300">
            {safe(analysis[key])}
          </p>
        </Card>
      ))}
    </div>
  )
}

// ─── Section 4: Improvements ──────────────────────────────────────────────────

function ImprovementsCard({ improvements }: { improvements: string[] }) {
  return (
    <Card>
      <Label>Top Improvements</Label>
      <ol className="space-y-4">
        {improvements.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-400">
              {i + 1}
            </span>
            <p className="text-sm leading-relaxed text-slate-300">{item}</p>
          </li>
        ))}
      </ol>
    </Card>
  )
}

// ─── Section 5: AI Rewrites ───────────────────────────────────────────────────

function RewritesCard({ analysis }: { analysis: RoastAnalysis }) {
  return (
    <Card className="space-y-7">
      {/* Improved Headlines */}
      <div>
        <Label>Improved Headlines</Label>
        <ul className="space-y-2">
          {analysis.improved_headlines.map((h, i) => (
            <li
              key={i}
              className="rounded-lg bg-slate-800/60 px-4 py-3 text-sm text-slate-200"
            >
              {h}
            </li>
          ))}
        </ul>
      </div>

      {/* Improved CTAs */}
      <div>
        <Label>Improved CTAs</Label>
        <div className="flex flex-wrap gap-2">
          {analysis.improved_ctas.map((cta, i) => (
            <span
              key={i}
              className="rounded-full border border-slate-700 bg-slate-800/50 px-4 py-1.5 text-sm font-medium text-slate-200"
            >
              {cta}
            </span>
          ))}
        </div>
      </div>

      {/* Rewritten Hero Paragraph */}
      <div>
        <Label>Rewritten Hero Paragraph</Label>
        <blockquote className="border-l-2 border-slate-600 pl-4">
          <p className="text-sm leading-relaxed text-slate-300">
            {safe(analysis.rewritten_hero_paragraph)}
          </p>
        </blockquote>
      </div>
    </Card>
  )
}

// ─── Section 6: Roast ────────────────────────────────────────────────────────

function RoastCard({ roast }: { roast: string }) {
  return (
    <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
          The Roast
        </p>
      </div>
      <p className="text-base italic leading-relaxed text-slate-200">
        &ldquo;{safe(roast)}&rdquo;
      </p>
    </div>
  )
}

// ─── Composed export ──────────────────────────────────────────────────────────

export default function AnalysisSections({ analysis }: Props) {
  return (
    <div className="space-y-5">
      {/* Section 3: AI Feedback */}
      <FeedbackGrid analysis={analysis} />

      {/* Section 6: Roast */}
      <RoastCard roast={analysis.roast} />

      {/* Sections 4 + 5: Improvements and AI Rewrites */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ImprovementsCard improvements={analysis.improvements} />
        <RewritesCard analysis={analysis} />
      </div>
    </div>
  )
}
