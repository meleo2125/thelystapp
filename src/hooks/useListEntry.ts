import { useState, useEffect, useCallback } from 'react';
import { ListEntry } from '@/types/list';
import { MediaType } from '@/types/media';
import { getDeterministicEntryId } from '@/lib/list/entryId';

export function useListEntry(type: MediaType, sourceId: number) {
  const [entry, setEntry] = useState<ListEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const entryId = getDeterministicEntryId(type, sourceId);

  const fetchEntry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/list/${entryId}`);
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
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const save = useCallback(async (data: {
    status: string;
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
  }) => {
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
            startedAt: data.startedAt,
            completedAt: data.completedAt,
          }
        : {
            type,
            sourceId,
            status: data.status,
            score: data.score,
            progress: data.progress,
            notes: data.notes,
            startedAt: data.startedAt,
            completedAt: data.completedAt,
            cache: data.cache,
            ignoreConflict: data.ignoreConflict,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (res.status === 409) {
        return { success: false, conflict: true, duplicate: json.duplicate, message: json.message };
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
  }, [entry, type, sourceId, entryId]);

  const remove = useCallback(async () => {
    try {
      setError(null);
      if (!entry) return { success: true };

      const res = await fetch(`/api/list/${entryId}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete tracking entry');
      }

      setEntry(null);
      return { success: true };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to delete entry';
      setError(errMsg);
      return { success: false, error: errMsg };
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
