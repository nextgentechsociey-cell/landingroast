import * as cheerio from "cheerio"
import type { AnyNode } from "domhandler"
import openai from "./openai"
import { captureScreenshot } from "./screenshot"
import {
  generateRoastSlug,
  getCachedRoastByUrl,
  saveRoast,
  setCachedRoast,
  type RoastCta,
  type CtaType,
  type RoastAnalysis,
} from "./roasts"
import { saveReport, type StoredReportPayload } from "./reports-db"

export type AnalysisResponse = {
  success: boolean
  cached?: boolean
  slug?: string
  roastUrl?: string
  page_snapshot?: string | null
  title?: string
  headline?: string
  ctas?: RoastCta[]
  analysis?: RoastAnalysis
  error?: string
  competitors?: CompetitorSnapshot[]
  reportId?: string
}

// ─── Types for optional full-site context ──────────────────────────────────────

type SitePageSummary = {
  url: string
  path: string
  title: string
  h1: string
  heroParagraph: string
  mainCtas: RoastCta[]
  imageCount: number
  videoCount: number
  imageAlts: string[]
  videoLabels: string[]
}

export type CompetitorSnapshot = {
  url: string
  headline: string
  cta: string
  heroText: string
  keyDifference: string
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_ANALYSIS: RoastAnalysis = {
  conversion_score: 50,
  score_breakdown: {
    hero_clarity: 50,
    cta_strength: 50,
    trust_signals: 50,
    copywriting: 50,
    design_hierarchy: 50,
    friction: 50,
  },
  missing_conversion_elements: [],
  weak_elements: [],
  strong_elements: [],
  key_insights: [
    "The value proposition is too generic to be clear above the fold.",
    "Competing CTAs create decision friction and dilute the primary action.",
    "Trust proof is too weak near the main conversion moment.",
  ],
  top_fixes: [
    "Rewrite the headline to clearly state the main benefit.",
    "Replace generic CTAs with benefit-driven action language.",
    "Add trust signals near the primary CTA (logos, testimonials, guarantees).",
  ],
  headline_feedback:
    "The headline needs a clearer value proposition with stronger specificity.",
  cta_feedback:
    "The CTA should lead with an action verb and communicate a direct benefit.",
  trust_feedback:
    "Add concrete proof points like testimonials, logos, or measurable outcomes to build credibility quickly.",
  copy_feedback:
    "Make the copy more benefit-led, specific, and concise so visitors grasp value faster.",
  messaging_feedback:
    "The messaging should explain the core benefit before anything else.",
  design_feedback:
    "Visual hierarchy needs work — the most important content should demand attention first.",
  improvements: [
    "Rewrite the headline to state the #1 customer outcome in plain language.",
    "Replace generic CTAs with benefit-led copy starting with a strong verb.",
    "Add at least one trust signal above the fold (testimonial, number, or logo).",
  ],
  conversion_fixes: [
    {
      title: "Clarify the primary hero message",
      problem: "Visitors need to work too hard to understand the offer in the first seconds.",
      solution: "Rewrite the hero to state one audience, one core benefit, and one desired outcome.",
      expected_conversion_impact: "Expected +8% to +15% improvement in engagement from above-the-fold clarity.",
    },
    {
      title: "Strengthen the primary CTA",
      problem: "Current CTAs are generic and do not communicate a concrete benefit.",
      solution: "Use one dominant CTA with a benefit-led verb phrase and repeat it in key sections.",
      expected_conversion_impact: "Expected +10% to +20% click-through rate on primary actions.",
    },
    {
      title: "Add trust proof near the hero",
      problem: "Credibility signals appear too late or are too weak to reduce hesitation.",
      solution: "Place customer logos, testimonial snippets, or quantified outcomes directly below the hero.",
      expected_conversion_impact: "Expected +5% to +12% conversion lift from reduced buyer skepticism.",
    },
    {
      title: "Reduce copy friction",
      problem: "Messaging is verbose and hides core value in long blocks of text.",
      solution: "Shorten copy into scannable sections with strong subheads and one idea per block.",
      expected_conversion_impact: "Expected +6% to +14% improvement in scroll depth and intent signals.",
    },
    {
      title: "Improve visual hierarchy",
      problem: "Important actions and messages compete with secondary content.",
      solution: "Increase contrast and spacing around hero value and CTA; demote low-priority elements.",
      expected_conversion_impact: "Expected +7% to +16% uplift in focused CTA interactions.",
    },
  ],
  improved_headlines: [
    "Turn More Visitors Into Paying Customers",
    "The Fastest Way to [Core Outcome]",
    "Stop Losing Leads. Start Converting.",
  ],
  improved_ctas: ["Start Free Trial", "See It in Action", "Get My Results"],
  rewritten_hero_paragraph:
    "Most landing pages bleed conversions because visitors can't figure out the value fast enough. This tool gives you an instant, expert-level audit so you can fix what's broken and ship a page that converts.",
  page_snapshot: null,
  roast:
    "Your page has energy, but the value proposition plays hide-and-seek. Lead with one clear promise and one clear CTA so visitors know exactly what to do.",
}

// ─── Sub-score type (what the AI returns — no conversion_score) ──────────────

type AIScores = {
  hero_clarity: number
  cta_strength: number
  trust_signals: number
  copywriting: number
  design_hierarchy: number
  friction: number
  key_insights: string[]
  top_fixes: string[]
  headline_feedback: string
  cta_feedback: string
  trust_feedback: string
  copy_feedback: string
  messaging_feedback: string
  design_feedback: string
  improvements: string[]
  conversion_fixes: {
    title: string
    problem: string
    solution: string
    expected_conversion_impact: string
  }[]
  improved_headlines: string[]
  improved_ctas: string[]
  rewritten_hero_paragraph: string
  roast: string
  scores?: {
    clarity: { score: number; reason: string }
    value_proposition: { score: number; reason: string }
    cta_strength: { score: number; reason: string }
    trust_signals: { score: number; reason: string }
    visual_hierarchy: { score: number; reason: string }
    friction: { score: number; reason: string }
  }
  rewrites?: {
    headline: string
    hero: string
    cta: string
    value_prop: string
  }
}

// ─── Scraping helpers ─────────────────────────────────────────────────────────

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function classifyCtaType(text: string): CtaType {
  const t = text.toLowerCase()
  if (
    /(learn more|read more|see more|view|explore|discover|pricing|docs|documentation|about|features|resources|blog|contact|login|log in|sign in)/.test(
      t,
    )
  )
    return "navigation"
  if (
    /(book|schedule|talk|contact sales|request|watch|demo|start free|try|get started|sign up|join|buy|purchase|download|install|subscribe)/.test(
      t,
    )
  )
    return "primary"
  return "secondary"
}

function dedupeTexts(values: string[]) {
  return Array.from(new Set(values.map(cleanText).filter(Boolean)))
}

function removeIgnoredNodes($: cheerio.CheerioAPI) {
  $(
    "nav, footer, aside, script, style, [role='navigation'], [data-cookie], [id*='cookie'], [class*='cookie'], [class*='nav'], [class*='footer'], [class*='menu']",
  ).each((_, el) => {
    $(el).remove()
  })
}

function getHeroRoot($: cheerio.CheerioAPI) {
  const candidates = [
    "main section:first-of-type",
    "main article:first-of-type",
    "main",
    "[role='main']",
    "header",
  ]
  for (const sel of candidates) {
    const el = $(sel).first()
    if (el.length) return el
  }
  return $("body")
}

function getHeroParagraph(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<AnyNode>,
) {
  const paras = dedupeTexts(
    root
      .find("p")
      .map((_, el) => $(el).text())
      .get(),
  ).filter(
    (p) =>
      p.length >= 40 &&
      !/^(home|about|pricing|contact|login|sign in|sign up|accept|decline)$/i.test(
        p,
      ),
  )
  return paras.find((p) => p.length >= 80) ?? paras[0] ?? ""
}

function extractCtas(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<AnyNode>,
): RoastCta[] {
  return dedupeTexts([
    ...root
      .find("button")
      .map((_, el) => $(el).text())
      .get(),
    ...root
      .find('a[role="button"], a')
      .map((_, el) => $(el).text())
      .get(),
    ...root
      .find('input[type="submit"], input[type="button"]')
      .map((_, el) => $(el).attr("value") ?? "")
      .get(),
  ])
    .filter((v) => v.length >= 2 && v.split(" ").length <= 6)
    .filter(
      (v) =>
        !/^(home|about|pricing|contact|blog|docs|features|resources|developers|products|solutions)$/i.test(
          v,
        ),
    )
    .slice(0, 5)
    .map((v) => ({ cta: v, type: classifyCtaType(v) }))
}

function extractMediaSummary($: cheerio.CheerioAPI, root: cheerio.Cheerio<AnyNode>) {
  const images = root.find("img")
  const videos = root.find("video, [data-video], [class*='video'], [id*='video']")

  const imageAlts = Array.from(
    new Set(
      images
        .map((_, el) => $(el).attr("alt") ?? "")
        .get()
        .map(cleanText)
        .filter(Boolean),
    ),
  ).slice(0, 5)

  const videoLabels = Array.from(
    new Set(
      videos
        .map((_, el) => {
          const $el = $(el)
          return (
            $el.attr("aria-label") ??
            $el.attr("title") ??
            $el.find("source").first().attr("src") ??
            ""
          )
        })
        .get()
        .map(cleanText)
        .filter(Boolean),
    ),
  ).slice(0, 3)

  return {
    imageCount: images.length,
    videoCount: videos.length,
    imageAlts,
    videoLabels,
  }
}

function summarisePage(url: string, html: string): SitePageSummary {
  const $ = cheerio.load(html)
  removeIgnoredNodes($)
  const heroRoot = getHeroRoot($)

  const title = cleanText($("title").first().text())
  const h1 = cleanText(
    heroRoot.find("h1").first().text() || $("h1").first().text(),
  )
  const heroParagraph = getHeroParagraph($, heroRoot)
  const mainCtas = extractCtas($, heroRoot)
  const media = extractMediaSummary($, heroRoot)

  const parsed = new URL(url)

  return {
    url,
    path: parsed.pathname || "/",
    title,
    h1,
    heroParagraph,
    mainCtas,
    imageCount: media.imageCount,
    videoCount: media.videoCount,
    imageAlts: media.imageAlts,
    videoLabels: media.videoLabels,
  }
}

async function crawlSite(
  startUrl: string,
  startHtml: string,
  maxPages = 5,
): Promise<SitePageSummary[]> {
  const results: SitePageSummary[] = []
  const visited = new Set<string>()

  let parsedStart: URL
  try {
    parsedStart = new URL(startUrl)
  } catch {
    return [summarisePage(startUrl, startHtml)]
  }

  type QueueItem = { url: string; html?: string }
  const queue: QueueItem[] = [{ url: parsedStart.href, html: startHtml }]

  while (queue.length > 0 && results.length < maxPages) {
    const item = queue.shift()!
    if (visited.has(item.url)) continue
    visited.add(item.url)

    let html = item.html
    if (!html) {
      try {
        const res = await fetch(item.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; LandingRoast/1.0)" },
        })
        html = await res.text()
      } catch {
        continue
      }
    }

    const pageSummary = summarisePage(item.url, html)
    results.push(pageSummary)

    const $ = cheerio.load(html)
    const links = $("a[href]")
      .map((_, el) => $(el).attr("href") ?? "")
      .get()
      .map((href) => href.trim())
      .filter(Boolean)
      .map((href) => {
        try {
          const absolute = new URL(href, parsedStart.href)
          return absolute
        } catch {
          return null
        }
      })
      .filter((u): u is URL => !!u)
      .filter(
        (u) =>
          u.origin === parsedStart.origin &&
          !u.hash &&
          !visited.has(u.href),
      )
      .sort((a, b) => a.pathname.length - b.pathname.length)
      .slice(0, 8)

    for (const u of links) {
      if (results.length + queue.length >= maxPages) break
      queue.push({ url: u.href })
    }
  }

  return results
}

