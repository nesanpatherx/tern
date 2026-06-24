import Papa from 'papaparse'

export type ParseError = { error: string }

export type GSCRow = { label: string; clicks: number; impressions: number; ctr: number; position: number }

export type SearchConsoleResult = {
  period_start: string | null
  period_end: string | null
  clicks: number
  impressions: number
  ctr: number
  avg_position: number
  row_count: number
  top_queries?: GSCRow[]
  top_pages?: GSCRow[]
  top_countries?: GSCRow[]
  top_devices?: GSCRow[]
}

export type GSCFileType = 'date' | 'queries' | 'pages' | 'countries' | 'devices' | 'appearance' | 'unknown'

export function detectGSCFileType(filename: string, text: string): GSCFileType {
  const fn = filename.toLowerCase()
  const first = text.slice(0, 1000).toLowerCase()
  if (fn.includes('quer') || first.includes('top queries') || first.includes('query\t') || first.includes('query,')) return 'queries'
  if (fn.includes('page') || first.includes('top pages') || first.includes('landing page')) return 'pages'
  if (fn.includes('countr') || first.includes('country\t') || first.includes('country,')) return 'countries'
  if (fn.includes('device') || first.includes('device\t') || first.includes('device,')) return 'devices'
  if (fn.includes('appearance') || first.includes('search type') || first.includes('search appearance')) return 'appearance'
  if (fn.includes('date') || fn.includes('chart') || fn.includes('performance') || first.includes('date\t') || first.includes('date,')) return 'date'
  return 'unknown'
}

export type AnalyticsResult = {
  period_start: string | null
  period_end: string | null
  sessions: number
  users: number
  new_users: number
  visits: number
  bounce_rate: number
  avg_session_duration: number
  row_count: number
}

export type FunnelResult = {
  period_start: string | null
  period_end: string | null
  mqls: number
  sqls: number
  pipeline_arr: number
  avg_deal_value: number
}

export type SemrushResult = {
  report_date: string
  authority_score: number
  organic_traffic: number
  organic_keywords: number
  paid_traffic: number
  backlinks: number
  referring_domains: number
}

function norm(key: string): string {
  return key.toLowerCase().trim().replace(/[\s\-_.()]/g, '')
}

function findCol(row: Record<string, string>, ...targets: string[]): string | undefined {
  const keys = Object.keys(row)
  for (const t of targets) {
    const exact = keys.find(k => norm(k) === norm(t))
    if (exact) return exact
  }
  for (const t of targets) {
    const partial = keys.find(k => norm(k).includes(norm(t)))
    if (partial) return partial
  }
  return undefined
}

function toNum(v: string | undefined): number {
  if (!v) return 0
  return parseFloat(String(v).replace(/[,%\s]/g, '')) || 0
}

function toPct(v: string | undefined): number {
  if (!v) return 0
  const s = String(v).trim()
  if (s.endsWith('%')) return parseFloat(s) / 100
  const n = parseFloat(s)
  if (n > 1) return n / 100   // e.g. "2.17" → 0.0217
  return n                     // e.g. "0.0217" → 0.0217
}

function stripBom(text: string): string {
  return text.replace(/^﻿/, '')
}

function findHeaderLine(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const lower = lines[i].toLowerCase()
    if (
      lower.includes('clicks') ||
      lower.includes('sessions') ||
      lower.includes('authority') ||
      lower.includes('organic')
    ) return i
  }
  return 0
}

// ── Search Console ────────────────────────────────────────────────────────────

function parseGSCRows(data: Record<string, string>[], labelKey: string): GSCRow[] {
  return data.slice(0, 20).map(r => {
    const clicksKey = findCol(r, 'clicks')
    const impKey = findCol(r, 'impressions')
    const ctrKey = findCol(r, 'ctr')
    const posKey = findCol(r, 'position')
    return {
      label: r[labelKey] ?? '',
      clicks: clicksKey ? toNum(r[clicksKey]) : 0,
      impressions: impKey ? toNum(r[impKey]) : 0,
      ctr: ctrKey ? toPct(r[ctrKey]) : 0,
      position: posKey ? toNum(r[posKey]) : 0,
    }
  }).filter(r => r.label)
}

