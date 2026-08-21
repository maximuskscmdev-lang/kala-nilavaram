/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/study/actions.ts
 * PURPOSE: Server Actions for the student study material hub: auto-publishing
 *          study notes, PDF/image links, and handling peer upvotes.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - UploadSchema (Zod Schema): Validates grade (10-12), subject, board,
 *   itemType ('note' | 'pdf' | 'image' | 'link'), title, body, linkUrl, fileUrl.
 * - uploadStudyItem (Server Action): Inserts a study resource with 'published' status
 *   and redirects back to the study hub.
 * - upvoteStudyItem (Server Action): Adds or removes an upvote record in study_upvotes
 *   and updates upvote_count on the study item.
 * 
 * RELATION TO APP:
 * - Enables peer-to-peer study sharing and exam preparation across school chapters.
 * ============================================================================
 */

'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getSupabaseUrl } from '@/lib/config';

const STUDY_FILES_BUCKET = 'study-files';
const MAX_FILE_BYTES = 10 * 1024 * 1024; // matches storage bucket + next.config bodySizeLimit

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];

const UploadSchema = z.object({
  tenantSlug: z.string(),
  grade: z.coerce.number().min(10).max(12),
  subject: z.string().min(1),
  topic: z.string().optional(),
  board: z.enum(['state_board', 'cbse', 'icse', 'other']),
  itemType: z.enum(['note', 'pdf', 'image', 'link']),
  title: z.string().min(3),
  body: z.string().optional(),
  linkUrl: z.string().url().optional(),
  fileUrl: z.string().url().optional()
}).superRefine((val, ctx) => {
  // External reference URL: https only (bug #17).
  if (val.linkUrl) {
    try {
      if (new URL(val.linkUrl).protocol !== 'https:') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'External link must use https.', path: ['linkUrl'] });
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid external link.', path: ['linkUrl'] });
    }
  }
  // A supplied fileUrl must be https AND live in our own study-files bucket —
  // we never store/serve arbitrary third-party URLs as "attached resources".
  if (val.fileUrl) {
    try {
      const u = new URL(val.fileUrl);
      const storageBase = `${new URL(getSupabaseUrl()).host}/storage/v1/object/public/study-files/`;
      if (u.protocol !== 'https:' || !u.host.includes(new URL(getSupabaseUrl()).host) || !u.pathname.includes('/storage/v1/object/public/study-files/')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Attached file URL must point to this project’s study-files storage bucket.',
          path: ['fileUrl']
        });
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid file URL.', path: ['fileUrl'] });
    }
  }
});

async function uploadFileToStorage(file: File, tenantId: string, userId: string): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('File is larger than the 10 MB limit.');
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Only PDF and PNG/JPEG/WebP/GIF images are supported.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
  const path = `${tenantId}/${userId}/${Date.now()}-${safeName}`;
  const serviceClient = createServiceRoleClient();

  const { error } = await serviceClient.storage.from(STUDY_FILES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: publicUrl } = serviceClient.storage.from(STUDY_FILES_BUCKET).getPublicUrl(path);
  return publicUrl.publicUrl;
}

export async function uploadStudyItem(formData: FormData) {
  const parsed = UploadSchema.parse({
    tenantSlug: formData.get('tenantSlug'),
    grade: formData.get('grade'),
    subject: formData.get('subject'),
    topic: formData.get('topic') || undefined,
    board: formData.get('board'),
    itemType: formData.get('itemType'),
    title: formData.get('title'),
    body: formData.get('body') || undefined,
    linkUrl: formData.get('linkUrl') || undefined,
    fileUrl: formData.get('fileUrl') || undefined
  });

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', parsed.tenantSlug).single();
  if (!tenant) throw new Error('School not found');

  // Publishing requires a verified student/teacher membership of this school
  // (RLS enforces the same rule) — send new users to onboarding instead of a
  // cryptic insert failure.
  const { data: membership } = await supabase
    .from('memberships')
    .select('role, verification_status')
    .eq('user_id', auth.user.id)
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .maybeSingle();

  const isVerified =
    !!membership &&
    membership.verification_status === 'verified' &&
    (membership.role === 'student' || membership.role === 'teacher');

  if (!isVerified) {
    redirect(`/onboarding?tenant=${parsed.tenantSlug}`);
  }

  const file = formData.get('file');
  let fileUrl = parsed.fileUrl;
  if (file instanceof File && file.size > 0) {
    fileUrl = await uploadFileToStorage(file, tenant.id as string, auth.user.id);
  }

  const { error } = await supabase.from('study_items').insert({
    tenant_id: tenant.id,
    grade: parsed.grade,
    subject: parsed.subject,
    topic: parsed.topic,
    board: parsed.board,
    item_type: parsed.itemType,
    title: parsed.title,
    body: parsed.body,
    link_url: parsed.linkUrl,
    file_url: fileUrl,
    status: 'published',
    author_user_id: auth.user.id
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/school/${parsed.tenantSlug}/study`);
  redirect(`/school/${parsed.tenantSlug}/study`);
}

export async function upvoteStudyItem(tenantSlug: string, itemId: string) {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  // The item must belong to this school and the voter must be a verified member
  // of it — otherwise any authenticated user could manipulate another school's
  // rankings (bug #10).
  const { data: item } = await supabase
    .from('study_items')
    .select('tenant_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!item) throw new Error('Study item not found.');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .maybeSingle();
  if (!tenant || item.tenant_id !== tenant.id) {
    throw new Error('This study item does not belong to this school.');
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('role, verification_status')
    .eq('user_id', auth.user.id)
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .maybeSingle();
  const isVerified =
    !!membership &&
    membership.verification_status === 'verified' &&
    (membership.role === 'student' || membership.role === 'teacher');
  if (!isVerified) {
    throw new Error('Only verified members of this school can upvote.');
  }

  const { data: existing } = await supabase
    .from('study_upvotes')
    .select('study_item_id')
    .eq('study_item_id', itemId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('study_upvotes')
      .delete()
      .eq('study_item_id', itemId)
      .eq('user_id', auth.user.id);
  } else {
    await supabase.from('study_upvotes').insert({
      study_item_id: itemId,
      user_id: auth.user.id
    });
  }

  // Refresh counts — the upvoter is usually not the item author, and the RLS
  // update policy only permits authors/staff, so update via the service-role client.
  const { count } = await supabase
    .from('study_upvotes')
    .select('*', { count: 'exact', head: true })
    .eq('study_item_id', itemId);

  const serviceClient = createServiceRoleClient();
  const { error: countError } = await serviceClient
    .from('study_items')
    .update({ upvote_count: count ?? 0 })
    .eq('id', itemId);
  if (countError) throw new Error(countError.message);

  revalidatePath(`/school/${tenantSlug}/study`);
}
