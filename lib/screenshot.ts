import { chromium } from "playwright"

/**
 * Capture a full-page PNG screenshot and return it as a base64 string.
 * Fails gracefully by returning an empty string on any error.
 */
export async function captureScreenshot(url: string): Promise<string> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null

  try {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30_000,
    })

    // Reasonable desktop viewport; fullPage will capture full height.
    await page.setViewportSize({ width: 1440, height: 900 })

    const buffer = await page.screenshot({
      type: "png",
      fullPage: true,
    })

    return buffer.toString("base64")
  } catch {
    // Fail gracefully: caller can detect empty string and ignore screenshot.
    return ""
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch {
        // ignore close errors
      }
    }
  }
}

