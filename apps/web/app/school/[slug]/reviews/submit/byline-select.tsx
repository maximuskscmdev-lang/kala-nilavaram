'use client';

import { useState } from 'react';

export function BylineSelect({ role }: { role: 'student' | 'teacher' }) {
  const [displayMode, setDisplayMode] = useState<'real' | 'pen_name' | 'anonymous'>('anonymous');

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-xs font-semibold text-ink-300">Display Byline</label>
      <select
        name="displayMode"
        value={displayMode}
        onChange={(e) => setDisplayMode(e.target.value as 'real' | 'pen_name' | 'anonymous')}
        className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 focus:border-brand focus:outline-none"
      >
        <option value="anonymous">Verified {role === 'student' ? 'Student' : 'Faculty'} — Anonymous</option>
        <option value="pen_name">My Pen Name</option>
        <option value="real">My Real Name</option>
      </select>
      {displayMode === 'pen_name' && (
        <input
          name="penName"
          required
          maxLength={40}
          placeholder="Your pen name (shown publicly)"
          className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-100 placeholder-ink-500 focus:border-brand focus:outline-none"
        />
      )}
    </div>
  );
}