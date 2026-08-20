/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/feed/submit/actions.ts
 * PURPOSE: Server Actions for processing community article submissions, resolving
 *          or claiming author pen name identities, and queueing posts in 'in_review' status.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - SubmitPostSchema (Zod Schema): Validates title (4-200), body (min 20), category,
 *   type ('news_campus' | 'event'), displayMode ('real' | 'pen_name' | 'anonymous'), penName, tags.
 * - submitPost (Server Action): Enforces active tenant membership, creates or reuses
 *   author_identities row, inserts post in 'in_review', and redirects to confirmation screen.
 * 
 * RELATION TO APP:
 * - Core ingestion pipeline for Section 4A student journalism.
 * ============================================================================
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const SubmitPostSchema = z
  .object({
    tenantSlug: z.string(),
    title: z.string().min(4).max(200),
    body: z.string().min(20),
    category: z.string(),
    type: z.enum(['news_campus', 'event']),
    displayMode: z.enum(['real', 'pen_name', 'anonymous']),
    penName: z.string().max(40).optional(),
    tags: z.string().optional()
  })
  .refine((v) => v.displayMode !== 'pen_name' || (v.penName && v.penName.trim().length > 0), {
    message: 'Please enter a pen name',
    path: ['penName']
  });

export async function submitPost(formData: FormData) {
  const parsed = SubmitPostSchema.parse({
    tenantSlug: formData.get('tenantSlug'),
    title: formData.get('title'),
    body: formData.get('body'),
    category: formData.get('category'),
    type: formData.get('type'),
    displayMode: formData.get('displayMode'),
    penName: formData.get('penName') || undefined,
    tags: formData.get('tags') || undefined
  });

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', parsed.tenantSlug)
    .single();

  if (!tenant) throw new Error('School not found');

  // Verify membership
  const { data: membership } = await supabase
    .from('memberships')
    .select('role')
    .eq('user_id', auth.user.id)
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!membership) {
    redirect(`/onboarding?tenant=${parsed.tenantSlug}`);
  }

  // Resolve author identity
  let authorIdentityId: string | null = null;
  if (parsed.displayMode !== 'real') {
    const { data: existing } = await supabase
      .from('author_identities')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('tenant_id', tenant.id)
      .eq('display_mode', parsed.displayMode)
      .maybeSingle();

    if (existing) {
      authorIdentityId = existing.id as string;
    } else {
      const { data: created, error } = await supabase
        .from('author_identities')
        .insert({
          user_id: auth.user.id,
          tenant_id: tenant.id,
          display_mode: parsed.displayMode,
          pen_name: parsed.displayMode === 'pen_name' ? parsed.penName : null
        })
        .select('id')
        .single();

      if (error && !error.message.includes('unique')) {
        throw new Error(error.message);
      }
      if (error && error.message.includes('unique')) {
        // A pen-name identity with this exact name already exists. Reuse it only
        // if it belongs to the current user; otherwise surface the conflict.
        const { data: mine } = await supabase
          .from('author_identities')
          .select('id')
          .eq('user_id', auth.user.id)
          .eq('tenant_id', tenant.id)
          .eq('display_mode', 'pen_name')
          .eq('pen_name', parsed.penName!)
          .maybeSingle();
        if (!mine) throw new Error('That pen name is already taken in this school — pick a different one.');
        authorIdentityId = mine.id as string;
      } else {
        authorIdentityId = created?.id ?? null;
      }
    }
  }

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      tenant_id: tenant.id,
      type: parsed.type,
      category: parsed.category,
      title: parsed.title,
      body: parsed.body,
      status: 'in_review',
      author_user_id: auth.user.id,
      author_identity_id: authorIdentityId,
      source_label: 'community',
      tags: parsed.tags ? parsed.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      submitted_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/school/${parsed.tenantSlug}/feed`);
  redirect(`/school/${parsed.tenantSlug}/feed/submit/thanks?id=${post.id}`);
}
