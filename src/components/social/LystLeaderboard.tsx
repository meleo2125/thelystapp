'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import MediaImage from '@/components/ui/MediaImage';
import Dropdown from '@/components/ui/Dropdown';
import { Lyst, LystRankingWindow } from '@/types/list';

interface LystLeaderboardProps {
  /** Optional initial window. Defaults to 'week'. */
  defaultWindow?: LystRankingWindow;
}

const windowOptions: { value: LystRankingWindow; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

/**
 * Home-page ranking section for top public Lysts (Task 3).
 * Filterable by week / month / year / all time.
 */
const LystLeaderboard: React.FC<LystLeaderboardProps> = ({
  defaultWindow = 'week',
}) => {
  const [window, setWindow] = useState<LystRankingWindow>(defaultWindow);
  const [lysts, setLysts] = useState<Lyst[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/lysts/rankings?window=${window}&limit=10`,
          { signal: abort.signal }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load rankings');
        setLysts(json.data || []);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => abort.abort();
  }, [window]);

  const headerLabel = useMemo(
    () => windowOptions.find((o) => o.value === window)?.label ?? 'This Week',
    [window]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Top Lysts • {headerLabel}
        </h2>
        <div className="w-[180px]">
          <Dropdown
            ariaLabel="Ranking window"
            options={windowOptions}
            value={window}
            onChange={(v) => setWindow(v as LystRankingWindow)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-white/5 animate-pulse rounded-lg border border-border/40"
            />
          ))}
        </div>
      ) : error ? (
        <div className="border border-border/40 border-dashed rounded-lg p-6 text-center text-sm text-muted">
          {error}
        </div>
      ) : lysts.length === 0 ? (
        <div className="border border-border/40 border-dashed rounded-lg p-6 text-center">
          <p className="text-sm text-muted">
            No public Lysts ranked for {headerLabel.toLowerCase()} yet — be the
            first to share one!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lysts.map((lyst, idx) => {
            const net = (lyst.likesCount || 0) - (lyst.dislikesCount || 0);
            return (
              <Link
                key={`${lyst.userId}-${lyst.id}`}
                href={`/u/${lyst.ownerUsername}/lyst/${lyst.id}?referrer=home`}
                className="group flex items-center gap-3 bg-secondary border border-border rounded-lg p-3 media-glow shadow-md"
              >
                <div className="relative w-12 h-16 rounded overflow-hidden border border-border bg-background flex-shrink-0">
                  <MediaImage
                    src={lyst.coverPosterPath}
                    alt={lyst.name}
                    fill
                    sizes="48px"
                  />
                  <div className="absolute top-0 left-0 bg-primary text-white text-[10px] font-black w-5 h-5 flex items-center justify-center">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors block truncate">
                    {lyst.name}
                  </span>
                  <span className="text-[10px] text-muted block mt-0.5">
                    by @{lyst.ownerUsername} • {lyst.itemCount} item
                    {lyst.itemCount === 1 ? '' : 's'}
                  </span>
                  <div className="flex items-center gap-3 text-[10px] font-bold mt-1">
                    <span className="text-emerald-400">▲ {lyst.likesCount || 0}</span>
                    <span className="text-rose-400">▼ {lyst.dislikesCount || 0}</span>
                    <span className="text-muted">
                      net {net >= 0 ? `+${net}` : net}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default LystLeaderboard;
