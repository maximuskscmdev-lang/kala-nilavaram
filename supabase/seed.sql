-- Local/dev seed data. Do NOT run against production.

insert into tenants (slug, name, city, status) values
  ('abc-matric-hr-sec', 'ABC Matriculation Higher Secondary School', 'Chennai', 'active'),
  ('demo-school', 'Demo School (for local dev)', 'Chennai', 'active');

insert into aggregated_news_sources (tenant_id, name, feed_url, category) values
  (null, 'Google News - Tamil Nadu Education', 'https://news.google.com/rss/search?q=%22Tamil%20Nadu%22%20education%20school%20when%3A7d&hl=en-IN&gl=IN&ceid=IN:en', 'state'),
  (null, 'The Hindu - Education', 'https://www.thehindu.com/education/feeder/default.rss', 'national');

-- Real users/memberships/posts should be created through the app's signup +
-- verification flow, not seeded directly, since auth.users rows must be
-- created via Supabase Auth.
