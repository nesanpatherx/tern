import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Pipeline IDs per portco (from Pipedrive)
const PIPEDRIVE_PORTCOS = [
  { name: 'Mind Of My Own', domain: 'mindofmyown.com', pipelineIds: [3, 29, 31, 1, 27, 24, 6] },
  { name: 'SchoolScreener', domain: 'schoolscreener.com', pipelineIds: [34, 36] },
  { name: 'CCube Solutions', domain: 'ccubesolutions.com', pipelineIds: [35] },
  { name: 'Charity Log', domain: 'charitylog.co.uk', pipelineIds: [37] },
]

type PipedriveDeal = {
  id: number
  title: string
  status: string
  value: number
  currency: string
  stage_id: number
  pipeline_id: number
  probability: number | null
}

export async function POST() {
  const apiKey = process.env.PIPEDRIVE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'PIPEDRIVE_API_KEY not set' }, { status: 500 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: portcos } = await sb.from('portcos').select('id, name, domain')
  if (!portcos) return NextResponse.json({ error: 'Could not load portcos' }, { status: 500 })

  // Fetch all deals in one call (status=all, limit=500)
  const dealsRes = await fetch(
    `https://api.pipedrive.com/v1/deals?status=all&limit=500&api_token=${apiKey}`
  )
  const dealsData = await dealsRes.json()
  const allDeals: PipedriveDeal[] = dealsData?.data ?? []

  // Fetch stages to map probability
  const stagesRes = await fetch(`https://api.pipedrive.com/v1/stages?api_token=${apiKey}`)
  const stagesData = await stagesRes.json()
  const stageMap: Record<number, { probability: number; order_nr: number }> = {}
  for (const s of stagesData?.data ?? []) {
    stageMap[s.id] = { probability: s.deal_probability ?? 50, order_nr: s.order_nr ?? 1 }
  }

  const results: { name: string; status: string; mqls?: number; sqls?: number; pipeline?: number; avgDeal?: number }[] = []

  for (const pd of PIPEDRIVE_PORTCOS) {
    const portco = portcos.find(p => p.domain === pd.domain)
    if (!portco) { results.push({ name: pd.name, status: 'not found in DB' }); continue }

    try {
      // Filter deals by pipeline_id
      const deals = allDeals.filter(d => pd.pipelineIds.includes(d.pipeline_id))
      const openDeals = deals.filter(d => d.status === 'open')
      const wonDeals = deals.filter(d => d.status === 'won')

      // MQL = open deals in early stages (probability < 50%)
      // SQL = open deals in later stages (probability >= 50%)
      const mqls = openDeals.filter(d => {
        const prob = stageMap[d.stage_id]?.probability ?? d.probability ?? 50
        return prob < 50
      }).length

      const sqls = openDeals.filter(d => {
        const prob = stageMap[d.stage_id]?.probability ?? d.probability ?? 50
        return prob >= 50
      }).length

      const pipeline = openDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)

      const avgDeal = wonDeals.length > 0
        ? wonDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0) / wonDeals.length
        : 0

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

      results.push({ name: pd.name, status: 'ok', mqls, sqls, pipeline, avgDeal })
    } catch (e) {
      results.push({ name: pd.name, status: `error: ${e}` })
    }
  }

  return NextResponse.json({ results })
}