export function parseSearchConsoleCSV(text: string, filename = ''): SearchConsoleResult | ParseError {
  const fileType = detectGSCFileType(filename, text)
  const lines = stripBom(text).split('\n').filter(l => l.trim())
  const startIdx = findHeaderLine(lines)
  const csv = lines.slice(startIdx).join('\n')

  const { data, errors } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })

  if (!data.length) return { error: errors[0]?.message || 'No rows found in CSV' }

  const row0 = data[0]
  const clicksKey = findCol(row0, 'clicks')
  const impKey = findCol(row0, 'impressions')
  const ctrKey = findCol(row0, 'ctr')
  const posKey = findCol(row0, 'position')

  if (!clicksKey || !impKey) {
    return { error: 'Could not find Clicks / Impressions columns.' }
  }

  // For dimension files — sum clicks/impressions from all rows, store top rows as JSONB
  if (fileType === 'queries' || fileType === 'pages' || fileType === 'countries' || fileType === 'devices') {
    let totalClicks = 0, totalImp = 0, sumCtr = 0, sumPos = 0
    for (const r of data) {
      totalClicks += clicksKey ? toNum(r[clicksKey]) : 0
      totalImp += impKey ? toNum(r[impKey]) : 0
      if (ctrKey) sumCtr += toPct(r[ctrKey])
      if (posKey) sumPos += toNum(r[posKey])
    }
    const n = data.length
    const base: SearchConsoleResult = {
      period_start: null, period_end: null,
      clicks: totalClicks, impressions: totalImp,
      ctr: n > 0 ? sumCtr / n : 0,
      avg_position: n > 0 ? sumPos / n : 0,
      row_count: n,
    }
    if (fileType === 'queries') {
      const labelKey = findCol(row0, 'query', 'top queries') ?? Object.keys(row0)[0]
      base.top_queries = parseGSCRows(data, labelKey)
    } else if (fileType === 'pages') {
      const labelKey = findCol(row0, 'page', 'top pages', 'landing page') ?? Object.keys(row0)[0]
      base.top_pages = parseGSCRows(data, labelKey)
    } else if (fileType === 'countries') {
      const labelKey = findCol(row0, 'country') ?? Object.keys(row0)[0]
      base.top_countries = parseGSCRows(data, labelKey)
    } else {
      const labelKey = findCol(row0, 'device') ?? Object.keys(row0)[0]
      base.top_devices = parseGSCRows(data, labelKey)
    }
    return base
  }

  // Date/performance file — aggregate totals
  const dateKey = findCol(row0, 'date')
  let totalClicks = 0, totalImp = 0, sumCtr = 0, sumPos = 0
  const dates: string[] = []

  for (const r of data) {
    totalClicks += toNum(r[clicksKey])
    totalImp += toNum(r[impKey])
    if (ctrKey) sumCtr += toPct(r[ctrKey])
    if (posKey) sumPos += toNum(r[posKey])
    if (dateKey && r[dateKey]) dates.push(r[dateKey])
  }

  const n = data.length
  const sorted = dates.sort()

  return {
    period_start: sorted[0] ?? null,
    period_end: sorted[sorted.length - 1] ?? null,
    clicks: totalClicks,
    impressions: totalImp,
    ctr: n > 0 ? sumCtr / n : 0,
    avg_position: n > 0 ? sumPos / n : 0,
    row_count: n,
  }
}

// ── Google Analytics ──────────────────────────────────────────────────────────

