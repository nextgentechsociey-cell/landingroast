import { notFound } from "next/navigation"
import { getReportById } from "@/lib/reports-db"
import LandingScore from "@/components/LandingScore"
import AnalysisSections from "@/components/AnalysisSections"

type Params = {
  params: { id: string }
}

export default async function ReportPage({ params }: Params) {
  const report = await getReportById(params.id)

  if (!report) {
    notFound()
  }

  const { url, title, headline, analysis } = report

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <header className="rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                LandingRoast Report
              </h1>
              <p className="mt-1 truncate text-xs text-slate-400">
                {url}
              </p>
              {title && (
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {title}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <LandingScore score={analysis.conversion_score} />
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Headline
              </p>
              <p className="mt-1.5 text-sm font-medium text-slate-100">
                {headline || "(no H1 detected)"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5 sm:hidden">
              <LandingScore score={analysis.conversion_score} />
            </div>
          </div>

          <div>
            <AnalysisSections analysis={analysis} />
          </div>
        </section>
      </div>
    </main>
  )
}

