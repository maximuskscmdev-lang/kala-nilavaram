'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Auth: Google Sign-In and email OTP / magic-link sign-in. Email OTP needs no
// SMS provider — Supabase delivers the link/code by email and auto-creates the
// account on first sign-in.
export default function SignInPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-ink-300">
        Real identity is always verified internally, even if you post under a pen name or
        anonymously.
      </p>

      <button onClick={signInWithGoogle} className="mb-4 w-full rounded-full border border-ink-700 py-2 text-sm font-semibold hover:bg-ink-800">
        Continue with Google
      </button>

      <div className="my-2 flex items-center gap-2 text-xs text-ink-500">
        <div className="h-px flex-1 bg-ink-700" /> or <div className="h-px flex-1 bg-ink-700" />
      </div>

      {sent ? (
        <div className="space-y-3 rounded-lg border border-ink-700 p-4 text-sm">
          <p className="font-semibold">Check your inbox</p>
          <p className="text-ink-300">
            We sent a sign-in link to <span className="text-ink-100">{email}</span>. Open it from
            this device to continue. No account yet? The link creates one for you.
          </p>
          <button
            onClick={() => {
              setSent(false);
              setError(null);
            }}
            className="text-sm text-brand underline"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm"
          />
          <button disabled={loading} className="btn-primary w-full" type="submit">
            {loading ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </main>
  );
}
