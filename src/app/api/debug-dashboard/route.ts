import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!supabase) return NextResponse.json({ error: 'no supabase' })

  const [portcosRes, scRes] = await Promise.all([
    supabase.from('portcos').select('*').order('name'),
    supabase.from('search_console_uploads').select('*').order('uploaded_at', { ascending: false }),
  ])

  const portcos = portcosRes.data ?? []
  const scRows = scRes.data ?? []

  const latestSC = new Map<string, unknown>()
  for (const r of scRows) {
    if (!latestSC.has(r.portco_id)) latestSC.set(r.portco_id, r)
  }

  const result = portcos.map(p => ({
    id: p.id,
    name: p.name,
    sc: latestSC.get(p.id) ?? null,
  }))

  return NextResponse.json({ result, scRows })
}
