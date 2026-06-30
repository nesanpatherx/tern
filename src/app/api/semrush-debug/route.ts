import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.SEMRUSH_API_KEY
  if (!key) return NextResponse.json({ error: 'no key' })

  const domains = ['cadssurveys.co.uk', 'sofco.co.uk', 'formainnovations.com']
  const results = []

  for (const domain of domains) {
    const [ukRes, usRes, auRes] = await Promise.all([
      fetch(`https://api.semrush.com/?type=domain_ranks&key=${key}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${domain}&database=uk`),
      fetch(`https://api.semrush.com/?type=domain_ranks&key=${key}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${domain}&database=us`),
      fetch(`https://api.semrush.com/?type=domain_ranks&key=${key}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=www.${domain}&database=uk`),
    ])
    const [uk, us, www] = await Promise.all([ukRes.text(), usRes.text(), auRes.text()])
    results.push({ domain, uk, us, www_uk: www })
    await new Promise(r => setTimeout(r, 300))
  }

  return NextResponse.json(results)
}
