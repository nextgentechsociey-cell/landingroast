import { analyzeLanding } from "@/lib/analyzeLanding"

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// Resets on server restart; sufficient for a launch-day MVP.

const DAILY_LIMIT = 3

type Bucket = { date: string; count: number }
const ipBuckets = new Map<string, Bucket>()

function today() {
  return new Date().toISOString().slice(0, 10)
}

function isLocalIp(ip: string) {
  return ip === "::1" || ip === "127.0.0.1" || ip === "localhost" || ip === "unknown"
}

/** Returns whether the request is allowed and how many are remaining. */
function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  if (isLocalIp(ip)) return { allowed: true, remaining: DAILY_LIMIT }

  const date = today()
  const bucket = ipBuckets.get(ip)

  if (!bucket || bucket.date !== date) {
    ipBuckets.set(ip, { date, count: 1 })
    return { allowed: true, remaining: DAILY_LIMIT - 1 }
  }

  if (bucket.count >= DAILY_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  bucket.count += 1
  return { allowed: true, remaining: DAILY_LIMIT - bucket.count }
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // Parse body safely
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return Response.json(
        { success: false, error: "Invalid request body." },
        { status: 400 },
      )
    }

    const { url, roastMode, goal, fullSite } = body

    if (!url || typeof url !== "string" || !url.trim()) {
      return Response.json(
        { success: false, error: "A valid URL is required." },
        { status: 400 },
      )
    }

    // Normalise — auto-prepend https:// if missing
    const raw = url.trim()
    const normalised = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

    let parsed: URL
    try {
      parsed = new URL(normalised)
    } catch {
      return Response.json(
        {
          success: false,
          error: "That doesn't look like a valid URL. Try something like https://example.com",
        },
        { status: 400 },
      )
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return Response.json(
        { success: false, error: "Only HTTP and HTTPS URLs are supported." },
        { status: 400 },
      )
    }

    // Server-side rate limit check
    const ip = getClientIp(req)
    const { allowed, remaining } = checkRateLimit(ip)

    if (!allowed) {
      return Response.json(
        {
          success: false,
          error: "You've reached the free limit of 3 analyses per day. Come back tomorrow!",
          rateLimited: true,
        },
        {
          status: 429,
          headers: {
            "Retry-After": "86400",
            "X-RateLimit-Limit": String(DAILY_LIMIT),
            "X-RateLimit-Remaining": "0",
          },
        },
      )
    }

    const goalStr = typeof goal === "string" ? goal : undefined
    const fullSiteFlag = fullSite === true

    const result = await analyzeLanding(parsed.href, Boolean(roastMode), goalStr, fullSiteFlag)

    return Response.json(result, {
      headers: { "X-RateLimit-Remaining": String(remaining) },
    })
  } catch {
    return Response.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 },
    )
  }
}
