'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lyst } from '@/types/list';

/**
 * Fetches and caches the signed-in user's custom Lysts.
 * Returns helpers to create, refresh, and remove Lysts in-place.
 */
export function useLysts() {
  const [lysts, setLysts] = useState<Lyst[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLysts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/lysts');
      if (res.status === 401) {
        setLysts([]);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load lysts');
      }
      setLysts(json.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load lysts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLysts();
  }, [fetchLysts]);

  const createLyst = useCallback(
    async (input: { name: string; description?: string; isPublic?: boolean }) => {
      const res = await fetch('/api/lysts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create lyst');
      }
      setLysts((prev) => [json.data as Lyst, ...prev]);
      return json.data as Lyst;
    },
    []
  );

  const removeLyst = useCallback(async (lystId: string) => {
    const res = await fetch(`/api/lysts/${lystId}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || 'Failed to delete lyst');
    }
    setLysts((prev) => prev.filter((l) => l.id !== lystId));
  }, []);

  return { lysts, loading, error, refresh: fetchLysts, createLyst, removeLyst };
}
