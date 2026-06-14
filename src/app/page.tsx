import Link from 'next/link'
import {
  supabase,
  type PortcoDB,
  type SCUpload,
  type GAUpload,
  type SEMUpload,
  type FunnelUpload,
} from '@/lib/supabase'
import {
  fmtNum,
  fmtPct,
  fmtPos,
  fmtDate,
  fmtCurrency,
  fmtDuration,
  authorityColor,
  positionColor,
  ctrColor,
} from '@/lib/format'

type PortcoRow = {
  portco: PortcoDB
  sc: SCUpload | null
  ga: GAUpload | null
  sem: SEMUpload | null
  funnel: FunnelUpload | null
}

async function getDashboardData(): Promise<PortcoRow[]> {
  if (!supabase) return []

  const [portcosRes, scRes, gaRes, semRes, funnelRes] = await Promise.all([
    supabase.from('portcos').select('*').order('name'),
    supabase.from('search_console_uploads').select('*').order('uploaded_at', { ascending: false }),
    supabase.from('analytics_uploads').select('*').order('uploaded_at', { ascending: false }),
    supabase.from('semrush_uploads').select('*').order('uploaded_at', { ascending: false }),
    supabase.from('funnel_uploads').select('*').order('uploaded_at', { ascending: false }),
  ])

  const portcos: PortcoDB[] = portcosRes.data ?? []
  const latestSC = new Map<string, SCUpload>()
  const latestGA = new Map<string, GAUpload>()
  const latestSEM = new Map<string, SEMUpload>()
  const latestFunnel = new Map<string, FunnelUpload>()

  for (const r of (scRes.data ?? []) as SCUpload[]) {
    if (!latestSC.has(r.portco_id)) latestSC.set(r.portco_id, r)
  }
  for (const r of (gaRes.data ?? []) as GAUpload[]) {
    if (!latestGA.has(r.portco_id)) latestGA.set(r.portco_id, r)
  }
  for (const r of (semRes.data ?? []) as SEMUpload[]) {
    if (!latestSEM.has(r.portco_id)) latestSEM.set(r.portco_id, r)
  }
  for (const r of (funnelRes.data ?? []) as FunnelUpload[]) {
    if (!latestFunnel.has(r.portco_id)) latestFunnel.set(r.portco_id, r)
  }

  return portcos.map(p => ({
    portco: p,
    sc: latestSC.get(p.id) ?? null,
    ga: latestGA.get(p.id) ?? null,
    sem: latestSEM.get(p.id) ?? null,
    funnel: latestFunnel.get(p.id) ?? null,
  }))
}

function Dash() {
  return <span className="text-slate-200">—</span>
}

function Cell({
  children,
  className = '',
  divider = false,
}: {
  children: React.ReactNode
  className?: string
  divider?: boolean
}) {
  return (
    <td className={`px-3 py-3 text-sm text-right whitespace-nowrap ${divider ? 'border-l border-slate-100' : ''} ${className}`}>
      {children}
    </td>
  )
}

function ColHead({ children, divider = false }: { children: React.ReactNode; divider?: boolean }) {
  return (
    <th className={`px-3 py-2 text-right text-[11px] font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap ${divider ? 'border-l border-slate-100' : ''}`}>
      {children}
    </th>
  )
}

function SourceBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${color}`}>
      {label}
    </span>
  )
}

function StatCard({ label, value, sub, color = 'text-slate-800' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 px-5 py-4 shadow-sm">
      <div className={`text-2xl font-bold ${color} leading-none`}>{value}</div>
      <div className="text-xs font-medium text-slate-500 mt-1.5">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  )
}

export default async function DashboardPage() {
  const rows = await getDashboardData()
  const isConfigured = !!supabase

  const withSEM = rows.filter(r => r.sem).length
  const withSC = rows.filter(r => r.sc).length
  const withGA = rows.filter(r => r.ga).length
  const withFunnel = rows.filter(r => r.funnel).length

  const totalTraffic = rows.reduce((s, r) => s + (r.sem?.organic_traffic ?? 0), 0)
  const totalPipeline = rows.reduce((s, r) => s + (r.funnel?.pipeline_arr ?? 0), 0)
  const totalMQLs = rows.reduce((s, r) => s + (r.funnel?.mqls ?? 0), 0)

  const hasAnyData = rows.some(r => r.sc || r.ga || r.sem || r.funnel)
  const coverage = Math.round(((withSEM + withSC + withGA + withFunnel) / 44) * 100)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#0D1B2A] text-white px-6 flex items-center justify-between h-14 shadow-lg sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shrink-0">
            <span className="text-[#0D1B2A] font-bold text-xs">T</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-sm">Tern Capital</span>
            <span className="text-slate-500 text-xs hidden sm:inline">Portfolio Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">{rows.length} companies</span>
          <Link
            href="/upload"
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-lg text-xs font-semibold border border-white/10 transition-colors"
          >
            Upload data
          </Link>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-5 max-w-[1600px] mx-auto">
        {!isConfigured && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
            <strong>Setup required:</strong> Add Supabase credentials to environment variables, then run both migrations.
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
          <StatCard label="Portfolio companies" value={rows.length} />
          <StatCard
            label="Organic traffic"
            value={totalTraffic > 0 ? fmtNum(totalTraffic) : '—'}
            sub="across all portcos"
            color="text-emerald-700"
          />
          <StatCard
            label="Total pipeline"
            value={totalPipeline > 0 ? fmtCurrency(totalPipeline) : '—'}
            sub="latest upload"
            color="text-purple-700"
          />
          <StatCard
            label="Total MQLs"
            value={totalMQLs > 0 ? fmtNum(totalMQLs) : '—'}
            sub="latest upload"
          />
          <StatCard
            label="Data coverage"
            value={`${coverage}%`}
            sub={`${withSEM + withSC + withGA + withFunnel} / 44 sources filled`}
            color={coverage > 60 ? 'text-emerald-700' : coverage > 30 ? 'text-amber-600' : 'text-red-500'}
          />
          <div className="bg-white rounded-xl border border-slate-100 px-5 py-4 shadow-sm text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">SEMrush</span>
              <span className="font-semibold text-slate-700">{withSEM} / {rows.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Search Console</span>
              <span className="font-semibold text-slate-700">{withSC} / {rows.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">GA4</span>
              <span className="font-semibold text-slate-700">{withGA} / {rows.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Funnel</span>
              <span className="font-semibold text-slate-700">{withFunnel} / {rows.length}</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">All companies</span>
              {hasAnyData && (
                <span className="text-xs text-slate-400">· latest upload per source</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span><span className="text-emerald-500 font-bold">●</span> Good</span>
              <span><span className="text-amber-500 font-bold">●</span> Mid</span>
              <span><span className="text-red-400 font-bold">●</span> Weak</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th rowSpan={2} className="text-left px-4 py-2 text-[11px] font-medium text-slate-400 uppercase tracking-wide bg-slate-50 border-r border-slate-100 min-w-[190px] sticky left-0 z-10">
                    Company
                  </th>
                  <th colSpan={4} className="border-l border-slate-100 py-2 text-center bg-emerald-50/60">
                    <SourceBadge label="SEMrush" color="text-emerald-700" />
                  </th>
                  <th colSpan={4} className="border-l border-slate-100 py-2 text-center bg-blue-50/60">
                    <SourceBadge label="Search Console" color="text-blue-700" />
                  </th>
                  <th colSpan={5} className="border-l border-slate-100 py-2 text-center bg-orange-50/60">
                    <SourceBadge label="Google Analytics" color="text-orange-700" />
                  </th>
                  <th colSpan={4} className="border-l border-slate-100 py-2 text-center bg-purple-50/60">
                    <SourceBadge label="Sales Funnel" color="text-purple-700" />
                  </th>
                </tr>
                <tr className="border-b-2 border-slate-100 bg-slate-50/50">
                  <ColHead divider>Auth</ColHead>
                  <ColHead>Traffic</ColHead>
                  <ColHead>Keywords</ColHead>
                  <ColHead>Backlinks</ColHead>
                  <ColHead divider>Clicks</ColHead>
                  <ColHead>Impr.</ColHead>
                  <ColHead>CTR</ColHead>
                  <ColHead>Position</ColHead>
                  <ColHead divider>Users</ColHead>
                  <ColHead>Sessions</ColHead>
                  <ColHead>Visits</ColHead>
                  <ColHead>Time on site</ColHead>
                  <ColHead>Bounce</ColHead>
                  <ColHead divider>MQLs</ColHead>
                  <ColHead>SQLs</ColHead>
                  <ColHead>Pipeline</ColHead>
                  <ColHead>Avg deal</ColHead>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  Array.from({ length: 11 }, (_, i) => (
                    <tr key={i} className="border-b border-slate-50 animate-pulse">
                      <td className="px-4 py-4 border-r border-slate-100 bg-white sticky left-0">
                        <div className="h-4 bg-slate-100 rounded w-28 mb-1.5" />
                        <div className="h-3 bg-slate-50 rounded w-20" />
                      </td>
                      {Array.from({ length: 17 }, (_, j) => (
                        <td key={j} className="px-3 py-4">
                          <div className="h-3 bg-slate-100 rounded w-10 ml-auto" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  rows.map(({ portco, sc, ga, sem, funnel }) => {
                    const lastUpdated = [sc?.uploaded_at, ga?.uploaded_at, sem?.uploaded_at, funnel?.uploaded_at]
                      .filter(Boolean).sort().pop()
                    const hasData = sc || ga || sem || funnel

                    return (
                      <tr key={portco.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors group">
                        <td className="px-4 py-3 border-r border-slate-100 bg-white group-hover:bg-slate-50/70 sticky left-0 transition-colors">
                          <div className="flex items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://www.google.com/s2/favicons?sz=32&domain=${portco.domain}`}
                              alt=""
                              className="w-5 h-5 rounded shrink-0 opacity-75"
                            />
                            <div>
                              <div className="font-semibold text-slate-800 text-sm leading-tight">{portco.name}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <a
                                  href={`https://${portco.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline"
                                >
                                  {portco.domain}
                                </a>
                                {lastUpdated && (
                                  <span className="text-[11px] text-slate-300">· {fmtDate(lastUpdated)}</span>
                                )}
                              </div>
                              {!hasData && (
                                <Link
                                  href={`/upload?company=${portco.id}`}
                                  className="text-[11px] text-blue-400 hover:text-blue-600 mt-0.5 inline-block"
                                >
                                  + Add data
                                </Link>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* SEMrush */}
                        <Cell divider className={authorityColor(sem?.authority_score)}>
                          {sem ? (sem.authority_score ?? <Dash />) : <Dash />}
                        </Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{sem ? fmtNum(sem.organic_traffic) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{sem ? fmtNum(sem.organic_keywords) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{sem ? fmtNum(sem.backlinks) : <Dash />}</Cell>

                        {/* Search Console */}
                        <Cell divider className="text-slate-600 font-mono text-xs">{sc ? fmtNum(sc.clicks) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{sc ? fmtNum(sc.impressions) : <Dash />}</Cell>
                        <Cell className={ctrColor(sc?.ctr)}>{sc ? fmtPct(sc.ctr) : <Dash />}</Cell>
                        <Cell className={positionColor(sc?.avg_position)}>{sc ? fmtPos(sc.avg_position) : <Dash />}</Cell>

                        {/* GA4 */}
                        <Cell divider className="text-slate-600 font-mono text-xs">{ga ? fmtNum(ga.users) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{ga ? fmtNum(ga.sessions) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{ga ? fmtNum(ga.visits) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{ga ? fmtDuration(ga.avg_session_duration) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{ga ? fmtPct(ga.bounce_rate) : <Dash />}</Cell>

                        {/* Funnel */}
                        <Cell divider className="text-slate-600 font-mono text-xs">{funnel ? fmtNum(funnel.mqls) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{funnel ? fmtNum(funnel.sqls) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{funnel ? fmtCurrency(funnel.pipeline_arr) : <Dash />}</Cell>
                        <Cell className="text-slate-600 font-mono text-xs">{funnel ? fmtCurrency(funnel.avg_deal_value) : <Dash />}</Cell>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {isConfigured && rows.length > 0 && !hasAnyData && (
            <div className="px-5 py-10 text-center border-t border-slate-100">
              <div className="text-slate-400 text-sm mb-3">No data uploaded yet. Start by uploading a CSV export.</div>
              <Link
                href="/upload"
                className="inline-flex items-center px-4 py-2 bg-[#0D1B2A] text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Upload first dataset
              </Link>
            </div>
          )}

          <div className="px-5 py-2.5 border-t border-slate-50 bg-slate-50/60 flex items-center justify-between text-xs text-slate-400">
            <span>Latest upload per company per source · {rows.length} portfolio companies</span>
            <span className="hidden sm:inline">Data refreshes on each upload</span>
          </div>
        </div>
      </main>
    </div>
  )
}
