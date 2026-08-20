/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/editorial/review-row.tsx
 * PURPOSE: Interactive editorial review card enabling editors to approve and publish
 *          stories or reject them with constructive editor feedback comments.
 *
 * IDENTIFIERS & SYMBOLS:
 * - Post (Type): Shape of post with body, author attribution, and submission timestamp.
 * - ReviewRow (Client Component): Renders markdown preview, comment input box,
 *   'Approve & Publish' action, and 'Reject with Comment' action.
 * - ApproveSubmit / RejectSubmit: Native form submit buttons using useFormStatus().
 *
 * WHY FORM ACTIONS:
 *   Server Actions bound to <form action> refresh the current route automatically
 *   after they complete, so an approved/rejected item disappears from the queue
 *   immediately. This avoids the event-handler + router.refresh() pattern (and its
 *   reliance on a fully hydrated client), and useFormState surfaces errors inline.
 *
 * RELATION TO APP:
 * - Direct execution interface for Section 4A editorial gatekeeping.
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { approvePostAction, rejectPostAction, type ReviewActionState } from './actions';

type Post = {
  id: string;
  title: string;
  category: string;
  type: string;
  body: string;
  author_display?: string;
  submitted_at: string;
};

const initialActionState: ReviewActionState = { error: null };

function ApproveSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-xs shadow-sm">
      {pending ? 'Processing…' : '✓ Approve & Publish to Feed'}
    </button>
  );
}

function RejectSubmit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="rounded-full border border-danger/70 bg-danger/10 px-4 py-1.5 text-xs font-semibold text-danger hover:bg-danger/20 disabled:opacity-40 transition"
    >
      {pending ? 'Processing…' : 'Reject with Feedback'}
    </button>
  );
}

export function ReviewRow({ post, slug }: { post: Post; slug: string }) {
  const [comment, setComment] = useState('');
  const [approveState, approveAction] = useFormState(approvePostAction, initialActionState);
  const [rejectState, rejectAction] = useFormState(rejectPostAction, initialActionState);

  const error = approveState?.error ?? rejectState?.error;

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between border-b border-ink-800 pb-2.5">
        <div>
          <h3 className="font-semibold text-base text-ink-100">{post.title}</h3>
          <p className="text-xs text-ink-400 mt-0.5">
            By <span className="text-ink-200">{post.author_display ?? 'Student'}</span> · Submitted{' '}
            {new Date(post.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>
        <span className="badge badge-community capitalize">{post.category}</span>
      </div>

      <div className="rounded-lg bg-ink-950 p-3.5 text-xs text-ink-300 whitespace-pre-wrap max-h-48 overflow-y-auto border border-ink-800/60 leading-relaxed font-sans">
        {post.body}
      </div>

      <div>
        <label className="block text-xs font-semibold text-ink-300 mb-1">
          Editor Feedback for Author (Required if rejecting)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="e.g. Please verify the event date, or add a short quote from the student council lead..."
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-xs text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
          rows={2}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      <div className="flex gap-2.5 pt-1">
        <form action={approveAction}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="postId" value={post.id} />
          <ApproveSubmit />
        </form>

        <form action={rejectAction}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="comment" value={comment} />
          <RejectSubmit disabled={!comment.trim()} />
        </form>
      </div>
    </div>
  );
}
