'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/../backend/AuthContext';
import { useListEntry } from '@/hooks/useListEntry';
import { useDialogs } from '@/lib/ui/dialogs';
import { ListStatus } from '@/types/list';
import { MediaType } from '@/types/media';
import Button from '../ui/Button';
import Dropdown from '../ui/Dropdown';
import ScoreWidget from './ScoreWidget';
import ProgressInput from './ProgressInput';
import DuplicateConflictModal from './DuplicateConflictModal';
import StatusBadge from '../ui/StatusBadge';
import LystPickerModal from './LystPickerModal';

interface StatusPickerProps {
  type: MediaType;
  sourceId: number;
  mediaTitle: string;
  posterPath: string | null;
  year: number | null;
  totalEpisodes: number | null;
}

const statusOptions: { value: ListStatus; label: string }[] = [
  { value: 'none', label: 'No status (saved only)' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'plan_to_watch', label: 'Plan to Watch' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'dropped', label: 'Dropped' },
];

export default function StatusPicker({
  type,
  sourceId,
  mediaTitle,
  posterPath,
  year,
  totalEpisodes,
}: StatusPickerProps) {
  const { user, loading: authLoading } = useAuth();
  const { entry, loading: entryLoading, save, remove } = useListEntry(type, sourceId);
  const { confirm } = useDialogs();

  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<ListStatus>('plan_to_watch');
  const [score, setScore] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [conflictEntry, setConflictEntry] = useState<{ type: string; cache: { title: string } } | null>(null);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showLystPicker, setShowLystPicker] = useState(false);
  const [inLysts, setInLysts] = useState<{ id: string; name: string }[]>([]);
  const [loadingLysts, setLoadingLysts] = useState(false);

  const fetchInLysts = useCallback(async () => {
    if (!user) return;
    setLoadingLysts(true);
    try {
      const res = await fetch(`/api/lysts/by-media?type=${type}&sourceId=${sourceId}`);
      if (res.ok) {
        const json = await res.json();
        setInLysts(json.lysts || []);
      }
    } catch (err) {
      console.error('Error fetching in lysts:', err);
    } finally {
      setLoadingLysts(false);
    }
  }, [user, type, sourceId]);

  useEffect(() => {
    fetchInLysts();
  }, [fetchInLysts]);

  // Sync state with loaded entry.
  useEffect(() => {
    if (entry) {
      setStatus(entry.status);
      setScore(entry.score);
      setProgress(entry.progress);
      setNotes(entry.notes);
    } else {
      setStatus('plan_to_watch');
      setScore(null);
      setProgress(0);
      setNotes('');
    }
  }, [entry]);

  const handleSave = useCallback(
    async (ignoreConflict = false) => {
      setSaving(true);
      const result = await save({
        status,
        score,
        progress: type === 'movie' ? 0 : progress,
        notes,
        cache: { title: mediaTitle, posterPath, year, totalEpisodes },
        ignoreConflict,
      });
      setSaving(false);

      if (result.success) {
        toast.success(entry ? 'Tracking updated' : 'Added to your watchlyst');
        setIsEditing(false);
        setIsConflictOpen(false);
      } else if ('conflict' in result && result.conflict) {
        setConflictEntry(result.duplicate);
        setIsConflictOpen(true);
      } else {
        const errMsg = ('error' in result && result.error) || ('message' in result && result.message) || 'Failed to save entry';
        toast.error(errMsg);
      }
    },
    [save, status, score, progress, notes, type, mediaTitle, posterPath, year, totalEpisodes, entry]
  );

  const handleConfirmConflict = () => handleSave(true);

  const handleRemove = async () => {
    const ok = await confirm({
      title: 'Remove from watchlyst?',
      description: `"${mediaTitle}" will be removed from your watchlyst and any custom Lysts that include it.`,
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    setSaving(true);
    const result = await remove();
    setSaving(false);
    if (result.success) {
      toast.success('Removed from your watchlyst');
      setIsEditing(false);
    } else {
      toast.error(result.error || 'Failed to delete entry');
    }
  };

  if (authLoading) {
    return <div className="h-20 w-full animate-pulse bg-white/5 rounded-lg" />;
  }

  // Not authenticated view.
  if (!user) {
    return (
      <div className="bg-secondary border border-border p-5 rounded-lg text-center flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted block">Tracking State</span>
        <p className="text-xs text-muted">Sign in to track your watch progress, score, and add notes.</p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => (window.location.href = '/login')}
          className="w-full cursor-pointer"
        >
          Sign In to Track
        </Button>
      </div>
    );
  }

  if (entryLoading) {
    return <div className="h-20 w-full animate-pulse bg-white/5 rounded-lg" />;
  }

  const filteredStatusOptions = statusOptions.filter(
    (opt) => !(type === 'movie' && opt.value === 'watching')
  );

  return (
    <div className="bg-secondary border border-border p-5 rounded-lg flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/45 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Tracking State</span>
        {entry && !isEditing && entry.status !== 'none' && (
          <StatusBadge status={entry.status} />
        )}
      </div>

      {/* Main Mode Layout */}
      {!isEditing ? (
        entry && entry.status !== 'none' ? (
          /* Tracked Display Mode */
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              {type !== 'movie' && (
                <div className="bg-background/40 border border-border/50 p-3 rounded">
                  <span className="text-muted block mb-1">Progress</span>
                  <span className="font-bold text-foreground text-sm">
                    {entry.progress} / {totalEpisodes || '—'} ep
                  </span>
                </div>
              )}
              <div
                className={`bg-background/40 border border-border/50 p-3 rounded ${
                  type === 'movie' ? 'col-span-2' : 'col-span-1'
                }`}
              >
                <span className="text-muted block mb-1">Your Score</span>
                <span className="font-bold text-rating text-sm flex items-center gap-1">
                  {entry.score ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                        <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.6 3.102-1.196 4.657c-.209.813.684 1.462 1.394 1.011l4.225-2.7 4.225 2.7c.71.451 1.602-.198 1.394-1.011l-1.196-4.657 3.6-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                      </svg>
                      {entry.score} / 10
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            </div>

            {entry.notes && (
              <div className="bg-background/30 border border-border/50 p-3 rounded">
                <span className="text-[10px] text-muted uppercase font-bold block mb-1">My Notes</span>
                <p className="text-xs text-foreground/80 leading-relaxed italic">&quot;{entry.notes}&quot;</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="cursor-pointer">
                Edit Tracking
              </Button>
              <Button
                variant={inLysts.length > 0 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowLystPicker(true)}
                className={`cursor-pointer ${
                  inLysts.length > 0
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'
                    : ''
                }`}
              >
                {inLysts.length > 0
                  ? `In ${inLysts.length} Lyst${inLysts.length === 1 ? '' : 's'}`
                  : 'Add to Lyst'}
              </Button>
            </div>
          </div>
        ) : (
          /* Untracked Add Mode */
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" size="sm" onClick={() => setIsEditing(true)} className="cursor-pointer">
              Add to Watchlyst
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowLystPicker(true)}
              className={`cursor-pointer ${
                inLysts.length > 0
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'
                  : ''
              }`}
            >
              {inLysts.length > 0
                ? `In ${inLysts.length} Lyst${inLysts.length === 1 ? '' : 's'}`
                : 'Add to a Lyst'}
            </Button>
          </div>
        )
      ) : (
        /* Form Editor Mode */
        <div className="flex flex-col gap-4">
          {/* Status Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted uppercase">Status</label>
            <Dropdown
              ariaLabel="Watch status"
              options={filteredStatusOptions}
              value={status}
              onChange={(next) => {
                const nextVal = next as ListStatus;
                setStatus(nextVal);
                if (nextVal === 'completed' && totalEpisodes && type !== 'movie') {
                  setProgress(totalEpisodes);
                }
              }}
              disabled={saving}
            />
          </div>

          {/* Episode Progress (If TV or Anime) */}
          {type !== 'movie' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-muted uppercase">Episode Progress</label>
              <ProgressInput
                value={progress}
                max={totalEpisodes}
                onChange={(val) => {
                  setProgress(val);
                  if (totalEpisodes && val >= totalEpisodes) {
                    setStatus('completed');
                  }
                }}
                disabled={saving}
              />
            </div>
          )}

          {/* Score Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted uppercase">My Rating</label>
            <ScoreWidget value={score} onChange={setScore} disabled={saving} />
          </div>

          {/* Notes Area */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted uppercase">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
              placeholder="Add your notes, reviews, or private thoughts here..."
              rows={3}
              maxLength={2000}
              className="w-full bg-background border border-border text-foreground rounded p-3 text-xs focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-border/45 pt-4 mt-2">
            <div>
              {entry && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleRemove}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-400 active:scale-95 transition-all cursor-pointer"
                >
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={saving} onClick={() => setIsEditing(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button variant="primary" size="sm" isLoading={saving} onClick={() => handleSave(false)} className="cursor-pointer">
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      <DuplicateConflictModal
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        onConfirm={handleConfirmConflict}
        duplicate={conflictEntry}
      />

      <LystPickerModal
        isOpen={showLystPicker}
        onClose={() => setShowLystPicker(false)}
        onAdded={fetchInLysts}
        media={{
          type,
          sourceId,
          title: mediaTitle,
          posterPath,
          year,
          totalEpisodes,
        }}
      />
    </div>
  );
}
