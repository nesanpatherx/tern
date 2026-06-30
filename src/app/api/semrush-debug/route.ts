import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const key = process.env.SEMRUSH_API_KEY
  if (!key) return NextResponse.json({ error: 'no key' })

  const domain = 'cadsonline.co.uk'

  const [resUk, resUs, resBl] = await Promise.all([
    fetch(`https://api.semrush.com/?type=domain_ranks&key=${key}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${domain}&database=uk`),
    fetch(`https://api.semrush.com/?type=domain_ranks&key=${key}&export_columns=Dn,Rk,Or,Ot,Oc,Ad,At,Ac&domain=${domain}&database=us`),
    fetch(`https://api.semrush.com/analytics/v1/?key=${key}&type=backlinks_overview&target=${domain}&target_type=root_domain&export_columns=ascore,total,domains_num`),
  ])

  const [uk, us, backlinks] = await Promise.all([resUk.text(), resUs.text(), resBl.text()])

  return NextResponse.json({ domain, uk, us, backlinks })
}