// ─── Competitor helpers ────────────────────────────────────────────────────────

async function suggestCompetitors(input: {
  title: string
  metaDescription: string
  h1: string
  heroParagraph: string
}): Promise<string[]> {
  try {
    const prompt = `You are a market research assistant.

Based on the landing page below, suggest 3 realistic competitor products or services in the same category.
Only include well-formed, live-looking URLs for the main marketing homepage of each competitor.

Title: ${input.title || "(none)"}
Meta description: ${input.metaDescription || "(none)"}
H1: ${input.h1 || "(none)"}
Hero paragraph: ${input.heroParagraph || "(none)"} 

Return JSON only, following this shape:
{
  "competitors": [
    { "name": "<short brand or product name>", "url": "<https://competitor-homepage>" },
    ...
  ]
}`

    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "competitor_suggestions",
          strict: true,
          schema: COMPETITOR_SUGGEST_SCHEMA,
        },
      },
    })

    const parsed = JSON.parse(completion.output_text) as {
      competitors?: { name?: string; url?: string }[]
    }

    if (!parsed.competitors || !Array.isArray(parsed.competitors)) return []

    const urls = parsed.competitors
      .map((c) => (typeof c.url === "string" ? c.url.trim() : ""))
      .filter((u) => u.length > 0)
      .map((u) => {
        if (/^https?:\/\//i.test(u)) return u
        return `https://${u}`
      })
      .slice(0, 3)

    return urls
  } catch {
    return []
  }
}

