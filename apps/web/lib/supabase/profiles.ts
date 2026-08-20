/**
 * ============================================================================
 * FILE: apps/web/lib/supabase/profiles.ts
 * PURPOSE: Resolves profile real names for rows that reference auth.users through
 *          a *_user_id column (posts.author_user_id, post_comments.user_id,
 *          teacher_profiles.user_id, ...).
 *
 * WHY A SEPARATE QUERY:
 *   PostgREST cannot embed `profiles` through such a column because there is no
 *   direct foreign key between the referencing table and `profiles` — both sides
 *   only reference auth.users. An embed like `profiles:author_user_id (real_name)`
 *   fails with PGRST200 -> HTTP 400, which silently empties the ENTIRE query
 *   (feed shows "nothing published", editorial queue shows "Queue is empty").
 *   We therefore fetch real names in a second, RLS-gated query and attach them
 *   as `profiles: { real_name }` to each row so existing rendering code keeps
 *   working unchanged. RLS still restricts real names to staff (editors /
 *   moderators / school admins) exactly as before.
 * ============================================================================
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export async function attachProfileRealNames(
  supabase: SupabaseClient<Database>,
  rows: any[],
  idKey: 'author_user_id' | 'user_id'
): Promise<any[]> {
  const source = rows ?? [];
  const ids = Array.from(new Set(source.map((r) => r?.[idKey]).filter(Boolean)));
  if (ids.length === 0) return source;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, real_name')
    .in('id', ids);

  const realNameById = new Map((profiles ?? []).map((p) => [p.id, p.real_name]));

  return source.map((r) => ({
    ...r,
    profiles: r?.[idKey] && realNameById.has(r[idKey])
      ? { real_name: realNameById.get(r[idKey]) }
      : null
  }));
}