export function parseAnalyticsCSV(text: string): AnalyticsResult | ParseError {
  const clean = stripBom(text)
  const lines = clean.split('\n')

  // Extract date range from GA4 metadata comments
  let metaStart: string | null = null
  let metaEnd: string | null = null
  for (const line of lines.slice(0, 15)) {
    const lower = line.toLowerCase()
    if (lower.includes('start date')) {
      const m = line.match(/(\d{4}-?\d{2}-?\d{2})/)
      if (m) metaStart = m[1]
    }
    if (lower.includes('end date')) {
      const m = line.match(/(\d{4}-?\d{2}-?\d{2})/)
      if (m) metaEnd = m[1]
    }
  }

  const dataLines = lines.filter(l => l.trim() && !l.startsWith('#'))
  const startIdx = findHeaderLine(dataLines)
  const csv = dataLines.slice(startIdx).join('\n')

  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })

  if (!data.length) return { error: 'No data rows found. Export via: Reports → share icon → Download CSV.' }

  const row0 = data[0]
  const sessionKey = findCol(row0, 'sessions')
  const usersKey = findCol(row0, 'totalusers', 'users', 'activeusers')
  const newUsersKey = findCol(row0, 'newusers')
  const visitsKey = findCol(row0, 'screenpageviews', 'pageviews', 'views', 'visits')
  const bounceKey = findCol(row0, 'bouncerate', 'bounces', 'bounced', 'engagementrate')
  const durKey = findCol(row0, 'avgsessionduration', 'averagesessionduration', 'averageengagementtimepersession', 'sessionduration', 'timeonsite', 'averageengagementtime', 'engagementtime')
  const dateKey = findCol(row0, 'date', 'nthday', 'day')

  if (!usersKey && !sessionKey) {
    return { error: 'Could not find Users or Sessions columns. Expected Google Analytics 4 export.' }
  }

  // Skip rate/ratio columns that look like sessions but are actually per-user rates
  const isRateCol = (key: string | undefined) => key && (key.toLowerCase().includes('per active') || key.toLowerCase().includes('per user'))
  const safeSessionKey = isRateCol(sessionKey) ? undefined : sessionKey

  let totalSessions = 0, totalUsers = 0, totalNew = 0, totalVisits = 0
  let sumBounce = 0, sumDur = 0
  const dates: string[] = []

  for (const r of data) {
    if (safeSessionKey) totalSessions += toNum(r[safeSessionKey])
    if (usersKey) totalUsers += toNum(r[usersKey])
    if (newUsersKey) totalNew += toNum(r[newUsersKey])
    if (visitsKey) totalVisits += toNum(r[visitsKey])
    if (bounceKey) sumBounce += toNum(r[bounceKey])
    if (durKey) sumDur += toNum(r[durKey])
    if (dateKey && r[dateKey]) {
      let d = r[dateKey]
      // GA4 exports dates as YYYYMMDD
      if (/^\d{8}$/.test(d)) d = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
      dates.push(d)
    }
  }

  const n = data.length
  const sorted = dates.sort()

  return {
    period_start: metaStart ?? sorted[0] ?? null,
    period_end: metaEnd ?? sorted[sorted.length - 1] ?? null,
    sessions: totalSessions,
    users: totalUsers,
    new_users: totalNew,
    visits: totalVisits,
    bounce_rate: n > 0 ? sumBounce / n : 0,
    avg_session_duration: n > 0 ? sumDur / n : 0,
    row_count: n,
  }
}

// ── SEMRush ───────────────────────────────────────────────────────────────────

export function parseSemrushCSV(text: string): SemrushResult | ParseError {
  const lines = stripBom(text).split('\n').filter(l => l.trim())
  const startIdx = findHeaderLine(lines)
  const csv = lines.slice(startIdx).join('\n')

  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })

  if (!data.length) return { error: 'No data found. Export Domain Overview via: SEMRush → Domain Overview → Export.' }

  const row = data[0]

  const authKey = findCol(row, 'authorityscore', 'as')
  const orgTrafficKey = findCol(row, 'organicsearchtraffic', 'organictraffic', 'organicsearch')
  const orgKwKey = findCol(row, 'organickeywords', 'organicsearchkeywords')
  const paidKey = findCol(row, 'paidsearchtraffic', 'paidtraffic', 'paidsearch')
  const backlinksKey = findCol(row, 'backlinks', 'totalbacklinks')
  const refKey = findCol(row, 'referringdomains', 'refdomains')

  if (!authKey && !orgTrafficKey) {
    return {
      error: 'Could not identify SEMRush columns. Export via: Domain Overview → Export CSV. Expected columns: Authority Score, Organic Search Traffic, etc.',
    }
  }

  return {
    report_date: new Date().toISOString().split('T')[0],
    authority_score: authKey ? toNum(row[authKey]) : 0,
    organic_traffic: orgTrafficKey ? toNum(row[orgTrafficKey]) : 0,
    organic_keywords: orgKwKey ? toNum(row[orgKwKey]) : 0,
    paid_traffic: paidKey ? toNum(row[paidKey]) : 0,
    backlinks: backlinksKey ? toNum(row[backlinksKey]) : 0,
    referring_domains: refKey ? toNum(row[refKey]) : 0,
  }
}

// ── Goldvision CRM ────────────────────────────────────────────────────────────
// Columns: AGE_GROUP, PROJECT_NAME, AC_NAME_1, ACCOUNT_MANAGER,
//          POTENTIAL_VALUE, PROBABILITY, OP_STAGE, LAST_UPDATED, DAYS_OLD

