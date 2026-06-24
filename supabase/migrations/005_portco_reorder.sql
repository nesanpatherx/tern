-- Add sort order column
ALTER TABLE portcos ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 99;

-- Insert new portcos
INSERT INTO portcos (name, domain, sort_order) VALUES
  ('CADS Surveys', 'cadssurveys.co.uk', 2),
  ('Prosper Design', 'prosper-design.com', 3),
  ('Metrofy', 'metrofy.com', 5)
ON CONFLICT (domain) DO NOTHING;

-- Update sort order for all portcos
UPDATE portcos SET sort_order = 1  WHERE domain = 'cadsonline.co.uk';
UPDATE portcos SET sort_order = 2  WHERE domain = 'cadssurveys.co.uk';
UPDATE portcos SET sort_order = 3  WHERE domain = 'prosper-design.com';
UPDATE portcos SET sort_order = 4  WHERE domain = 'storespaceinsights.com';
UPDATE portcos SET sort_order = 5  WHERE domain = 'metrofy.com';
UPDATE portcos SET sort_order = 6  WHERE domain = 'noveva.com';
UPDATE portcos SET sort_order = 7  WHERE domain = 'sofco.co.uk';
UPDATE portcos SET sort_order = 8  WHERE domain = 'ccubesolutions.com';
UPDATE portcos SET sort_order = 9  WHERE domain = 'schoolscreener.com';
UPDATE portcos SET sort_order = 10 WHERE domain = 'dizions.com';
UPDATE portcos SET sort_order = 11 WHERE domain = 'charitylog.co.uk';
UPDATE portcos SET sort_order = 12 WHERE domain = 'crossdata.co.uk';
UPDATE portcos SET sort_order = 13 WHERE domain = 'mindofmyown.com';
UPDATE portcos SET sort_order = 14 WHERE domain = 'metabroadcast.com';
