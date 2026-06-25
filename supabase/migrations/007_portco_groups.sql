-- Add group column
ALTER TABLE portcos ADD COLUMN IF NOT EXISTS portco_group TEXT DEFAULT 'Other';

-- Insert new placeholder portcos
INSERT INTO portcos (name, domain, sort_order, portco_group) VALUES
  ('Storespace', 'storespace.co.uk', 15, 'Forma'),
  ('Forma Innovations', 'formainnovations.com', 16, 'Forma')
ON CONFLICT (domain) DO NOTHING;

-- Assign groups: Noveva
UPDATE portcos SET portco_group = 'Noveva' WHERE domain IN (
  'noveva.com',
  'ccubesolutions.com',
  'schoolscreener.com',
  'mindofmyown.com',
  'dizions.com',
  'charitylog.co.uk',
  'crossdata.co.uk'
);

-- Assign groups: Forma
UPDATE portcos SET portco_group = 'Forma' WHERE domain IN (
  'metrofy.com',
  'cadsonline.co.uk',
  'cadssurveys.co.uk',
  'prosper-design.com',
  'storespaceinsights.com',
  'storespace.co.uk',
  'formainnovations.com'
);

-- Assign groups: Standalone
UPDATE portcos SET portco_group = 'Standalone' WHERE domain IN (
  'metabroadcast.com'
);

-- Reassign sort_order within groups
-- Noveva
UPDATE portcos SET sort_order = 1  WHERE domain = 'noveva.com';
UPDATE portcos SET sort_order = 2  WHERE domain = 'ccubesolutions.com';
UPDATE portcos SET sort_order = 3  WHERE domain = 'schoolscreener.com';
UPDATE portcos SET sort_order = 4  WHERE domain = 'mindofmyown.com';
UPDATE portcos SET sort_order = 5  WHERE domain = 'dizions.com';
UPDATE portcos SET sort_order = 6  WHERE domain = 'charitylog.co.uk';
UPDATE portcos SET sort_order = 7  WHERE domain = 'crossdata.co.uk';

-- Forma
UPDATE portcos SET sort_order = 8  WHERE domain = 'metrofy.com';
UPDATE portcos SET sort_order = 9  WHERE domain = 'cadsonline.co.uk';
UPDATE portcos SET sort_order = 10 WHERE domain = 'cadssurveys.co.uk';
UPDATE portcos SET sort_order = 11 WHERE domain = 'prosper-design.com';
UPDATE portcos SET sort_order = 12 WHERE domain = 'storespaceinsights.com';
UPDATE portcos SET sort_order = 13 WHERE domain = 'storespace.co.uk';
UPDATE portcos SET sort_order = 14 WHERE domain = 'formainnovations.com';

-- Standalone
UPDATE portcos SET sort_order = 15 WHERE domain = 'metabroadcast.com';

-- Sofco — unassigned, keep at end
UPDATE portcos SET sort_order = 99 WHERE domain = 'sofco.co.uk';
