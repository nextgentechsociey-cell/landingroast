import type { RoastAnalysis } from "./roasts"

type SocialImagePayload = {
  url: string
  analysis: RoastAnalysis
}

const WIDTH = 1200
const HEIGHT = 630

function clampText(value: string, max: number) {
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (ctx.measureText(next).width <= maxWidth) {
      current = next
      continue
    }

    if (current) lines.push(current)
    current = word
  }

  if (current) lines.push(current)

  const limited = lines.slice(0, maxLines)
  if (lines.length > maxLines && limited.length > 0) {
    limited[limited.length - 1] = clampText(limited[limited.length - 1], limited[limited.length - 1].length - 1)
  }

  limited.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight)
  })

  return y + limited.length * lineHeight
}

export async function generateSocialImage(payload: SocialImagePayload) {
  const { url, analysis } = payload

  if (typeof document === "undefined") return null

  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = HEIGHT

  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Background
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  bg.addColorStop(0, "#020617")
  bg.addColorStop(1, "#0f172a")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Card container
  ctx.fillStyle = "#111827"
  ctx.strokeStyle = "#1f2937"
  ctx.lineWidth = 2
  const padding = 48
  const cardX = padding
  const cardY = 46
  const cardW = WIDTH - padding * 2
  const cardH = HEIGHT - cardY * 2
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, cardW, cardH, 22)
  ctx.fill()
  ctx.stroke()

  // Header
  ctx.fillStyle = "#94a3b8"
  ctx.font = "600 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  ctx.fillText("LandingRoast", cardX + 34, cardY + 48)

  const shortUrl = clampText(url.replace(/^https?:\/\//, ""), 52)
  ctx.fillStyle = "#64748b"
  ctx.font = "400 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  ctx.fillText(shortUrl, cardX + 34, cardY + 78)

  // Score block
  const score = Math.max(0, Math.min(100, Math.round(analysis.conversion_score)))
  let scoreColor = "#22c55e"
  if (score < 80) scoreColor = "#eab308"
  if (score < 50) scoreColor = "#ef4444"

  ctx.fillStyle = "#0b1220"
  ctx.beginPath()
  ctx.roundRect(cardX + 34, cardY + 110, 252, 176, 18)
  ctx.fill()

  ctx.fillStyle = "#94a3b8"
  ctx.font = "600 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  ctx.fillText("CONVERSION SCORE", cardX + 58, cardY + 146)

  ctx.fillStyle = scoreColor
  ctx.font = "700 76px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  ctx.fillText(`${score}`, cardX + 58, cardY + 232)

  ctx.fillStyle = "#64748b"
  ctx.font = "500 26px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  ctx.fillText("/100", cardX + 178, cardY + 232)

  // Headline feedback
  const feedbackX = cardX + 320
  const feedbackY = cardY + 132
  const feedbackW = cardW - 356

  ctx.fillStyle = "#cbd5e1"
  ctx.font = "600 15px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  ctx.fillText("Headline Feedback", feedbackX, feedbackY)

  ctx.fillStyle = "#e2e8f0"
  ctx.font = "500 24px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  wrapText(
    ctx,
    clampText(analysis.headline_feedback || "No headline feedback provided.", 220),
    feedbackX,
    feedbackY + 42,
    feedbackW,
    34,
    4,
  )

  // Roast block
  const roastY = cardY + 322
  ctx.fillStyle = "#1e293b"
  ctx.beginPath()
  ctx.roundRect(cardX + 34, roastY, cardW - 68, 186, 18)
  ctx.fill()

  ctx.fillStyle = "#f59e0b"
  ctx.font = "700 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  ctx.fillText("🔥 Roast", cardX + 58, roastY + 38)

  ctx.fillStyle = "#fde68a"
  ctx.font = "500 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
  wrapText(
    ctx,
    clampText(analysis.roast || "No roast available.", 180),
    cardX + 58,
    roastY + 90,
    cardW - 116,
    40,
    3,
  )

  return new Promise<string | null>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null)
        return
      }
      resolve(URL.createObjectURL(blob))
    }, "image/png")
  })
}
