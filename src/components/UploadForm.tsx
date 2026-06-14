'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { fmtNum, fmtPct, fmtPos, fmtDuration, fmtCurrency, fmtDate } from '@/lib/format'

type Source = 'gsc' | 'ga' | 'semrush' | 'funnel'
type ParseResult = SearchConsoleResult | AnalyticsResult | SemrushResult | FunnelResult | ParseError

interface Portco {
  id: string
  name: string
  domain: string
}

function isError(r: ParseResult): r is ParseError {
  return 'error' in r
}

const SOURCE_LABELS: Record<Source, string> = {
  gsc: 'Search Console',
  ga: 'Google Analytics',
  semrush: 'SEMRush',
  funnel: 'Sales Funnel',
}

const SOURCE_HINTS: Record<Source, string> = {
  gsc: 'Export: Search Console → Performance → Export → Download CSV',
  ga: 'Export: GA4 Reports → share icon → Download CSV',
  semrush: 'Export: SEMRush → Domain Overview → Export',
  funnel: 'Export from HubSpot / Salesforce / Pipedrive, or a spreadsheet with columns: MQLs, SQLs, Pipeline ARR, Avg Deal Value',
}

const SOURCE_COLORS: Record<Source, { active: string; inactive: string }> = {
  gsc: { active: 'bg-blue-600 text-white border-blue-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300' },
  ga: { active: 'bg-orange-500 text-white border-orange-500', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300' },
  semrush: { active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300' },
  funnel: { active: 'bg-purple-600 text-white border-purple-600', inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-300' },
}

export default function UploadForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [portcos, setPortcos] = useState<Portco[]>([])
  const [company, setCompany] = useState<string>('')
  const [source, setSource] = useState<Source>('gsc')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'parsing' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const sb = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

  useEffect(() => {
    if (!sb) return
    sb.from('portcos')
      .select('id, name, domain')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setPortcos(data)
          const preselect = searchParams.get('company')
          if (preselect) setCompany(preselect)
          else if (data.length) setCompany(data[0].id)
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const processFile = useCallback(
    (f: File) => {
      setFile(f)
      setParsed(null)
      setStatus('parsing')
      const reader = new FileReader()
      reader.onload = e => {
        const text = e.target?.result as string
        let result: ParseResult
        if (source === 'gsc') result = parseSearchConsoleCSV(text)
        else if (source === 'ga') result = parseAnalyticsCSV(text)
        else if (source === 'semrush') result = parseSemrushCSV(text)
        else result = parseFunnelCSV(text)
        setParsed(result)
        setStatus(isError(result) ? 'error' : 'idle')
        if (isError(result)) setErrorMsg((result as ParseError).error)
      }
      reader.readAsText(f)
    },
    [source],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) processFile(f)
    },
    [processFile],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  useEffect(() => {
    if (file) processFile(file)
  }, [source]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!sb || !parsed || isError(parsed) || !company) return
    setStatus('saving')

    let error: unknown = null

    if (source === 'gsc') {
      const d = parsed as SearchConsoleResult
      const { error: e } = await sb.from('search_console_uploads').insert({
        portco_id: company,
        period_start: d.period_start,
        period_end: d.period_end,
        clicks: d.clicks,
        impressions: d.impressions,
        ctr: d.ctr,
        avg_position: d.avg_position,
      })
      error = e
    } else if (source === 'ga') {
      const d = parsed as AnalyticsResult
      const { error: e } = await sb.from('analytics_uploads').insert({
        portco_id: company,
        period_start: d.period_start,
        period_end: d.period_end,
        sessions: d.sessions,
        users: d.users,
        new_users: d.new_users,
        visits: d.visits,
        bounce_rate: d.bounce_rate,
        avg_session_duration: d.avg_session_duration,
      })
      error = e
    } else if (source === 'semrush') {
      const d = parsed as SemrushResult
      const { error: e } = await sb.from('semrush_uploads').insert({
        portco_id: company,
        report_date: d.report_date,
        authority_score: d.authority_score,
        organic_traffic: d.organic_traffic,
        organic_keywords: d.organic_keywords,
        paid_traffic: d.paid_traffic,
        backlinks: d.backlinks,
        referring_domains: d.referring_domains,
      })
      error = e
    } else {
      const d = parsed as FunnelResult
      const { error: e } = await sb.from('funnel_uploads').insert({
        portco_id: company,
        period_start: d.period_start,
        period_end: d.period_end,
        mqls: d.mqls,
        sqls: d.sqls,
        pipeline_arr: d.pipeline_arr,
        avg_deal_value: d.avg_deal_value,
      })
      error = e
    }

    if (error) {
      setStatus('error')
      setErrorMsg(String(error))
    } else {
      setStatus('saved')
      setTimeout(() => router.push('/'), 1500)
    }
  }

  const reset = () => {
    setFile(null)
    setParsed(null)
    setStatus('idle')
    setErrorMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const selectedPortco = portcos.find(p => p.id === company)

  return (
    <div className="max-w-2xl mx-auto">
      {!sb && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 text-sm text-amber-800">
          Supabase is not configured. Add credentials to{' '}
          <code className="bg-amber-100 px-1 rounded">.env.local</code>.
        </div>
      )}

      {/* Company */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Company</label>
        <select
          value={company}
          onChange={e => setCompany(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          {portcos.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.domain}
            </option>
          ))}
        </select>
      </div>

      {/* Source */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-3">Data Source</label>
        <div className="grid grid-cols-2 gap-2">
          {(['gsc', 'ga', 'semrush', 'funnel'] as Source[]).map(s => (
            <button
              key={s}
              onClick={() => { setSource(s); reset() }}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                source === s ? SOURCE_COLORS[s].active : SOURCE_COLORS[s].inactive
              }`}
            >
              {SOURCE_LABELS[s]}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">{SOURCE_HINTS[source]}</p>
      </div>

      {/* File upload */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <label className="block text-sm font-semibold text-slate-700 mb-3">Upload CSV</label>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? 'border-slate-400 bg-slate-50'
              : file
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          {file ? (
            <div>
              <div className="text-2xl mb-1">📄</div>
              <div className="text-sm font-semibold text-slate-700">{file.name}</div>
              <div className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</div>
              <button
                onClick={e => { e.stopPropagation(); reset() }}
                className="mt-2 text-xs text-red-400 hover:text-red-600 underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">⬆️</div>
              <div className="text-sm font-semibold text-slate-600">Drop CSV here or click to browse</div>
              <div className="text-xs text-slate-400 mt-1">.csv files only</div>
            </div>
          )}
        </div>
      </div>

      {/* Parsing state */}
      {status === 'parsing' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 text-sm text-slate-500">
          Parsing CSV…
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-4">
          <div className="text-sm font-semibold text-red-700 mb-1">Could not parse file</div>
          <div className="text-sm text-red-600">{errorMsg}</div>
        </div>
      )}

      {/* Preview */}
      {parsed && !isError(parsed) && status !== 'saved' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
          <div className="text-sm font-semibold text-slate-700 mb-1">
            Detected data for <span className="text-slate-900">{selectedPortco?.name}</span>
          </div>
          {'row_count' in parsed && (
            <div className="text-xs text-slate-500 mb-3">
              {(parsed as SearchConsoleResult | AnalyticsResult).row_count} row(s) parsed
              {(parsed as SearchConsoleResult).period_start && (
                <>
                  {' · '}Period:{' '}
                  {fmtDate((parsed as SearchConsoleResult).period_start)} –{' '}
                  {fmtDate((parsed as SearchConsoleResult).period_end)}
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {source === 'gsc' && (() => {
              const d = parsed as SearchConsoleResult
              return (
                <>
                  <Metric label="Clicks" value={fmtNum(d.clicks)} />
                  <Metric label="Impressions" value={fmtNum(d.impressions)} />
                  <Metric label="CTR" value={fmtPct(d.ctr)} />
                  <Metric label="Avg Position" value={fmtPos(d.avg_position)} />
                </>
              )
            })()}
            {source === 'ga' && (() => {
              const d = parsed as AnalyticsResult
              return (
                <>
                  <Metric label="Users" value={fmtNum(d.users)} />
                  <Metric label="Sessions" value={fmtNum(d.sessions)} />
                  <Metric label="Visits (Pageviews)" value={fmtNum(d.visits)} />
                  <Metric label="Time on Site" value={fmtDuration(d.avg_session_duration)} />
                  <Metric label="Bounce Rate" value={fmtPct(d.bounce_rate)} />
                </>
              )
            })()}
            {source === 'semrush' && (() => {
              const d = parsed as SemrushResult
              return (
                <>
                  <Metric label="Authority Score" value={String(d.authority_score)} />
                  <Metric label="Organic Traffic" value={fmtNum(d.organic_traffic)} />
                  <Metric label="Org Keywords" value={fmtNum(d.organic_keywords)} />
                  <Metric label="Backlinks" value={fmtNum(d.backlinks)} />
                  <Metric label="Ref Domains" value={fmtNum(d.referring_domains)} />
                </>
              )
            })()}
            {source === 'funnel' && (() => {
              const d = parsed as FunnelResult
              return (
                <>
                  <Metric label="MQLs" value={fmtNum(d.mqls)} />
                  <Metric label="SQLs" value={fmtNum(d.sqls)} />
                  <Metric label="Pipeline ARR" value={fmtCurrency(d.pipeline_arr)} />
                  <Metric label="Avg Deal Value" value={fmtCurrency(d.avg_deal_value)} />
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'saved' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4 text-sm text-emerald-700 font-semibold">
          ✓ Saved! Redirecting to dashboard…
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!parsed || isError(parsed) || status === 'saving' || status === 'saved' || !sb}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#0D1B2A] text-white hover:bg-slate-800 disabled:hover:bg-[#0D1B2A]"
      >
        {status === 'saving' ? 'Saving…' : 'Save to Dashboard'}
      </button>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-lg px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-800 font-mono">{value}</div>
    </div>
  )
}
