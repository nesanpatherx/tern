'use client'

import { useState } from 'react'
import Link from 'next/link'
import { fmtNum, fmtPct, fmtPos, fmtDate, fmtCurrency, fmtDuration, authorityColor, positionColor, ctrColor } from '@/lib/format'
import type { PortcoDB, SCUpload, GAUpload, SEMUpload, FunnelUpload } from '@/lib/supabase'

const C = {
  orange: '#eb5c32',
  nearBlack: '#1a1a18',
  charcoal: '#4a4a48',
  darkGrey: '#999999',
  lightGrey: '#d9d9d9',
  offWhite: '#f7f4f0',
}

type PortcoRow = {
  portco: PortcoDB
  sc: SCUpload | null
  ga: GAUpload | null
  sem: SEMUpload | null
  funnel: FunnelUpload | null
}

type Group = { group: string; rows: PortcoRow[] }

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

function Cell({ children, className = '', divider = false, style }: {
  children: React.ReactNode; className?: string; divider?: boolean; style?: React.CSSProperties
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
      style={{ color: C.darkGrey, borderLeft: divider ? `1px solid ${C.lightGrey}` : undefined }}
    >
      {children}
    </th>
  )
}

function TableHead() {
  return (
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
}

function CompanyRow({ portco, sc, ga, sem, funnel }: PortcoRow) {
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
      <Cell style={{ color: C.charcoal }}>
        {sem && sem.organic_traffic
          ? fmtNum(sem.organic_traffic)
          : sc?.clicks
          ? <span>{fmtNum(sc.clicks)}<sup style={{ fontSize: '8px', color: C.darkGrey, marginLeft: '2px' }}>GSC</sup></span>
          : sem ? 0 : <Dash />}
      </Cell>
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

function GroupTable({ group, rows }: Group) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div style={{ background: '#ffffff', border: `1px solid ${C.lightGrey}` }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full px-5 py-3 flex items-center justify-between transition-colors hover:opacity-90"
        style={{ background: C.nearBlack, borderBottom: collapsed ? 'none' : `1px solid ${C.lightGrey}` }}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: '#ffffff' }}>{group}</span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{rows.length} companies</span>
        </div>
        <div className="flex items-center gap-4">
          {!collapsed && (
            <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span><span style={{ color: '#22c55e' }}>●</span> Good</span>
              <span><span style={{ color: '#f59e0b' }}>●</span> Mid</span>
              <span><span style={{ color: '#ef4444' }}>●</span> Weak</span>
            </div>
          )}
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{collapsed ? '▶' : '▼'}</span>
        </div>
      </button>
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <TableHead />
            <tbody>
              {rows.map(r => <CompanyRow key={r.portco.id} {...r} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function GroupedTables({ groups }: { groups: Group[] }) {
  return (
    <div className="space-y-6">
      {groups.map(g => <GroupTable key={g.group} {...g} />)}
    </div>
  )
}
