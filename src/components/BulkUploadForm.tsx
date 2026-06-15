'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  parseSearchConsoleCSV,
  parseAnalyticsCSV,
  parseSemrushCSV,
  parseFunnelCSV,
  type SearchConsoleResult,
  type AnalyticsResult,
  type SemrushResult,
  type FunnelResult,
  type ParseError,
} from '@/lib/csv-parsers'
import { fmtNum, fmtPct, fmtPos, fmtCurrency, fmtDuration } from '@/lib/format'

type Source = 'gsc' | 'ga' | 'semrush' | 'funnel'
type ParseResult = SearchConsoleResult | AnalyticsResult | SemrushResult | FunnelResult | ParseError

type FileEntry = {
  id: string
  file: File
  source: Source | null
  portcoId: string
  parsed: ParseResult | null
  status: 'pending' | 'parsing' | 'ready' | 'error' | 'saving' | 'saved'
  errorMsg: string
}

interface Portco { id: string; name: string; domain: string }

const SOURCE_LABELS: Record<Source, string> = {
  gsc: 'Search Console',
  ga: 'Google Analytics',
  semrush: 'SEMrush',
  funnel: 'Sales Funnel',
}

const SOURCE_COLORS: Record<Source, string> = {
  gsc: '#1a73e8',
  ga: '#e37400',
  semrush: '#ff6b35',
  funnel: '#7c3aed',
}

function isError(r: ParseResult | null): r is ParseError {
  return !!r && 'error' in r
}

function detectSource(text: string): Source | null {
  const lower = text.slice(0, 2000).toLowerCase()
  if (lower.includes('authority score') || lower.includes('organic search traffic') || lower.includes('semrush')) return 'semrush'
  if (lower.includes('clicks') && lower.includes('impressions') && lower.includes('position')) return 'gsc'
  if (lower.includes('sessions') && (lower.includes('users') || lower.includes('bounce'))) return 'ga'
  if (lower.includes('mql') || lower.includes('pipeline') || (lower.includes('sql') && lower.includes('deal'))) return 'funnel'
  return null
}

function detectPortco(filename: string, portcos: Portco[]): string {
  const lower = filename.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const p of portcos) {
    const nameLower = p.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const domainLower = p.domain.toLowerCase().replace(/[^a-z0-9]/g, '').split('.')[0]
    if (lower.includes(nameLower) || lower.includes(domainLower)) return p.id
  }
  return portcos[0]?.id ?? ''
}

function parseFile(text: string, source: Source, filename = ''): ParseResult {
  if (source === 'gsc') return parseSearchConsoleCSV(text, filename)
  if (source === 'ga') return parseAnalyticsCSV(text)
  if (source === 'semrush') return parseSemrushCSV(text)
  return parseFunnelCSV(text)
}

function PreviewMetrics({ entry }: { entry: FileEntry }) {
  if (!entry.parsed || isError(entry.parsed) || !entry.source) return null
  const p = entry.parsed
  const items: { label: string; value: string }[] = []

  if (entry.source === 'gsc') {
    const d = p as SearchConsoleResult
    items.push({ label: 'Clicks', value: fmtNum(d.clicks) })
    items.push({ label: 'Impressions', value: fmtNum(d.impressions) })
    items.push({ label: 'CTR', value: fmtPct(d.ctr) })
    items.push({ label: 'Avg position', value: fmtPos(d.avg_position) })
  } else if (entry.source === 'ga') {
    const d = p as AnalyticsResult
    items.push({ label: 'Users', value: fmtNum(d.users) })
    items.push({ label: 'Sessions', value: fmtNum(d.sessions) })
    items.push({ label: 'Bounce rate', value: fmtPct(d.bounce_rate) })
    items.push({ label: 'Avg session', value: fmtDuration(d.avg_session_duration) })
  } else if (entry.source === 'semrush') {
    const d = p as SemrushResult
    items.push({ label: 'Auth score', value: String(d.authority_score) })
    items.push({ label: 'Org traffic', value: fmtNum(d.organic_traffic) })
    items.push({ label: 'Keywords', value: fmtNum(d.organic_keywords) })
    items.push({ label: 'Backlinks', value: fmtNum(d.backlinks) })
  } else {
    const d = p as FunnelResult
    items.push({ label: 'MQLs', value: fmtNum(d.mqls) })
    items.push({ label: 'SQLs', value: fmtNum(d.sqls) })
    items.push({ label: 'Pipeline', value: fmtCurrency(d.pipeline_arr) })
    items.push({ label: 'Avg deal', value: fmtCurrency(d.avg_deal_value) })
  }

  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {items.map(i => (
        <div key={i.label} className="text-xs">
          <div style={{ color: '#999' }}>{i.label}</div>
          <div className="font-semibold font-mono" style={{ color: '#1a1a18' }}>{i.value}</div>
        </div>
      ))}
    </div>
  )
}

