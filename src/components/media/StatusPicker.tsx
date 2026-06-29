'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/../backend/AuthContext';
import { useListEntry } from '@/hooks/useListEntry';
import { ListStatus } from '@/types/list';
import { MediaType } from '@/types/media';
import Button from '../ui/Button';
import ScoreWidget from './ScoreWidget';
import ProgressInput from './ProgressInput';
import DuplicateConflictModal from './DuplicateConflictModal';
import StatusBadge from '../ui/StatusBadge';
import toast from 'react-hot-toast';

interface StatusPickerProps {
  type: MediaType;
  sourceId: number;
  mediaTitle: string;
  posterPath: string | null;
  year: number | null;
  totalEpisodes: number | null;
}

const statusOptions: { value: ListStatus; label: string }[] = [
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

  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<ListStatus>('plan_to_watch');
  const [score, setScore] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [conflictEntry, setConflictEntry] = useState<{ type: string; cache: { title: string } } | null>(null);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state with loaded entry
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

  if (authLoading) {
    return <div className="h-20 w-full animate-pulse bg-white/5 rounded-lg" />;
  }

  // Not authenticated view
  if (!user) {
    return (
      <div className="bg-secondary border border-border p-5 rounded-lg text-center flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted block">Tracking State</span>
        <p className="text-xs text-muted">Sign in to track your watch progress, score, and add notes.</p>
        <Button variant="primary" size="sm" onClick={() => window.location.href = '/login'} className="w-full cursor-pointer">
          Sign In to Track
        </Button>
      </div>
    );
  }

  if (entryLoading) {
    return <div className="h-20 w-full animate-pulse bg-white/5 rounded-lg" />;
  }

  const handleSave = async (ignoreConflict = false) => {
    setSaving(true);
    const result = await save({
      status,
      score,
      progress: type === 'movie' ? 0 : progress,
      notes,
      cache: {
        title: mediaTitle,
        posterPath,
        year,
        totalEpisodes,
      },
      ignoreConflict,
    });
    setSaving(false);

    if (result.success) {
      toast.success(entry ? 'Tracking updated' : 'Added to your watchlyst');
      setIsEditing(false);
      setIsConflictOpen(false);
    } else if (result.conflict) {
      setConflictEntry(result.duplicate);
      setIsConflictOpen(true);
    } else {
      toast.error(result.error || 'Failed to save entry');
    }
  };

  const handleConfirmConflict = () => {
    handleSave(true);
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this item from your watchlyst?')) return;
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

  return (
    <div className="bg-secondary border border-border p-5 rounded-lg flex flex-col gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/45 pb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-muted">Tracking State</span>
        {entry && !isEditing && (
          <StatusBadge status={entry.status} />
        )}
      </div>

      {/* Main Mode Layout */}
      {!isEditing ? (
        entry ? (
          /* Tracked Display Mode */
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              {type !== 'movie' && (
                <div className="bg-background/40 border border-border/50 p-3 rounded">
                  <span className="text-muted block mb-1">Progress</span>
                  <span className="font-bold text-foreground text-sm">{entry.progress} / {totalEpisodes || '—'} ep</span>
                </div>
              )}
              <div className={`bg-background/40 border border-border/50 p-3 rounded ${type === 'movie' ? 'col-span-2' : 'col-span-1'}`}>
                <span className="text-muted block mb-1">Your Score</span>
                <span className="font-bold text-rating text-sm flex items-center gap-1">
                  {entry.score ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
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
                <p className="text-xs text-foreground/80 leading-relaxed italic">"{entry.notes}"</p>
              </div>
            )}

            <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="cursor-pointer">
              Edit Tracking
            </Button>
          </div>
        ) : (
          /* Untracked Add Mode */
          <Button variant="primary" size="sm" onClick={() => setIsEditing(true)} className="cursor-pointer">
            Add to Lyst
          </Button>
        )
      ) : (
        /* Form Editor Mode */
        <div className="flex flex-col gap-4">
          {/* Status Options Dropdown */}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-muted uppercase">Status</label>
            <select
              value={status}
              onChange={(e) => {
                const nextVal = e.target.value as ListStatus;
                setStatus(nextVal);
                if (nextVal === 'completed' && totalEpisodes && type !== 'movie') {
                  setProgress(totalEpisodes);
                }
              }}
              disabled={saving}
              className="w-full h-10 px-3 rounded bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
            >
              {statusOptions
                .filter((opt) => !(type === 'movie' && opt.value === 'watching'))
                .map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-secondary text-foreground">
                    {opt.label}
                  </option>
                ))}
            </select>
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
              <Button
                variant="ghost"
                size="sm"
                disabled={saving}
                onClick={() => setIsEditing(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={saving}
                onClick={() => handleSave(false)}
                className="cursor-pointer"
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Conflict Dialog */}
      <DuplicateConflictModal
        isOpen={isConflictOpen}
        onClose={() => setIsConflictOpen(false)}
        onConfirm={handleConfirmConflict}
        duplicate={conflictEntry}
      />
    </div>
  );
}
