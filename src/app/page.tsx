export const dynamic = 'force-dynamic'
export const revalidate = 0

import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import PipedriveRefreshButton from '@/components/PipedriveRefreshButton'
import SemrushRefreshButton from '@/components/SemrushRefreshButton'
import GroupedTables from '@/components/GroupedTables'
import MetricFAQ from '@/components/MetricFAQ'
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
          <SemrushRefreshButton />
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
          const GROUP_ORDER = ['Noveva Software Group', 'Forma Innovations', 'Standalone', 'Other']
          const grouped = GROUP_ORDER.map(g => ({
            group: g,
            rows: rows.filter(r => (r.portco.portco_group ?? 'Other') === g),
          })).filter(g => g.rows.length > 0)
          return <GroupedTables groups={grouped} />
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

        <MetricFAQ />
      </main>
    </div>
  )
}
