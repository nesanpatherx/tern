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

const C = {
  orange: '#eb5c32',
  nearBlack: '#1a1a18',
  charcoal: '#4a4a48',
  darkGrey: '#999999',
  lightGrey: '#d9d9d9',
  offWhite: '#f7f4f0',
  navy: '#1c2b3a',
  slateBlue: '#4a6580',
  paleSlate: '#c8d8e8',
}

function Dash() {
  return <span style={{ color: C.lightGrey }}>—</span>
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
    <td
      className={`px-3 py-3 text-right text-xs whitespace-nowrap font-mono ${className}`}
      style={divider ? { borderLeft: `1px solid ${C.lightGrey}` } : {}}
    >
      {children}
    </td>
  )
}

function ColHead({ children, divider = false }: { children: React.ReactNode; divider?: boolean }) {
  return (
    <th
      className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
      style={{
        color: C.darkGrey,
        borderLeft: divider ? `1px solid ${C.lightGrey}` : undefined,
      }}
    >
      {children}
    </th>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className="px-5 py-4"
      style={{
        background: '#ffffff',
        border: `1px solid ${C.lightGrey}`,
      }}
    >
      <div
        className="text-2xl font-bold leading-none"
        style={{ color: accent ? C.orange : C.nearBlack }}
      >
        {value}
      </div>
      <div className="text-xs font-semibold uppercase tracking-widest mt-2" style={{ color: C.darkGrey }}>
        {label}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: C.darkGrey }}>{sub}</div>}
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
    <div className="min-h-screen" style={{ background: C.offWhite }}>
      {/* Header */}
      <header
        className="px-6 flex items-center justify-between h-14 sticky top-0 z-10"
        style={{ background: C.nearBlack, borderBottom: `2px solid ${C.orange}` }}
      >
        <div className="flex items-center gap-3">
          {/* Wordmark */}
          <span className="text-base leading-none select-none">
            <span style={{ color: C.orange, fontWeight: 600 }}>Tern</span>
            <span style={{ color: '#ffffff', fontWeight: 300 }}>Capital</span>
          </span>
          <span
            className="text-xs hidden sm:inline"
            style={{ color: C.darkGrey, borderLeft: `1px solid ${C.charcoal}`, paddingLeft: '12px' }}
          >
            Portfolio dashboard
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs hidden sm:inline" style={{ color: C.darkGrey }}>
            {rows.length} companies
          </span>
          <Link
            href="/upload"
            className="px-4 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: C.orange,
              color: '#ffffff',
            }}
          >
            Upload data
          </Link>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto">
        {!isConfigured && (
          <div
            className="mb-5 px-5 py-4 text-sm"
            style={{ background: '#fff8f5', border: `1px solid ${C.orange}`, color: C.charcoal }}
          >
            <strong>Setup required:</strong> Add Supabase credentials to environment variables, then run both migrations.
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px mb-6" style={{ background: C.lightGrey }}>
          <StatCard label="Portfolio companies" value={rows.length} />
          <StatCard
            label="Organic traffic"
            value={totalTraffic > 0 ? fmtNum(totalTraffic) : '—'}
            sub="across all portcos"
            accent
          />
          <StatCard
            label="Total pipeline"
            value={totalPipeline > 0 ? fmtCurrency(totalPipeline) : '—'}
            sub="latest upload"
            accent
          />
          <StatCard
            label="Total MQLs"
            value={totalMQLs > 0 ? fmtNum(totalMQLs) : '—'}
            sub="latest upload"
          />
          <StatCard
            label="Data coverage"
            value={`${coverage}%`}
            sub={`${withSEM + withSC + withGA + withFunnel} / 44 sources`}
            accent={coverage > 0}
          />
          <div className="px-5 py-4 text-xs space-y-2" style={{ background: '#ffffff', border: `0px solid ${C.lightGrey}` }}>
            <div className="font-semibold uppercase tracking-widest text-[10px] mb-3" style={{ color: C.darkGrey }}>Source coverage</div>
            {[
              { label: 'SEMrush', count: withSEM },
              { label: 'Search Console', count: withSC },
              { label: 'GA4', count: withGA },
              { label: 'Funnel', count: withFunnel },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center">
                <span style={{ color: C.darkGrey }}>{s.label}</span>
                <span className="font-semibold" style={{ color: s.count > 0 ? C.nearBlack : C.lightGrey }}>
                  {s.count} / {rows.length}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#ffffff', border: `1px solid ${C.lightGrey}` }}>
          {/* Table header bar */}
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${C.lightGrey}` }}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: C.nearBlack }}>All companies</span>
              {hasAnyData && (
                <span className="text-xs" style={{ color: C.darkGrey }}>· latest upload per source</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: C.darkGrey }}>
              <span><span style={{ color: '#22c55e' }}>●</span> Good</span>
              <span><span style={{ color: '#f59e0b' }}>●</span> Mid</span>
              <span><span style={{ color: '#ef4444' }}>●</span> Weak</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                {/* Source group row */}
                <tr style={{ borderBottom: `1px solid ${C.lightGrey}` }}>
                  <th
                    rowSpan={2}
                    className="text-left px-4 py-2 text-[10px] font-semibold uppercase tracking-widest sticky left-0 z-10 min-w-[190px]"
                    style={{ background: C.offWhite, color: C.darkGrey, borderRight: `1px solid ${C.lightGrey}` }}
                  >
                    Company
                  </th>
                  {[
                    { label: 'SEMrush', cols: 4 },
                    { label: 'Search Console', cols: 4 },
                    { label: 'Google Analytics', cols: 5 },
                    { label: 'Sales Funnel', cols: 4 },
                  ].map(g => (
                    <th
                      key={g.label}
                      colSpan={g.cols}
                      className="py-2 text-center text-[10px] font-semibold uppercase tracking-widest"
                      style={{
                        borderLeft: `1px solid ${C.lightGrey}`,
                        background: C.offWhite,
                        color: C.charcoal,
                      }}
                    >
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr style={{ borderBottom: `2px solid ${C.nearBlack}`, background: C.offWhite }}>
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
                    <tr key={i} className="animate-pulse" style={{ borderBottom: `1px solid ${C.offWhite}` }}>
                      <td className="px-4 py-4 sticky left-0 bg-white" style={{ borderRight: `1px solid ${C.lightGrey}` }}>
                        <div className="h-4 rounded w-28 mb-1.5" style={{ background: C.offWhite }} />
                        <div className="h-3 rounded w-20" style={{ background: C.offWhite }} />
                      </td>
                      {Array.from({ length: 17 }, (_, j) => (
                        <td key={j} className="px-3 py-4">
                          <div className="h-3 rounded w-10 ml-auto" style={{ background: C.offWhite }} />
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
                      <tr
                        key={portco.id}
                        className="group transition-colors"
                        style={{ borderBottom: `1px solid ${C.offWhite}` }}
                        onMouseEnter={undefined}
                      >
                        {/* Company cell */}
                        <td
                          className="px-4 py-3 sticky left-0 bg-white group-hover:bg-[#f7f4f0] transition-colors"
                          style={{ borderRight: `1px solid ${C.lightGrey}` }}
                        >
                          <div className="flex items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://www.google.com/s2/favicons?sz=32&domain=${portco.domain}`}
                              alt=""
                              className="w-4 h-4 shrink-0"
                              style={{ opacity: 0.7 }}
                            />
                            <div>
                              <div className="font-semibold text-sm leading-tight" style={{ color: C.nearBlack }}>
                                {portco.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <a
                                  href={`https://${portco.domain}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] hover:underline"
                                  style={{ color: C.darkGrey }}
                                >
                                  {portco.domain}
                                </a>
                                {lastUpdated && (
                                  <span className="text-[11px]" style={{ color: C.lightGrey }}>
                                    · {fmtDate(lastUpdated)}
                                  </span>
                                )}
                              </div>
                              {!hasData && (
                                <Link
                                  href={`/upload?company=${portco.id}`}
                                  className="text-[11px] hover:underline mt-0.5 inline-block"
                                  style={{ color: C.orange }}
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
                        <Cell style={{ color: C.charcoal }}>{sem ? fmtNum(sem.organic_traffic) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{sem ? fmtNum(sem.organic_keywords) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{sem ? fmtNum(sem.backlinks) : <Dash />}</Cell>

                        {/* Search Console */}
                        <Cell divider style={{ color: C.charcoal }}>{sc ? fmtNum(sc.clicks) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{sc ? fmtNum(sc.impressions) : <Dash />}</Cell>
                        <Cell className={ctrColor(sc?.ctr)}>{sc ? fmtPct(sc.ctr) : <Dash />}</Cell>
                        <Cell className={positionColor(sc?.avg_position)}>{sc ? fmtPos(sc.avg_position) : <Dash />}</Cell>

                        {/* GA4 */}
                        <Cell divider style={{ color: C.charcoal }}>{ga ? fmtNum(ga.users) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{ga ? fmtNum(ga.sessions) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{ga ? fmtNum(ga.visits) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{ga ? fmtDuration(ga.avg_session_duration) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{ga ? fmtPct(ga.bounce_rate) : <Dash />}</Cell>

                        {/* Funnel */}
                        <Cell divider style={{ color: C.charcoal }}>{funnel ? fmtNum(funnel.mqls) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{funnel ? fmtNum(funnel.sqls) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{funnel ? fmtCurrency(funnel.pipeline_arr) : <Dash />}</Cell>
                        <Cell style={{ color: C.charcoal }}>{funnel ? fmtCurrency(funnel.avg_deal_value) : <Dash />}</Cell>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {isConfigured && rows.length > 0 && !hasAnyData && (
            <div className="px-5 py-10 text-center" style={{ borderTop: `1px solid ${C.lightGrey}` }}>
              <div className="text-sm mb-4" style={{ color: C.darkGrey }}>No data uploaded yet. Start by uploading a CSV export.</div>
              <Link
                href="/upload"
                className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white transition-colors"
                style={{ background: C.nearBlack }}
              >
                Upload first dataset
              </Link>
            </div>
          )}

          <div
            className="px-5 py-2.5 flex items-center justify-between text-xs"
            style={{ borderTop: `1px solid ${C.lightGrey}`, color: C.darkGrey, background: C.offWhite }}
          >
            <span>Latest upload per company per source · {rows.length} portfolio companies</span>
            <span className="hidden sm:inline">Data refreshes on each upload</span>
          </div>
        </div>
      </main>
    </div>
  )
}
