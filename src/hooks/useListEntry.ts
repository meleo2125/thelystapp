'use client';

import { useState, useEffect, useCallback } from 'react';
import { ListEntry, ListStatus } from '@/types/list';
import { MediaType } from '@/types/media';
import { getDeterministicEntryId } from '@/lib/list/entryId';

interface SaveInput {
  status: ListStatus;
  score: number | null;
  progress: number;
  notes: string;
  startedAt?: string | null;
  completedAt?: string | null;
  cache: {
    title: string;
    posterPath: string | null;
    year: number | null;
    totalEpisodes: number | null;
  };
  ignoreConflict?: boolean;
  lystIds?: string[];
}

type SaveResult =
  | { success: true; data: ListEntry }
  | {
      success: false;
      conflict: true;
      duplicate: { type: string; cache: { title: string } };
      message: string;
    }
  | { success: false; error: string };

export function useListEntry(type: MediaType, sourceId: number) {
  const [entry, setEntry] = useState<ListEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const entryId = getDeterministicEntryId(type, sourceId);

  const fetchEntry = useCallback(async () => {
    const abort = new AbortController();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/list/${entryId}`, { signal: abort.signal });
      if (res.status === 401) {
        setEntry(null);
        return;
      }
      const json = await res.json();
      if (res.status === 404) {
        setEntry(null);
      } else if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch tracking details');
      } else {
        setEntry(json.data || null);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
    return () => abort.abort();
  }, [entryId]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const save = useCallback(
    async (data: SaveInput): Promise<SaveResult> => {
      try {
        setError(null);
        const isUpdate = !!entry;
        const url = isUpdate ? `/api/list/${entryId}` : '/api/list';
        const method = isUpdate ? 'PATCH' : 'POST';

        const body = isUpdate
          ? {
              status: data.status,
              score: data.score,
              progress: data.progress,
              notes: data.notes,
              startedAt: data.startedAt ?? null,
              completedAt: data.completedAt ?? null,
            }
          : {
              type,
              sourceId,
              status: data.status,
              score: data.score,
              progress: data.progress,
              notes: data.notes,
              startedAt: data.startedAt ?? null,
              completedAt: data.completedAt ?? null,
              cache: data.cache,
              lystIds: data.lystIds ?? [],
              ignoreConflict: data.ignoreConflict,
            };

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const json = await res.json();
        if (res.status === 409) {
          return {
            success: false,
            conflict: true,
            duplicate: json.duplicate,
            message: json.message,
          };
        }
        if (!res.ok) {
          throw new Error(json.error || 'Failed to save entry');
        }
        setEntry(json.data);
        return { success: true, data: json.data };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Failed to save changes';
        setError(errMsg);
        return { success: false, error: errMsg };
      }
    },
    [entry, type, sourceId, entryId]
  );

  const remove = useCallback(async () => {
    try {
      setError(null);
      if (!entry) return { success: true as const };
      const res = await fetch(`/api/list/${entryId}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete tracking entry');
      }
      setEntry(null);
      return { success: true as const };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete entry';
      setError(errMsg);
      return { success: false as const, error: errMsg };
    }
  }, [entry, entryId]);

  return {
    entry,
    loading,
    error,
    save,
    remove,
    refresh: fetchEntry,
  };
}
