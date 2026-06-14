-- Add visits (pageviews) to GA uploads
ALTER TABLE analytics_uploads ADD COLUMN IF NOT EXISTS visits BIGINT DEFAULT 0;

-- Sales funnel metrics (MQLs, SQLs, pipeline)
CREATE TABLE IF NOT EXISTS funnel_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id UUID NOT NULL REFERENCES portcos(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  mqls INTEGER DEFAULT 0,
  sqls INTEGER DEFAULT 0,
  pipeline_arr DECIMAL(15,2) DEFAULT 0,
  avg_deal_value DECIMAL(15,2) DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE funnel_uploads DISABLE ROW LEVEL SECURITY;
