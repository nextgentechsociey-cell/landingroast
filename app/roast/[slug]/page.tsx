import { redirect } from "next/navigation"

type Props = {
  params: Promise<{ slug: string }>
}

// Preserve old /roast/[slug] URLs — redirect to canonical /r/[slug]
export default async function RoastRedirect({ params }: Props) {
  const { slug } = await params
  redirect(`/r/${slug}`)
}
