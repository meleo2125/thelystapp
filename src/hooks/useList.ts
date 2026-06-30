'use client';

import { useState, useEffect, useCallback } from 'react';
import { ListEntry } from '@/types/list';

export function useList() {
  const [list, setList] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    const abort = new AbortController();
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/list', { signal: abort.signal });
      if (res.status === 401) {
        setList([]);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch list');
      }
      setList(json.data || []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
    return () => abort.abort();
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return {
    list,
    loading,
    error,
    refresh: fetchList,
  };
}
