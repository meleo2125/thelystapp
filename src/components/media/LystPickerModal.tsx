'use client';

import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { useLysts } from '@/hooks/useLysts';
import { Lyst } from '@/types/list';
import { MediaType } from '@/types/media';

interface LystPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called whenever an item is successfully added to a Lyst. */
  onAdded?: (lystId: string) => void;
  media: {
    type: MediaType;
    sourceId: number;
    title: string;
    posterPath: string | null;
    year: number | null;
    totalEpisodes: number | null;
  };
}

/**
 * Picker UI shown when the user wants to add a media item to one of their
 * custom Lysts (Task 2). Allows creating a new Lyst inline.
 */
const LystPickerModal: React.FC<LystPickerModalProps> = ({
  isOpen,
  onClose,
  onAdded,
  media,
}) => {
  const { lysts, loading, createLyst, refresh } = useLysts();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPublic, setNewPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeLystIds, setActiveLystIds] = useState<Set<string>>(new Set());
  const [loadingActive, setLoadingActive] = useState(false);

  const fetchActiveLysts = useCallback(async () => {
    setLoadingActive(true);
    try {
      const res = await fetch(
        `/api/lysts/by-media?type=${media.type}&sourceId=${media.sourceId}`
      );
      if (res.ok) {
        const json = await res.json();
        const ids = new Set<string>((json.lysts || []).map((l: { id: string }) => l.id));
        setActiveLystIds(ids);
      }
    } catch (err) {
      console.error('Failed to fetch active lysts:', err);
    } finally {
      setLoadingActive(false);
    }
  }, [media.type, media.sourceId]);

  useEffect(() => {
    if (isOpen) {
      refresh();
      fetchActiveLysts();
      setShowCreate(false);
      setNewName('');
      setNewDescription('');
      setNewPublic(false);
    }
  }, [isOpen, refresh, fetchActiveLysts]);

  const handleToggle = async (lyst: Lyst) => {
    const isAdded = activeLystIds.has(lyst.id);
    const entryId = `${media.type}_${media.sourceId}`;
    setBusyId(lyst.id);
    try {
      if (isAdded) {
        const res = await fetch(`/api/lysts/${lyst.id}/items?entryId=${entryId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || 'Failed to remove from lyst');
        }
        toast.success(`Removed from "${lyst.name}"`);
        setActiveLystIds((prev) => {
          const next = new Set(prev);
          next.delete(lyst.id);
          return next;
        });
      } else {
        const res = await fetch(`/api/lysts/${lyst.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: media.type,
            sourceId: media.sourceId,
            cache: {
              title: media.title,
              posterPath: media.posterPath,
              year: media.year,
              totalEpisodes: media.totalEpisodes,
            },
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to add to lyst');
        }
        toast.success(`Added to "${lyst.name}"`);
        setActiveLystIds((prev) => {
          const next = new Set(prev);
          next.add(lyst.id);
          return next;
        });
      }
      onAdded?.(lyst.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await createLyst({
        name,
        description: newDescription.trim(),
        isPublic: newPublic,
      });
      toast.success(`Created "${created.name}"`);
      await handleToggle(created);
      setShowCreate(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create lyst');
    } finally {
      setCreating(false);
    }
  };

  const showLoading = loading || loadingActive;

  return (
    <Modal isOpen={isOpen} onClose={onClose} labelledBy="lyst-picker-title">
      <h3
        id="lyst-picker-title"
        className="text-lg font-bold text-foreground mb-1 flex items-center gap-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-5 h-5 text-primary"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
        Add to a Lyst
      </h3>
      <p className="text-xs text-muted mb-5">
        Pick a custom Lyst for{' '}
        <strong className="text-foreground">"{media.title}"</strong>, or create
        a new one. You can add it to multiple Lysts.
      </p>

      {showLoading ? (
        <div className="space-y-2">
          <div className="h-10 bg-white/5 animate-pulse rounded" />
          <div className="h-10 bg-white/5 animate-pulse rounded" />
        </div>
      ) : lysts.length === 0 && !showCreate ? (
        <div className="text-center bg-background/40 border border-border/40 border-dashed p-6 rounded-lg mb-4">
          <p className="text-sm text-muted mb-3">
            You don&apos;t have any custom Lysts yet.
          </p>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowCreate(true)}
          >
            Create your first Lyst
          </Button>
        </div>
      ) : (
        <div className="space-y-1 max-h-72 overflow-y-auto mb-4 pr-1">
          {lysts.map((lyst) => {
            const isAdded = activeLystIds.has(lyst.id);
            return (
              <button
                key={lyst.id}
                type="button"
                disabled={busyId === lyst.id}
                onClick={() => handleToggle(lyst)}
                className={`w-full flex items-center justify-between gap-3 p-3 rounded border bg-background/40 hover:bg-white/5 active:scale-[0.99] transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                  isAdded
                    ? 'border-emerald-500/30 hover:border-rose-500/30'
                    : 'border-border'
                }`}
              >
                <div className="min-w-0">
                  <span className="block font-semibold text-sm text-foreground truncate">
                    {lyst.name}
                  </span>
                  <span className="block text-[10px] text-muted uppercase tracking-wider font-bold mt-0.5">
                    {lyst.itemCount} item{lyst.itemCount === 1 ? '' : 's'}
                    {lyst.isPublic ? ' • Public' : ' • Private'}
                  </span>
                </div>
                <span className={`text-xs font-bold shrink-0 ${
                  isAdded ? 'text-emerald-400' : 'text-primary'
                }`}>
                  {busyId === lyst.id ? (
                    'Processing…'
                  ) : isAdded ? (
                    '✓ Added'
                  ) : (
                    'Add'
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!showCreate ? (
        lysts.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={() => setShowCreate(true)}
            className="mb-2"
          >
            + New Lyst
          </Button>
        )
      ) : (
        <form
          onSubmit={handleCreate}
          className="border-t border-border/50 pt-4 space-y-3"
        >
          <div>
            <label
              className="text-[10px] font-bold uppercase text-muted block mb-1"
              htmlFor="new-lyst-name"
            >
              Name
            </label>
            <input
              id="new-lyst-name"
              type="text"
              maxLength={60}
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Cozy Sunday Movies"
              className="w-full h-10 px-3 rounded bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label
              className="text-[10px] font-bold uppercase text-muted block mb-1"
              htmlFor="new-lyst-desc"
            >
              Description (optional)
            </label>
            <textarea
              id="new-lyst-desc"
              maxLength={500}
              rows={2}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="A short blurb describing this Lyst"
              className="w-full bg-background border border-border text-foreground rounded p-3 text-xs focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newPublic}
              onChange={(e) => setNewPublic(e.target.checked)}
              className="w-4 h-4 rounded border-border bg-background text-primary"
            />
            Make this Lyst public — others can view, like, and clone it.
          </label>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={creating}
              disabled={!newName.trim()}
            >
              Create &amp; add
            </Button>
          </div>
        </form>
      )}

      {!showCreate && (
        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default LystPickerModal;
