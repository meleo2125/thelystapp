'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/../backend/AuthContext';
import { useList } from '@/hooks/useList';
import { ListStatus } from '@/types/list';
import { MediaType } from '@/types/media';
import Link from 'next/link';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import AggregateScoreBadge from '@/components/ui/AggregateScoreBadge';
import MediaImage from '@/components/ui/MediaImage';

const statusTabs: { value: ListStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'plan_to_watch', label: 'Plan to Watch' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
];

const typeOptions: { value: MediaType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Formats' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
  { value: 'anime', label: 'Anime' },
];

type SortKey = 'updatedAt' | 'score' | 'title';
type SortOrder = 'asc' | 'desc';

export default function MyListPage() {
  const { user, loading: authLoading } = useAuth();
  const { list, loading: listLoading } = useList();

  const [activeStatus, setActiveStatus] = useState<ListStatus | 'all'>('all');
  const [activeType, setActiveType] = useState<MediaType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Redirect to login if user is not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [user, authLoading]);

  // Compute counts for status badges
  const counts = useMemo(() => {
    const defaultCounts = { all: 0, watching: 0, completed: 0, plan_to_watch: 0, on_hold: 0, dropped: 0 };
    list.forEach((entry) => {
      defaultCounts.all++;
      if (entry.status in defaultCounts) {
        defaultCounts[entry.status]++;
      }
    });
    return defaultCounts;
  }, [list]);

  // Filter and sort items
  const filteredAndSortedList = useMemo(() => {
    let result = [...list];

    // Filter by status
    if (activeStatus !== 'all') {
      result = result.filter((item) => item.status === activeStatus);
    }

    // Filter by type
    if (activeType !== 'all') {
      result = result.filter((item) => item.type === activeType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) => item.cache.title.toLowerCase().includes(q));
    }

    // Sort items
    result.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'updatedAt') {
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortKey === 'score') {
        const scoreA = a.score ?? -1;
        const scoreB = b.score ?? -1;
        comparison = scoreB - scoreA;
      } else if (sortKey === 'title') {
        comparison = a.cache.title.localeCompare(b.cache.title);
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return result;
  }, [list, activeStatus, activeType, searchQuery, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Title and Controls */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Watchlyst</h1>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-secondary/80 border border-border p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
                title="Grid view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5ZM13.25 2A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5ZM4.25 11A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5ZM13.25 11A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-all cursor-pointer ${viewMode === 'table' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
                title="Table view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Filtering and Search Controls */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-secondary p-4 rounded-xl border border-border">
            {/* Search Box */}
            <div className="relative w-full md:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search my lyst by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Formats Selector */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActiveType(opt.value)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold select-none cursor-pointer transition-colors ${
                    activeType === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-background border border-border text-muted hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Tabs Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/40 scrollbar-none no-scrollbar">
            {statusTabs.map((tab) => {
              const isSelected = activeStatus === tab.value;
              const count = counts[tab.value];
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveStatus(tab.value)}
                  className={`px-4 py-2 border-b-2 font-bold text-sm whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isSelected ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List Content */}
        {listLoading ? (
          /* Loading Skeleton Grid */
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="aspect-[2/3] bg-white/5 animate-pulse rounded-lg" />
                <div className="h-4 bg-white/5 animate-pulse rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : filteredAndSortedList.length === 0 ? (
          /* Empty State */
          <EmptyState
            title="No Items Found"
            description={
              list.length === 0
                ? "Your watchlyst is currently empty. Head over to the home dashboard or search page to find media to track!"
                : "No items in your watchlyst match the active search query or filter tags."
            }
            actionLabel={list.length === 0 ? "Browse Popular Media" : "Clear Filters"}
            onAction={
              list.length === 0
                ? () => (window.location.href = '/home')
                : () => {
                    setActiveStatus('all');
                    setActiveType('all');
                    setSearchQuery('');
                  }
            }
          />
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 fade-in">
            {filteredAndSortedList.map((entry) => {
              const detailLink = `/${entry.type}/${entry.sourceId}`;
              return (
                <div
                  key={entry.id}
                  className="group relative flex flex-col bg-secondary border border-border rounded-lg overflow-hidden media-glow w-full shadow-md"
                >
                  {/* Poster Art with Hover Info overlay */}
                  <Link href={detailLink} className="relative aspect-[2/3] block overflow-hidden bg-background">
                    <MediaImage
                      src={entry.cache.posterPath}
                      alt={entry.cache.title}
                      fill
                      sizes="(max-w-768px) 50vw, 200px"
                      priority={false}
                    />
                    
                    {/* Score Tag */}
                    {entry.score !== null && (
                      <div className="absolute top-2 left-2 z-10">
                        <AggregateScoreBadge score={entry.score} size="sm" />
                      </div>
                    )}

                    {/* Format Badge */}
                    <div className="absolute top-2 right-2 z-10">
                      <span className="text-[9px] font-extrabold tracking-wider uppercase bg-black/80 border border-white/10 px-1.5 py-0.5 rounded text-foreground">
                        {entry.type === 'tv' ? 'TV' : entry.type}
                      </span>
                    </div>

                    {/* Progress Indicator (TV/Anime) */}
                    {entry.type !== 'movie' && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/75 border border-white/5 py-1 px-2 rounded flex items-center justify-between text-[10px] text-foreground font-bold">
                        <span>Ep {entry.progress}</span>
                        {entry.cache.totalEpisodes && (
                          <span className="text-muted">/ {entry.cache.totalEpisodes}</span>
                        )}
                      </div>
                    )}
                  </Link>

                  {/* Info Panel */}
                  <div className="flex-1 flex flex-col p-3">
                    <Link href={detailLink} className="hover:text-primary transition-colors line-clamp-2 text-sm font-semibold mb-1 flex-1 text-foreground leading-snug">
                      {entry.cache.title}
                    </Link>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-muted">{entry.cache.year || '—'}</span>
                      <span className="text-primary-light font-bold capitalize">{entry.status.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="overflow-x-auto rounded-xl border border-border bg-secondary fade-in">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-muted font-bold text-xs bg-background/30 uppercase tracking-wider">
                  <th className="p-4 cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('title')}>
                    Title {sortKey === 'title' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="p-4">Format</th>
                  <th className="p-4">Progress</th>
                  <th className="p-4 cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('score')}>
                    My Score {sortKey === 'score' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="p-4">Status</th>
                  <th className="p-4 cursor-pointer hover:text-foreground select-none" onClick={() => handleSort('updatedAt')}>
                    Last Updated {sortKey === 'updatedAt' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredAndSortedList.map((entry) => {
                  const detailLink = `/${entry.type}/${entry.sourceId}`;
                  return (
                    <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                      {/* Title + Poster Column */}
                      <td className="p-4">
                        <Link href={detailLink} className="flex items-center gap-3 group">
                          <div className="relative w-9 h-12 rounded overflow-hidden border border-border bg-background flex-shrink-0">
                            <MediaImage
                              src={entry.cache.posterPath}
                              alt={entry.cache.title}
                              fill
                              sizes="36px"
                            />
                          </div>
                          <div>
                            <span className="font-semibold text-foreground group-hover:text-primary transition-colors block line-clamp-1">
                              {entry.cache.title}
                            </span>
                            {entry.notes && (
                              <span className="text-xs text-muted block line-clamp-1 italic mt-0.5">
                                "{entry.notes}"
                              </span>
                            )}
                          </div>
                        </Link>
                      </td>
                      {/* Format Column */}
                      <td className="p-4 text-xs font-bold uppercase text-muted">
                        {entry.type === 'tv' ? 'TV' : entry.type}
                      </td>
                      {/* Progress Column */}
                      <td className="p-4 text-foreground font-semibold">
                        {entry.type === 'movie' ? (
                          <span className="text-muted text-xs font-medium">—</span>
                        ) : (
                          <span>
                            {entry.progress} <span className="text-muted text-xs font-normal">/ {entry.cache.totalEpisodes || '—'}</span>
                          </span>
                        )}
                      </td>
                      {/* Score Column */}
                      <td className="p-4">
                        {entry.score !== null ? (
                          <span className="font-bold text-rating flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.6 3.102-1.196 4.657c-.209.813.684 1.462 1.394 1.011l4.225-2.7 4.225 2.7c.71.451 1.602-.198 1.394-1.011l-1.196-4.657 3.6-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                            </svg>
                            {entry.score}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      {/* Status Column */}
                      <td className="p-4">
                        <StatusBadge status={entry.status} />
                      </td>
                      {/* Updated Date Column */}
                      <td className="p-4 text-xs text-muted">
                        {new Date(entry.updatedAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
