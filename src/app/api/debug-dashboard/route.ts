import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!supabase) return NextResponse.json({ error: 'no supabase' })

  const [portcosRes, funnelRes] = await Promise.all([
    supabase.from('portcos').select('id, name, domain').order('sort_order', { ascending: true }),
    supabase.from('funnel_uploads').select('portco_id, mqls, sqls, pipeline_arr, avg_deal_value, uploaded_at').order('uploaded_at', { ascending: false }),
  ])

  const portcos = portcosRes.data ?? []
  const funnelRows = funnelRes.data ?? []

  const latestFunnel = new Map<string, unknown>()
  for (const r of funnelRows) {
    if (!latestFunnel.has(r.portco_id)) latestFunnel.set(r.portco_id, r)
  }

  return NextResponse.json({
    portcos: portcos.map(p => ({
      name: p.name,
      domain: p.domain,
      funnel: latestFunnel.get(p.id) ?? null,
    })),
    all_funnel_rows: funnelRows,
  })
}
