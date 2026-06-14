import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const semrushKey = process.env.SEMRUSH_API_KEY
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Check env vars
  const envCheck = {
    SEMRUSH_API_KEY: semrushKey ? `set (${semrushKey.slice(0, 6)}...)` : 'MISSING',
    SUPABASE_URL: sbUrl ? 'set' : 'MISSING',
    SUPABASE_ANON_KEY: sbKey ? 'set' : 'MISSING',
  }

  // Check portcos
  let portcos: unknown[] = []
  let portcoError = null
  if (sbUrl && sbKey) {
    const sb = createClient(sbUrl, sbKey)
    const { data, error } = await sb.from('portcos').select('id, name, domain')
    portcos = data ?? []
    portcoError = error?.message ?? null
  }

  // Test one SEMrush call
  let semrushTest = null
  if (semrushKey && portcos.length > 0) {
    const domain = (portcos[0] as { domain: string }).domain
    try {
      const url = `https://api.semrush.com/?type=domain_ranks&key=${semrushKey}&export_columns=Dn,Rk,Or,Ot,Oc&domain=${domain}&database=uk`
      const res = await fetch(url)
      const text = await res.text()
      semrushTest = { domain, status: res.status, response: text.slice(0, 300) }
    } catch (e) {
      semrushTest = { domain, error: String(e) }
    }
  }

  return NextResponse.json({ envCheck, portcoCount: portcos.length, portcoError, semrushTest })
}
