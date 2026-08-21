/**
 * ============================================================================
 * FILE: apps/web/app/api/cron/aggregate-news/route.ts
 * PURPOSE: Scheduled cron route for ingesting curated external RSS news feeds
 *          (e.g., state education bulletins, board exam alerts) and inserting
 *          headline + link records without republishing full article text.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - GET (Route Handler): Protected by CRON_SECRET authorization header, iterates
 *   active aggregated_news_sources rows and parses XML RSS feeds.
 * - parseRssItems (Helper): Extracts <item> tags with title, link, and pubDate.
 * - extractTag (Helper): Regex tag extractor supporting CDATA wrappers.
 * - decodeEntities (Helper): Decodes standard XML/HTML entities.
 * 
 * RELATION TO APP:
 * - Direct execution of Section 4A automated news aggregation pipeline.
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET must always be configured. If it is missing the endpoint is
  // refused outright rather than falling back to a known dev secret (which
  // would leave a service-role, SSRF-capable route open to the public).
  if (!cronSecret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data: sources } = await supabase
    .from('aggregated_news_sources')
    .select('id, tenant_id, name, feed_url, category')
    .eq('active', true);

  let inserted = 0;
  for (const source of sources ?? []) {
    try {
      const res = await fetch(source.feed_url as string, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KalaNilavaram/1.0; +https://kalanilavaram.com)'
        }
      });
      if (!res.ok) {
        console.error(`Feed ${source.name} returned ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const items = parseRssItems(xml).filter((i) => isRelevant(i.title)).slice(0, 10);
      if (items.length === 0) continue;

      const { data: insertedRows } = await supabase
        .from('posts')
        .upsert(
          items.map((item) => ({
            tenant_id: source.tenant_id,
            type: 'news_aggregated',
            category: source.category,
            title: item.title,
            body: null,
            status: 'published',
            source_label: 'aggregated',
            source_name: source.name,
            source_url: item.link,
            external_published_at: item.pubDate,
            published_at: new Date().toISOString()
          })),
          { onConflict: 'source_url', ignoreDuplicates: true }
        )
        .select('id');

      inserted += insertedRows?.length ?? 0;
    } catch (err) {
      console.error(`Failed to aggregate ${source.name}:`, err);
    }
  }

  return NextResponse.json({ ok: true, inserted });
}

function parseRssItems(xml: string): { title: string; link: string; pubDate: string | null }[] {
  const items: { title: string; link: string; pubDate: string | null }[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml))) {
    const block = match[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    if (title && link) items.push({ title: decodeEntities(title), link: link.trim(), pubDate });
  }
  return items;
}

function extractTag(block: string, tag: string): string | null {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(block);
  if (!m) return null;
  return m[1].replace('<![CDATA[', '').replace(']]>', '').trim();
}

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    // Numeric (decimal and hexadecimal) entities, e.g. &#169; / &#x2022;
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

const RELEVANCE_PATTERN =
  /education|school|student|exam|examination|board|cbse|neet|jee|syllabus|college|university|admission|scholarship|teacher|curriculum|olympiad|entrance|semester|degree|campus|kindergarten|tuition|ugc/i;

function isRelevant(title: string): boolean {
  return RELEVANCE_PATTERN.test(title);
}
