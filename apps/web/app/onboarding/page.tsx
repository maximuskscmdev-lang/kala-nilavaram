import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from './onboarding-form';

// Post-signup: capture real identity (Section 4E) + school/role selection
// (Section 6). This profile row is what the whistleblower and pen-name
// reveal functions read from later — it is never optional.
export default async function OnboardingPage() {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/auth/sign-in');

  const { data: profile } = await supabase.from('profiles').select('id').eq('id', auth.user.id).maybeSingle();
  const { data: tenants } = await supabase.from('tenants').select('id, slug, name').eq('status', 'active').order('name');

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="mb-2 text-2xl font-semibold">Tell us who you are</h1>
      <p className="mb-6 text-sm text-ink-300">
        This information is verified and kept internal. It is never shown publicly unless you
        choose to post under your real name.
      </p>
      <OnboardingForm hasProfile={!!profile} tenants={tenants ?? []} />
    </main>
  );
}
