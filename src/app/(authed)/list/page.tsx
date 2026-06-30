'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/../backend/AuthContext';
import { useList } from '@/hooks/useList';
import { useLysts } from '@/hooks/useLysts';
import { useDialogs } from '@/lib/ui/dialogs';
import { ListStatus } from '@/types/list';
import { MediaType } from '@/types/media';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import AggregateScoreBadge from '@/components/ui/AggregateScoreBadge';
import MediaImage from '@/components/ui/MediaImage';
import Button from '@/components/ui/Button';
import Dropdown from '@/components/ui/Dropdown';

const statusTabs: { value: ListStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'plan_to_watch', label: 'Plan to Watch' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
];

const typeOptions = [
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
  const { lysts, loading: lystsLoading, createLyst, removeLyst, refresh: refreshLysts } = useLysts();
  const { confirm } = useDialogs();

  const [tab, setTab] = useState<'watchlyst' | 'lysts'>('watchlyst');
  const [activeStatus, setActiveStatus] = useState<ListStatus | 'all'>('all');
  const [activeType, setActiveType] = useState<MediaType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [newName, setNewName] = useState('');
  const [newPublic, setNewPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const [editingLystId, setEditingLystId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPublic, setEditPublic] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [user, authLoading]);

  // Watchlyst only shows items with a real watch status (not lyst-only 'none' entries)
  const watchlystEntries = useMemo(
    () => list.filter((entry) => entry.status !== 'none'),
    [list]
  );

  const counts = useMemo(() => {
    const defaults = {
      all: 0,
      watching: 0,
      completed: 0,
      plan_to_watch: 0,
      on_hold: 0,
      dropped: 0,
    };
    watchlystEntries.forEach((entry) => {
      defaults.all++;
      if (entry.status in defaults) {
        defaults[entry.status as keyof typeof defaults]++;
      }
    });
    return defaults;
  }, [watchlystEntries]);

  const filteredAndSortedList = useMemo(() => {
    // Watchlyst only contains entries with a real watch status
    let result = [...watchlystEntries];
    if (activeStatus !== 'all') {
      result = result.filter((item) => item.status === activeStatus);
    }
    if (activeType !== 'all') {
      result = result.filter((item) => item.type === activeType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.cache.title.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'updatedAt') {
        cmp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortKey === 'score') {
        const sa = a.score ?? -1;
        const sb = b.score ?? -1;
        cmp = sb - sa;
      } else if (sortKey === 'title') {
        cmp = a.cache.title.localeCompare(b.cache.title);
      }
      return sortOrder === 'desc' ? cmp : -cmp;
    });
    return result;
  }, [watchlystEntries, activeStatus, activeType, searchQuery, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const lyst = await createLyst({ name, isPublic: newPublic });
      toast.success(`Created "${lyst.name}"`);
      setNewName('');
      setNewPublic(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lyst');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteLyst = async (lystId: string, name: string) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      description:
        'The Lyst and all its references will be deleted. The underlying media entries in your watchlyst remain intact.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await removeLyst(lystId);
      toast.success('Lyst deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete lyst');
    }
  };

  const handleStartEdit = (lyst: import('@/types/list').Lyst) => {
    setEditingLystId(lyst.id);
    setEditName(lyst.name);
    setEditPublic(lyst.isPublic);
  };

  const handleSaveLyst = async (lystId: string) => {
    const name = editName.trim();
    if (!name) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/lysts/${lystId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isPublic: editPublic }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update lyst');
      await refreshLysts();
      toast.success('Lyst updated');
      setEditingLystId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setEditSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Lysts</h1>
      </div>

      {/* Tab switcher: Watchlyst | Custom Lysts */}
      <div className="flex gap-2 border-b border-border/40 mb-8">
        <button
          onClick={() => setTab('watchlyst')}
          className={`px-4 py-2 border-b-2 font-bold text-sm cursor-pointer transition-colors ${
            tab === 'watchlyst'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Watchlyst
        </button>
        <button
          onClick={() => setTab('lysts')}
          className={`px-4 py-2 border-b-2 font-bold text-sm cursor-pointer transition-colors ${
            tab === 'lysts'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted hover:text-foreground'
          }`}
        >
          Custom Lysts {lysts.length > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted font-semibold">
              {lysts.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'watchlyst' ? (
        <>
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-secondary p-4 rounded-xl border border-border">
              <div className="relative w-full md:max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
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

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="w-44">
                  <Dropdown
                    ariaLabel="Format filter"
                    options={typeOptions}
                    value={activeType}
                    onChange={(v) => setActiveType(v as MediaType | 'all')}
                  />
                </div>
                <div className="flex items-center bg-background border border-border p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded transition-all cursor-pointer ${
                      viewMode === 'grid' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                    }`}
                    title="Grid view"
                    aria-label="Grid view"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5ZM13.25 2A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5ZM4.25 11A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5ZM13.25 11A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded transition-all cursor-pointer ${
                      viewMode === 'table' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                    }`}
                    title="Table view"
                    aria-label="Table view"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border/40 no-scrollbar">
              {statusTabs.map((tabItem) => {
                const isSelected = activeStatus === tabItem.value;
                const count = counts[tabItem.value as keyof typeof counts] ?? 0;
                return (
                  <button
                    key={tabItem.value}
                    onClick={() => setActiveStatus(tabItem.value as ListStatus | 'all')}
                    className={`px-4 py-2 border-b-2 font-bold text-sm whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted hover:text-foreground'
                    }`}
                  >
                    {tabItem.label}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {listLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="aspect-[2/3] bg-white/5 animate-pulse rounded-lg" />
                  <div className="h-4 bg-white/5 animate-pulse rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredAndSortedList.length === 0 ? (
            <EmptyState
              title="No Items Found"
              description={
                watchlystEntries.length === 0
                  ? 'Your watchlyst is currently empty. Head over to the home dashboard or search page to find media to track!'
                  : 'No items in your watchlyst match the active search query or filter tags.'
              }
              actionLabel={watchlystEntries.length === 0 ? 'Browse Popular Media' : 'Clear Filters'}
              onAction={
                watchlystEntries.length === 0
                  ? () => (window.location.href = '/home')
                  : () => {
                      setActiveStatus('all');
                      setActiveType('all');
                      setSearchQuery('');
                    }
              }
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6 fade-in">
              {filteredAndSortedList.map((entry) => {
                const detailLink = `/${entry.type}/${entry.sourceId}`;
                return (
                  <div
                    key={entry.id}
                    className="group relative flex flex-col bg-secondary border border-border rounded-lg overflow-hidden media-glow w-full shadow-md"
                  >
                    <Link href={detailLink} className="relative aspect-[2/3] block overflow-hidden bg-background">
                      <MediaImage
                        src={entry.cache.posterPath}
                        alt={entry.cache.title}
                        fill
                        sizes="(max-width:768px) 50vw, 200px"
                        priority={false}
                      />
                      {entry.score !== null && (
                        <div className="absolute top-2 left-2 z-10">
                          <AggregateScoreBadge score={entry.score} size="sm" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 z-10">
                        <span className="text-[9px] font-extrabold tracking-wider uppercase bg-black/80 border border-white/10 px-1.5 py-0.5 rounded text-foreground">
                          {entry.type === 'tv' ? 'TV' : entry.type}
                        </span>
                      </div>
                      {entry.type !== 'movie' && (
                        <div className="absolute bottom-2 left-2 right-2 bg-black/75 border border-white/5 py-1 px-2 rounded flex items-center justify-between text-[10px] text-foreground font-bold">
                          <span>Ep {entry.progress}</span>
                          {entry.cache.totalEpisodes && (
                            <span className="text-muted">/ {entry.cache.totalEpisodes}</span>
                          )}
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 flex flex-col p-3">
                      <Link
                        href={detailLink}
                        className="hover:text-primary transition-colors line-clamp-2 text-sm font-semibold mb-1 flex-1 text-foreground leading-snug"
                      >
                        {entry.cache.title}
                      </Link>
                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        <span className="text-muted">{entry.cache.year || '—'}</span>
                        <span className="text-primary-light font-bold capitalize">
                          {entry.status === 'none' ? 'saved' : entry.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
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
                        <td className="p-4">
                          <Link href={detailLink} className="flex items-center gap-3 group">
                            <div className="relative w-9 h-12 rounded overflow-hidden border border-border bg-background flex-shrink-0">
                              <MediaImage src={entry.cache.posterPath} alt={entry.cache.title} fill sizes="36px" />
                            </div>
                            <div>
                              <span className="font-semibold text-foreground group-hover:text-primary transition-colors block line-clamp-1">
                                {entry.cache.title}
                              </span>
                              {entry.notes && (
                                <span className="text-xs text-muted block line-clamp-1 italic mt-0.5">
                                  &quot;{entry.notes}&quot;
                                </span>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="p-4 text-xs font-bold uppercase text-muted">
                          {entry.type === 'tv' ? 'TV' : entry.type}
                        </td>
                        <td className="p-4 text-foreground font-semibold">
                          {entry.type === 'movie' ? (
                            <span className="text-muted text-xs font-medium">—</span>
                          ) : (
                            <span>
                              {entry.progress}{' '}
                              <span className="text-muted text-xs font-normal">
                                / {entry.cache.totalEpisodes || '—'}
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {entry.score !== null ? (
                            <span className="font-bold text-rating">★ {entry.score}</span>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          {entry.status === 'none' ? (
                            <span className="text-[10px] text-muted uppercase font-bold tracking-wider">
                              No status
                            </span>
                          ) : (
                            <StatusBadge status={entry.status} />
                          )}
                        </td>
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
        </>
      ) : (
        <div className="space-y-6">
          <form
            onSubmit={handleCreate}
            className="bg-secondary border border-border p-4 rounded-xl flex flex-col sm:flex-row sm:items-end gap-3"
          >
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase text-muted block mb-1" htmlFor="new-lyst-name">
                Create a new Lyst
              </label>
              <input
                id="new-lyst-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={60}
                placeholder="e.g. Best 90s Action Films"
                className="w-full h-10 px-3 rounded bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newPublic}
                onChange={(e) => setNewPublic(e.target.checked)}
                className="w-4 h-4 rounded border-border bg-background text-primary"
              />
              Make Public
            </label>
            <Button type="submit" variant="primary" size="sm" isLoading={creating} disabled={!newName.trim()}>
              Create Lyst
            </Button>
          </form>

          {lystsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 bg-white/5 animate-pulse rounded-lg border border-border/40" />
              ))}
            </div>
          ) : lysts.length === 0 ? (
            <EmptyState
              title="No custom Lysts yet"
              description="Create custom Lysts to group titles however you like — by genre, mood, watch order, anything!"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lysts.map((lyst) => {
                const isEditing = editingLystId === lyst.id;
                return (
                  <div
                    key={lyst.id}
                    className="bg-secondary border border-border rounded-lg p-4 flex flex-col gap-3 shadow-md"
                  >
                    {isEditing ? (
                      /* Inline edit form */
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-muted block mb-1">Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={60}
                            className="w-full h-9 px-3 rounded bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editPublic}
                            onChange={(e) => setEditPublic(e.target.checked)}
                            className="w-4 h-4 rounded border-border bg-background text-primary"
                          />
                          <span>Make Public</span>
                          {editPublic && (
                            <span className="text-[10px] text-emerald-400 font-bold">(visible on your profile)</span>
                          )}
                        </label>
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={editSaving}
                            disabled={!editName.trim()}
                            onClick={() => handleSaveLyst(lyst.id)}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={editSaving}
                            onClick={() => setEditingLystId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Normal display */
                      <>
                        <div className="flex items-start gap-3">
                          <div className="relative w-12 h-16 rounded overflow-hidden border border-border bg-background flex-shrink-0">
                            <MediaImage src={lyst.coverPosterPath} alt={lyst.name} fill sizes="48px" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={`/u/${lyst.ownerUsername}/lyst/${lyst.id}`}
                                className="font-bold text-sm text-foreground hover:text-primary transition-colors truncate"
                              >
                                {lyst.name}
                              </Link>
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex-shrink-0 ${
                                lyst.isPublic
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {lyst.isPublic ? 'Public' : 'Private'}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted mt-0.5">
                              {lyst.itemCount} item{lyst.itemCount === 1 ? '' : 's'}
                            </p>
                            {lyst.description && (
                              <p className="text-xs text-foreground/80 mt-1 line-clamp-2">
                                {lyst.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/30">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/u/${lyst.ownerUsername}/lyst/${lyst.id}`}
                              className="text-xs font-bold text-primary hover:underline"
                            >
                              Open
                            </Link>
                            <button
                              onClick={() => handleStartEdit(lyst)}
                              className="text-xs font-semibold text-muted hover:text-foreground cursor-pointer transition-colors"
                            >
                              Edit
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteLyst(lyst.id, lyst.name)}
                            className="text-xs font-semibold text-rose-500 hover:text-rose-400 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
