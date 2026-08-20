'use client';

import { useState } from 'react';
import { addComment } from './actions';

export function CommentForm({ postId, tenantSlug }: { postId: string; tenantSlug: string }) {
  const [displayMode, setDisplayMode] = useState<'real' | 'pen_name' | 'anonymous'>('real');
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        setError(null);
        try {
          await addComment(formData);
        } catch (err: any) {
          setError(err.message);
        }
      }}
      className="card space-y-3"
    >
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="tenantSlug" value={tenantSlug} />

      <textarea
        name="body"
        required
        minLength={2}
        maxLength={2000}
        rows={3}
        placeholder="Share your thoughts on this story..."
        className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
      />

      {displayMode === 'pen_name' && (
        <input
          name="penName"
          required
          maxLength={40}
          placeholder="Your pen name (shown publicly)"
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
        />
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <label className="text-ink-300">Byline:</label>
          <select
            name="displayMode"
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as 'real' | 'pen_name' | 'anonymous')}
            className="rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1 text-xs text-ink-100"
          >
            <option value="real">Real Name</option>
            <option value="pen_name">Pen Name</option>
            <option value="anonymous">Anonymous Student</option>
          </select>
        </div>

        <button type="submit" className="btn-primary text-xs">
          Post Comment
        </button>
      </div>
    </form>
  );
}