export function isGoldvisionCSV(text: string): boolean {
  const first = text.slice(0, 500).toUpperCase()
  return first.includes('AGE_GROUP') && first.includes('OP_STAGE') && first.includes('POTENTIAL_VALUE')
}

// Account manager → BU mapping
const GV_BU_MAP: Record<string, string> = {
  'iain tubby': 'CADS Surveys',
  'mark johnson': 'CADS Surveys',
  'jamie mccoll': 'CADS Surveys',
  'simon ruddick': 'CADS Surveys',
  'matthew pilling': 'Prosper Design',
}
const GV_BU_DEFAULT = 'CADS'

export type GoldvisionBU = { bu: string; result: FunnelResult }

export function parseGoldvisionCSV(text: string): GoldvisionBU[] | ParseError {
  const clean = stripBom(text)
  const { data } = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })

  if (!data.length) return { error: 'No rows found in Goldvision export.' }

  const row0 = data[0]
  const stageKey = findCol(row0, 'OP_STAGE', 'opstage', 'stage')
  const valueKey = findCol(row0, 'POTENTIAL_VALUE', 'potentialvalue', 'value')
  const probKey = findCol(row0, 'PROBABILITY', 'probability', 'prob')
  const amKey = findCol(row0, 'ACCOUNT_MANAGER', 'accountmanager', 'manager')
  const dateKey = findCol(row0, 'LAST_UPDATED', 'lastupdated', 'date')

  if (!stageKey || !valueKey) {
    return { error: 'Could not find OP_STAGE or POTENTIAL_VALUE columns. Is this a Goldvision opportunities export?' }
  }

  const isOpen = (stage: string) => !['7 - closed', '8 - closed', '9 - closed'].some(s => stage.toLowerCase().startsWith(s))
  const isWon = (stage: string) => stage.toLowerCase().includes('closed - won')

  type BUAccum = { mqls: number; sqls: number; pipeline: number; wonTotal: number; wonCount: number; dates: string[] }
  const accum: Record<string, BUAccum> = {}
  const initBU = (): BUAccum => ({ mqls: 0, sqls: 0, pipeline: 0, wonTotal: 0, wonCount: 0, dates: [] })

  for (const r of data) {
    const stage = r[stageKey] ?? ''
    const value = toNum(r[valueKey])
    const prob = probKey ? toNum(r[probKey]) : 0
    const am = amKey ? (r[amKey] ?? '').toLowerCase().trim() : ''
    const bu = GV_BU_MAP[am] ?? GV_BU_DEFAULT

    if (!accum[bu]) accum[bu] = initBU()
    const a = accum[bu]

    if (dateKey && r[dateKey]) a.dates.push(r[dateKey])

    if (isWon(stage)) {
      if (value > 0) { a.wonTotal += value; a.wonCount++ }
      continue
    }
    if (!isOpen(stage)) continue

    a.pipeline += value
    if (prob < 50) a.mqls++
    else a.sqls++
  }

  return Object.entries(accum).map(([bu, a]) => {
    const parsedDates = a.dates.map(d => {
      const m = d.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      return m ? `${m[3]}-${m[2]}-${m[1]}` : d
    }).sort()

    return {
      bu,
      result: {
        period_start: parsedDates[0] ?? null,
        period_end: parsedDates[parsedDates.length - 1] ?? null,
        mqls: a.mqls,
        sqls: a.sqls,
        pipeline_arr: a.pipeline,
        avg_deal_value: a.wonCount > 0 ? a.wonTotal / a.wonCount : 0,
      },
    }
  })
}

// ── HubSpot CRM ───────────────────────────────────────────────────────────────
// Columns: Record ID, Deal Name, Deal Stage, Close Date, Deal owner, Amount

export function isHubSpotCSV(text: string): boolean {
  const first = text.slice(0, 300).toLowerCase()
  return first.includes('record id') && first.includes('deal stage') && first.includes('deal owner')
}

const HS_MQL_STAGES = ['qualification', 'meeting / demonstration', 'meeting/demonstration', 're-engage', 'rfp/rfi']
const HS_SQL_STAGES = ['proposal  created', 'proposal created', 'preferred vendor', 'renewal discussion scheduled', 'billing started']

