'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from '@/components/nav/SearchBar';
import MediaCard from '@/components/media/MediaCard';
import LoadingSkeleton from '@/components/ui/LoadingSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import { MediaSummary } from '@/types/media';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const queryParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || 'all';

  const [query, setQuery] = useState(queryParam);
  const [activeType, setActiveType] = useState<string>(typeParam);
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if queryParam changes
  useEffect(() => {
    setQuery(queryParam);
    setActiveType(typeParam);
  }, [queryParam, typeParam]);

  // Perform search when parameters change
  useEffect(() => {
    if (!queryParam.trim()) {
      setResults([]);
      return;
    }

    const abortController = new AbortController();

    const fetchSearchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const typeFilter = typeParam !== 'all' ? `&type=${typeParam}` : '';
        const res = await fetch(`/api/media/search?q=${encodeURIComponent(queryParam)}${typeFilter}`, {
          signal: abortController.signal,
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch search results');
        }
        setResults(json.results || []);
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name !== 'AbortError') {
            setError(err.message);
          }
        } else {
          setError('An error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();

    return () => {
      abortController.abort();
    };
  }, [queryParam, typeParam]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const typeFilter = activeType !== 'all' ? `&type=${activeType}` : '';
    router.push(`/search?q=${encodeURIComponent(query)}${typeFilter}`);
  };

  const uniqueResults = useMemo(() => {
    const seen = new Set<string>();
    return results.filter((item) => {
      const key = `${item.type}-${item.sourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [results]);

  const handleTypeSelect = (type: string) => {
    setActiveType(type);
    const typeFilter = type !== 'all' ? `&type=${type}` : '';
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}${typeFilter}`);
    }
  };


  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'movie', label: 'Movies' },
    { value: 'tv', label: 'TV Shows' },
    { value: 'anime', label: 'Anime' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">Search Catalog</h1>

      {/* Search Input Area */}
      <form onSubmit={handleSearchSubmit} className="max-w-xl mb-6">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search movies, TV shows, anime..."
          autoFocus
        />
      </form>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-border/40 pb-4">
        {filterOptions.map((opt) => {
          const isSelected = activeType === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleTypeSelect(opt.value)}
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

      {/* Results Display */}
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
      ) : results.length === 0 ? (
        <EmptyState
          title={queryParam.trim() ? "No Results Found" : "Start Searching"}
          description={
            queryParam.trim()
              ? `We couldn't find any matches for "${queryParam}" under the selected format.`
              : "Type keywords in the search bar above to look up movies, TV shows, or anime in our unified index."
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 fade-in">
          {uniqueResults.map((item) => (
            <MediaCard key={`${item.type}-${item.sourceId}`} media={item} showBadge={activeType === 'all'} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex items-center justify-center min-h-[300px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
