import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiKey = process.env.PIPEDRIVE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'PIPEDRIVE_API_KEY not set' })

  // Fetch first 10 deals with all fields
  const dealsRes = await fetch(`https://api.pipedrive.com/v1/deals?status=all&limit=10&api_token=${apiKey}`)
  const dealsData = await dealsRes.json()

  // Fetch pipeline stages
  const stagesRes = await fetch(`https://api.pipedrive.com/v1/stages?api_token=${apiKey}`)
  const stagesData = await stagesRes.json()

  // Fetch pipelines
  const pipelinesRes = await fetch(`https://api.pipedrive.com/v1/pipelines?api_token=${apiKey}`)
  const pipelinesData = await pipelinesRes.json()

  return NextResponse.json({
    sample_deals: (dealsData?.data ?? []).map((d: Record<string, unknown>) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      value: d.value,
      currency: d.currency,
      stage_id: d.stage_id,
      pipeline_id: d.pipeline_id,
    })),
    stages: stagesData?.data,
    pipelines: pipelinesData?.data,
  })
}
