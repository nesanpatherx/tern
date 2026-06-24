import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const PIPEDRIVE_PORTCOS = [
  { name: 'SchoolScreener', domain: 'schoolscreener.com' },
  { name: 'Mind Of My Own', domain: 'mindofmyown.com' },
  { name: 'CCube Solutions', domain: 'ccubesolutions.com' },
  { name: 'Charity Log', domain: 'charitylog.co.uk' },
]

export async function POST() {
  const apiKey = process.env.PIPEDRIVE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'PIPEDRIVE_API_KEY not set' }, { status: 500 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get portcos from DB
  const { data: portcos } = await sb.from('portcos').select('id, name, domain')
  if (!portcos) return NextResponse.json({ error: 'Could not load portcos' }, { status: 500 })

  const results: { name: string; status: string; mqls?: number; sqls?: number; pipeline?: number }[] = []

  for (const pd of PIPEDRIVE_PORTCOS) {
    const portco = portcos.find(p => p.domain === pd.domain)
    if (!portco) { results.push({ name: pd.name, status: 'not found in DB' }); continue }

    try {
      // Search for organisation by name
      const orgRes = await fetch(
        `https://api.pipedrive.com/v1/organizations/search?term=${encodeURIComponent(pd.name)}&api_token=${apiKey}`
      )
      const orgData = await orgRes.json()
      const org = orgData?.data?.items?.[0]?.item

      // Fetch all deals for this org (or all deals if no org found)
      const dealsUrl = org
        ? `https://api.pipedrive.com/v1/organizations/${org.id}/deals?status=all&limit=500&api_token=${apiKey}`
        : `https://api.pipedrive.com/v1/deals?status=all&limit=500&api_token=${apiKey}`

      const dealsRes = await fetch(dealsUrl)
      const dealsData = await dealsRes.json()
      const deals: Record<string, unknown>[] = dealsData?.data ?? []

      // Calculate metrics
      const openDeals = deals.filter((d: Record<string, unknown>) => d.status === 'open')
      const wonDeals = deals.filter((d: Record<string, unknown>) => d.status === 'won')

      const pipeline = openDeals.reduce((sum: number, d: Record<string, unknown>) => sum + (Number(d.value) || 0), 0)
      const avgDeal = wonDeals.length > 0
        ? wonDeals.reduce((sum: number, d: Record<string, unknown>) => sum + (Number(d.value) || 0), 0) / wonDeals.length
        : 0

      // Use won deals as SQLs, open as MQLs (approximate mapping)
      const mqls = openDeals.length
      const sqls = wonDeals.length

      await sb.from('funnel_uploads').delete().eq('portco_id', portco.id)
      await sb.from('funnel_uploads').insert({
        portco_id: portco.id,
        period_start: null,
        period_end: new Date().toISOString().split('T')[0],
        mqls,
        sqls,
        pipeline_arr: pipeline,
        avg_deal_value: avgDeal,
      })

      results.push({ name: pd.name, status: 'ok', mqls, sqls, pipeline })
    } catch (e) {
      results.push({ name: pd.name, status: `error: ${e}` })
    }
  }

  return NextResponse.json({ results })
}
