'use client'

import { useState } from 'react'

const C = {
  nearBlack: '#1a1a18',
  charcoal: '#4a4a48',
  darkGrey: '#999999',
  lightGrey: '#d9d9d9',
  offWhite: '#f7f4f0',
}

const METRICS = [
  { n: '1', label: 'Authority Score', def: 'A SEMrush score from 0–100 measuring how strong a domain is. Higher is better.' },
  { n: '2', label: 'Organic Traffic', def: 'Estimated monthly visitors arriving from search engines (not paid ads).' },
  { n: '3', label: 'Organic Keywords', def: 'Number of search terms the site ranks for in Google.' },
  { n: '4', label: 'Backlinks', def: 'Number of external websites linking to this domain.' },
  { n: '5', label: 'Clicks', def: 'People who clicked through to the site from Google Search.' },
  { n: '6', label: 'Impressions', def: 'Times the site appeared in Google Search results, whether clicked or not.' },
  { n: '7', label: 'CTR (Click-Through Rate)', def: 'Percentage of search appearances that led to a click.' },
  { n: '8', label: 'Avg Position', def: 'Average Google ranking across all search terms. Lower is better — 1 means top of results.' },
  { n: '9', label: 'Users', def: 'Unique visitors to the site in the period.' },
  { n: '10', label: 'Sessions', def: 'Total visits. One user can have multiple sessions.' },
  { n: '11', label: 'Visits (Pageviews)', def: 'Total pages viewed across all sessions.' },
  { n: '12', label: 'Time on Site', def: 'Average time spent per visit. Longer generally means stronger engagement.' },
  { n: '13', label: 'Bounce Rate', def: 'Visitors who left without clicking anything. Lower is better.' },
  { n: '14', label: 'MQLs', def: 'Marketing Qualified Leads — prospects showing early buying interest.' },
  { n: '15', label: 'SQLs', def: 'Sales Qualified Leads — prospects actively being pursued by sales.' },
  { n: '16', label: 'Pipeline ARR', def: 'Total annual revenue value of all open deals in the pipeline.' },
  { n: '17', label: 'Avg Deal Value', def: 'Average annual revenue per open deal.' },
]

function MetricItem({ n, label, def }: { n: string; label: string; def: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${C.lightGrey}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#f7f4f0]"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono w-5 shrink-0 text-right" style={{ color: C.darkGrey }}>{n}</span>
          <span className="text-sm font-semibold" style={{ color: C.nearBlack }}>{label}</span>
        </div>
        <span className="text-[10px] ml-4 shrink-0" style={{ color: C.darkGrey }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm" style={{ color: C.charcoal, paddingLeft: '52px' }}>
          {def}
        </div>
      )}
    </div>
  )
}

export default function MetricFAQ() {
  const [allOpen, setAllOpen] = useState(false)

  return (
    <div className="mt-8 mb-10">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold uppercase tracking-widest text-[10px]" style={{ color: C.charcoal }}>
          Metric definitions
        </div>
        <button
          onClick={() => setAllOpen(o => !o)}
          className="text-xs underline"
          style={{ color: C.darkGrey }}
        >
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <div style={{ border: `1px solid ${C.lightGrey}`, background: '#ffffff' }}>
        {METRICS.map(m => (
          <ControlledMetricItem key={m.n} {...m} forceOpen={allOpen} />
        ))}
      </div>
    </div>
  )
}

function ControlledMetricItem({ n, label, def, forceOpen }: { n: string; label: string; def: string; forceOpen: boolean }) {
  const [localOpen, setLocalOpen] = useState(false)
  const open = forceOpen || localOpen

  return (
    <div style={{ borderBottom: `1px solid ${C.lightGrey}` }}>
      <button
        onClick={() => setLocalOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[#f7f4f0]"
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono w-5 shrink-0 text-right" style={{ color: C.darkGrey }}>{n}</span>
          <span className="text-sm font-semibold" style={{ color: C.nearBlack }}>{label}</span>
        </div>
        <span className="text-[10px] ml-4 shrink-0" style={{ color: C.darkGrey }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-sm" style={{ color: C.charcoal, paddingLeft: '52px' }}>
          {def}
        </div>
      )}
    </div>
  )
}
