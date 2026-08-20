-- Kala Nilavaram — 0013: unique source_url for news-aggregation de-duplication
-- Backs the on-conflict upsert in apps/web/app/api/cron/aggregate-news/route.ts.
-- Standard unique indexes allow multiple NULL rows, so existing campus posts
-- with source_url = NULL are unaffected.
create unique index posts_source_url_unique on posts (source_url);
