import { useState, useEffect, useCallback } from 'react';
import { ListEntry } from '@/types/list';

export function useList() {
  const [list, setList] = useState<ListEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/list');
      const json = await res.json();
      if (!res.ok) {
        // If unauthenticated, silently return empty list
        if (res.status === 401) {
          setList([]);
          return;
        }
        throw new Error(json.error || 'Failed to fetch list');
      }
      setList(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
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
