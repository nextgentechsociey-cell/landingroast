import Link from "next/link"

const STATS = [
  { label: "Analyses this week", value: "24" },
  { label: "Average score", value: "58/100" },
  { label: "High impact fixes shipped", value: "11" },
]

const RECENT_REPORTS = [
  { url: "acme.com", score: 42, status: "Needs Attention", href: "/analyze?url=https%3A%2F%2Facme.com" },
  { url: "stripe.com", score: 71, status: "Needs Improvement", href: "/analyze?url=https%3A%2F%2Fstripe.com" },
  { url: "vercel.com", score: 84, status: "Good", href: "/analyze?url=https%3A%2F%2Fvercel.com" },
]

function statusColor(status: string) {
  if (status === "Good") return "text-emerald-300 border-emerald-500/40 bg-emerald-500/10"
  if (status === "Needs Improvement") return "text-amber-300 border-amber-500/40 bg-amber-500/10"
  return "text-red-300 border-red-500/40 bg-red-500/10"
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:py-14">
        <header className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/70 px-5 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400">LandingRoast</p>
            <h1 className="text-xl font-semibold text-white">Dashboard</h1>
          </div>
          <Link
            href="/analyze"
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            New Analysis
          </Link>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {STATS.map((stat) => (
            <article key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Reports</h2>
            <Link href="/analyze" className="text-sm text-blue-300 hover:text-blue-200">
              View all in analyzer
            </Link>
          </div>
          <div className="space-y-3">
            {RECENT_REPORTS.map((report) => (
              <article
                key={report.url}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{report.url}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Conversion score: {report.score}/100</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColor(report.status)}`}>
                    {report.status}
                  </span>
                  <Link
                    href={report.href}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    Open report
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
