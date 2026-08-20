/**
 * ============================================================================
 * FILE: apps/web/app/schools/new/actions.ts
 * PURPOSE: Server Actions for processing self-serve chapter creation requests.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - NewTenantSchema (Zod Schema): Validates name (min 3), city (min 2),
 *   and slug (regex: lowercase letters, numbers, hyphens).
 * - requestNewChapter (Server Action): Inserts a tenant in 'pending' status
 *   tied to the authenticated user ID and redirects to /schools?requested=1.
 * 
 * RELATION TO APP:
 * - Creates school tenant records that super admins later review and activate.
 * ============================================================================
 */

'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const NewTenantSchema = z.object({
  name: z.string().min(3),
  city: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, hyphens only')
});

export async function requestNewChapter(formData: FormData) {
  const parsed = NewTenantSchema.parse({
    name: formData.get('name'),
    city: formData.get('city'),
    slug: formData.get('slug')
  });

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  const { error } = await supabase.from('tenants').insert({
    name: parsed.name,
    city: parsed.city,
    slug: parsed.slug,
    status: 'pending',
    requested_by: auth.user.id
  });
  if (error) throw new Error(error.message.includes('unique') ? 'That school URL is already taken.' : error.message);

  redirect('/schools?requested=1');
}
