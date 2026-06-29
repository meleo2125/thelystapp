'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MediaSummary } from '@/types/media';
import { useDebounce } from '@/hooks/useDebounce';
import MediaImage from '../ui/MediaImage';

interface SearchDropdownProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
}

const typeMap: Record<string, string> = {
  movie: 'Movie',
  tv: 'TV',
  anime: 'Anime',
};

export default function SearchDropdown({ query, isOpen, onClose }: SearchDropdownProps) {
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  const debouncedQuery = useDebounce(query, 400);

  // Fetch search results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || !isOpen) {
      setResults([]);
      return;
    }

    const abortController = new AbortController();
    
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/media/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`, {
          signal: abortController.signal,
        });
        const json = await res.json();
        if (res.ok) {
          setResults(json.results || []);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name !== 'AbortError') {
            console.error('Dropdown search error:', err);
          }
        } else {
          console.error('Dropdown search error:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchResults();

    return () => {
      abortController.abort();
    };
  }, [debouncedQuery, isOpen]);

  if (!isOpen || !query.trim()) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-secondary border border-border rounded-lg shadow-2xl overflow-hidden z-50 fade-in"
    >
      {loading ? (
        /* Loading placeholders */
        <div className="p-2 space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <div className="w-8 h-12 bg-white/5 animate-pulse rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-white/5 animate-pulse rounded w-2/3" />
                <div className="h-2.5 bg-white/5 animate-pulse rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted">
          No results found for "{query}"
        </div>
      ) : (
        /* Results rows */
        <div className="p-1.5 flex flex-col">
          {results.slice(0, 5).map((item) => (
            <Link
              key={`${item.type}-${item.sourceId}`}
              href={`/${item.type}/${item.sourceId}`}
              onClick={onClose}
              className="flex items-center gap-3 p-2 rounded hover:bg-white/5 border border-transparent transition-colors group"
            >
              <div className="relative w-8 h-12 rounded overflow-hidden border border-border bg-background flex-shrink-0">
                <MediaImage
                  src={item.posterPath}
                  alt={item.title}
                  fill
                  sizes="32px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors block truncate">
                  {item.title}
                </span>
                <span className="text-[10px] text-muted font-medium">
                  {item.year || '—'}
                </span>
              </div>
              <span className="text-[9px] font-bold tracking-wider uppercase border border-border px-1.5 py-0.5 rounded text-muted shrink-0">
                {typeMap[item.type] || item.type}
              </span>
            </Link>
          ))}
          
          {/* Full Search Redirect link */}
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={onClose}
            className="border-t border-border/40 p-3 text-center text-xs font-bold text-primary hover:text-primary-light transition-colors block"
          >
            View all results for "{query}"
          </Link>
        </div>
      )}
    </div>
  );
}
