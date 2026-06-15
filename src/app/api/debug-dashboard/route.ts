import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!supabase) return NextResponse.json({ error: 'no supabase' })

  const [portcosRes, scRes] = await Promise.all([
    supabase.from('portcos').select('id, name').order('name'),
    supabase.from('search_console_uploads').select('portco_id, clicks, impressions, uploaded_at').order('uploaded_at', { ascending: false }),
  ])

  return NextResponse.json({
    portcos: portcosRes.data,
    sc_rows: scRes.data,
    sc_error: scRes.error,
  })
}
