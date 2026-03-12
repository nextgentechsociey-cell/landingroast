import puppeteer from "puppeteer"

export async function captureScreenshot(url: string): Promise<string | null> {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      channel: "chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()

    await page.setViewport({
      width: 1280,
      height: 800,
    })

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60_000,
    })

    const screenshot = await page.screenshot({
      type: "jpeg",
      fullPage: true,
      quality: 80,
    })

    await browser.close()

    const base64 = Buffer.from(screenshot).toString("base64")
    return `data:image/jpeg;base64,${base64}`
  } catch (error) {
    console.error("Screenshot error:", error)
    return null
  }
}
