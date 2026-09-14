CREATE TABLE IF NOT EXISTS web_page_views (
  id bigserial PRIMARY KEY,
  path text NOT NULL,
  referrer_host text,
  device text NOT NULL DEFAULT 'unknown' CHECK (device IN ('mobile', 'tablet', 'desktop', 'unknown')),
  client text NOT NULL DEFAULT 'web' CHECK (client IN ('web', 'mobile')),
  visitor_hash text NOT NULL,
  session_hash text NOT NULL,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS web_page_views_time_idx ON web_page_views (created_at DESC);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS web_page_views_path_idx ON web_page_views (path, created_at DESC);
-- statement-breakpoint
CREATE INDEX IF NOT EXISTS web_page_views_visitor_idx ON web_page_views (visitor_hash, created_at DESC);