export function parseHubSpotCSV(text: string): FunnelResult | ParseError {
  const clean = stripBom(text)
  const { data } = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })

  if (!data.length) return { error: 'No rows found in HubSpot export.' }

  const row0 = data[0]
  const stageKey = findCol(row0, 'Deal Stage', 'dealstage', 'stage')
  const amountKey = findCol(row0, 'Amount', 'amount', 'value')
  const dateKey = findCol(row0, 'Close Date', 'closedate', 'date')

  if (!stageKey) return { error: 'Could not find Deal Stage column. Is this a HubSpot deals export?' }

  let mqls = 0, sqls = 0, pipeline = 0, wonTotal = 0, wonCount = 0
  const dates: string[] = []

  for (const r of data) {
    const stage = (r[stageKey] ?? '').toLowerCase().trim()
    const amount = amountKey ? toNum(r[amountKey]) : 0
    if (dateKey && r[dateKey]) dates.push(r[dateKey])

    if (stage === 'closed won') {
      if (amount > 0) { wonTotal += amount; wonCount++ }
      continue
    }
    if (stage === 'closed lost') continue

    // Open deal
    pipeline += amount
    if (HS_MQL_STAGES.some(s => stage.includes(s))) mqls++
    else if (HS_SQL_STAGES.some(s => stage.includes(s))) sqls++
    else mqls++ // unknown open stage → treat as MQL
  }

  const parsedDates = dates
    .map(d => { const m = d.match(/(\d{4}-\d{2}-\d{2})/); return m ? m[1] : '' })
    .filter(Boolean).sort()

  return {
    period_start: parsedDates[0] ?? null,
    period_end: parsedDates[parsedDates.length - 1] ?? null,
    mqls,
    sqls,
    pipeline_arr: pipeline,
    avg_deal_value: wonCount > 0 ? wonTotal / wonCount : 0,
  }
}

// ── Sales Funnel ──────────────────────────────────────────────────────────────
// Accepts any CSV with columns: MQLs, SQLs, Pipeline ARR, Avg Deal Value
// Works with HubSpot/Salesforce/Pipedrive exports or a manual spreadsheet export.

export function parseFunnelCSV(text: string): FunnelResult | ParseError {
  const lines = stripBom(text).split('\n').filter(l => l.trim())

  // Look for header line containing known funnel column names
  let startIdx = 0
  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const lower = lines[i].toLowerCase()
    if (lower.includes('mql') || lower.includes('sql') || lower.includes('pipeline') || lower.includes('deal')) {
      startIdx = i
      break
    }
  }

  const csv = lines.slice(startIdx).join('\n')
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  })

  if (!data.length) return { error: 'No data found. Expected columns: MQLs, SQLs, Pipeline ARR, Avg Deal Value.' }

  const row0 = data[0]
  const mqlKey = findCol(row0, 'mqls', 'mql', 'marketingqualifiedleads')
  const sqlKey = findCol(row0, 'sqls', 'sql', 'salesqualifiedleads')
  const pipelineKey = findCol(row0, 'pipelinearr', 'pipeline', 'pipelinevalue', 'arr')
  const dealKey = findCol(row0, 'avgdealvalue', 'averagedealvalue', 'dealvalue', 'avgdeal')
  const dateKey = findCol(row0, 'date', 'period', 'month')

  if (!mqlKey && !sqlKey && !pipelineKey) {
    return { error: 'Could not find funnel columns. Expected: MQLs, SQLs, Pipeline ARR, Avg Deal Value.' }
  }

  let totalMqls = 0, totalSqls = 0, totalPipeline = 0, sumDeal = 0, dealCount = 0
  const dates: string[] = []

  for (const r of data) {
    if (mqlKey) totalMqls += toNum(r[mqlKey])
    if (sqlKey) totalSqls += toNum(r[sqlKey])
    if (pipelineKey) totalPipeline += toNum(r[pipelineKey])
    if (dealKey) { sumDeal += toNum(r[dealKey]); dealCount++ }
    if (dateKey && r[dateKey]) dates.push(r[dateKey])
  }

  const sorted = dates.sort()

  return {
    period_start: sorted[0] ?? null,
    period_end: sorted[sorted.length - 1] ?? null,
    mqls: totalMqls,
    sqls: totalSqls,
    pipeline_arr: totalPipeline,
    avg_deal_value: dealCount > 0 ? sumDeal / dealCount : 0,
  }
}
