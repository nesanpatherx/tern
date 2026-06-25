export const dynamic = 'force-dynamic'
export const revalidate = 0

import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import PipedriveRefreshButton from '@/components/PipedriveRefreshButton'
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
  noStore()
  if (!supabase) return []

  const [portcosRes, scRes, gaRes, semRes, funnelRes] = await Promise.all([
    supabase.from('portcos').select('*').order('sort_order', { ascending: true }).order('name'),
    supabase.from('search_console_uploads').select('id,portco_id,period_start,period_end,clicks,impressions,ctr,avg_position,uploaded_at').order('uploaded_at', { ascending: false }).limit(50),
    supabase.from('analytics_uploads').select('id,portco_id,period_start,period_end,sessions,users,new_users,visits,bounce_rate,avg_session_duration,uploaded_at').order('uploaded_at', { ascending: false }).limit(50),
    supabase.from('semrush_uploads').select('id,portco_id,report_date,authority_score,organic_traffic,organic_keywords,paid_traffic,backlinks,referring_domains,uploaded_at').order('uploaded_at', { ascending: false }).limit(50),
    supabase.from('funnel_uploads').select('id,portco_id,period_start,period_end,mqls,sqls,pipeline_arr,avg_deal_value,uploaded_at').order('uploaded_at', { ascending: false }).limit(50),
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

function V2Button({ label }: { label: string }) {
  return (
    <button
      disabled
      className="flex items-center px-3 py-1.5 text-xs font-semibold cursor-not-allowed opacity-30"
      style={{ background: '#1a1a18', color: '#ffffff', border: '1px solid transparent' }}
    >
      {label}
    </button>
  )
}

function Dash() {
  return (
    <span title="No data" style={{ color: C.lightGrey, display: 'inline-flex', alignItems: 'center' }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="4" y1="4" x2="20" y2="20"/>
      </svg>
    </span>
  )
}

function Cell({
  children,
  className = '',
  divider = false,
  style,
}: {
  children: React.ReactNode
  className?: string
  divider?: boolean
  style?: React.CSSProperties
}) {
  return (
    <td
      className={`px-3 py-3 text-right text-xs whitespace-nowrap font-mono ${className}`}
      style={{ ...(divider ? { borderLeft: `1px solid ${C.lightGrey}` } : {}), ...style }}
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
  const coverage = Math.round(((withSEM + withSC + withGA + withFunnel) / (rows.length * 4)) * 100)

  const allUploadDates = rows.flatMap(r => [
    r.sc?.uploaded_at, r.ga?.uploaded_at, r.sem?.uploaded_at, r.funnel?.uploaded_at,
  ]).filter(Boolean) as string[]
  const lastUpdated = allUploadDates.length
    ? new Date(Math.max(...allUploadDates.map(d => new Date(d).getTime())))
    : null
  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

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
            {lastUpdatedStr && (
              <span style={{ color: C.charcoal, marginLeft: '8px' }}>· Updated {lastUpdatedStr}</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs hidden sm:inline" style={{ color: C.darkGrey }}>
            {rows.length} companies
          </span>
          <V2Button label="Refresh SEMrush" />
          <V2Button label="Refresh GA4" />
          <V2Button label="Refresh HubSpot" />
          <PipedriveRefreshButton />
          <Link
            href="/bulk-upload"
            className="px-4 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: C.orange, color: '#ffffff' }}
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
            sub={`${withSEM + withSC + withGA + withFunnel} / ${rows.length * 4} sources`}
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

        {/* Grouped tables */}
        {(() => {
          const GROUP_ORDER = ['Noveva', 'Forma Innovations', 'Standalone', 'Other']
          const grouped = GROUP_ORDER.map(g => ({
            group: g,
            rows: rows.filter(r => (r.portco.portco_group ?? 'Other') === g),
          })).filter(g => g.rows.length > 0)

          const TableHead = () => (
            <thead>
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
                    style={{ borderLeft: `1px solid ${C.lightGrey}`, background: C.offWhite, color: C.charcoal }}
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
              <tr style={{ borderBottom: `2px solid ${C.nearBlack}`, background: C.offWhite }}>
                <ColHead divider>Auth¹</ColHead>
                <ColHead>Traffic²</ColHead>
                <ColHead>Keywords³</ColHead>
                <ColHead>Backlinks⁴</ColHead>
                <ColHead divider>Clicks⁵</ColHead>
                <ColHead>Impr.⁶</ColHead>
                <ColHead>CTR⁷</ColHead>
                <ColHead>Position⁸</ColHead>
                <ColHead divider>Users⁹</ColHead>
                <ColHead>Sessions¹⁰</ColHead>
                <ColHead>Visits¹¹</ColHead>
                <ColHead>Time on site¹²</ColHead>
                <ColHead>Bounce¹³</ColHead>
                <ColHead divider>MQLs¹⁴</ColHead>
                <ColHead>SQLs¹⁵</ColHead>
                <ColHead>Pipeline¹⁶</ColHead>
                <ColHead>Avg deal¹⁷</ColHead>
              </tr>
            </thead>
          )

          const CompanyRow = ({ portco, sc, ga, sem, funnel }: PortcoRow) => {
            const rowLastUpdated = [sc?.uploaded_at, ga?.uploaded_at, sem?.uploaded_at, funnel?.uploaded_at]
              .filter(Boolean).sort().pop()
            const hasData = sc || ga || sem || funnel
            return (
              <tr className="group transition-colors" style={{ borderBottom: `1px solid ${C.offWhite}` }}>
                <td
                  className="px-4 py-3 sticky left-0 bg-white group-hover:bg-[#f7f4f0] transition-colors"
                  style={{ borderRight: `1px solid ${C.lightGrey}` }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://www.google.com/s2/favicons?sz=32&domain=${portco.domain}`} alt="" className="w-4 h-4 shrink-0" style={{ opacity: 0.7 }} />
                    <div>
                      <div className="font-semibold text-sm leading-tight" style={{ color: C.nearBlack }}>{portco.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <a href={`https://${portco.domain}`} target="_blank" rel="noopener noreferrer" className="text-[11px] hover:underline" style={{ color: C.darkGrey }}>
                          {portco.domain}
                        </a>
                        {rowLastUpdated && <span className="text-[11px]" style={{ color: C.lightGrey }}>· {fmtDate(rowLastUpdated)}</span>}
                      </div>
                      {!hasData && (
                        <Link href={`/upload?company=${portco.id}`} className="text-[11px] hover:underline mt-0.5 inline-block" style={{ color: C.orange }}>
                          + Add data
                        </Link>
                      )}
                    </div>
                  </div>
                </td>
                <Cell divider className={authorityColor(sem?.authority_score)}>{sem ? (sem.authority_score ?? 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{sem ? (sem.organic_traffic ? fmtNum(sem.organic_traffic) : 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{sem ? (sem.organic_keywords ? fmtNum(sem.organic_keywords) : 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{sem ? (sem.backlinks ? fmtNum(sem.backlinks) : 0) : <Dash />}</Cell>
                <Cell divider style={{ color: C.charcoal }}>{sc ? (sc.clicks ? fmtNum(sc.clicks) : 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{sc ? (sc.impressions ? fmtNum(sc.impressions) : 0) : <Dash />}</Cell>
                <Cell className={ctrColor(sc?.ctr)}>{sc ? (sc.ctr ? fmtPct(sc.ctr) : 0) : <Dash />}</Cell>
                <Cell className={positionColor(sc?.avg_position)}>{sc ? (sc.avg_position ? fmtPos(sc.avg_position) : 0) : <Dash />}</Cell>
                <Cell divider style={{ color: C.charcoal }}>{ga ? (ga.users ? fmtNum(ga.users) : 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{ga ? (ga.sessions ? fmtNum(ga.sessions) : 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{ga ? (ga.visits ? fmtNum(ga.visits) : 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{ga ? (ga.avg_session_duration ? fmtDuration(ga.avg_session_duration) : 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{ga ? (ga.bounce_rate ? fmtPct(ga.bounce_rate) : 0) : <Dash />}</Cell>
                <Cell divider style={{ color: C.charcoal }}>{funnel ? (funnel.mqls ?? 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{funnel ? (funnel.sqls ?? 0) : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{funnel ? (funnel.pipeline_arr ? fmtCurrency(funnel.pipeline_arr) : '£0') : <Dash />}</Cell>
                <Cell style={{ color: C.charcoal }}>{funnel ? (funnel.avg_deal_value ? fmtCurrency(funnel.avg_deal_value) : '£0') : <Dash />}</Cell>
              </tr>
            )
          }

          return (
            <div className="space-y-6">
              {grouped.map(({ group, rows: groupRows }) => (
                <div key={group} style={{ background: '#ffffff', border: `1px solid ${C.lightGrey}` }}>
                  <div
                    className="px-5 py-3 flex items-center justify-between"
                    style={{ borderBottom: `1px solid ${C.lightGrey}`, background: C.nearBlack }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold" style={{ color: '#ffffff' }}>{group}</span>
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{groupRows.length} companies</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <span><span style={{ color: '#22c55e' }}>●</span> Good</span>
                      <span><span style={{ color: '#f59e0b' }}>●</span> Mid</span>
                      <span><span style={{ color: '#ef4444' }}>●</span> Weak</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <TableHead />
                      <tbody>
                        {groupRows.map(r => <CompanyRow key={r.portco.id} {...r} />)}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        {/* Footnotes */}
        <div className="mt-8 text-xs space-y-1.5" style={{ color: C.darkGrey }}>
          <div className="font-semibold uppercase tracking-widest text-[10px] mb-3" style={{ color: C.charcoal }}>Data sources</div>
          <p>Pipeline data (MQLs, SQLs, Pipeline ARR, Avg Deal Value) for MOMO, SchoolScreener, and CCube Solutions refreshes automatically via the Pipedrive API. All other data requires a manual CSV export and upload — approximately 5 minutes per company.</p>
          <p className="mt-2">
            <span style={{ color: C.charcoal }}>SEMrush</span> · exported from Domain Overview ·{' '}
            <span style={{ color: C.charcoal }}>Google Search Console</span> · exported from Performance report ·{' '}
            <span style={{ color: C.charcoal }}>Google Analytics</span> · exported from GA4 Reports ·{' '}
            <span style={{ color: C.charcoal }}>HubSpot / Goldvision</span> · exported from CRM deals view
          </p>
        </div>

        {/* Metric definitions */}
        <div className="mt-8 mb-10" style={{ borderTop: `1px solid ${C.lightGrey}`, paddingTop: '24px' }}>
          <div className="font-semibold uppercase tracking-widest text-[10px] mb-4" style={{ color: C.charcoal }}>Metric definitions</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-xs" style={{ color: C.charcoal }}>
            {[
              { n: '1', label: 'Authority Score', def: 'SEMrush proprietary score (0–100) measuring a domain\'s overall SEO strength based on backlinks, traffic, and spam factors. Higher is better.' },
              { n: '2', label: 'Organic Traffic', def: 'Estimated number of monthly visits from unpaid search results, as measured by SEMrush.' },
              { n: '3', label: 'Organic Keywords', def: 'Number of keywords the domain ranks for in the top 100 organic search results.' },
              { n: '4', label: 'Backlinks', def: 'Total number of external links pointing to the domain. A signal of domain authority and referral reach.' },
              { n: '5', label: 'Clicks', def: 'Total clicks from Google Search to the website over the selected period, sourced from Google Search Console.' },
              { n: '6', label: 'Impressions', def: 'Number of times the website appeared in Google Search results, whether clicked or not.' },
              { n: '7', label: 'CTR (Click-Through Rate)', def: 'Percentage of impressions that resulted in a click. Clicks ÷ Impressions.' },
              { n: '8', label: 'Avg Position', def: 'Average ranking position across all queries the site appeared for. Lower is better (1 = top of results).' },
              { n: '9', label: 'Users', def: 'Number of unique individuals who visited the site in the period, as tracked by Google Analytics.' },
              { n: '10', label: 'Sessions', def: 'Total number of visits to the site. One user can have multiple sessions.' },
              { n: '11', label: 'Visits (Pageviews)', def: 'Total number of pages viewed across all sessions, including repeat views of the same page.' },
              { n: '12', label: 'Time on Site', def: 'Average duration of a session. Longer times generally indicate stronger engagement.' },
              { n: '13', label: 'Bounce Rate', def: 'Percentage of sessions where the user left without interacting further. Lower is generally better.' },
              { n: '14', label: 'MQLs', def: 'Marketing Qualified Leads — prospects who have shown interest and meet basic criteria to be passed to sales.' },
              { n: '15', label: 'SQLs', def: 'Sales Qualified Leads — prospects who have been vetted by sales and are actively being pursued.' },
              { n: '16', label: 'Pipeline ARR', def: 'Total Annual Recurring Revenue represented by open deals in the sales pipeline.' },
              { n: '17', label: 'Avg Deal Value', def: 'Average ARR value of open deals in the pipeline.' },
            ].map(({ n, label, def }) => (
              <div key={n} className="flex gap-2">
                <span className="shrink-0 font-mono" style={{ color: C.darkGrey }}>{n}.</span>
                <div>
                  <span className="font-semibold" style={{ color: C.nearBlack }}>{label} </span>
                  <span style={{ color: C.darkGrey }}>{def}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
