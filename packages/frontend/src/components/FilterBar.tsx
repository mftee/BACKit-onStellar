import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const SORT_OPTIONS = ['Newest', 'Ending Soon', 'Most Staked', 'Trending'] as const;
const STATUS_OPTIONS = ['All', 'Open', 'Resolved'] as const;

export default function FilterBar() {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(params.toString());
    value ? p.set(key, value) : p.delete(key);
    router.push(`?${p.toString()}`);
  }, [params, router]);

  const activeCount = ['sort', 'status', 'token'].filter(k => params.get(k)).length;

  return (
    <div className="flex flex-wrap gap-2 p-2">
      <select value={params.get('sort') || ''} onChange={e => update('sort', e.target.value)} aria-label="Sort">
        <option value="">Sort</option>
        {SORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <select value={params.get('status') || ''} onChange={e => update('status', e.target.value)} aria-label="Status">
        {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {activeCount > 0 && <span className="badge">{activeCount} active</span>}
      {activeCount > 0 && (
        <button onClick={() => router.push(window.location.pathname)} aria-label="Clear filters">Clear All</button>
      )}
    </div>
  );
}
