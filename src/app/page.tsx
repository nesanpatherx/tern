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

function NoData() {
  return <span className="text-slate-300 font-mono text-sm">—</span>
}

function Cell({
  children,
  className = '',
  border = false,
}: {
  children: React.ReactNode
  className?: string
  border?: boolean
}) {
  return (
    <td
      className={`px-3 py-3 text-sm font-mono whitespace-nowrap ${border ? 'border-r border-slate-100' : ''} ${className}`}
    >
      {children}
    </td>
  )
}

function GroupHeader({
  label,
  color,
  badgeColor,
  colSpan,
  border = true,
}: {
  label: string
  color: string
  badgeColor: string
  colSpan: number
  border?: boolean
}) {
  return (
    <th
      colSpan={colSpan}
      className={`px-3 py-2 text-center ${color} ${border ? 'border-r border-slate-200' : ''}`}
    >
      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold tracking-wide ${badgeColor}`}>
        {label}
      </span>
    </th>
  )
}

function ColHeader({ children, border = false }: { children: React.ReactNode; border?: boolean }) {
  return (
    <th
      className={`px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${border ? 'border-r border-slate-200' : ''}`}
    >
      {children}
    </th>
  )
}

export default async function DashboardPage() {
  const rows = await getDashboardData()
  const isConfigured = !!supabase

  const withSC = rows.filter(r => r.sc).length
  const withGA = rows.filter(r => r.ga).length
  const withSEM = rows.filter(r => r.sem).length
  const withFunnel = rows.filter(r => r.funnel).length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#0D1B2A] text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-[#0D1B2A] font-bold text-sm">T</span>
          </div>
          <div>
            <div className="font-semibold text-lg leading-tight">Tern Capital</div>
            <div className="text-slate-400 text-xs">Portfolio Dashboard</div>
          </div>
        </div>
        <Link
          href="/upload"
          className="bg-white text-[#0D1B2A] px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors"
        >
          Upload Data
        </Link>
      </header>

      <main className="px-6 py-6">
        {/* Setup banner */}
        {!isConfigured && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 text-sm text-amber-800 max-w-4xl">
            <strong>Setup required:</strong> Copy{' '}
            <code className="bg-amber-100 px-1 rounded">.env.local.example</code> →{' '}
            <code className="bg-amber-100 px-1 rounded">.env.local</code> and add Supabase credentials, then run both migrations in{' '}
            <code className="bg-amber-100 px-1 rounded">supabase/migrations/</code>.
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Portfolio Companies', value: 11 },
            { label: 'SEMRush', value: `${withSEM} / 11` },
            { label: 'Search Console', value: `${withSC} / 11` },
            { label: 'Analytics + Funnel', value: `${withGA} / ${withFunnel}` },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-5 py-3">
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                {/* Source group row */}
                <tr className="border-b border-slate-200">
                  <th
                    rowSpan={2}
                    className="px-4 py-2 text-left text-xs font-medium text-slate-400 bg-slate-50 border-r border-slate-200 min-w-[170px]"
                  >
                    Company
                  </th>
                  <GroupHeader label="SEMRush" color="bg-emerald-50" badgeColor="bg-emerald-100 text-emerald-800" colSpan={4} />
                  <GroupHeader label="Search Console" color="bg-blue-50" badgeColor="bg-blue-100 text-blue-800" colSpan={4} />
                  <GroupHeader label="Google Analytics" color="bg-orange-50" badgeColor="bg-orange-100 text-orange-800" colSpan={5} />
                  <GroupHeader label="Sales Funnel" color="bg-purple-50" badgeColor="bg-purple-100 text-purple-800" colSpan={4} border={false} />
                </tr>
                {/* Column header row */}
                <tr className="border-b-2 border-slate-200">
                  {/* SEMRush */}
                  <ColHeader>Auth Score</ColHeader>
                  <ColHeader>Org Traffic</ColHeader>
                  <ColHeader>Org KWs</ColHeader>
                  <ColHeader border>Backlinks</ColHeader>
                  {/* GSC */}
                  <ColHeader>Clicks</ColHeader>
                  <ColHeader>Impressions</ColHeader>
                  <ColHeader>CTR</ColHeader>
                  <ColHeader border>Avg Pos</ColHeader>
                  {/* GA */}
                  <ColHeader>Users</ColHeader>
                  <ColHeader>Sessions</ColHeader>
                  <ColHeader>Visits</ColHeader>
                  <ColHeader>Time on Site</ColHeader>
                  <ColHeader border>Bounce Rate</ColHeader>
                  {/* Funnel */}
                  <ColHeader>MQLs</ColHeader>
                  <ColHeader>SQLs</ColHeader>
                  <ColHeader>Pipeline ARR</ColHeader>
                  <ColHeader>Avg Deal</ColHeader>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  Array.from({ length: 11 }, (_, i) => (
                    <tr key={i} className="border-b border-slate-100 animate-pulse">
                      <td className="px-4 py-4 border-r border-slate-100">
                        <div className="h-4 bg-slate-100 rounded w-32 mb-1" />
                        <div className="h-3 bg-slate-50 rounded w-24" />
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
                    const lastUpdated = [
                      sc?.uploaded_at,
                      ga?.uploaded_at,
                      sem?.uploaded_at,
                      funnel?.uploaded_at,
                    ]
                      .filter(Boolean)
                      .sort()
                      .pop()

                    return (
                      <tr
                        key={portco.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        {/* Company */}
                        <td className="px-4 py-3 border-r border-slate-100">
                          <div className="font-semibold text-slate-800 text-sm">{portco.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <a
                              href={`https://${portco.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
                            >
                              {portco.domain}
                            </a>
                            {lastUpdated && (
                              <span className="text-xs text-slate-300">{fmtDate(lastUpdated)}</span>
                            )}
                          </div>
                          {!lastUpdated && (
                            <Link
                              href={`/upload?company=${portco.id}`}
                              className="text-xs text-blue-400 hover:text-blue-600 hover:underline"
                            >
                              + Add data
                            </Link>
                          )}
                        </td>

                        {/* SEMRush */}
                        <Cell className={`text-right ${authorityColor(sem?.authority_score)}`}>
                          {sem ? (sem.authority_score || <NoData />) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700">
                          {sem ? fmtNum(sem.organic_traffic) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700">
                          {sem ? fmtNum(sem.organic_keywords) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700" border>
                          {sem ? fmtNum(sem.backlinks) : <NoData />}
                        </Cell>

                        {/* Search Console */}
                        <Cell className="text-right text-slate-700">
                          {sc ? fmtNum(sc.clicks) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700">
                          {sc ? fmtNum(sc.impressions) : <NoData />}
                        </Cell>
                        <Cell className={`text-right ${ctrColor(sc?.ctr)}`}>
                          {sc ? fmtPct(sc.ctr) : <NoData />}
                        </Cell>
                        <Cell className={`text-right ${positionColor(sc?.avg_position)}`} border>
                          {sc ? fmtPos(sc.avg_position) : <NoData />}
                        </Cell>

                        {/* Google Analytics */}
                        <Cell className="text-right text-slate-700">
                          {ga ? fmtNum(ga.users) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700">
                          {ga ? fmtNum(ga.sessions) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700">
                          {ga ? fmtNum(ga.visits) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700">
                          {ga ? fmtDuration(ga.avg_session_duration) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700" border>
                          {ga ? fmtPct(ga.bounce_rate) : <NoData />}
                        </Cell>

                        {/* Funnel */}
                        <Cell className="text-right text-slate-700">
                          {funnel ? fmtNum(funnel.mqls) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700">
                          {funnel ? fmtNum(funnel.sqls) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700">
                          {funnel ? fmtCurrency(funnel.pipeline_arr) : <NoData />}
                        </Cell>
                        <Cell className="text-right text-slate-700">
                          {funnel ? fmtCurrency(funnel.avg_deal_value) : <NoData />}
                        </Cell>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-400">
            <span>Latest upload per company per source · 11 portfolio companies</span>
            <span>
              <span className="text-emerald-600 font-semibold">●</span> good ·{' '}
              <span className="text-amber-600 font-semibold">●</span> ok ·{' '}
              <span className="text-red-500 font-semibold">●</span> low
            </span>
          </div>
        </div>
      </main>
    </div>
  )
}
