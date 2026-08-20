/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/feed/[id]/actions.ts
 * PURPOSE: Server Actions for post engagement — adding moderated comments and
 *          toggling post reactions (like, heart, clap, insightful).
 * 
 * IDENTIFIERS & SYMBOLS:
 * - AddCommentSchema (Zod Schema): Validates postId, tenantSlug, body (1-2000 chars),
 *   and displayMode ('real', 'pen_name', 'anonymous').
 * - ToggleReactionSchema (Zod Schema): Validates postId, reactionType ('like' | 'heart' | 'clap' | 'insightful').
 * - addComment (Server Action): Inserts a comment linked to the user's active session,
 *   resolves pen-name/anonymous author identity if chosen, and revalidates the post path.
 * - toggleReaction (Server Action): Adds or removes a reaction record in post_reactions.
 * 
 * RELATION TO APP:
 * - Connects user engagement directly to the multi-tenant posts system. Enforces
 *   verified authentication and respect for author display modes per Section 4E.
 * ============================================================================
 */

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const AddCommentSchema = z
  .object({
    postId: z.string().uuid(),
    tenantSlug: z.string(),
    body: z.string().min(1).max(2000),
    displayMode: z.enum(['real', 'pen_name', 'anonymous']).default('real'),
    penName: z.string().max(40).optional()
  })
  .refine((v) => v.displayMode !== 'pen_name' || (v.penName && v.penName.trim().length > 0), {
    message: 'Please enter a pen name',
    path: ['penName']
  });

export async function addComment(formData: FormData) {
  const parsed = AddCommentSchema.parse({
    postId: formData.get('postId'),
    tenantSlug: formData.get('tenantSlug'),
    body: formData.get('body'),
    displayMode: formData.get('displayMode') ?? 'real',
    penName: formData.get('penName') || undefined
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
      const { data: created, error: identityError } = await supabase
        .from('author_identities')
        .insert({
          user_id: auth.user.id,
          tenant_id: tenant.id,
          display_mode: parsed.displayMode,
          pen_name: parsed.displayMode === 'pen_name' ? parsed.penName : null
        })
        .select('id')
        .single();
      if (identityError && !identityError.message.includes('unique')) {
        throw new Error(identityError.message);
      }
      if (identityError && identityError.message.includes('unique')) {
        // Reuse the identity if the pen name belongs to the current user
        const { data: mine } = await supabase
          .from('author_identities')
          .select('id')
          .eq('user_id', auth.user.id)
          .eq('tenant_id', tenant.id)
          .eq('display_mode', 'pen_name')
          .eq('pen_name', parsed.penName!)
          .maybeSingle();
        if (mine) {
          authorIdentityId = mine.id as string;
        } else {
          throw new Error('That pen name is already taken in this school — pick a different one.');
        }
      } else {
        authorIdentityId = created?.id ?? null;
      }
    }
  }

  const { error } = await supabase.from('post_comments').insert({
    post_id: parsed.postId,
    user_id: auth.user.id,
    author_identity_id: authorIdentityId,
    body: parsed.body,
    status: 'visible'
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/school/${parsed.tenantSlug}/feed/${parsed.postId}`);
}

const ToggleReactionSchema = z.object({
  postId: z.string().uuid(),
  tenantSlug: z.string(),
  reactionType: z.enum(['like', 'heart', 'clap', 'insightful'])
});

export async function toggleReaction(postId: string, tenantSlug: string, reactionType: 'like' | 'heart' | 'clap' | 'insightful') {
  const parsed = ToggleReactionSchema.parse({ postId, tenantSlug, reactionType });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  const { data: existing } = await supabase
    .from('post_reactions')
    .select('post_id')
    .eq('post_id', parsed.postId)
    .eq('user_id', auth.user.id)
    .eq('reaction_type', parsed.reactionType)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('post_reactions')
      .delete()
      .eq('post_id', parsed.postId)
      .eq('user_id', auth.user.id)
      .eq('reaction_type', parsed.reactionType);
  } else {
    await supabase.from('post_reactions').insert({
      post_id: parsed.postId,
      user_id: auth.user.id,
      reaction_type: parsed.reactionType
    });
  }

  revalidatePath(`/school/${parsed.tenantSlug}/feed/${parsed.postId}`);
}
