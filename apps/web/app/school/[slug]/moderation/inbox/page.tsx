/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/moderation/inbox/page.tsx
 * PURPOSE: Restricted moderation triage queue for school complaints and whistleblower
 *          reports. Enforces safety alert banners and audit-logged identity reveals.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - ModerationInboxPage (Async React Server Component): Verifies 'moderator' or
 *   'school_admin' membership role, queries reports for the tenant sorted by safety_flag
 *   priority, and renders interactive triage rows.
 * 
 * RELATION TO APP:
 * - Back-office safety response interface per Section 5.
 * ============================================================================
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getMembershipForTenant, isSuperAdmin } from '@/lib/auth/roles';
import { InboxRow } from './inbox-row';

export default async function ModerationInboxPage({ params }: { params: { slug: string } }) {
  const isSuper = await isSuperAdmin();
  const membership = await getMembershipForTenant(params.slug);

  if (!isSuper && (!membership || !['moderator', 'school_admin'].includes(membership.role))) {
    redirect(`/school/${params.slug}/feed`);
  }

  const supabase = createClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', params.slug)
    .maybeSingle();

  let query = supabase
    .from('whistleblower_reports')
    .select('id, tracking_id, category, status, safety_flag, safety_flag_reason, created_at')
    .order('safety_flag', { ascending: false })
    .order('created_at', { ascending: true });

  // Always scope to the school in the URL — including for super admins who have
  // no membership row of their own (previously they saw every school's inbox).
  if (tenant?.id) {
    query = query.eq('tenant_id', tenant.id);
  }

  const { data: reports } = await query;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <h1 className="text-xl font-bold text-ink-100">Moderation Inbox</h1>
        </div>
        <p className="text-xs text-ink-300 mt-1">
          Every submitter identity reveal is permanently recorded in the audit log. Verify submitters
          by contacting them personally before acting on a report.
        </p>
      </div>

      <div className="space-y-3">
        {(reports ?? []).map((r) => (
          <InboxRow key={r.id as string} slug={params.slug} report={r as any} />
        ))}

        {(!reports || reports.length === 0) && (
          <div className="card text-center py-10">
            <p className="text-sm font-medium text-ink-100">Inbox is empty</p>
            <p className="text-xs text-ink-400 mt-1">No active reports awaiting moderator triage.</p>
          </div>
        )}
      </div>
    </div>
  );
}
