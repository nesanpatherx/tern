import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleAuth } from 'google-auth-library'

async function getGA4Data(propertyId: string, auth: GoogleAuth) {
  const client = await auth.getClient()
  const token = await client.getAccessToken()

  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'sessions' },
          { name: 'totalUsers' },
          { name: 'newUsers' },
          { name: 'screenPageViews' },
          { name: 'bounceRate' },
          { name: 'averageSessionDuration' },
        ],
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GA4 API error for property ${propertyId}: ${err}`)
  }

  const data = await res.json()
  const row = data.rows?.[0]?.metricValues

  if (!row) return null

  return {
    sessions: parseInt(row[0]?.value ?? '0') || 0,
    users: parseInt(row[1]?.value ?? '0') || 0,
    new_users: parseInt(row[2]?.value ?? '0') || 0,
    visits: parseInt(row[3]?.value ?? '0') || 0,
    bounce_rate: parseFloat(row[4]?.value ?? '0') || 0,
    avg_session_duration: parseFloat(row[5]?.value ?? '0') || 0,
  }
}

export async function POST() {
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const sbKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!serviceAccountJson) {
    return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured' }, { status: 500 })
  }
  if (!sbUrl || !sbKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const credentials = JSON.parse(serviceAccountJson)
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  })

  const sb = createClient(sbUrl, sbKey)
  const { data: portcos, error } = await sb
    .from('portcos')
    .select('id, name, domain, ga4_property_id')
    .not('ga4_property_id', 'is', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { name: string; status: string }[] = []

  for (const portco of portcos ?? []) {
    try {
      const metrics = await getGA4Data(portco.ga4_property_id, auth)
      if (!metrics) {
        results.push({ name: portco.name, status: 'no data' })
        continue
      }

      const today = new Date().toISOString().split('T')[0]
      const { error: insertErr } = await sb.from('analytics_uploads').insert({
        portco_id: portco.id,
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        period_end: today,
        ...metrics,
      })

      results.push({ name: portco.name, status: insertErr ? `error: ${insertErr.message}` : 'ok' })
    } catch (e) {
      results.push({ name: portco.name, status: `failed: ${String(e)}` })
    }
  }

  const ok = results.filter(r => r.status === 'ok').length
  return NextResponse.json({ refreshed: ok, total: results.length, results })
}
