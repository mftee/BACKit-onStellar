"use client";

const SORT_OPTIONS = ["Newest", "Ending Soon", "Most Staked", "Trending"] as const;
const STATUS_OPTIONS = ["All", "Open", "Resolved"] as const;

interface FilterBarProps {
  onFilterChange?: (filters: { status: string | null }) => void;
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const handleStatus = (value: string) => {
    onFilterChange?.({ status: value ? value.toLowerCase() : null });
  };

  return (
    <div className="flex flex-wrap gap-2 p-2">
      <select defaultValue="" onChange={e => handleStatus(e.target.value)} aria-label="Status">
        {STATUS_OPTIONS.map(o => (
          <option key={o} value={o === "All" ? "" : o}>{o}</option>
        ))}
      </select>
      <select defaultValue="" aria-label="Sort">
        <option value="">Sort</option>
        {SORT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
