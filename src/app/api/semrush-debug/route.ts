import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function parseTraffic(text: string): number {
  const lines = text.trim().split('\n')
  if (lines.length < 2 || text.includes('ERROR')) return -1
  const headers = lines[0].split(';')
  const values = lines[1].split(';')
  const row: Record<string, string> = {}
  headers.forEach((h, i) => { row[h.trim()] = values[i]?.trim() ?? '0' })
  return parseInt(row['Organic Traffic'] ?? '0') || 0
}

export async function GET() {
  const key = process.env.SEMRUSH_API_KEY
  if (!key) return NextResponse.json({ error: 'no key' })

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: portcos } = await sb.from('portcos').select('name, domain').order('sort_order')
  if (!portcos) return NextResponse.json({ error: 'no portcos' })

  const results = []
  for (const p of portcos) {
    const [ukRes, usRes] = await Promise.all([
      fetch(`https://api.semrush.com/?type=domain_ranks&key=${key}&export_columns=Dn,Rk,Or,Ot&domain=${p.domain}&database=uk`),
      fetch(`https://api.semrush.com/?type=domain_ranks&key=${key}&export_columns=Dn,Rk,Or,Ot&domain=${p.domain}&database=us`),
    ])
    const [ukText, usText] = await Promise.all([ukRes.text(), usRes.text()])
    const ukTraffic = parseTraffic(ukText)
    const usTraffic = parseTraffic(usText)
    results.push({ name: p.name, domain: p.domain, uk_traffic: ukTraffic, us_traffic: usTraffic, best: Math.max(ukTraffic, usTraffic) })
    await new Promise(r => setTimeout(r, 200))
  }

  return NextResponse.json(results)
}
