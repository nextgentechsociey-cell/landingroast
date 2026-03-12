import jsPDF from "jspdf"
import type { AnalysisResponse } from "./analyzeLanding"

// ─── Color palette (RGB tuples) ───────────────────────────────────────────────

const C = {
  headerBg:  [15,  23,  42]  as const,  // slate-950
  dark:      [30,  41,  59]  as const,  // slate-800
  mid:       [71,  85,  105] as const,  // slate-500
  light:     [148, 163, 184] as const,  // slate-400
  white:     [248, 250, 252] as const,  // slate-50
  indigo:    [99,  102, 241] as const,  // indigo-500
  subtle:    [226, 232, 240] as const,  // slate-200
  muted:     [241, 245, 249] as const,  // slate-100
  amberBg:   [255, 251, 235] as const,  // amber-50
  amberText: [146, 64,  14]  as const,  // amber-800
  green:     [34,  197, 94]  as const,  // green-500
  yellow:    [234, 179, 8]   as const,  // yellow-500
  orange:    [249, 115, 22]  as const,  // orange-500
  red:       [239, 68,  68]  as const,  // red-500
} satisfies Record<string, readonly [number, number, number]>

type RGB = readonly [number, number, number]

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreColor(value: number): RGB {
  if (value >= 75) return C.green
  if (value >= 60) return C.yellow
  if (value >= 45) return C.orange
  return C.red
}

function gradeLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 65) return "Good"
  if (score >= 50) return "Fair"
  if (score >= 35) return "Needs Work"
  return "Poor"
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generates and downloads a full LandingRoast PDF report.
 * Call as: generatePdfReport(result, url)
 */
