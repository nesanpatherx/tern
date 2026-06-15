-- Disable RLS on all upload tables (internal tool, no auth)
ALTER TABLE search_console_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_uploads DISABLE ROW LEVEL SECURITY;

-- Enrich Search Console uploads with top queries, pages, countries, devices
ALTER TABLE search_console_uploads
  ADD COLUMN IF NOT EXISTS top_queries  JSONB,
  ADD COLUMN IF NOT EXISTS top_pages    JSONB,
  ADD COLUMN IF NOT EXISTS top_countries JSONB,
  ADD COLUMN IF NOT EXISTS top_devices  JSONB;
