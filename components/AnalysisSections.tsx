import type { RoastAnalysis } from "@/lib/roasts"

type Props = {
  analysis: RoastAnalysis
}

const FALLBACK = "No feedback available."

function safe(value?: string | null) {
  return value?.trim() || FALLBACK
}

type Severity = "High" | "Medium" | "Low"

type Issue = {
  id: string
  severity: Severity
  title: string
  description: string
  fix: string
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function SeverityBadge({ level }: { level: Severity }) {
  const colorMap: Record<Severity, { bg: string; text: string }> = {
    High: {
      bg: "bg-red-500/15",
      text: "text-red-400",
    },
    Medium: {
      bg: "bg-amber-500/15",
      text: "text-amber-300",
    },
    Low: {
      bg: "bg-emerald-500/15",
      text: "text-emerald-300",
    },
  }
  const colors = colorMap[level]
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${colors.bg} ${colors.text}`}
    >
      {level}
    </span>
  )
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-100">{issue.title}</h3>
        <SeverityBadge level={issue.severity} />
      </div>
      <p className="mb-2 text-xs text-slate-400">{issue.description}</p>
      <p className="text-xs font-medium text-emerald-300">
        💡 {issue.fix}
      </p>
    </div>
  )
}

function IssuesSection({
  title,
  issues,
}: {
  title: string
  issues: Issue[]
}) {
  if (!issues.length) return null

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          {title}
        </h2>
        <p className="text-[11px] text-slate-500">
          {issues.length} issue{issues.length > 1 ? "s" : ""}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </section>
  )
}

// ─── Issue builders ───────────────────────────────────────────────────────────

function severityFromScore(score: number): Severity {
  if (score <= 40) return "High"
  if (score <= 70) return "Medium"
  return "Low"
}

function buildConversionIssues(analysis: RoastAnalysis): Issue[] {
  const fixes = analysis.conversion_fixes ?? []
  return fixes.map((fix, index) => {
    const severity: Severity =
      index === 0 ? "High" : index === 1 ? "Medium" : "Low"

    return {
      id: `conv-${index}`,
      severity,
      title: fix.title || "Conversion bottleneck",
      description: fix.problem || FALLBACK,
      fix: fix.solution || FALLBACK,
    }
  })
}

function buildUxIssues(analysis: RoastAnalysis): Issue[] {
  const issues: Issue[] = []
  const designScore = analysis.score_breakdown.design_hierarchy
  const frictionScore = analysis.score_breakdown.friction

  if (analysis.design_feedback) {
    issues.push({
      id: "ux-design",
      severity: severityFromScore(designScore),
      title: "Layout & visual hierarchy",
      description: safe(analysis.design_feedback),
      fix:
        analysis.improvements?.[0] ??
        "Make the most important content and CTA visually dominant above the fold.",
    })
  }

  if (frictionScore < 80) {
    issues.push({
      id: "ux-friction",
      severity: severityFromScore(frictionScore),
      title: "Interaction friction",
      description:
        "The path from first impression to primary action has avoidable friction or hesitation points.",
      fix:
        analysis.improvements?.[1] ??
        "Simplify the flow to the primary CTA and remove non-essential steps or distractions.",
    })
  }

  return issues
}

function buildCopyIssues(analysis: RoastAnalysis): Issue[] {
  const issues: Issue[] = []

  if (analysis.headline_feedback) {
    issues.push({
      id: "copy-headline",
      severity: "High",
      title: "Headline clarity",
      description: safe(analysis.headline_feedback),
      fix:
        analysis.improved_headlines?.[0] ??
        "Rewrite the headline to clearly state the outcome for a specific audience.",
    })
  }

  if (analysis.copy_feedback) {
    issues.push({
      id: "copy-body",
      severity: "Medium",
      title: "Body copy focus",
      description: safe(analysis.copy_feedback),
      fix:
        analysis.improvements?.[2] ??
        "Tighten long paragraphs into scannable, benefit-led bullets.",
    })
  }

  if (analysis.messaging_feedback) {
    issues.push({
      id: "copy-messaging",
      severity: "Medium",
      title: "Messaging & positioning",
      description: safe(analysis.messaging_feedback),
      fix:
        analysis.key_insights?.[0] ??
        "Lead with one core promise that clearly differentiates you from alternatives.",
    })
  }

  return issues
}

function buildTechnicalIssues(analysis: RoastAnalysis): Issue[] {
  const issues: Issue[] = []

  if (analysis.trust_feedback) {
    issues.push({
      id: "tech-trust",
      severity: "Medium",
      title: "Trust & proof placement",
      description: safe(analysis.trust_feedback),
      fix:
        "Move strong proof (logos, testimonials, metrics) closer to the main CTA and decision points.",
    })
  }

  const missing = analysis.missing_conversion_elements ?? []
  if (missing.length > 0) {
    issues.push({
      id: "tech-missing-elements",
      severity: "High",
      title: "Missing conversion elements",
      description: `The page is missing important elements for conversion: ${missing.join(
        ", ",
      )}.`,
      fix:
        "Add these elements near the hero and pricing sections so visitors have everything needed to decide.",
    })
  }

  return issues
}

// ─── Composed export ──────────────────────────────────────────────────────────

export default function AnalysisSections({ analysis }: Props) {
  const conversionIssues = buildConversionIssues(analysis)
  const uxIssues = buildUxIssues(analysis)
  const copyIssues = buildCopyIssues(analysis)
  const technicalIssues = buildTechnicalIssues(analysis)

  return (
    <div className="space-y-8">
      <IssuesSection title="Conversion Issues" issues={conversionIssues} />
      <IssuesSection title="UX Problems" issues={uxIssues} />
      <IssuesSection title="Copywriting Problems" issues={copyIssues} />
      <IssuesSection title="Technical Issues" issues={technicalIssues} />
    </div>
  )
}