export function generatePdfReport(result: AnalysisResponse, url: string): void {
  const analysis = result.analysis
  if (!analysis) return

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" })

  const PW = doc.internal.pageSize.getWidth()   // 595.28 pt
  const PH = doc.internal.pageSize.getHeight()  // 841.89 pt
  const M  = 48                                  // margin
  const CW = PW - M * 2                          // content width

  let y = 0

  // ─── DOM helpers ─────────────────────────────────────────────────────────────

  function tc(rgb: RGB)  { doc.setTextColor(rgb[0], rgb[1], rgb[2]) }
  function fc(rgb: RGB)  { doc.setFillColor(rgb[0], rgb[1], rgb[2]) }
  function dc(rgb: RGB)  { doc.setDrawColor(rgb[0], rgb[1], rgb[2]) }

  /** Add a new page and reset y to the top margin. */
  function newPage() {
    doc.addPage()
    y = M
  }

  /** Ensure `height` pts fit on the current page, otherwise break. */
  function guard(height: number) {
    if (y + height > PH - M - 28) newPage()  // 28 for footer
  }

  // ─── Section label ────────────────────────────────────────────────────────────

  function sectionLabel(text: string) {
    guard(28)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    tc(C.mid)
    doc.text(text.toUpperCase(), M, y)
    y += 5
    dc(C.subtle)
    doc.setLineWidth(0.4)
    doc.line(M, y, M + CW, y)
    y += 14
  }

  // ─── Score bar ────────────────────────────────────────────────────────────────

  const BAR_X = M + 110
  const BAR_W = 200
  const BAR_H = 7

  function scoreBar(label: string, value: number) {
    guard(22)
    const color = scoreColor(value)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    tc(C.dark)
    doc.text(label, M, y)

    // track
    fc(C.subtle)
    doc.roundedRect(BAR_X, y - BAR_H + 1, BAR_W, BAR_H, 2, 2, "F")

    // fill
    fc(color)
    doc.roundedRect(BAR_X, y - BAR_H + 1, (BAR_W * value) / 100, BAR_H, 2, 2, "F")

    // value label
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9.5)
    tc(color)
    doc.text(`${value}`, BAR_X + BAR_W + 10, y)

    y += 20
  }

  // ─── Feedback block (bold label + wrapped body) ───────────────────────────────

  function feedbackBlock(label: string, text: string) {
    const lines = doc.splitTextToSize(text, CW)
    guard(14 + lines.length * 12 + 10)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9.5)
    tc(C.dark)
    doc.text(label, M, y)
    y += 13

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    tc(C.mid)
    doc.text(lines, M, y)
    y += lines.length * 12 + 10
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // BUILD THE DOCUMENT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ─── Header band ─────────────────────────────────────────────────────────────

  fc(C.headerBg)
  doc.rect(0, 0, PW, 76, "F")

  y = 34
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  tc(C.white)
  doc.text("LandingRoast", M, y)

  y += 18
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  tc(C.light)
  doc.text("AI-Powered Landing Page Audit", M, y)

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  doc.text(dateStr, PW - M, 34, { align: "right" })

  y = 96

  // ─── URL ─────────────────────────────────────────────────────────────────────

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  tc(C.light)
  doc.text("URL ANALYZED", M, y)

  y += 13
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  tc(C.indigo)
  const displayUrl = url.length > 88 ? url.slice(0, 88) + "…" : url
  doc.text(displayUrl, M, y)

  y += 22

  // Divider
  dc(C.subtle)
  doc.setLineWidth(0.5)
  doc.line(M, y, M + CW, y)
  y += 20

  // ─── 1. Conversion Score ──────────────────────────────────────────────────────

  sectionLabel("Conversion Score")

  const sc = analysis.conversion_score
  const scColor = scoreColor(sc)

  // Big number
  doc.setFont("helvetica", "bold")
  doc.setFontSize(54)
  tc(scColor)
  doc.text(`${sc}`, M, y)

  // /100
  doc.setFont("helvetica", "normal")
  doc.setFontSize(18)
  tc(C.light)
  doc.text("/ 100", M + 78, y)

  // Grade badge
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  tc(scColor)
  doc.text(gradeLabel(sc), M + 148, y)

  y += 28

  // ─── 2. Score Breakdown ───────────────────────────────────────────────────────

  sectionLabel("Score Breakdown")
  scoreBar("Hero Clarity", analysis.score_breakdown.hero_clarity)
  scoreBar("CTA Strength", analysis.score_breakdown.cta_strength)
  scoreBar("Trust Signals", analysis.score_breakdown.trust_signals)
  scoreBar("Copywriting", analysis.score_breakdown.copywriting)
  scoreBar("Design Hierarchy", analysis.score_breakdown.design_hierarchy)
  scoreBar("Friction", analysis.score_breakdown.friction)
  y += 8

  // ─── 3. AI Feedback ───────────────────────────────────────────────────────────

  sectionLabel("AI Feedback")
  feedbackBlock("Headline Feedback", analysis.headline_feedback)
  feedbackBlock("CTA Feedback",      analysis.cta_feedback)
  feedbackBlock("Messaging Feedback", analysis.messaging_feedback)
  feedbackBlock("Design Feedback",   analysis.design_feedback)
  y += 4

  // ─── 4. Improvements ─────────────────────────────────────────────────────────

  sectionLabel("Top Improvements")

  analysis.improvements.forEach((item, i) => {
    const lines = doc.splitTextToSize(item, CW - 22)
    guard(14 + lines.length * 12 + 8)

    // Number circle
    fc(C.muted)
    doc.circle(M + 7, y - 4, 7, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    tc(C.mid)
    doc.text(`${i + 1}`, M + 7, y - 1, { align: "center" })

    // Text
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    tc(C.dark)
    doc.text(lines, M + 20, y)
    y += lines.length * 12 + 8
  })

  y += 8

  // ─── 5. AI Rewrite Suggestions ───────────────────────────────────────────────

  sectionLabel("AI Rewrite Suggestions")

  // Improved Headlines
  guard(20)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  tc(C.mid)
  doc.text("IMPROVED HEADLINES", M, y)
  y += 12

  analysis.improved_headlines.forEach((h) => {
    guard(22)
    fc(C.muted)
    doc.roundedRect(M, y - 11, CW, 17, 3, 3, "F")
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9.5)
    tc(C.dark)
    doc.text(h, M + 10, y)
    y += 23
  })

  y += 8

  // Improved CTAs
  guard(22)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  tc(C.mid)
  doc.text("IMPROVED CTAs", M, y)
  y += 14

  let ctaX = M
  analysis.improved_ctas.forEach((cta) => {
    const tw = doc.getTextWidth(cta) + 24
    if (ctaX + tw > M + CW) {
      ctaX = M
      y += 26
    }
    guard(24)
    fc(C.subtle)
    doc.roundedRect(ctaX, y - 12, tw, 18, 9, 9, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    tc(C.dark)
    doc.text(cta, ctaX + 12, y)
    ctaX += tw + 8
  })
  y += 28

  // Rewritten Hero Paragraph
  const heroLines = doc.splitTextToSize(analysis.rewritten_hero_paragraph, CW - 18)
  guard(14 + heroLines.length * 12 + 20)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  tc(C.mid)
  doc.text("REWRITTEN HERO PARAGRAPH", M, y)
  y += 14

  // Indigo left-border accent
  fc(C.indigo)
  doc.rect(M, y - 10, 2.5, heroLines.length * 12 + 10, "F")

  doc.setFont("helvetica", "italic")
  doc.setFontSize(9.5)
  tc(C.dark)
  doc.text(heroLines, M + 14, y)
  y += heroLines.length * 12 + 20

  // ─── 6. Roast ────────────────────────────────────────────────────────────────

  sectionLabel("The Roast")

  const roastLines = doc.splitTextToSize(`\u201c${analysis.roast}\u201d`, CW - 28)
  guard(roastLines.length * 12 + 36)

  fc(C.amberBg)
  doc.roundedRect(M, y - 14, CW, roastLines.length * 12 + 28, 4, 4, "F")

  doc.setFont("helvetica", "italic")
  doc.setFontSize(10.5)
  tc(C.amberText)
  doc.text(roastLines, M + 14, y)
  y += roastLines.length * 12 + 28

  // ─── Footer on every page ─────────────────────────────────────────────────────

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    tc(C.light)
    doc.text(
      `LandingRoast  ·  Page ${p} of ${totalPages}`,
      PW / 2,
      PH - 20,
      { align: "center" },
    )
  }

  // ─── Download ─────────────────────────────────────────────────────────────────

  const slug = url
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .slice(0, 30)
    .replace(/-+$/, "")

  doc.save(`landingroast-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
