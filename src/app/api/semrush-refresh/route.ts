import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SEMRUSH_KEY = process.env.SEMRUSH_API_KEY
const DB = 'uk'

type DomainOverview = {
  organic_keywords: number
  organic_traffic: number
  paid_traffic: number
  authority_score: number
  backlinks: number
  referring_domains: number
}

async function fetchDomainOverview(domain: string): Promise<DomainOverview | null> {
  const parse = (text: string): DomainOverview | null => {
    const lines = text.trim().split('\n')
    if (lines.length < 2 || text.includes('ERROR')) return null
    const headers = lines[0].split(';')
    const values = lines[1].split(';')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim() ?? '0' })
    const traffic = parseInt(row['Organic Traffic'] ?? row['Ot'] ?? '0') || 0
    const keywords = parseInt(row['Organic Keywords'] ?? row['Or'] ?? '0') || 0
    if (traffic === 0) return null
    return {
      organic_keywords: keywords,
      organic_traffic: traffic,
      paid_traffic: parseInt(row['Adwords Traffic'] ?? row['At'] ?? '0') || 0,
      authority_score: 0,
      backlinks: 0,
      referring_domains: 0,
    }
  }

  try {
    // Fetch both databases in parallel, pick whichever has more traffic
    const [ukRes, usRes] = await Promise.all([
      fetch(`https://api.semrush.com/?type=domain_ranks&key=${SEMRUSH_KEY}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${domain}&database=uk`, { next: { revalidate: 0 } }),
      fetch(`https://api.semrush.com/?type=domain_ranks&key=${SEMRUSH_KEY}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${domain}&database=us`, { next: { revalidate: 0 } }),
    ])
    const [ukText, usText] = await Promise.all([ukRes.text(), usRes.text()])
    const ukData = parse(ukText)
    const usData = parse(usText)

    if (!ukData && !usData) return null
    if (!ukData) return usData
    if (!usData) return ukData
    // Return whichever has higher organic traffic
    return ukData.organic_traffic >= usData.organic_traffic ? ukData : usData
  } catch {
    return null
  }
}

async function fetchBacklinksOverview(domain: string): Promise<{ backlinks: number; referring_domains: number; authority_score: number } | null> {
  try {
    const url = `https://api.semrush.com/analytics/v1/?key=${SEMRUSH_KEY}&type=backlinks_overview&target=${domain}&target_type=root_domain&export_columns=ascore,total,domains_num`
    const res = await fetch(url, { next: { revalidate: 0 } })
    const text = await res.text()

    if (text.includes('ERROR') || !text.trim()) return null

    const lines = text.trim().split('\n')
    if (lines.length < 2) return null

    const headers = lines[0].split(';')
    const values = lines[1].split(';')
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim() ?? '0' })

    return {
      authority_score: parseInt(row['Authority Score'] ?? row['ascore'] ?? '0') || 0,
      backlinks: parseInt(row['Total Backlinks'] ?? row['total'] ?? '0') || 0,
      referring_domains: parseInt(row['Referring Domains'] ?? row['domains_num'] ?? '0') || 0,
    }
  } catch {
    return null
  }
}

export async function POST() {
  if (!SEMRUSH_KEY) {
    return NextResponse.json({ error: 'SEMRUSH_API_KEY not configured' }, { status: 500 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const sb = createClient(url, key)

  const { data: portcos, error: portcoErr } = await sb.from('portcos').select('id, domain, name')
  if (portcoErr || !portcos) {
    return NextResponse.json({ error: 'Could not load portcos' }, { status: 500 })
  }

  const results: { name: string; domain: string; status: string }[] = []

  for (const portco of portcos) {
    try {
      const [overview, backlinks] = await Promise.all([
        fetchDomainOverview(portco.domain),
        fetchBacklinksOverview(portco.domain),
      ])

      if (!overview && !backlinks) {
        results.push({ name: portco.name, domain: portco.domain, status: 'no data' })
        continue
      }

      const payload = {
        portco_id: portco.id,
        report_date: new Date().toISOString().split('T')[0],
        authority_score: backlinks?.authority_score ?? 0,
        organic_traffic: overview?.organic_traffic ?? 0,
        organic_keywords: overview?.organic_keywords ?? 0,
        paid_traffic: overview?.paid_traffic ?? 0,
        backlinks: backlinks?.backlinks ?? 0,
        referring_domains: backlinks?.referring_domains ?? 0,
      }

      await sb.from('semrush_uploads').delete().eq('portco_id', portco.id)
      const { error } = await sb.from('semrush_uploads').insert(payload)

      results.push({
        name: portco.name,
        domain: portco.domain,
        status: error ? `error: ${error.message}` : 'ok',
      })
    } catch (e) {
      results.push({ name: portco.name, domain: portco.domain, status: `failed: ${String(e)}` })
    }

    // Respect SEMrush rate limits — 10 req/s max
    await new Promise(r => setTimeout(r, 150))
  }

  const ok = results.filter(r => r.status === 'ok').length
  return NextResponse.json({ refreshed: ok, total: portcos.length, results })
}