async function fetchCompetitorSnapshot(url: string): Promise<{
  url: string
  headline: string
  cta: string
  heroText: string
} | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LandingRoast/1.0)" },
    })
    const html = await res.text()

    const $ = cheerio.load(html)
    removeIgnoredNodes($)
    const heroRoot = getHeroRoot($)

    const h1 = cleanText(heroRoot.find("h1").first().text() || $("h1").first().text())
    const heroParagraph = getHeroParagraph($, heroRoot)
    const ctas = extractCtas($, heroRoot)

    const mainCta =
      ctas.find((c) => c.type === "primary")?.cta ??
      ctas[0]?.cta ??
      ""

    if (!h1 && !heroParagraph && !mainCta) {
      return null
    }

    return {
      url,
      headline: h1,
      cta: mainCta,
      heroText: heroParagraph,
    }
  } catch {
    return null
  }
}

async function buildCompetitorSnapshots(options: {
  self: { title: string; h1: string; heroParagraph: string }
  suggestedUrls: string[]
}): Promise<CompetitorSnapshot[] | undefined> {
  if (!options.suggestedUrls.length) return undefined

  const rawSnapshots = await Promise.all(
    options.suggestedUrls.map((url) => fetchCompetitorSnapshot(url)),
  )

  const snapshots = rawSnapshots.filter(
    (s): s is { url: string; headline: string; cta: string; heroText: string } => s !== null,
  )

  if (!snapshots.length) return undefined

  try {
    const diffPrompt = `You are a CRO and positioning expert.

The following is the reference landing page:
- Headline: ${options.self.h1 || "(none)"}
- Hero: ${options.self.heroParagraph || "(none)"}

Below are ${snapshots.length} competitor homepages. For each competitor, write ONE clear sentence that describes the key difference in positioning, offer, or focus versus the reference page. Be specific and conversion-oriented.

${snapshots
  .map(
    (s, index) =>
      `Competitor ${index + 1} (${s.url}):
- Headline: ${s.headline || "(none)"}
- Hero: ${s.heroText || "(none)"} 
- CTA: ${s.cta || "(none)"}`,
  )
  .join("\n\n")}

Return JSON only:
{
  "differences": [
    "<difference for competitor 1>",
    "<difference for competitor 2>",
    "<difference for competitor 3>"
  ]
}`

    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: diffPrompt,
      text: {
        format: {
          type: "json_schema",
          name: "competitor_differences",
          strict: true,
          schema: COMPETITOR_DIFF_SCHEMA,
        },
      },
    })

    const parsed = JSON.parse(completion.output_text) as {
      differences?: string[]
    }

    const differences = Array.isArray(parsed.differences)
      ? parsed.differences.map((d) => safeStr(d, "")).filter(Boolean)
      : []

    return snapshots.map((s, index) => ({
      url: s.url,
      headline: s.headline,
      cta: s.cta,
      heroText: s.heroText,
      keyDifference: differences[index] ?? "",
    }))
  } catch {
    // If the secondary AI call fails, still return snapshots with empty keyDifference.
    return snapshots.map((s) => ({
      url: s.url,
      headline: s.headline,
      cta: s.cta,
      heroText: s.heroText,
      keyDifference: "",
    }))
  }
}