export default function BulkUploadForm({ portcos }: { portcos: Portco[] }) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const processFiles = useCallback((files: File[]) => {
    const csvFiles = files.filter(f => f.name.endsWith('.csv'))
    if (!csvFiles.length) return

    const newEntries: FileEntry[] = csvFiles.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      source: null,
      portcoId: detectPortco(file.name, portcos),
      parsed: null,
      status: 'parsing',
      errorMsg: '',
    }))

    setEntries(prev => [...prev, ...newEntries])

    newEntries.forEach(entry => {
      const reader = new FileReader()
      reader.onload = e => {
        const text = e.target?.result as string
        // Skip metadata/filter files from GSC exports
        const lowerName = entry.file.name.toLowerCase()
        if (lowerName === 'filters.csv' || lowerName.startsWith('filter')) {
          setEntries(prev => prev.filter(en => en.id !== entry.id))
          return
        }
        const source = detectSource(text)
        if (!source) {
          setEntries(prev => prev.map(en => en.id === entry.id
            ? { ...en, status: 'error', errorMsg: 'Could not detect source type — rename file to include: gsc, ga, semrush, or funnel' }
            : en
          ))
          return
        }
        const parsed = parseFile(text, source, entry.file.name)
        setEntries(prev => prev.map(en => en.id === entry.id
          ? { ...en, source, parsed, status: isError(parsed) ? 'error' : 'ready', errorMsg: isError(parsed) ? parsed.error : '' }
          : en
        ))
      }
      reader.readAsText(entry.file)
    })
  }, [portcos])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }, [processFiles])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files))
  }

  const updateEntry = (id: string, patch: Partial<FileEntry>) => {
    setEntries(prev => prev.map(en => en.id === id ? { ...en, ...patch } : en))
  }

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(en => en.id !== id))
  }

  const saveAll = async () => {
    const ready = entries.filter(e => e.status === 'ready')
    if (!ready.length) return
    setSaving(true)

    // Group GSC files by portco so multiple files merge into one row
    const gscByPortco = new Map<string, FileEntry[]>()
    const nonGsc: FileEntry[] = []
    for (const entry of ready) {
      if (!entry.parsed || isError(entry.parsed) || !entry.source) continue
      if (entry.source === 'gsc') {
        const group = gscByPortco.get(entry.portcoId) ?? []
        group.push(entry)
        gscByPortco.set(entry.portcoId, group)
      } else {
        nonGsc.push(entry)
      }
    }

    // Save merged GSC rows
    for (const [portcoId, gscEntries] of Array.from(gscByPortco.entries())) {
      gscEntries.forEach(e => updateEntry(e.id, { status: 'saving' }))
      // Merge all parsed results for this portco
      const merged: SearchConsoleResult = {
        period_start: null, period_end: null,
        clicks: 0, impressions: 0, ctr: 0, avg_position: 0, row_count: 0,
      }
      for (const entry of gscEntries) {
        const d = entry.parsed as SearchConsoleResult
        merged.clicks += d.clicks
        merged.impressions += d.impressions
        merged.row_count += d.row_count
        if (d.top_queries) merged.top_queries = d.top_queries
        if (d.top_pages) merged.top_pages = d.top_pages
        if (d.top_countries) merged.top_countries = d.top_countries
        if (d.top_devices) merged.top_devices = d.top_devices
        if (!merged.period_start && d.period_start) merged.period_start = d.period_start
        if (!merged.period_end && d.period_end) merged.period_end = d.period_end
        if (d.ctr) merged.ctr = d.ctr
        if (d.avg_position) merged.avg_position = d.avg_position
      }
      const { error } = await sb.from('search_console_uploads').insert({
        portco_id: portcoId,
        period_start: merged.period_start, period_end: merged.period_end,
        clicks: merged.clicks, impressions: merged.impressions,
        ctr: merged.ctr, avg_position: merged.avg_position,
        top_queries: merged.top_queries ?? null,
        top_pages: merged.top_pages ?? null,
        top_countries: merged.top_countries ?? null,
        top_devices: merged.top_devices ?? null,
      })
      gscEntries.forEach(e => updateEntry(e.id, error
        ? { status: 'error', errorMsg: error.message }
        : { status: 'saved' }
      ))
    }

    // Save non-GSC entries
    for (const entry of nonGsc) {
      updateEntry(entry.id, { status: 'saving' })
      let error = null
      const p = entry.parsed

      if (entry.source === 'ga') {
        const d = p as AnalyticsResult
        const { error: e } = await sb.from('analytics_uploads').insert({
          portco_id: entry.portcoId, period_start: d.period_start, period_end: d.period_end,
          sessions: d.sessions, users: d.users, new_users: d.new_users, visits: d.visits,
          bounce_rate: d.bounce_rate, avg_session_duration: d.avg_session_duration,
        })
        error = e
      } else if (entry.source === 'semrush') {
        const d = p as SemrushResult
        const { error: e } = await sb.from('semrush_uploads').insert({
          portco_id: entry.portcoId, report_date: d.report_date, authority_score: d.authority_score,
          organic_traffic: d.organic_traffic, organic_keywords: d.organic_keywords,
          paid_traffic: d.paid_traffic, backlinks: d.backlinks, referring_domains: d.referring_domains,
        })
        error = e
      } else {
        const d = p as FunnelResult
        const { error: e } = await sb.from('funnel_uploads').insert({
          portco_id: entry.portcoId, period_start: d.period_start, period_end: d.period_end,
          mqls: d.mqls, sqls: d.sqls, pipeline_arr: d.pipeline_arr, avg_deal_value: d.avg_deal_value,
        })
        error = e
      }

      updateEntry(entry.id, error
        ? { status: 'error', errorMsg: error.message }
        : { status: 'saved' }
      )
    }

    setSaving(false)
  }

  const readyCount = entries.filter(e => e.status === 'ready').length
  const savedCount = entries.filter(e => e.status === 'saved').length

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('bulk-file-input')?.click()}
        className="cursor-pointer transition-colors mb-5"
        style={{
          border: `2px dashed ${dragging ? '#eb5c32' : '#d9d9d9'}`,
          background: dragging ? '#fff8f5' : '#ffffff',
          padding: '40px',
          textAlign: 'center',
        }}
      >
        <input
          id="bulk-file-input"
          type="file"
          accept=".csv"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="text-3xl mb-3">⬆</div>
        <div className="font-semibold text-sm" style={{ color: '#1a1a18' }}>
          Drop all your CSVs here, or click to browse
        </div>
        <div className="text-xs mt-1" style={{ color: '#999' }}>
          Multiple files supported · Source type and company auto-detected from filename and content
        </div>
        <div className="text-xs mt-3" style={{ color: '#d9d9d9' }}>
          Tip: name files like <span style={{ color: '#4a4a48' }}>charitylog-gsc.csv</span> or <span style={{ color: '#4a4a48' }}>schoolscreener-ga.csv</span> for best auto-matching
        </div>
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="space-y-2 mb-5">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="px-4 py-3"
              style={{
                background: '#ffffff',
                border: `1px solid ${entry.status === 'saved' ? '#d9d9d9' : entry.status === 'error' ? '#eb5c32' : '#d9d9d9'}`,
              }}
            >
              <div className="flex items-start gap-3">
                {/* Status icon */}
                <div className="text-sm mt-0.5 shrink-0">
                  {entry.status === 'parsing' && <span style={{ color: '#999' }}>⟳</span>}
                  {entry.status === 'ready' && <span style={{ color: '#22c55e' }}>✓</span>}
                  {entry.status === 'error' && <span style={{ color: '#eb5c32' }}>✗</span>}
                  {entry.status === 'saving' && <span style={{ color: '#999' }}>⟳</span>}
                  {entry.status === 'saved' && <span style={{ color: '#22c55e' }}>✓</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate" style={{ color: '#1a1a18' }}>
                      {entry.file.name}
                    </span>
                    {entry.source && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5"
                        style={{ background: SOURCE_COLORS[entry.source] + '18', color: SOURCE_COLORS[entry.source] }}
                      >
                        {SOURCE_LABELS[entry.source]}
                      </span>
                    )}
                    {entry.status === 'saved' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5" style={{ background: '#f0fdf4', color: '#22c55e' }}>
                        Saved
                      </span>
                    )}
                  </div>

                  {/* Company selector */}
                  {entry.status !== 'saved' && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs" style={{ color: '#999' }}>Company:</span>
                      <select
                        value={entry.portcoId}
                        onChange={e => updateEntry(entry.id, { portcoId: e.target.value })}
                        className="text-xs px-2 py-1 border"
                        style={{ borderColor: '#d9d9d9', color: '#1a1a18', background: '#f7f4f0' }}
                      >
                        {portcos.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>

                      {entry.source && (
                        <>
                          <span className="text-xs" style={{ color: '#999' }}>Source:</span>
                          <select
                            value={entry.source}
                            onChange={e => updateEntry(entry.id, { source: e.target.value as Source })}
                            className="text-xs px-2 py-1 border"
                            style={{ borderColor: '#d9d9d9', color: '#1a1a18', background: '#f7f4f0' }}
                          >
                            <option value="gsc">Search Console</option>
                            <option value="ga">Google Analytics</option>
                            <option value="semrush">SEMrush</option>
                            <option value="funnel">Sales Funnel</option>
                          </select>
                        </>
                      )}
                    </div>
                  )}

                  {/* Preview metrics */}
                  {entry.status === 'ready' && <PreviewMetrics entry={entry} />}

                  {/* Error */}
                  {entry.status === 'error' && (
                    <div className="text-xs mt-1" style={{ color: '#eb5c32' }}>{entry.errorMsg}</div>
                  )}
                </div>

                {/* Remove */}
                {entry.status !== 'saving' && entry.status !== 'saved' && (
                  <button
                    onClick={() => removeEntry(entry.id)}
                    className="text-xs shrink-0"
                    style={{ color: '#d9d9d9' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {entries.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={saveAll}
            disabled={saving || readyCount === 0}
            className="px-6 py-2.5 text-sm font-semibold disabled:opacity-40 transition-colors"
            style={{ background: '#1a1a18', color: '#ffffff' }}
          >
            {saving ? 'Saving…' : `Save ${readyCount} file${readyCount !== 1 ? 's' : ''} to dashboard`}
          </button>

          {savedCount > 0 && (
            <a
              href="/"
              className="text-sm font-semibold"
              style={{ color: '#eb5c32' }}
            >
              View dashboard →
            </a>
          )}

          <button
            onClick={() => setEntries([])}
            className="text-xs ml-auto"
            style={{ color: '#999' }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
