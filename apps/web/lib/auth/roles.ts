/**
 * ============================================================================
 * FILE: apps/web/lib/auth/roles.ts
 * PURPOSE: Server-side authorization and multi-tenant membership resolution helpers.
 *          Resolves active tenant role for current session and checks super admin status.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - MembershipRole (Type): 'student' | 'teacher' | 'editor' | 'moderator' | 'school_admin'.
 * - CurrentMembership (Interface): User ID, tenant ID, active role, verification status.
 * - getMembershipForTenant (Async Function): Resolves current user's membership in a tenant.
 * - isSuperAdmin (Async Function): Queries platform_admins table for cross-tenant super admin status.
 * - canModerate (Function): Checks if a given role is within an allowed array of roles.
 * 
 * RELATION TO APP:
 * - Powers role-based access control for editorial queue and moderation inbox.
 * ============================================================================
 */

import { createClient } from '@/lib/supabase/server';

export type MembershipRole = 'student' | 'teacher' | 'editor' | 'moderator' | 'school_admin';

export interface CurrentMembership {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
}

/** Server-side helper: resolve the current user's membership + role for a tenant slug. */
export async function getMembershipForTenant(tenantSlug: string): Promise<CurrentMembership | null> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).maybeSingle();
  if (!tenant) return null;

  const { data: membership } = await supabase
    .from('memberships')
    .select('role, verification_status')
    .eq('user_id', auth.user.id)
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  return {
    userId: auth.user.id,
    tenantId: tenant.id,
    role: membership.role as MembershipRole,
    verificationStatus: membership.verification_status as CurrentMembership['verificationStatus']
  };
}

export async function isSuperAdmin(): Promise<boolean> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data } = await supabase.from('platform_admins').select('user_id').eq('user_id', auth.user.id).maybeSingle();
  return !!data;
}

export function canModerate(role: MembershipRole | undefined, allowed: MembershipRole[]) {
  return !!role && allowed.includes(role);
}