function detectDomStructure(
  $: cheerio.CheerioAPI,
  context: { h1: string; heroParagraph: string; ctas: RoastCta[] },
) {
  const hasHeroText = Boolean(context.h1) || context.heroParagraph.length >= 40
  const hasButtons = context.ctas.length > 0
  const hasForms = $("form").length > 0
  const pricingNodes = $(
    "table, [class*='pricing'], [id*='pricing'], [class*='plan'], [id*='plan'], [data-pricing]",
  )
  const hasPricingTables = pricingNodes.length > 0
  const testimonialNodes = $(
    "blockquote, [class*='testimonial'], [id*='testimonial'], [class*='review'], [id*='review'], [data-testimonial]",
  )
  const hasTestimonials = testimonialNodes.length > 0
  const logoNodes = $(
    "img[alt*='logo' i], [class*='logo'], [id*='logo'], [data-logo], [class*='brand'] img",
  )
  const hasLogos = logoNodes.length > 0
  const imageCount = $("img").length
  const hasImages = imageCount > 0
  const nav = $("nav").first()
  const navLinks = nav.length ? nav.find("a").length : $("header a").length
  const hasNavigation = nav.length > 0 || navLinks >= 3

  const missing_conversion_elements: string[] = []
  const weak_elements: string[] = []
  const strong_elements: string[] = []

  if (!hasHeroText) missing_conversion_elements.push("hero text")
  else if (context.h1.length >= 12 && context.heroParagraph.length >= 70) strong_elements.push("hero text")
  else weak_elements.push("hero text")

  if (!hasButtons) missing_conversion_elements.push("buttons")
  else if (context.ctas.length >= 2) strong_elements.push("buttons")
  else weak_elements.push("buttons")

  if (!hasForms) missing_conversion_elements.push("forms")
  else if ($("form").length <= 2) strong_elements.push("forms")
  else weak_elements.push("forms")

  if (!hasPricingTables) missing_conversion_elements.push("pricing tables")
  else if (pricingNodes.length >= 2) strong_elements.push("pricing tables")
  else weak_elements.push("pricing tables")

  if (!hasTestimonials) missing_conversion_elements.push("testimonials")
  else if (testimonialNodes.length >= 2) strong_elements.push("testimonials")
  else weak_elements.push("testimonials")

  if (!hasLogos) missing_conversion_elements.push("logos")
  else if (logoNodes.length >= 3) strong_elements.push("logos")
  else weak_elements.push("logos")

  if (!hasImages) missing_conversion_elements.push("images")
  else if (imageCount >= 3 && imageCount <= 30) strong_elements.push("images")
  else weak_elements.push("images")

  if (!hasNavigation) missing_conversion_elements.push("navigation")
  else if (navLinks >= 3 && navLinks <= 10) strong_elements.push("navigation")
  else weak_elements.push("navigation")

  return { missing_conversion_elements, weak_elements, strong_elements }
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildPrompt(
  title: string,
  metaDescription: string,
  h1: string,
  h2: string,
  ctas: RoastCta[],
  heroParagraph: string,
  roastMode: boolean,
  analysisGoal: string | undefined,
  sitePages: SitePageSummary[] | undefined,
) {
  const roastInstruction = roastMode
    ? "max 2 short sentences: witty and punchy, a little brutal, but still helpful with a concrete direction."
    : "max 2 short sentences: witty but professional and constructive, naming the biggest issue and the fix direction."

  const ctaList = ctas.length
    ? ctas.map((c) => `"${c.cta}" (${c.type})`).join(", ")
    : "No CTAs detected"

  const goalDescription =
    analysisGoal && analysisGoal.trim()
      ? analysisGoal.trim()
      : "General conversion: maximise the main action this page is designed for (signups, trials, purchases, or leads)."

  const siteSummary =
    sitePages && sitePages.length > 1
      ? sitePages
          .slice(0, 5)
          .map((page, index) => {
            const mediaBits: string[] = []
            if (page.imageCount > 0) {
              mediaBits.push(
                `${page.imageCount} images` +
                  (page.imageAlts.length
                    ? ` (examples: ${page.imageAlts.join("; ")})`
                    : ""),
              )
            }
            if (page.videoCount > 0) {
              mediaBits.push(
                `${page.videoCount} videos` +
                  (page.videoLabels.length
                    ? ` (examples: ${page.videoLabels.join("; ")})`
                    : ""),
              )
            }
            const mediaText = mediaBits.length ? mediaBits.join(" | ") : "no notable media detected"
            const ctasText = page.mainCtas.length
              ? page.mainCtas
                  .slice(0, 3)
                  .map((c) => `"${c.cta}" (${c.type})`)
                  .join(", ")
              : "no strong CTAs detected"

            return `${index + 1}. Path: ${page.path || "/"} — Title: ${
              page.title || "(none)"
            } — H1: ${page.h1 || "(none)"} — Media: ${mediaText} — Main CTAs: ${ctasText}`
          })
          .join("\n")
      : null

  return `You are a senior conversion rate optimisation (CRO) specialist with 10+ years of experience auditing SaaS and e-commerce landing pages.

Analyse the landing page data below and return a structured JSON assessment.

PRIMARY CONVERSION GOAL
- Optimise for this primary goal when scoring, writing insights, and proposing improvements.
- Goal: ${goalDescription}

VISUAL ANALYSIS
Analyse the visual layout of the page using the screenshot that is provided alongside this prompt.
Focus on:
- visual hierarchy
- CTA visibility
- clutter
- readability
- above the fold content

STRUCTURED CONVERSION SCORING ENGINE
You must compute scores in SIX categories. Each category score is an integer from 0–10 (higher is better) and has a short explanation of the main reason for that score.

1) clarity — how immediately the visitor understands what this is and who it is for.
2) value_proposition — how strong, differentiated, and concrete the main promise and outcome are.
3) cta_strength — how compelling, visible, and focused the primary call-to-action is.
4) trust_signals — how much credible proof (social proof, logos, numbers, guarantees) appears near the key actions.
5) visual_hierarchy — how well the layout guides attention from headline to CTA and key proof.
6) friction — how easy it feels to take the next step (forms, cognitive load, distractions, risk).

Each category must have this shape:
{ "score": <integer 0–10>, "reason": "<short one-sentence explanation>" }

REWRITE SUGGESTIONS
After identifying the main issues, write improved versions for:
- The main headline.
- The hero paragraph.
- The primary CTA text.
- A concise one-sentence value proposition that can be used in multiple places.

These must be returned under the "rewrites" object in the JSON, with this shape:
{
  "rewrites": {
    "headline": "<improved headline>",
    "hero": "<improved hero paragraph>",
    "cta": "<improved primary CTA copy>",
    "value_prop": "<sharp one-sentence value proposition>"
  }
}

## SCORING RUBRICS

Score each dimension independently from 0–100. Do NOT adjust one score based on another.

### hero_clarity (0–100) — Does a visitor instantly understand the offer?
- 90–100: Crystal-clear value proposition; a newcomer could explain the product after reading the headline alone
- 70–89: Clear but could be more specific or punchy
- 50–69: Requires effort to understand; vague or abstract language used
- 30–49: Confusing or contradictory messaging; key benefit is buried
- 0–29: Completely unclear or meaningless

### cta_strength (0–100) — How compelling are the calls to action?
- 90–100: Specific, benefit-led, strong action verbs, single clear primary CTA prominently placed
- 70–89: Clear CTAs but generic text or minor placement issues
- 50–69: Generic CTAs ("Submit", "Learn More") or too many competing choices
- 30–49: Passive CTAs, buried below fold, or decision paralysis from too many options
- 0–29: No CTAs detected, or CTAs that actively reduce conversion

### trust_signals (0–100) — Does the page build credibility?
- 90–100: Specific testimonials with names, concrete metrics, recognisable logos, guarantees
- 70–89: Some social proof but lacks specifics (e.g. "thousands of users" with no evidence)
- 50–69: Minimal trust signals; professional look but nothing to back up the claims
- 30–49: No social proof; makes claims it cannot support
- 0–29: Actively suspicious — spam-like language, no contact info, visible red flags

### copywriting (0–100) — Quality and effectiveness of the copy
- 90–100: Benefit-focused, specific, scannable, conversational, zero filler, emotionally resonant
- 70–89: Good copy with some feature-focus or corporate jargon
- 50–69: Acceptable but reads like a brochure instead of a conversation
- 30–49: Generic, verbose, or feature-list heavy
- 0–29: Poor structure, grammar issues, or copy so thin it provides no value

### design_hierarchy (0–100) — Is the page visually structured for fast scanning?
- 90–100: Immediate hierarchy, clear focal points, smooth flow from headline to CTA
- 70–89: Solid hierarchy with minor clutter or emphasis issues
- 50–69: Some structure, but visual priority is inconsistent
- 30–49: Weak hierarchy; key content competes for attention
- 0–29: Chaotic visual flow with no clear path to action

### friction (0–100) — How easy is it to take action? (higher is better)
- 90–100: Near-zero friction; minimal cognitive load and clear next step
- 70–89: Mostly smooth with small points of hesitation
- 50–69: Noticeable friction from ambiguity or too many choices
- 30–49: High friction from clutter, unclear copy, or weak CTA flow
- 0–29: Severe friction; users likely abandon before acting

## LANDING PAGE DATA

Title: ${title || "(none)"}
Meta description: ${metaDescription || "(none)"}
H1: ${h1 || "(none)"}
H2: ${h2 || "(none)"}
CTA buttons: ${ctaList}
Hero paragraph: ${heroParagraph || "(none)"}

Full-site context (optional, up to 5 key pages):
${siteSummary ?? "Only the analysed URL is available."}

## OUTPUT FORMAT

Return JSON only. No markdown, no code fences, no commentary before or after the JSON object.

{
  "hero_clarity": <integer 0–100>,
  "cta_strength": <integer 0–100>,
  "trust_signals": <integer 0–100>,
  "copywriting": <integer 0–100>,
  "design_hierarchy": <integer 0–100>,
  "friction": <integer 0–100>,
  "key_insights": [
    "<1 sentence: biggest conversion problem>",
    "<1 sentence: second biggest conversion problem>",
    "<1 sentence: third biggest conversion problem>"
  ],
  "top_fixes": [
    "<high-impact immediate fix>",
    "<second high-impact immediate fix>",
    "<third high-impact immediate fix>"
  ],
  "headline_feedback": "<2–3 sentences: what works, what to fix, one concrete suggestion>",
  "cta_feedback": "<2–3 sentences: what works, what to fix, one concrete suggestion>",
  "trust_feedback": "<2–3 sentences on credibility gaps and one concrete trust signal to add>",
  "copy_feedback": "<2–3 sentences on copy quality and one specific copy rewrite direction>",
  "messaging_feedback": "<2–3 sentences on message-market fit and positioning>",
  "design_feedback": "<2–3 sentences on visual hierarchy inferred from the copy structure>",
  "improvements": [
    "<highest-impact improvement — specific and actionable>",
    "<second improvement>",
    "<third improvement>"
  ],
  "conversion_fixes": [
    {
      "title": "<short action title>",
      "problem": "<what is hurting conversion now>",
      "solution": "<specific fix to implement>",
      "expected_conversion_impact": "<expected conversion impact in plain language>"
    },
    {
      "title": "<short action title>",
      "problem": "<what is hurting conversion now>",
      "solution": "<specific fix to implement>",
      "expected_conversion_impact": "<expected conversion impact in plain language>"
    },
    {
      "title": "<short action title>",
      "problem": "<what is hurting conversion now>",
      "solution": "<specific fix to implement>",
      "expected_conversion_impact": "<expected conversion impact in plain language>"
    },
    {
      "title": "<short action title>",
      "problem": "<what is hurting conversion now>",
      "solution": "<specific fix to implement>",
      "expected_conversion_impact": "<expected conversion impact in plain language>"
    },
    {
      "title": "<short action title>",
      "problem": "<what is hurting conversion now>",
      "solution": "<specific fix to implement>",
      "expected_conversion_impact": "<expected conversion impact in plain language>"
    }
  ],
  "improved_headlines": [
    "<headline — max 12 words, communicates a concrete benefit>",
    "<headline — max 12 words, communicates a concrete benefit>",
    "<headline — max 12 words, communicates a concrete benefit>"
  ],
  "improved_ctas": [
    "<CTA — max 4 words, starts with a strong verb>",
    "<CTA — max 4 words, starts with a strong verb>",
    "<CTA — max 4 words, starts with a strong verb>"
  ],
  "rewritten_hero_paragraph": "<2 sentences max — start with the visitor's problem or desire, then present the solution>",
  "roast": "<${roastInstruction}>",
  "scores": {
    "clarity": {
      "score": <integer 0–10>,
      "reason": "<short explanation of why this clarity score was given>"
    },
    "value_proposition": {
      "score": <integer 0–10>,
      "reason": "<short explanation of why this value proposition score was given>"
    },
    "cta_strength": {
      "score": <integer 0–10>,
      "reason": "<short explanation of why this CTA strength score was given>"
    },
    "trust_signals": {
      "score": <integer 0–10>,
      "reason": "<short explanation of why this trust signals score was given>"
    },
    "visual_hierarchy": {
      "score": <integer 0–10>,
      "reason": "<short explanation of why this visual hierarchy score was given>"
    },
    "friction": {
      "score": <integer 0–10>,
      "reason": "<short explanation of why this friction score was given>"
    }
  }
}

RULES:
- Score using only the rubrics above — no other scoring logic
- Final conversion score is computed server-side using weighted scoring:
  hero_clarity 20%, cta_strength 20%, trust_signals 15%, copywriting 20%, design_hierarchy 15%, friction 10%
- key_insights must contain exactly 3 insights and each insight must be exactly one sentence
- Generate a section called "top_fixes" with exactly 3 high-impact conversion improvements that the user should implement immediately.
- Each feedback field must include at least one specific, actionable suggestion (no generic advice)
- improved_headlines must communicate a concrete benefit — no puns or vague taglines
- improved_ctas must each start with a strong action verb (Get, Start, Try, Unlock, Claim, Build, etc.)
- improvements must be listed in priority order — highest impact first
- conversion_fixes must contain exactly 5 specific, non-redundant actions
- each conversion fix must include: title, problem, solution, expected_conversion_impact
- expected_conversion_impact should be realistic and expressed as likely conversion outcome (for example expected uplift ranges)
- roast must be a short punchy summary (maximum 2 sentences), witty but helpful
- All string values must be plain text — no markdown, bullet symbols, or HTML`
}

// ─── OpenAI JSON schema (AI-owned fields only) ───────────────────────────────

const AI_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    hero_clarity: { type: "integer" as const, minimum: 0, maximum: 100 },
    cta_strength: { type: "integer" as const, minimum: 0, maximum: 100 },
    trust_signals: { type: "integer" as const, minimum: 0, maximum: 100 },
    copywriting: { type: "integer" as const, minimum: 0, maximum: 100 },
    design_hierarchy: { type: "integer" as const, minimum: 0, maximum: 100 },
    friction: { type: "integer" as const, minimum: 0, maximum: 100 },
    key_insights: {
      type: "array" as const,
      minItems: 3,
      maxItems: 3,
      items: { type: "string" as const, minLength: 1 },
    },
    top_fixes: {
      type: "array" as const,
      minItems: 3,
      maxItems: 3,
      items: { type: "string" as const, minLength: 1 },
    },
    headline_feedback: { type: "string" as const, minLength: 1 },
    cta_feedback: { type: "string" as const, minLength: 1 },
    trust_feedback: { type: "string" as const, minLength: 1 },
    copy_feedback: { type: "string" as const, minLength: 1 },
    messaging_feedback: { type: "string" as const, minLength: 1 },
    design_feedback: { type: "string" as const, minLength: 1 },
    improvements: {
      type: "array" as const,
      minItems: 3,
      maxItems: 3,
      items: { type: "string" as const, minLength: 1 },
    },
    conversion_fixes: {
      type: "array" as const,
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          title: { type: "string" as const, minLength: 1 },
          problem: { type: "string" as const, minLength: 1 },
          solution: { type: "string" as const, minLength: 1 },
          expected_conversion_impact: { type: "string" as const, minLength: 1 },
        },
        required: [
          "title",
          "problem",
          "solution",
          "expected_conversion_impact",
        ],
      },
    },
    improved_headlines: {
      type: "array" as const,
      minItems: 3,
      maxItems: 3,
      items: { type: "string" as const, minLength: 1 },
    },
    improved_ctas: {
      type: "array" as const,
      minItems: 3,
      maxItems: 3,
      items: { type: "string" as const, minLength: 1 },
    },
    rewritten_hero_paragraph: { type: "string" as const, minLength: 1 },
    roast: { type: "string" as const, minLength: 1 },
    scores: {
      type: "object" as const,
      additionalProperties: false,
      properties: {
        clarity: {
          type: "object" as const,
          additionalProperties: false,
          properties: {
            score: { type: "integer" as const, minimum: 0, maximum: 10 },
            reason: { type: "string" as const, minLength: 1 },
          },
          required: ["score", "reason"],
        },
        value_proposition: {
          type: "object" as const,
          additionalProperties: false,
          properties: {
            score: { type: "integer" as const, minimum: 0, maximum: 10 },
            reason: { type: "string" as const, minLength: 1 },
          },
          required: ["score", "reason"],
        },
        cta_strength: {
          type: "object" as const,
          additionalProperties: false,
          properties: {
            score: { type: "integer" as const, minimum: 0, maximum: 10 },
            reason: { type: "string" as const, minLength: 1 },
          },
          required: ["score", "reason"],
        },
        trust_signals: {
          type: "object" as const,
          additionalProperties: false,
          properties: {
            score: { type: "integer" as const, minimum: 0, maximum: 10 },
            reason: { type: "string" as const, minLength: 1 },
          },
          required: ["score", "reason"],
        },
        visual_hierarchy: {
          type: "object" as const,
          additionalProperties: false,
          properties: {
            score: { type: "integer" as const, minimum: 0, maximum: 10 },
            reason: { type: "string" as const, minLength: 1 },
          },
          required: ["score", "reason"],
        },
        friction: {
          type: "object" as const,
          additionalProperties: false,
          properties: {
            score: { type: "integer" as const, minimum: 0, maximum: 10 },
            reason: { type: "string" as const, minLength: 1 },
          },
          required: ["score", "reason"],
        },
      },
      required: [
        "clarity",
        "value_proposition",
        "cta_strength",
        "trust_signals",
        "visual_hierarchy",
        "friction",
      ],
    },
    rewrites: {
      type: "object" as const,
      additionalProperties: false,
      properties: {
        headline: { type: "string" as const, minLength: 1 },
        hero: { type: "string" as const, minLength: 1 },
        cta: { type: "string" as const, minLength: 1 },
        value_prop: { type: "string" as const, minLength: 1 },
      },
      required: ["headline", "hero", "cta", "value_prop"],
    },
  },
  required: [
    "hero_clarity",
    "cta_strength",
    "trust_signals",
    "copywriting",
    "design_hierarchy",
    "friction",
    "key_insights",
    "top_fixes",
    "headline_feedback",
    "cta_feedback",
    "trust_feedback",
    "copy_feedback",
    "messaging_feedback",
    "design_feedback",
    "improvements",
    "conversion_fixes",
    "improved_headlines",
    "improved_ctas",
    "rewritten_hero_paragraph",
    "roast",
    "scores",
    "rewrites",
  ],
}

