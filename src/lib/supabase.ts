import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase =
  url && key ? createClient(url, key) : null

export type PortcoDB = {
  id: string
  name: string
  domain: string
  created_at: string
  portco_group?: string
}

export type SCUpload = {
  id: string
  portco_id: string
  period_start: string | null
  period_end: string | null
  clicks: number
  impressions: number
  ctr: number
  avg_position: number
  uploaded_at: string
}

export type GAUpload = {
  id: string
  portco_id: string
  period_start: string | null
  period_end: string | null
  sessions: number
  users: number
  new_users: number
  visits: number
  bounce_rate: number
  avg_session_duration: number
  uploaded_at: string
}

export type FunnelUpload = {
  id: string
  portco_id: string
  period_start: string | null
  period_end: string | null
  mqls: number
  sqls: number
  pipeline_arr: number
  avg_deal_value: number
  uploaded_at: string
}

export type SEMUpload = {
  id: string
  portco_id: string
  report_date: string | null
  authority_score: number
  organic_traffic: number
  organic_keywords: number
  paid_traffic: number
  backlinks: number
  referring_domains: number
  uploaded_at: string
}
