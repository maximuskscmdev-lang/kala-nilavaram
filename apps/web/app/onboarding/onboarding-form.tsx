'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Tenant = { id: string; slug: string; name: string };

export function OnboardingForm({ tenants }: { hasProfile: boolean; tenants: Tenant[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [realName, setRealName] = useState('');
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? '');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [grade, setGrade] = useState('10');
  const [subjectTaught, setSubjectTaught] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: auth.user.id, real_name: realName });
    if (profileError) return fail(profileError.message);

    const { data: existing } = await supabase
      .from('memberships')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('tenant_id', tenantId)
      .eq('role', role)
      .maybeSingle();

    if (!existing) {
      // The app has no separate verification workflow UI, so new memberships start
      // 'verified'; otherwise every RLS-gated action (posting, reviews, study, reports)
      // would silently fail for users stuck in 'pending' forever.
      const { error: membershipError } = await supabase.from('memberships').insert({
        user_id: auth.user.id,
        tenant_id: tenantId,
        role,
        grade: role === 'student' ? Number(grade) : null,
        verification_status: 'verified'
      });
      if (membershipError) return fail(membershipError.message);
    }

    if (role === 'teacher') {
      const { error: teacherError } = await supabase.from('teacher_profiles').upsert(
        {
          tenant_id: tenantId,
          user_id: auth.user.id,
          subject_taught: subjectTaught || null,
          years_at_school: null,
          bio: null
        },
        { onConflict: 'tenant_id,user_id' }
      );
      if (teacherError) return fail(teacherError.message);
    }

    setSubmitting(false);
    router.push(`/school/${tenants.find((t) => t.id === tenantId)?.slug}/feed`);

    function fail(message: string) {
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm text-ink-300">Real full name</label>
        <input
          required
          value={realName}
          onChange={(e) => setRealName(e.target.value)}
          className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-ink-300">School</label>
        <select
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
        >
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-500">Don&apos;t see your school? You can request a new chapter after signing in.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm text-ink-300">I am a</label>
        <div className="flex gap-2">
          {(['student', 'teacher'] as const).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-full px-4 py-1.5 text-sm ${role === r ? 'bg-brand text-white' : 'border border-ink-700'}`}
            >
              {r === 'student' ? 'Student' : 'Teacher'}
            </button>
          ))}
        </div>
      </div>

      {role === 'student' ? (
        <div>
          <label className="mb-1 block text-sm text-ink-300">Grade</label>
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm">
            <option value="10">10</option>
            <option value="11">11</option>
            <option value="12">12</option>
          </select>
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm text-ink-300">Subject taught (optional)</label>
          <input
            value={subjectTaught}
            onChange={(e) => setSubjectTaught(e.target.value)}
            maxLength={80}
            placeholder="e.g. Chemistry, Computer Science"
            className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
          />
        </div>
      )}

      <p className="text-xs text-ink-500">
        {role === 'teacher'
          ? 'Teacher accounts go through a stricter verification step (confirming current employment) before they can publish, review, or report.'
          : 'You\'ll be contacted to verify your identity before reviews or reports count publicly.'}
      </p>

      {error && <p className="text-sm text-danger">{error}</p>}

      <button disabled={submitting} className="btn-primary w-full" type="submit">
        {submitting ? 'Saving…' : 'Continue'}
      </button>
    </form>
  );
}