const COMPETITOR_SUGGEST_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    competitors: {
      type: "array" as const,
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object" as const,
        additionalProperties: false,
        properties: {
          name: { type: "string" as const, minLength: 1 },
          url: { type: "string" as const, minLength: 1 },
        },
        required: ["name", "url"],
      },
    },
  },
  required: ["competitors"],
}

const COMPETITOR_DIFF_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    differences: {
      type: "array" as const,
      minItems: 1,
      maxItems: 3,
      items: { type: "string" as const, minLength: 1 },
    },
  },
  required: ["differences"],
}

// ─── Normaliser ───────────────────────────────────────────────────────────────

function clampInt(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : fallback
  return Math.max(0, Math.min(100, Math.round(n)))
}

function clampCategoryScore(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : fallback
  return Math.max(0, Math.min(10, Math.round(n)))
}

function safeStr(value: unknown, fallback: string) {
  const s = typeof value === "string" ? value.trim() : ""
  return s || fallback
}

function safeStrArray(value: unknown, fallback: string[], limit = 3) {
  if (!Array.isArray(value)) return fallback
  const items = (value as unknown[])
    .map((item) => safeStr(item, ""))
    .filter(Boolean)
    .slice(0, limit)
  return items.length === limit ? items : fallback
}

function toSingleSentence(value: string) {
  const cleaned = cleanText(value)
  if (!cleaned) return ""
  const first = cleaned.match(/^[^.!?]+[.!?]?/)
  const sentence = (first?.[0] ?? cleaned).trim()
  if (!sentence) return ""
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`
}

function safeInsights(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback

  const items = (value as unknown[])
    .map((item) => safeStr(item, ""))
    .map(toSingleSentence)
    .filter(Boolean)
    .slice(0, 3)

  return items.length === 3 ? items : fallback
}

function limitSentences(value: string, maxSentences = 2) {
  const text = cleanText(value)
  if (!text) return ""

  const sentences = text.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) ?? []
  const limited = (sentences.length > 0 ? sentences : [text]).slice(0, maxSentences)

  return limited
    .map((sentence) => (/^[.!?]$/.test(sentence) ? "" : sentence))
    .filter(Boolean)
    .map((sentence) => (/[.!?]$/.test(sentence) ? sentence : `${sentence}.`))
    .join(" ")
}

function safeConversionFixes(
  value: unknown,
  fallback: RoastAnalysis["conversion_fixes"],
  limit = 5,
) {
  if (!Array.isArray(value)) return fallback

  const items = value
    .map((item) => {
      const v = typeof item === "object" && item !== null
        ? (item as Partial<RoastAnalysis["conversion_fixes"][number]>)
        : {}

      return {
        title: safeStr(v.title, ""),
        problem: safeStr(v.problem, ""),
        solution: safeStr(v.solution, ""),
        expected_conversion_impact: safeStr(v.expected_conversion_impact, ""),
      }
    })
    .filter((item) =>
      item.title &&
      item.problem &&
      item.solution &&
      item.expected_conversion_impact,
    )
    .slice(0, limit)

  return items.length === limit ? items : fallback
}

function safeStructuredScores(
  scores: AIScores["scores"] | undefined,
): RoastAnalysis["structured_scores"] | undefined {
  if (!scores) return undefined
  const clarityScore = clampCategoryScore(scores.clarity?.score, 5)
  const valueScore = clampCategoryScore(scores.value_proposition?.score, 5)
  const ctaScore = clampCategoryScore(scores.cta_strength?.score, 5)
  const trustScore = clampCategoryScore(scores.trust_signals?.score, 5)
  const visualScore = clampCategoryScore(scores.visual_hierarchy?.score, 5)
  const frictionScore = clampCategoryScore(scores.friction?.score, 5)

  return {
    clarity: {
      score: clarityScore,
      reason: safeStr(scores.clarity?.reason, "No clarity explanation provided."),
    },
    value_proposition: {
      score: valueScore,
      reason: safeStr(
        scores.value_proposition?.reason,
        "No value proposition explanation provided.",
      ),
    },
    cta_strength: {
      score: ctaScore,
      reason: safeStr(
        scores.cta_strength?.reason,
        "No CTA strength explanation provided.",
      ),
    },
    trust_signals: {
      score: trustScore,
      reason: safeStr(
        scores.trust_signals?.reason,
        "No trust signals explanation provided.",
      ),
    },
    visual_hierarchy: {
      score: visualScore,
      reason: safeStr(
        scores.visual_hierarchy?.reason,
        "No visual hierarchy explanation provided.",
      ),
    },
    friction: {
      score: frictionScore,
      reason: safeStr(
        scores.friction?.reason,
        "No friction explanation provided.",
      ),
    },
  }
}

function safeStructuredRewrites(
  rewrites: AIScores["rewrites"] | undefined,
  analysis: RoastAnalysis,
): RoastAnalysis["structured_rewrites"] | undefined {
  if (!rewrites) {
    return {
      headline: analysis.improved_headlines?.[0] ?? "",
      hero: analysis.rewritten_hero_paragraph,
      cta: analysis.improved_ctas?.[0] ?? "",
      value_prop: analysis.key_insights?.[0] ?? "",
    }
  }

  return {
    headline: safeStr(
      rewrites.headline,
      analysis.improved_headlines?.[0] ?? "",
    ),
    hero: safeStr(
      rewrites.hero,
      analysis.rewritten_hero_paragraph,
    ),
    cta: safeStr(
      rewrites.cta,
      analysis.improved_ctas?.[0] ?? "",
    ),
    value_prop: safeStr(
      rewrites.value_prop,
      analysis.key_insights?.[0] ?? "",
    ),
  }
}

function normalizeStoredAnalysis(raw: RoastAnalysis): RoastAnalysis {
  const legacy = raw as unknown as {
    clarity?: number
    trust?: number
    copywriting?: number
    cta_strength?: number
  }

  const breakdown = raw.score_breakdown ?? {
    hero_clarity: clampInt(legacy.clarity, DEFAULT_ANALYSIS.score_breakdown.hero_clarity),
    cta_strength: clampInt(legacy.cta_strength, DEFAULT_ANALYSIS.score_breakdown.cta_strength),
    trust_signals: clampInt(legacy.trust, DEFAULT_ANALYSIS.score_breakdown.trust_signals),
    copywriting: clampInt(legacy.copywriting, DEFAULT_ANALYSIS.score_breakdown.copywriting),
    design_hierarchy: DEFAULT_ANALYSIS.score_breakdown.design_hierarchy,
    friction: DEFAULT_ANALYSIS.score_breakdown.friction,
  }

  const weightedScore = Math.round(
    breakdown.hero_clarity * 0.2 +
      breakdown.cta_strength * 0.2 +
      breakdown.trust_signals * 0.15 +
      breakdown.copywriting * 0.2 +
      breakdown.design_hierarchy * 0.15 +
      breakdown.friction * 0.1,
  )

  return {
    ...DEFAULT_ANALYSIS,
    ...raw,
    conversion_score: clampInt(raw.conversion_score, weightedScore),
    score_breakdown: {
      hero_clarity: clampInt(
        breakdown.hero_clarity,
        DEFAULT_ANALYSIS.score_breakdown.hero_clarity,
      ),
      cta_strength: clampInt(
        breakdown.cta_strength,
        DEFAULT_ANALYSIS.score_breakdown.cta_strength,
      ),
      trust_signals: clampInt(
        breakdown.trust_signals,
        DEFAULT_ANALYSIS.score_breakdown.trust_signals,
      ),
      copywriting: clampInt(
        breakdown.copywriting,
        DEFAULT_ANALYSIS.score_breakdown.copywriting,
      ),
      design_hierarchy: clampInt(
        breakdown.design_hierarchy,
        DEFAULT_ANALYSIS.score_breakdown.design_hierarchy,
      ),
      friction: clampInt(
        breakdown.friction,
        DEFAULT_ANALYSIS.score_breakdown.friction,
      ),
    },
    missing_conversion_elements: Array.isArray(raw.missing_conversion_elements)
      ? raw.missing_conversion_elements.map((v) => safeStr(v, "")).filter(Boolean)
      : DEFAULT_ANALYSIS.missing_conversion_elements,
    weak_elements: Array.isArray(raw.weak_elements)
      ? raw.weak_elements.map((v) => safeStr(v, "")).filter(Boolean)
      : DEFAULT_ANALYSIS.weak_elements,
    strong_elements: Array.isArray(raw.strong_elements)
      ? raw.strong_elements.map((v) => safeStr(v, "")).filter(Boolean)
      : DEFAULT_ANALYSIS.strong_elements,
    key_insights: safeInsights(raw.key_insights, DEFAULT_ANALYSIS.key_insights),
    top_fixes: safeStrArray(raw.top_fixes, DEFAULT_ANALYSIS.top_fixes ?? [], 3),
    roast: limitSentences(safeStr(raw.roast, DEFAULT_ANALYSIS.roast), 2),
  }
}

function normalizeAIResponse(raw: unknown): RoastAnalysis {
  const v =
    typeof raw === "object" && raw !== null ? (raw as Partial<AIScores>) : {}

  const score_breakdown = {
    hero_clarity: clampInt(
      v.hero_clarity,
      DEFAULT_ANALYSIS.score_breakdown.hero_clarity,
    ),
    cta_strength: clampInt(
      v.cta_strength,
      DEFAULT_ANALYSIS.score_breakdown.cta_strength,
    ),
    trust_signals: clampInt(
      v.trust_signals,
      DEFAULT_ANALYSIS.score_breakdown.trust_signals,
    ),
    copywriting: clampInt(
      v.copywriting,
      DEFAULT_ANALYSIS.score_breakdown.copywriting,
    ),
    design_hierarchy: clampInt(
      v.design_hierarchy,
      DEFAULT_ANALYSIS.score_breakdown.design_hierarchy,
    ),
    friction: clampInt(v.friction, DEFAULT_ANALYSIS.score_breakdown.friction),
  }

  const conversion_score = Math.round(
    score_breakdown.hero_clarity * 0.2 +
      score_breakdown.cta_strength * 0.2 +
      score_breakdown.trust_signals * 0.15 +
      score_breakdown.copywriting * 0.2 +
      score_breakdown.design_hierarchy * 0.15 +
      score_breakdown.friction * 0.1,
  )

  const base: RoastAnalysis = {
    conversion_score,
    score_breakdown,
    missing_conversion_elements: DEFAULT_ANALYSIS.missing_conversion_elements,
    weak_elements: DEFAULT_ANALYSIS.weak_elements,
    strong_elements: DEFAULT_ANALYSIS.strong_elements,
    key_insights: safeInsights(v.key_insights, DEFAULT_ANALYSIS.key_insights),
    top_fixes: safeStrArray(v.top_fixes, DEFAULT_ANALYSIS.top_fixes ?? [], 3),
    headline_feedback: safeStr(
      v.headline_feedback,
      DEFAULT_ANALYSIS.headline_feedback,
    ),
    cta_feedback: safeStr(v.cta_feedback, DEFAULT_ANALYSIS.cta_feedback),
    trust_feedback: safeStr(
      v.trust_feedback,
      DEFAULT_ANALYSIS.trust_feedback,
    ),
    copy_feedback: safeStr(
      v.copy_feedback,
      DEFAULT_ANALYSIS.copy_feedback,
    ),
    messaging_feedback: safeStr(
      v.messaging_feedback,
      DEFAULT_ANALYSIS.messaging_feedback,
    ),
    design_feedback: safeStr(
      v.design_feedback,
      DEFAULT_ANALYSIS.design_feedback,
    ),
    improvements: safeStrArray(v.improvements, DEFAULT_ANALYSIS.improvements),
    conversion_fixes: safeConversionFixes(
      v.conversion_fixes,
      DEFAULT_ANALYSIS.conversion_fixes,
    ),
    improved_headlines: safeStrArray(
      v.improved_headlines,
      DEFAULT_ANALYSIS.improved_headlines,
    ),
    improved_ctas: safeStrArray(
      v.improved_ctas,
      DEFAULT_ANALYSIS.improved_ctas,
    ),
    rewritten_hero_paragraph: safeStr(
      v.rewritten_hero_paragraph,
      DEFAULT_ANALYSIS.rewritten_hero_paragraph,
    ),
    roast: limitSentences(safeStr(v.roast, DEFAULT_ANALYSIS.roast), 2),
    structured_scores: undefined, // filled just below
    structured_rewrites: undefined,
  }

  base.structured_scores = safeStructuredScores(v.scores)
  base.structured_rewrites = safeStructuredRewrites(v.rewrites, base)

  return base
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function analyzeLanding(
  url: string,
  roastMode: boolean,
  analysisGoal?: string,
  fullSite?: boolean,
): Promise<AnalysisResponse> {
  try {
    const cached = await getCachedRoastByUrl(url)
    if (cached) {
      const normalizedCached = normalizeStoredAnalysis(cached.analysis)
      return {
        success: true,
        cached: true,
        slug: cached.slug,
        roastUrl: `/r/${cached.slug}`,
        page_snapshot: normalizedCached.page_snapshot,
        title: cached.title,
        headline: cached.headline,
        ctas: cached.ctas,
        analysis: normalizedCached,
      }
    }

    // Scrape
    const pageResponse = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LandingRoast/1.0)" },
    })
    const html = await pageResponse.text()

    const $structure = cheerio.load(html)
    const structureRoot = getHeroRoot($structure)
    const structureH1 = cleanText(
      structureRoot.find("h1").first().text() || $structure("h1").first().text(),
    )
    const structureHero = getHeroParagraph($structure, structureRoot)
    const structureCtas = extractCtas($structure, structureRoot)
    const domStructure = detectDomStructure($structure, {
      h1: structureH1,
      heroParagraph: structureHero,
      ctas: structureCtas,
    })

    const $ = cheerio.load(html)
    removeIgnoredNodes($)
    const heroRoot = getHeroRoot($)

    const title = cleanText($("title").first().text())
    const metaDescription = cleanText(
      $('meta[name="description"]').attr("content") ?? "",
    )
    const h1 = cleanText(
      heroRoot.find("h1").first().text() || $("h1").first().text(),
    )
    const h2 = cleanText(
      heroRoot.find("h2").first().text() || $("h2").first().text(),
    )
    const heroParagraph = getHeroParagraph($, heroRoot)
    const ctas = extractCtas($, heroRoot)

    const sitePages = fullSite ? await crawlSite(url, html, 5) : undefined

    // Screenshot capture (fails gracefully).
    let screenshotDataUrl: string | null = null
    let screenshotBase64ForModel: string | null = null
    try {
      const captured = await captureScreenshot(url)
      if (captured && captured.length > 0) {
        if (captured.startsWith("data:image/")) {
          screenshotDataUrl = captured
          const [, base64] = captured.split(",", 2)
          screenshotBase64ForModel = base64 || null
        } else {
          screenshotBase64ForModel = captured
          screenshotDataUrl = `data:image/jpeg;base64,${captured}`
        }
      }
    } catch {
      screenshotDataUrl = null
      screenshotBase64ForModel = null
    }

    // AI call
    const prompt = buildPrompt(
      title,
      metaDescription,
      h1,
      h2,
      ctas,
      heroParagraph,
      roastMode,
      analysisGoal,
      sitePages,
    )

    const input =
      screenshotBase64ForModel != null
        ? [
            {
              role: "user" as const,
              content: [
                {
                  type: "input_text" as const,
                  text: prompt,
                },
                {
                  type: "input_image" as const,
                  image_url: `data:image/jpeg;base64,${screenshotBase64ForModel}`,
                  detail: "auto" as const,
                },
              ],
            },
          ]
        : prompt

    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input,
      text: {
        format: {
          type: "json_schema",
          name: "landing_page_analysis",
          strict: true,
          schema: AI_SCHEMA,
        },
      },
    })

    const analysis = {
      ...normalizeAIResponse(JSON.parse(completion.output_text)),
      ...domStructure,
      page_snapshot: screenshotDataUrl ?? null,
    }

    // ── Competitor comparison (best-effort, fail gracefully) ───────────────────
    let competitors: CompetitorSnapshot[] | undefined
    try {
      const competitorUrls = await suggestCompetitors({
        title,
        metaDescription,
        h1,
        heroParagraph,
      })

      if (competitorUrls.length) {
        competitors = await buildCompetitorSnapshots({
          self: { title, h1, heroParagraph },
          suggestedUrls: competitorUrls,
        })
      }
    } catch {
      competitors = undefined
    }
    const slug = generateRoastSlug(url)

    await saveRoast({
      slug,
      url,
      title,
      headline: h1,
      ctas,
      analysis,
      createdAt: new Date().toISOString(),
    })
    await setCachedRoast(url, slug)

    // Best-effort: store a copy of the analysis in Supabase for shareable reports.
    const reportPayload: StoredReportPayload = {
      url,
      title,
      headline: h1,
      analysis,
      roastUrl: `/r/${slug}`,
      competitors,
    }
    // Fire and forget; failures are ignored so core analysis still works.
    void saveReport(slug, url, reportPayload)

    return {
      success: true,
      cached: false,
      slug,
      roastUrl: `/r/${slug}`,
      page_snapshot: analysis.page_snapshot,
      title,
      headline: h1,
      ctas,
      analysis,
      competitors,
      reportId: slug,
    }
  } catch {
    return { success: false, error: "Analysis failed" }
  }
}
