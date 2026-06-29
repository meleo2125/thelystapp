'use client';

import React, { useState, useEffect, useMemo } from 'react';
import MediaCard from '@/components/media/MediaCard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { MediaSummary } from '@/types/media';

type BrowseFormat = 'movie' | 'tv' | 'anime';
type BrowseCategory = 'trending' | 'seasonal';

export default function BrowsePage() {
  const [format, setFormat] = useState<BrowseFormat>('movie');
  const [category, setCategory] = useState<BrowseCategory>('trending');
  const [items, setItems] = useState<MediaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-switch categories when format changes (Movies and TV don't support 'seasonal')
  useEffect(() => {
    if (format !== 'anime' && category === 'seasonal') {
      setCategory('trending');
    }
  }, [format, category]);

  useEffect(() => {
    const fetchBrowseItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const url =
          category === 'seasonal'
            ? '/api/media/seasonal'
            : `/api/media/trending?type=${format}`;

        const res = await fetch(url);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch browse media');
        }

        setItems(json.items || json.results || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred while loading media');
      } finally {
        setLoading(false);
      }
    };

    fetchBrowseItems();
  }, [format, category]);

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const key = `${item.type}-${item.sourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [items]);

  const formats = [
    { value: 'movie', label: 'Movies' },
    { value: 'tv', label: 'TV Shows' },
    { value: 'anime', label: 'Anime' },
  ];


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      {/* Title & Description */}
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Browse Catalog</h1>
        <p className="text-sm text-muted">Discover trending blockbusters, airing TV series, and seasonal anime.</p>
      </div>

      {/* Format Selector Row */}
      <div className="flex items-center gap-2 mb-6 border-b border-border/40 pb-4">
        {formats.map((opt) => {
          const isSelected = format === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setFormat(opt.value as BrowseFormat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all select-none cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white scale-105 shadow-md shadow-primary/25'
                  : 'bg-secondary border border-border text-muted hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Category Sub-tabs */}
      <div className="flex gap-4 mb-8 border-b border-border/20 pb-2 scrollbar-none no-scrollbar">
        <button
          onClick={() => setCategory('trending')}
          className={`pb-2 border-b-2 font-bold text-sm cursor-pointer transition-colors ${
            category === 'trending' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Trending Now
        </button>
        {format === 'anime' && (
          <button
            onClick={() => setCategory('seasonal')}
            className={`pb-2 border-b-2 font-bold text-sm cursor-pointer transition-colors ${
              category === 'seasonal' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            Seasonal Anime
          </button>
        )}
      </div>

      {/* Media Results Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <LoadingSkeleton key={i} variant="card" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-lg text-sm font-semibold">
          Error: {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No Media Found"
          description="We couldn't retrieve any media entries from the catalog source at this time."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 fade-in">
          {uniqueItems.map((item) => (
            <MediaCard key={`${item.type}-${item.sourceId}`} media={item} />
          ))}
        </div>
      )}
    </div>
  );
}
