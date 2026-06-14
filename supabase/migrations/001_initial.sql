-- Portfolio companies
CREATE TABLE IF NOT EXISTS portcos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search Console uploads (aggregated per period)
CREATE TABLE IF NOT EXISTS search_console_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id UUID NOT NULL REFERENCES portcos(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  clicks BIGINT DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  ctr DECIMAL(10,8) DEFAULT 0,
  avg_position DECIMAL(8,4) DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Google Analytics uploads (aggregated per period)
CREATE TABLE IF NOT EXISTS analytics_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id UUID NOT NULL REFERENCES portcos(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  sessions BIGINT DEFAULT 0,
  users BIGINT DEFAULT 0,
  new_users BIGINT DEFAULT 0,
  bounce_rate DECIMAL(10,8) DEFAULT 0,
  avg_session_duration DECIMAL(10,2) DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEMRush uploads (snapshot per upload)
CREATE TABLE IF NOT EXISTS semrush_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portco_id UUID NOT NULL REFERENCES portcos(id) ON DELETE CASCADE,
  report_date DATE,
  authority_score INTEGER DEFAULT 0,
  organic_traffic BIGINT DEFAULT 0,
  organic_keywords INTEGER DEFAULT 0,
  paid_traffic BIGINT DEFAULT 0,
  backlinks BIGINT DEFAULT 0,
  referring_domains INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed portcos
INSERT INTO portcos (name, domain) VALUES
  ('CADS Online', 'cadsonline.co.uk'),
  ('Sofco', 'sofco.co.uk'),
  ('Noveva Software Group', 'noveva.com'),
  ('StoreSpace Insights', 'storespaceinsights.com'),
  ('CCube Solutions', 'ccubesolutions.com'),
  ('SchoolScreener', 'schoolscreener.com'),
  ('Mind Of My Own', 'mindofmyown.com'),
  ('Meta Broadcast', 'metabroadcast.com'),
  ('Dizions', 'dizions.com'),
  ('Charity Log', 'charitylog.co.uk'),
  ('CrossData', 'crossdata.co.uk')
ON CONFLICT (domain) DO NOTHING;

-- Disable RLS for internal use (no auth required)
ALTER TABLE portcos DISABLE ROW LEVEL SECURITY;
ALTER TABLE search_console_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE semrush_uploads DISABLE ROW LEVEL SECURITY;
