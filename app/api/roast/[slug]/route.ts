import { getRoast } from "@/lib/roasts"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const roast = await getRoast(slug)

  if (!roast) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  return Response.json(roast)
}
