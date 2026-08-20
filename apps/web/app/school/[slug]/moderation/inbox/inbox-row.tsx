/**
 * ============================================================================
 * FILE: apps/web/app/school/[slug]/moderation/inbox/inbox-row.tsx
 * PURPOSE: Interactive moderator triage card for a single whistleblower report.
 *          Features immediate safety risk alert banner, audited identity reveal,
 *          public/internal note editors, and status progression buttons.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - Report (Type): Type definition for whistleblower report row.
 * - STATUSES (tuple): 'under_review', 'verified_contacted', 'action_taken', 'escalated', 'closed'.
 * - InboxRow (Client Component): Renders triage controls, handles reveal action with reason prompt,
 *   and triggers real-world safety escalation flags.
 * 
 * RELATION TO APP:
 * - Direct UI for Section 5 non-negotiable safety workflows and child protection protocols.
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { updateReportStatus, setSafetyFlag, revealIdentity } from './actions';

type Report = {
  id: string;
  tracking_id: string;
  category: string;
  status: string;
  safety_flag: boolean;
  safety_flag_reason: string | null;
  created_at: string;
};

const STATUSES = ['under_review', 'verified_contacted', 'action_taken', 'escalated', 'closed'] as const;

export function InboxRow({ report, slug }: { report: Report; slug: string }) {
  const [identity, setIdentity] = useState<{ real_name: string; phone: string; email?: string | null } | null>(null);
  const [reason, setReason] = useState('');
  const [notePublic, setNotePublic] = useState('');
  const [noteInternal, setNoteInternal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={`card transition-all ${report.safety_flag ? 'border-danger bg-danger/5 shadow-md shadow-danger/10' : ''}`}>
      {report.safety_flag && (
        <div className="mb-3 rounded-lg border border-danger bg-danger/15 p-3 text-sm">
          <p className="font-semibold text-danger">⚠ Immediate risk flagged: {report.safety_flag_reason}</p>
          <p className="mt-1 text-ink-300">
            Escalate now to a real-world contact — school counselor, the student&apos;s parent/guardian,
            or a local authority/helpline as appropriate. This should not wait in the queue.
          </p>
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono font-bold text-sm tracking-wider text-safe">{report.tracking_id}</p>
        <span className="badge badge-community capitalize">{report.status.replace('_', ' ')}</span>
      </div>
      <p className="mb-3 text-xs text-ink-500 capitalize">
        Category: {report.category.replace('_', ' ')} · Submitted{' '}
        {new Date(report.created_at).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </p>

      {error && (
        <div className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {!identity ? (
        <div className="mb-3 flex gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for viewing submitter identity (logged in audit trail)"
            className="flex-1 rounded-lg border border-ink-700 bg-ink-950 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-500 focus:border-safe focus:outline-none"
          />
          <button
            disabled={busy || !reason.trim()}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                const data = await revealIdentity(slug, report.id, reason);
                setIdentity(data);
              } catch (err: any) {
                setError(err.message);
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-full border border-safe/60 bg-safe/10 text-safe px-3.5 py-1.5 text-xs font-semibold hover:bg-safe/20 disabled:opacity-50 transition"
          >
            {busy ? 'Verifying…' : 'Reveal identity'}
          </button>
        </div>
      ) : (
        <div className="mb-3 rounded-lg border border-safe/40 bg-safe/10 p-3 text-xs space-y-1">
          <p className="font-semibold text-ink-100">Submitter: {identity.real_name}</p>
          <p className="text-ink-300">Phone: {identity.phone}</p>
          {identity.email && <p className="text-ink-300">Email: {identity.email}</p>}
        </div>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <textarea
          value={noteInternal}
          onChange={(e) => setNoteInternal(e.target.value)}
          placeholder="Internal note (moderator team only)"
          rows={2}
          className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-xs text-ink-100 placeholder-ink-500 focus:border-ink-500 focus:outline-none"
        />
        <textarea
          value={notePublic}
          onChange={(e) => setNotePublic(e.target.value)}
          placeholder="Public note (de-identified, shown on tracking lookup)"
          rows={2}
          className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-xs text-ink-100 placeholder-ink-500 focus:border-ink-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-ink-800">
        {STATUSES.map((s) => (
          <button
            key={s}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await updateReportStatus(slug, report.id, s, notePublic, noteInternal);
              setBusy(false);
            }}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
              report.status === s
                ? 'border-brand bg-brand/20 text-brand-light font-semibold'
                : 'border-ink-700 text-ink-300 hover:bg-ink-800 hover:text-ink-100'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
        {!report.safety_flag && (
          <button
            disabled={busy}
            onClick={async () => {
              const r = prompt('Describe the immediate risk (this will prompt real-world escalation for every moderator viewing this report):');
              if (!r) return;
              setBusy(true);
              await setSafetyFlag(slug, report.id, r);
              setBusy(false);
            }}
            className="rounded-full border border-danger/80 bg-danger/10 px-3 py-1 text-xs text-danger hover:bg-danger/20 transition font-semibold"
          >
            Flag immediate risk
          </button>
        )}
      </div>
    </div>
  );
}
